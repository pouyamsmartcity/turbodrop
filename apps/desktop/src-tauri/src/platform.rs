//! OS integration: Explorer context menu and keeping the computer awake during transfers.

use std::sync::mpsc;

/// A thread that holds the "system required" power request while transfers run.
/// SetThreadExecutionState is per-thread, so one dedicated thread owns it.
pub fn keep_awake_thread() -> mpsc::Sender<bool> {
    let (tx, rx) = mpsc::channel::<bool>();
    std::thread::Builder::new()
        .name("turbodrop-awake".into())
        .spawn(move || {
            while let Ok(on) = rx.recv() {
                set_awake(on);
            }
            set_awake(false);
        })
        .expect("spawn keep-awake thread");
    tx
}

#[cfg(windows)]
fn set_awake(on: bool) {
    use windows_sys::Win32::System::Power::{
        SetThreadExecutionState, ES_CONTINUOUS, ES_SYSTEM_REQUIRED,
    };
    unsafe {
        SetThreadExecutionState(if on {
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        } else {
            ES_CONTINUOUS
        });
    }
}

#[cfg(not(windows))]
fn set_awake(_on: bool) {}

/// Add or remove "Send with Turbodrop" for files and folders (current user only, no admin).
#[cfg(windows)]
pub fn set_context_menu(enable: bool) -> std::io::Result<()> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe = std::env::current_exe()?;
    let exe = exe.to_string_lossy();
    for base in [
        "Software\\Classes\\*\\shell\\Turbodrop",
        "Software\\Classes\\Directory\\shell\\Turbodrop",
    ] {
        if enable {
            let (key, _) = hkcu.create_subkey(base)?;
            key.set_value("", &"Send with Turbodrop")?;
            key.set_value("Icon", &format!("\"{exe}\",0"))?;
            let (cmd, _) = key.create_subkey("command")?;
            cmd.set_value("", &format!("\"{exe}\" \"%1\""))?;
        } else {
            let _ = hkcu.delete_subkey_all(base);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_context_menu(_enable: bool) -> std::io::Result<()> {
    Ok(())
}
