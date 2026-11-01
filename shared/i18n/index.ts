import { en, type Dict, type MessageKey } from './en';
import { fa } from './fa';
import { more } from './more';

export type { MessageKey } from './en';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fa', name: 'فارسی' },
  { code: 'ar', name: 'العربية' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

const dicts: Record<string, Dict> = { en, fa, ...more };

export const RTL_LANGS: readonly string[] = ['fa', 'ar'];

export function isRtl(lang: string): boolean {
  return RTL_LANGS.includes(lang);
}

export function detectLang(preferred: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Lang {
  for (const p of preferred) {
    const code = p.toLowerCase().split('-')[0];
    if (LANGUAGES.some((l) => l.code === code)) return code as Lang;
  }
  return 'en';
}

export function translate(lang: string, key: MessageKey, vars?: Record<string, string | number>): string {
  const s = dicts[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Digits in the reader's script (Persian/Arabic-Indic) for numbers shown in RTL UIs. */
export function localizeDigits(lang: string, s: string): string {
  if (lang === 'fa') return s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  if (lang === 'ar') return s.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
  return s;
}

export function formatBytes(lang: string, bytes: number): string {
  const units = lang === 'fa' ? ['بایت', 'KB', 'MB', 'GB', 'TB'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const num = i === 0 ? String(Math.round(v)) : v.toFixed(v >= 100 ? 0 : 1);
  return localizeDigits(lang, `${num} ${units[i]}`);
}

export function formatDuration(lang: string, seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '';
  const s = Math.round(seconds);
  const parts = s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return localizeDigits(lang, parts);
}

export function allDicts(): Record<string, Dict> {
  return dicts;
}

export { en };
