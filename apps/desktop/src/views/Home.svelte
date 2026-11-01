<script lang="ts">
  import { readText } from '@tauri-apps/plugin-clipboard-manager';
  import { open } from '@tauri-apps/plugin-dialog';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import QrCode from '../components/QrCode.svelte';
  import TransferRow from '../components/TransferRow.svelte';
  import { baseName, bytes, num, platformIcon, t } from '../lib/i18n';
  import { store } from '../lib/store.svelte';

  let writing = $state(false);
  let draft = $state('');

  const total = $derived(store.selection.reduce((s, x) => s + x.size, 0));
  const hasPayload = $derived(store.selection.length > 0 || store.selectionText.trim().length > 0);
  const recent = $derived(store.transfers.slice(0, 5));
  const targets = $derived([
    ...store.peers.map((p) => ({ kind: 'device' as const, id: p.device.id, name: p.device.name, platform: p.device.platform, sub: p.trusted ? t('devices.trusted') : p.address, online: true })),
    ...store.onlinePhones.map((c) => ({ kind: 'browser' as const, id: c.id, name: c.name, platform: c.platform, sub: t('devices.online'), online: true })),
  ]);

  async function pickFiles() {
    const r = await open({ multiple: true, directory: false });
    if (r) await store.addPaths(Array.isArray(r) ? r : [r]);
  }
  async function pickFolder() {
    const r = await open({ multiple: true, directory: true });
    if (r) await store.addPaths(Array.isArray(r) ? r : [r]);
  }
  async function clipboard() {
    try {
      const text = await readText();
      if (text?.trim()) store.selectionText = text;
    } catch {
      /* empty clipboard */
    }
  }
  function saveText() {
    store.selectionText = draft;
    writing = false;
  }
</script>

