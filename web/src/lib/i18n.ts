import { formatBytes, formatDuration, localizeDigits, translate, type MessageKey } from '../../../shared/i18n';
import { app } from './state.svelte';

// Reading app.lang inside these helpers makes every template that calls them reactive to language.
export const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(app.lang, key, vars);
export const bytes = (n: number) => formatBytes(app.lang, n);
export const speed = (n: number) => translate(app.lang, 'unit.perSecond', { v: formatBytes(app.lang, n) });
export const eta = (seconds: number) => formatDuration(app.lang, seconds);
export const num = (n: number) => localizeDigits(app.lang, String(n));
