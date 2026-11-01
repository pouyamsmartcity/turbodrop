<script lang="ts">
  import { onMount } from 'svelte';
  import { LANGUAGES, type Lang } from '../../shared/i18n';
  import Icon from '../../shared/ui/Icon.svelte';
  import Logo from '../../shared/ui/Logo.svelte';
  import ConnectScreen from './components/ConnectScreen.svelte';
  import IncomingCard from './components/IncomingCard.svelte';
  import OutgoingCard from './components/OutgoingCard.svelte';
  import TextSheet from './components/TextSheet.svelte';
  import { t } from './lib/i18n';
  import { app } from './lib/state.svelte';

  let fileInput = $state<HTMLInputElement>();
  let folderInput = $state<HTMLInputElement>();
  let textOpen = $state(false);
  let dragging = $state(false);
  let editingName = $state(false);
  let nameDraft = $state('');
  let dragDepth = 0;

  onMount(() => app.init());

  $effect(() => {
    document.documentElement.lang = app.lang;
    document.documentElement.dir = app.rtl ? 'rtl' : 'ltr';
    document.title = app.host ? `Turbodrop · ${app.host.name}` : 'Turbodrop';
  });

  const ready = $derived(app.conn === 'online' || app.conn === 'offline');
  const platformIcon = $derived(app.host?.platform === 'macos' || app.host?.platform === 'linux' ? 'laptop' : 'monitor');

  function picked(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length) void app.sendFiles(files);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    dragDepth = 0;
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.size > 0 || f.type !== '');
    if (files.length && ready) void app.sendFiles(files);
  }

  function onPaste(e: ClipboardEvent) {
    if (!ready || (e.target as HTMLElement)?.closest('textarea,input')) return;
    const files = [...(e.clipboardData?.files ?? [])];
    if (files.length) {
      e.preventDefault();
      void app.sendFiles(files);
      return;
    }
    const text = e.clipboardData?.getData('text/plain');
    if (text?.trim()) {
      e.preventDefault();
      void app.sendText(text);
    }
  }

  function saveName() {
    app.rename(nameDraft);
    editingName = false;
  }
</script>

<svelte:window
  onpaste={onPaste}
  ondragenter={(e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    dragDepth++;
    dragging = true;
  }}
  ondragleave={() => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragging = false;
  }}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
/>

<div class="aurora"></div>

