// A friendly default name and platform for this browser.

export interface ThisDevice {
  name: string;
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'chromeos' | 'browser';
}

export function detectDevice(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0): ThisDevice {
  if (/iPhone|iPod/.test(ua)) return { name: 'iPhone', platform: 'ios' };
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return { name: 'iPad', platform: 'ios' };
  if (/Android/.test(ua)) {
    const tablet = !/Mobile/.test(ua);
    return { name: tablet ? 'Android tablet' : 'Android phone', platform: 'android' };
  }
  if (/CrOS/.test(ua)) return { name: 'Chromebook', platform: 'chromeos' };
  if (/Macintosh|Mac OS X/.test(ua)) return { name: 'Mac', platform: 'macos' };
  if (/Windows/.test(ua)) return { name: 'Windows PC', platform: 'windows' };
  if (/Linux/.test(ua)) return { name: 'Linux PC', platform: 'linux' };
  return { name: 'Browser', platform: 'browser' };
}

export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  },
  del(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode */
    }
  },
};

/** Copy text without the async Clipboard API, which plain-http pages do not get. */
export function copyText(text: string): boolean {
  if (window.isSecureContext && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return true;
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function linkify(text: string): { text: string; url?: string }[] {
  const parts: { text: string; url?: string }[] = [];
  const re = /\bhttps?:\/\/[^\s<>"']+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], url: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
