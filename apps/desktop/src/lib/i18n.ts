import { formatBytes, formatDuration, localizeDigits, translate, type MessageKey } from '../../../../shared/i18n';
import { store } from './store.svelte';

export const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(store.lang, key, vars);
export const bytes = (n: number) => formatBytes(store.lang, n);
export const speed = (n: number) => translate(store.lang, 'unit.perSecond', { v: formatBytes(store.lang, n) });
export const eta = (seconds: number) => formatDuration(store.lang, seconds);
export const num = (n: number) => localizeDigits(store.lang, String(n));

export function ago(ms: number): string {
  const rtf = new Intl.RelativeTimeFormat(store.lang, { numeric: 'auto' });
  const s = Math.round((ms - Date.now()) / 1000);
  if (Math.abs(s) < 60) return rtf.format(s, 'second');
  const m = Math.round(s / 60);
  if (Math.abs(m) < 60) return rtf.format(m, 'minute');
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}

export function baseName(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p;
}

export function platformIcon(p: string): 'monitor' | 'laptop' | 'phone' | 'globe' {
  if (p === 'ios' || p === 'android') return 'phone';
  if (p === 'macos') return 'laptop';
  if (p === 'windows' || p === 'linux') return 'monitor';
  return 'globe';
}