<div class="shell">
  <header>
    <div class="brand">
      <Logo size={30} glow />
      <span class="word">Turbodrop</span>
    </div>
    <label class="lang" title={t('lang.label')}>
      <Icon name="globe" size={16} />
      <select value={app.lang} onchange={(e) => app.setLang((e.currentTarget as HTMLSelectElement).value as Lang)} aria-label={t('lang.label')}>
        {#each LANGUAGES as l (l.code)}
          <option value={l.code}>{l.name}</option>
        {/each}
      </select>
    </label>
  </header>

  {#if app.conn === 'none' || app.conn === 'revoked'}
    <ConnectScreen revoked={app.conn === 'revoked'} />
  {:else}
    <section class="status glass" class:off={app.conn !== 'online'}>
      <span class="dot"></span>
      <Icon name={platformIcon} size={18} />
      <span class="label">
        {#if app.conn === 'online' && app.host}
          {t('conn.connected', { name: app.host.name })}
        {:else if app.conn === 'offline'}
          {t('conn.offline')}
        {:else if app.conn === 'unreachable'}
          {t('conn.unreachable')}
        {:else}
          {t('conn.connecting')}
        {/if}
      </span>
      <span class="lock" title={t('footer.secure')}><Icon name="lock" size={14} /></span>
    </section>

    <section class="hero glass">
      <button class="orb" disabled={!ready} onclick={() => fileInput?.click()} aria-label={t('send.button')}>
        <span class="ring r1"></span>
        <span class="ring r2"></span>
        <span class="core"><Icon name="upload" size={42} stroke={2.2} /></span>
      </button>
      <h1>{t('send.button')}</h1>
      <p class="muted">
        {t('send.hint')}{#if app.host}<br /><span class="to">{t('send.toComputer', { name: app.host.name })}</span>{/if}
      </p>
      <div class="row">
        <button class="btn" disabled={!ready} onclick={() => folderInput?.click()}><Icon name="folder" size={18} />{t('send.folder')}</button>
        <button class="btn" disabled={!ready} onclick={() => (textOpen = true)}><Icon name="message" size={18} />{t('send.text')}</button>
      </div>
      <input bind:this={fileInput} type="file" multiple hidden onchange={picked} />
      <input bind:this={folderInput} type="file" multiple hidden webkitdirectory onchange={picked} />
    </section>

    {#each app.incoming as tr (tr.id)}
      <IncomingCard {tr} />
    {/each}

    {#if app.outgoing.length}
      <div class="section-head">
        <h2>{t('list.activity')}</h2>
        <button class="btn btn-ghost btn-sm" onclick={() => app.clearFinished()}>{t('list.clear')}</button>
      </div>
      {#each app.outgoing as tr (tr.id)}
        <OutgoingCard {tr} />
      {/each}
    {/if}

    <footer>
      <div class="me">
        <Icon name="phone" size={16} />
        <span class="tiny">{t('name.thisDevice')}:</span>
        {#if editingName}
          <input
            class="name-input"
            bind:value={nameDraft}
            maxlength="40"
            onkeydown={(e) => e.key === 'Enter' && saveName()}
            onblur={saveName}
          />
        {:else}
          <button class="link" onclick={() => ((nameDraft = app.name), (editingName = true))}>{app.name}</button>
        {/if}
      </div>
      <div class="tiny secure"><Icon name="shield" size={14} /> {t('footer.secure')} · <a href="https://www.pouyam.com" target="_blank" rel="noopener">{t('app.by')}</a></div>
    </footer>
  {/if}
</div>

{#if textOpen}
  <TextSheet onclose={() => (textOpen = false)} />
{/if}

{#if dragging && ready}
  <div class="dropzone"><div class="glass inner"><Icon name="download" size={48} /><b>{t('send.drop')}</b></div></div>
{/if}

<style>
  .shell {
    max-width: 560px;
    margin: 0 auto;
    padding: max(16px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 100dvh;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 2px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .word {
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.02em;
  }
  .lang {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-2);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 0 10px;
    height: 34px;
  }
  .lang select {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: 0;
    padding: 0 2px;
    font-size: 13px;
    color: var(--text);
    outline: none;
  }
  .lang option {
    background: var(--surface-solid);
  }
  .status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 99px;
    font-weight: 600;
    font-size: 14px;
  }
  .status .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ok);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--ok) 25%, transparent);
    animation: pulse 2s infinite;
  }
  .status.off .dot {
    background: var(--warn);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--warn) 25%, transparent);
  }
  .lock {
    color: var(--ok);
    display: flex;
  }
  @keyframes pulse {
    50% {
      box-shadow: 0 0 0 7px color-mix(in oklab, var(--ok) 0%, transparent);
    }
  }
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 30px 18px 22px;
    gap: 6px;
  }
  .hero h1 {
    margin: 14px 0 0;
    font-size: 26px;
    letter-spacing: -0.02em;
  }
  .hero p {
    margin: 0 0 14px;
    font-size: 14px;
    line-height: 1.6;
  }
  .to {
    color: var(--text);
    font-weight: 600;
  }
  .row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .orb {
    position: relative;
    width: 148px;
    height: 148px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    display: grid;
    place-items: center;
    padding: 0;
    transition: transform 0.25s var(--ease);
  }
  .orb:active {
    transform: scale(0.95);
  }
  .orb:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .core {
    position: relative;
    z-index: 2;
    width: 112px;
    height: 112px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
    box-shadow:
      0 18px 50px -12px color-mix(in oklab, var(--accent-2) 80%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid color-mix(in oklab, var(--accent-1) 55%, transparent);
    animation: ripple 2.8s var(--ease) infinite;
  }
  .r2 {
    animation-delay: 1.4s;
    border-color: color-mix(in oklab, var(--accent-3) 50%, transparent);
  }
  .orb:disabled .ring {
    animation: none;
    opacity: 0;
  }
  @keyframes ripple {
    from {
      transform: scale(0.72);
      opacity: 1;
    }
    to {
      transform: scale(1.18);
      opacity: 0;
    }
  }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
    padding: 0 4px;
  }
  .section-head h2 {
    font-size: 15px;
    margin: 0;
    color: var(--text-2);
    font-weight: 600;
  }
  footer {
    margin-top: auto;
    padding-top: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .me {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-2);
  }
  .link {
    background: none;
    border: 0;
    padding: 0;
    font-weight: 600;
    color: var(--text);
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .name-input {
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 4px 8px;
    width: 160px;
  }
  .secure {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .secure a {
    color: var(--text-2);
  }
  .dropzone {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--bg) 60%, transparent);
    backdrop-filter: blur(6px);
    pointer-events: none;
  }
  .dropzone .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 56px;
    border: 2px dashed color-mix(in oklab, var(--accent-1) 60%, transparent);
    font-size: 18px;
  }
</style>
