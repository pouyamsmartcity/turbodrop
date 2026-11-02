<script lang="ts">
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { readText } from '@tauri-apps/plugin-clipboard-manager';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';
  import Icon, { type IconName } from '../../../shared/ui/Icon.svelte';
  import Logo from '../../../shared/ui/Logo.svelte';
  import PouyamMark from '../../../shared/ui/PouyamMark.svelte';
  import RequestModal from './components/RequestModal.svelte';
  import Toasts from './components/Toasts.svelte';
  import { num, t } from './lib/i18n';
  import { ACCENTS, store, type View } from './lib/store.svelte';
  import Home from './views/Home.svelte';
  import Nearby from './views/Nearby.svelte';
  import Phone from './views/Phone.svelte';
  import Settings from './views/Settings.svelte';
  import Transfers from './views/Transfers.svelte';
  import type { MessageKey } from '../../../shared/i18n';

  let dragging = $state(false);
  const win = getCurrentWindow();

  const NAV: { id: View; icon: IconName; label: MessageKey }[] = [
    { id: 'home', icon: 'bolt', label: 'nav.home' },
    { id: 'nearby', icon: 'radar', label: 'nav.nearby' },
    { id: 'phone', icon: 'qr', label: 'nav.phone' },
    { id: 'transfers', icon: 'refresh', label: 'nav.transfers' },
    { id: 'settings', icon: 'settings', label: 'nav.settings' },
  ];

  onMount(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      await store.init();
      unlisten = await getCurrentWebview().onDragDropEvent((e) => {
        const p = e.payload;
        if (p.type === 'enter' || p.type === 'over') dragging = true;
        else if (p.type === 'leave') dragging = false;
        else if (p.type === 'drop') {
          dragging = false;
          void store.addPaths(p.paths);
        }
      });
      if (!new URLSearchParams(location.search).has('hidden')) await win.show();
    })();
    return () => unlisten?.();
  });

  $effect(() => {
    const root = document.documentElement;
    root.lang = store.lang;
    root.dir = store.rtl ? 'rtl' : 'ltr';
    if (store.app.theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = store.app.theme;
    const [a, b, c] = ACCENTS[store.app.accent] ?? ACCENTS.aurora;
    root.style.setProperty('--accent-1', a);
    root.style.setProperty('--accent-2', b);
    root.style.setProperty('--accent-3', c);
    root.classList.toggle('win', store.platform === 'windows');
  });

  const activeCount = $derived(store.active.length);

  // Ctrl+V anywhere outside a text field: send the clipboard text.
  async function onKey(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'v') return;
    if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
    try {
      const text = await readText();
      if (text?.trim()) {
        store.selectionText = text;
        store.view = 'home';
      }
    } catch {
      /* clipboard empty or not text */
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="aurora"></div>

<div class="frame">
  <aside class="sidebar">
    <div class="brand" data-tauri-drag-region>
      <Logo size={30} glow />
      <div data-tauri-drag-region>
        <div class="word" data-tauri-drag-region>Turbodrop</div>
        <div class="tiny" data-tauri-drag-region>{t('app.tagline')}</div>
      </div>
    </div>
    <nav>
      {#each NAV as n (n.id)}
        <button class:active={store.view === n.id} onclick={() => (store.view = n.id)}>
          <Icon name={n.icon} size={19} />
          <span>{t(n.label)}</span>
          {#if n.id === 'transfers' && activeCount}<em>{num(activeCount)}</em>{/if}
          {#if n.id === 'phone' && store.onlinePhones.length}<em class="ok">{num(store.onlinePhones.length)}</em>{/if}
          {#if n.id === 'nearby' && store.peers.length}<em class="soft">{num(store.peers.length)}</em>{/if}
        </button>
      {/each}
    </nav>
    <div class="me glass">
      <span class="pulse"></span>
      <div class="me-text">
        <b>{store.info?.name ?? '…'}</b>
        <span class="tiny ltr">{store.invite[0]?.ip ?? ''}{store.info ? `:${store.info.port}` : ''}</span>
      </div>
    </div>
    <button class="by" title="pouyam.com" onclick={() => store.openUrl('https://www.pouyam.com/?utm_source=turbodrop&utm_medium=app')}>
      <PouyamMark size={14} /><span>{t('app.by')}</span>
    </button>
  </aside>

  <main>
    <header class="titlebar" data-tauri-drag-region>
      {#if store.platform === 'windows'}
        <div class="winbtns">
          <button aria-label="Minimize" onclick={() => win.minimize()}><svg width="10" height="10"><path d="M0 5h10" stroke="currentColor" /></svg></button>
          <button aria-label="Maximize" onclick={() => win.toggleMaximize()}><svg width="10" height="10"><rect x=".5" y=".5" width="9" height="9" fill="none" stroke="currentColor" /></svg></button>
          <button class="close" aria-label="Close" onclick={() => win.close()}><svg width="10" height="10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg></button>
        </div>
      {/if}
    </header>
    <section class="content">
      {#if store.ready}
        {#key store.view}
          <div class="view">
            {#if store.view === 'home'}<Home />
            {:else if store.view === 'nearby'}<Nearby />
            {:else if store.view === 'phone'}<Phone />
            {:else if store.view === 'transfers'}<Transfers />
            {:else}<Settings />{/if}
          </div>
        {/key}
      {/if}
    </section>
  </main>
</div>

{#if store.requests.length}
  <RequestModal req={store.requests[0]} />
{/if}

<Toasts />

{#if dragging}
  <div class="dropzone">
    <div class="inner">
      <div class="orb"><Icon name="download" size={46} stroke={2.2} /></div>
      <b>{t('home.dropTitle')}</b>
    </div>
  </div>
{/if}

<style>
  :global(html.win body) {
    background: color-mix(in oklab, var(--bg) 82%, transparent);
  }
  :global(body) {
    overflow: hidden;
    user-select: none;
  }
  .frame {
    display: grid;
    grid-template-columns: 248px 1fr;
    height: 100vh;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 14px 14px;
    border-inline-end: 1px solid var(--border);
    background: color-mix(in oklab, var(--bg-2) 55%, transparent);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 4px 6px 10px;
  }
  .word {
    font-weight: 800;
    font-size: 19px;
    letter-spacing: -0.02em;
  }
  .brand .tiny {
    line-height: 1.3;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 0 12px;
    border-radius: 12px;
    border: 0;
    background: transparent;
    color: var(--text-2);
    font-weight: 600;
    font-size: 14px;
    text-align: start;
    transition: background 0.2s, color 0.2s;
  }
  nav button span {
    flex: 1;
  }
  nav button:hover {
    background: var(--surface);
    color: var(--text);
  }
  nav button.active {
    color: var(--text);
    background: var(--surface-2);
    box-shadow: inset 3px 0 0 var(--accent-2);
  }
  :global([dir='rtl']) nav button.active {
    box-shadow: inset -3px 0 0 var(--accent-2);
  }
  nav em {
    font-style: normal;
    font-size: 11px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 99px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
  }
  nav em.ok {
    background: var(--ok);
    color: #04130c;
  }
  nav em.soft {
    background: var(--surface-2);
    color: var(--text-2);
  }
  .me {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: var(--r);
  }
  .me-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .me-text b {
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pulse {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--ok);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--ok) 60%, transparent);
    animation: beat 2.2s infinite;
  }
  @keyframes beat {
    70% {
      box-shadow: 0 0 0 9px transparent;
    }
  }
  .by {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    background: none;
    border: 0;
    color: var(--text-3);
    font-size: 12px;
    padding: 4px;
    transition: color 0.25s;
  }
  .by:hover {
    color: #c9b27c;
  }
  main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .titlebar {
    height: 38px;
    flex: none;
    display: flex;
    justify-content: flex-end;
  }
  .winbtns {
    display: flex;
    direction: ltr;
  }
  .winbtns button {
    width: 46px;
    height: 38px;
    border: 0;
    background: transparent;
    color: var(--text-2);
    display: grid;
    place-items: center;
  }
  .winbtns button:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  .winbtns .close:hover {
    background: #e81123;
    color: #fff;
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 28px 28px;
  }
  .view {
    animation: enter 0.4s var(--ease);
    max-width: 1180px;
    margin: 0 auto;
  }
  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  .dropzone {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--bg) 55%, transparent);
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .dropzone .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    font-size: 22px;
    padding: 56px 80px;
    border-radius: 40px;
    border: 2px dashed color-mix(in oklab, var(--accent-1) 70%, transparent);
    background: var(--surface);
    animation: enter 0.25s var(--ease);
  }
  .orb {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
    box-shadow: 0 0 60px color-mix(in oklab, var(--accent-2) 70%, transparent);
  }
</style>