<div class="grid">
  <div class="col">
    <section class="drop" class:filled={hasPayload}>
      <div class="border"></div>
      {#if !hasPayload}
        <div class="hero">
          <div class="orb"><span class="ring"></span><span class="ring r2"></span><Icon name="bolt" size={40} stroke={2} /></div>
          <h1>{t('home.dropTitle')}</h1>
          <p class="muted">{t('home.dropSub')}</p>
          <div class="btns">
            <button class="btn btn-primary" onclick={pickFiles}><Icon name="file" size={18} />{t('home.chooseFiles')}</button>
            <button class="btn" onclick={pickFolder}><Icon name="folder" size={18} />{t('home.chooseFolder')}</button>
            <button class="btn" onclick={() => ((draft = ''), (writing = true))}><Icon name="message" size={18} />{t('send.text')}</button>
            <button class="btn btn-ghost" onclick={clipboard}><Icon name="clipboard" size={18} />{t('home.sendClipboard')}</button>
          </div>
        </div>
      {:else}
        <div class="sel">
          <div class="sel-head">
            <b>{t('home.selected', { n: num(store.selection.length + (store.selectionText ? 1 : 0)), size: bytes(total) })}</b>
            <div class="btns">
              <button class="btn btn-sm" onclick={pickFiles}><Icon name="plus" size={15} />{t('home.chooseFiles')}</button>
              <button class="btn btn-sm btn-ghost" onclick={() => store.clearSelection()}>{t('home.clearSelection')}</button>
            </div>
          </div>
          <div class="chips">
            {#if store.selectionText}
              <span class="chip text" dir="auto"><Icon name="message" size={14} />{store.selectionText.slice(0, 60)}<button aria-label="Remove" onclick={() => (store.selectionText = '')}><Icon name="x" size={12} /></button></span>
            {/if}
            {#each store.selection as s (s.path)}
              <span class="chip" title={s.path}>
                <Icon name={s.isDir ? 'folder' : 'file'} size={14} />
                <span dir="auto">{baseName(s.path)}</span>
                <em>{bytes(s.size)}</em>
                <button aria-label="Remove" onclick={() => (store.selection = store.selection.filter((x) => x.path !== s.path))}><Icon name="x" size={12} /></button>
              </span>
            {/each}
          </div>
          <h3>{t('home.pickTarget')}</h3>
          {#if targets.length === 0}
            <p class="muted empty">{t('home.noTargets')}</p>
          {:else}
            <div class="targets">
              {#each targets as d (d.kind + d.id)}
                <button class="target" onclick={() => store.send({ kind: d.kind, id: d.id })}>
                  <span class="av"><Icon name={platformIcon(d.platform)} size={22} /></span>
                  <b dir="auto">{d.name}</b>
                  <span class="tiny">{d.sub}</span>
                </button>
              {/each}
              {#if store.onlinePhones.length > 1}
                <button class="target all" onclick={() => store.send({ kind: 'allBrowsers' })}>
                  <span class="av"><Icon name="phone" size={22} /></span>
                  <b>{t('devices.allPhones')}</b>
                  <span class="tiny">{num(store.onlinePhones.length)}</span>
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </section>

    {#if recent.length}
      <section class="recent">
        <div class="head">
          <h3>{t('nav.transfers')}</h3>
          <button class="btn btn-sm btn-ghost" onclick={() => (store.view = 'transfers')}>{t('tr.open')}</button>
        </div>
        {#each recent as tr (tr.id)}
          <TransferRow {tr} compact />
        {/each}
      </section>
    {/if}
  </div>

  <aside class="col side">
    <section class="card glass phone">
      <h3>{t('phone.title')}</h3>
      {#if store.invite[0]}
        <button class="qrbtn" onclick={() => (store.view = 'phone')} aria-label={t('phone.title')}>
          <QrCode text={store.invite[0].url} size={196} />
        </button>
        <p class="tiny center">{t('phone.sub')}</p>
      {:else}
        <p class="muted">{t('phone.noNetwork')}</p>
      {/if}
      {#if store.onlinePhones.length}
        <div class="phones">
          {#each store.onlinePhones as c (c.id)}
            <span class="pill"><span class="dot"></span>{c.name}</span>
          {/each}
        </div>
      {/if}
    </section>
    <section class="card glass nearby" >
      <h3>{t('devices.title')}</h3>
      {#if store.peers.length === 0}
        <div class="scanning"><span class="sweep"></span><span class="tiny">{t('devices.searching')}</span></div>
      {:else}
        {#each store.peers.slice(0, 4) as p (p.device.id)}
          <div class="peer"><Icon name={platformIcon(p.device.platform)} size={18} /><span dir="auto">{p.device.name}</span>{#if p.trusted}<Icon name="shield" size={14} class="ok" />{/if}</div>
        {/each}
      {/if}
    </section>
    <div class="secure tiny"><Icon name="lock" size={14} /> {t('phone.e2e')}</div>
  </aside>
</div>

{#if writing}
  <div class="backdrop">
    <div class="modal glass" role="dialog" aria-modal="true">
      <h3>{t('send.text')}</h3>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea bind:value={draft} dir="auto" rows="6" autofocus placeholder={t('send.textPlaceholder')} onkeydown={(e) => e.ctrlKey && e.key === 'Enter' && saveText()}></textarea>
      <div class="btns end">
        <button class="btn" onclick={() => (writing = false)}>{t('req.decline')}</button>
        <button class="btn btn-primary" disabled={!draft.trim()} onclick={saveText}><Icon name="check" size={18} />{t('send.textSend')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
    gap: 22px;
    align-items: start;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .drop {
    position: relative;
    border-radius: var(--r-xl);
    padding: 2px;
    min-height: 380px;
    display: flex;
  }
  .border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.5px;
    background: conic-gradient(from var(--a, 0deg), var(--accent-1), var(--accent-2), var(--accent-3), var(--accent-1));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.75;
    animation: spin 8s linear infinite;
  }
  @property --a {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes spin {
    to {
      --a: 360deg;
    }
  }
  .hero,
  .sel {
    position: relative;
    flex: 1;
    border-radius: calc(var(--r-xl) - 2px);
    background: color-mix(in oklab, var(--surface-solid) 70%, transparent);
    backdrop-filter: blur(20px);
  }
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 28px;
    gap: 6px;
  }
  .hero h1 {
    margin: 22px 0 0;
    font-size: 30px;
    letter-spacing: -0.03em;
  }
  .hero p {
    margin: 0 0 22px;
  }
  .orb {
    position: relative;
    width: 116px;
    height: 116px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
    box-shadow: 0 20px 70px -16px var(--accent-2);
    animation: float 5s ease-in-out infinite;
  }
  .ring {
    position: absolute;
    inset: -14px;
    border-radius: 50%;
    border: 1.5px solid color-mix(in oklab, var(--accent-1) 50%, transparent);
    animation: ripple 3s var(--ease) infinite;
  }
  .r2 {
    animation-delay: 1.5s;
    border-color: color-mix(in oklab, var(--accent-3) 45%, transparent);
  }
  @keyframes ripple {
    from {
      transform: scale(0.8);
      opacity: 1;
    }
    to {
      transform: scale(1.35);
      opacity: 0;
    }
  }
  @keyframes float {
    50% {
      transform: translateY(-6px);
    }
  }
  .btns {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .btns.end {
    justify-content: flex-end;
  }
  .sel {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .sel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 150px;
    overflow: auto;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: 280px;
    padding: 6px 8px 6px 12px;
    border-radius: 99px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-size: 13px;
  }
  .chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip em {
    font-style: normal;
    color: var(--text-3);
    flex: none;
  }
  .chip button {
    border: 0;
    background: var(--surface);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0;
    color: var(--text-2);
  }
  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--text-2);
    font-weight: 600;
  }
  .targets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .target {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 18px 10px 14px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--surface);
    transition: transform 0.2s var(--ease), border-color 0.2s, box-shadow 0.2s;
    min-width: 0;
  }
  .target:hover {
    transform: translateY(-3px);
    border-color: color-mix(in oklab, var(--accent-2) 60%, transparent);
    box-shadow: 0 14px 40px -16px var(--accent-2);
  }
  .target b {
    font-size: 14px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .av {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
  }
  .target.all .av {
    background: linear-gradient(135deg, var(--ok), var(--accent-1));
  }
  .empty {
    margin: 0;
    font-size: 14px;
  }
  .recent {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .phone {
    align-items: center;
  }
  .phone h3 {
    align-self: flex-start;
  }
  .qrbtn {
    border: 0;
    padding: 0;
    background: none;
    border-radius: 22px;
  }
  .center {
    text-align: center;
    margin: 0;
    line-height: 1.6;
  }
  .phones {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 99px;
    background: var(--surface-2);
    font-size: 12px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ok);
  }
  .scanning {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sweep {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: conic-gradient(from 0deg, transparent 0 70%, color-mix(in oklab, var(--accent-1) 70%, transparent));
    animation: rot 2s linear infinite;
  }
  @keyframes rot {
    to {
      transform: rotate(360deg);
    }
  }
  .peer {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .peer span {
    flex: 1;
  }
  .peer :global(.ok) {
    color: var(--ok);
  }
  .secure {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    line-height: 1.5;
    padding: 0 6px;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 65;
    display: grid;
    place-items: center;
    background: rgba(3, 5, 12, 0.5);
    backdrop-filter: blur(6px);
  }
  .modal {
    width: min(520px, 92vw);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--surface-solid);
  }
  textarea {
    width: 100%;
    resize: vertical;
    border-radius: var(--r);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 12px 14px;
    font-size: 15px;
    line-height: 1.6;
    user-select: text;
  }
  @media (max-width: 1000px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
