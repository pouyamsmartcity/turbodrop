//! Turning names chosen by a remote device into safe local paths.
//!
//! A sender controls `FileMeta::path`, so nothing in it may escape the download folder
//! (`..`, absolute paths, drive letters, UNC prefixes) or produce names Windows refuses
//! (reserved device names, trailing dots and spaces, forbidden characters).

use std::path::{Path, PathBuf};

const RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Make one path component safe on every OS. Never returns an empty string, `.` or `..`.
pub fn sanitize_component(raw: &str) -> String {
    let mut s: String = raw
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            // Bidi controls can disguise an extension ("photo<RLO>gpj.exe").
            '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' | '\u{200E}' | '\u{200F}' => '_',
            c => c,
        })
        .collect();
    while s.ends_with('.') || s.ends_with(' ') {
        s.pop();
    }
    let s = s.trim_start().to_string();
    let mut s = if s.is_empty() || s == "." || s == ".." {
        "file".to_string()
    } else {
        s
    };
    let stem = s.split('.').next().unwrap_or("").to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        s = format!("_{s}");
    }
    truncate_utf8(&s, 200)
}

fn truncate_utf8(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    // Keep the extension when shortening.
    let (stem, ext) = match s.rfind('.') {
        Some(i) if s.len() - i <= 16 && i > 0 => (&s[..i], &s[i..]),
        _ => (s, ""),
    };
    let mut cut = max_bytes.saturating_sub(ext.len());
    while !stem.is_char_boundary(cut) {
        cut -= 1;
    }
    format!("{}{}", &stem[..cut], ext)
}

/// Sanitize a relative `/`- or `\`-separated path into components. Empty, `.` and `..`
/// components are dropped, so the result always stays inside the base folder.
pub fn sanitize_relative(raw: &str) -> Vec<String> {
    let parts: Vec<String> = raw
        .split(['/', '\\'])
        .filter(|p| !p.is_empty() && *p != "." && *p != "..")
        .take(32)
        .map(sanitize_component)
        .collect();
    if parts.is_empty() {
        vec!["file".to_string()]
    } else {
        parts
    }
}

/// Resolve a remote relative path under `base`.
pub fn resolve_under(base: &Path, raw: &str) -> PathBuf {
    let mut p = base.to_path_buf();
    for c in sanitize_relative(raw) {
        p.push(c);
    }
    p
}

/// `name.ext` → `name (2).ext`, `name (3).ext`, ... until the path is free.
pub fn unique_path(path: &Path) -> PathBuf {
    if !path.exists() && !part_path(path).exists() {
        return path.to_path_buf();
    }
    let parent = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let file = path.file_name().and_then(|s| s.to_str()).unwrap_or("file");
    let (stem, ext) = match file.rfind('.') {
        Some(i) if i > 0 => (&file[..i], &file[i..]),
        _ => (file, ""),
    };
    for n in 2..10_000 {
        let candidate = parent.join(format!("{stem} ({n}){ext}"));
        if !candidate.exists() && !part_path(&candidate).exists() {
            return candidate;
        }
    }
    parent.join(format!("{stem} ({}){ext}", crate::crypto::random_id(4)))
}

/// Where a file lives while it is still arriving.
pub fn part_path(path: &Path) -> PathBuf {
    let mut s = path.as_os_str().to_owned();
    s.push(".tdpart");
    PathBuf::from(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn traversal_is_neutralised() {
        assert_eq!(sanitize_relative("../../etc/passwd"), vec!["etc", "passwd"]);
        assert_eq!(sanitize_relative("/abs/x"), vec!["abs", "x"]);
        assert_eq!(
            sanitize_relative("C:\\Windows\\system32"),
            vec!["C_", "Windows", "system32"]
        );
        assert_eq!(
            sanitize_relative("\\\\server\\share\\f"),
            vec!["server", "share", "f"]
        );
        assert_eq!(sanitize_relative(""), vec!["file"]);
        assert_eq!(sanitize_relative("./././"), vec!["file"]);
        let base = Path::new("base");
        assert!(resolve_under(base, "../../x").starts_with(base));
    }

    #[test]
    fn windows_hostile_names() {
        assert_eq!(sanitize_component("CON"), "_CON");
        assert_eq!(sanitize_component("nul.txt"), "_nul.txt");
        assert_eq!(sanitize_component("report. . "), "report");
        assert_eq!(sanitize_component("a<b>c:d\"e|f?g*h"), "a_b_c_d_e_f_g_h");
        assert_eq!(sanitize_component("..."), "file");
        assert_eq!(sanitize_component("tab\there"), "tab_here");
        assert_eq!(sanitize_component("photo\u{202E}gpj.exe"), "photo_gpj.exe");
    }

    #[test]
    fn unicode_names_survive() {
        assert_eq!(sanitize_component("عکس‌های سفر.jpg"), "عکس‌های سفر.jpg");
        assert_eq!(sanitize_component("📸 2026.heic"), "📸 2026.heic");
    }

    #[test]
    fn long_names_keep_extension() {
        let long = format!("{}.mp4", "ب".repeat(300));
        let s = sanitize_component(&long);
        assert!(s.len() <= 200);
        assert!(s.ends_with(".mp4"));
    }

    #[test]
    fn unique_path_counts_up() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.txt");
        assert_eq!(unique_path(&p), p);
        std::fs::write(&p, "x").unwrap();
        assert_eq!(unique_path(&p), dir.path().join("a (2).txt"));
        std::fs::write(dir.path().join("a (2).txt"), "x").unwrap();
        assert_eq!(unique_path(&p), dir.path().join("a (3).txt"));
        let noext = dir.path().join("README");
        std::fs::write(&noext, "x").unwrap();
        assert_eq!(unique_path(&noext), dir.path().join("README (2)"));
    }
}
