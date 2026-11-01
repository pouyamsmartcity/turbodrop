import '@fontsource-variable/inter';
import '@fontsource-variable/vazirmatn';
import '../../../shared/ui/theme.css';
import { mount } from 'svelte';
import App from './App.svelte';

// No browser context menu or accidental reloads inside the app window.
window.addEventListener('contextmenu', (e) => {
  if (!(e.target as HTMLElement).closest('input,textarea')) e.preventDefault();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) e.preventDefault();
});

mount(App, { target: document.getElementById('app')! });
