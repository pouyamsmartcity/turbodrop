<script lang="ts">
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import QrCode from '../components/QrCode.svelte';
  import { ago, platformIcon, t } from '../lib/i18n';
  import { store } from '../lib/store.svelte';

  let pick = $state(0);
  let confirming = $state(false);
  const url = $derived(store.invite[pick] ?? store.invite[0]);

  async function copy() {
    if (!url) return;
    await writeText(url.url);
    store.toast({ kind: 'info', title: 'toast.copied' }, 1800);
  }
</script>

<div class="wrap">
  <section class="qr-card glass">
    {#if url}
      <div class="glow"></div>
      <QrCode text={url.url} size={300} />
      {#if store.invite.length > 1}
        <div class="nets" role="tablist">
          {#each store.invite as u, i (u.ip)}
            <button role="tab" aria-selected={i === pick} class:on={i === pick} onclick={() => (pick = i)}>
              <Icon name={u.label.toLowerCase().includes('wi') ? 'wifi' : 'globe'} size={14} />{u.label} <span class="ltr tiny">{u.ip}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="tiny ltr">{url.label} · {url.ip}</div>
      {/if}
      <div class="btns">
        <button class="btn" onclick={copy}><Icon name="link" size={17} />{t('phone.copy')}</button>
        <button class="btn btn-ghost" onclick={() => (confirming = true)}><Icon name="refresh" size={17} />{t('phone.reset')}</button>
      </div>
      {#if confirming}
        <div class="confirm">
          <span class="tiny">{t('phone.resetConfirm')}</span>
          <button class="btn btn-sm" onclick={() => (confirming = false)}>{t('req.decline')}</button>
          <button class="btn btn-sm btn-primary" onclick={async () => ((confirming = false), await store.rotateRoom())}>{t('req.accept')}</button>
        </div>
      {/if}
    {:else}
      <Icon name="wifi" size={48} />
      <p class="muted">{t('phone.noNetwork')}</p>
    {/if}
  </section>

  <section class="info">
    <h1>{t('phone.title')}</h1>
    <p class="muted lead">{t('phone.sub')}</p>
    <ol>
      <li><span>1</span>{t('phone.tip')}</li>
      <li><span>2</span>{t('conn.noSessionBody')}</li>
      <li><span>3</span>{t('phone.e2e')}</li>
    </ol>
    <div class="card glass">
      <h3>{t('devices.phones')}</h3>
      {#each store.clients as c (c.id)}
        <div class="item">
          <span class="dot" class:on={c.online}></span>
          <Icon name={platformIcon(c.platform)} size={18} />
          <span class="nm" dir="auto">{c.name}</span>
          <em>{c.online ? t('devices.online') : ago(c.lastSeen)}</em>
          <button class="btn btn-sm btn-ghost" title={t('devices.forget')} onclick={() => store.forgetClient(c.id)}><Icon name="trash" size={14} /></button>
        </div>
      {:else}
        <p class="tiny">—</p>
      {/each}
    </div>
  </section>
</div>

<style>
  .wrap {
    display: grid;
    grid-template-columns: minmax(340px, 1fr) minmax(0, 1.1fr);
    gap: 26px;
    align-items: start;
  }
  .qr-card {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 34px 24px 26px;
    border-radius: var(--r-xl);
  }
  .glow {
    position: absolute;
    width: 420px;
    height: 420px;
    top: -60px;
    border-radius: 50%;
    background: conic-gradient(var(--accent-1), var(--accent-2), var(--accent-3), var(--accent-1));
    filter: blur(80px);
    opacity: 0.35;
    animation: rot 12s linear infinite;
    pointer-events: none;
  }
  @keyframes rot {
    to {
      transform: rotate(360deg);
    }
  }
  .nets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    position: relative;
  }
  .nets button {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 6px 12px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 13px;
  }
  .nets button.on {
    border-color: var(--accent-2);
    background: var(--surface-2);
  }
  .btns {
    display: flex;
    gap: 10px;
    position: relative;
  }
  .confirm {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px 14px;
    border-radius: var(--r);
    background: var(--surface-2);
  }
  h1 {
    margin: 8px 0 6px;
    font-size: 30px;
    letter-spacing: -0.03em;
  }
  .lead {
    margin: 0 0 18px;
    line-height: 1.6;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--text-2);
    line-height: 1.6;
  }
  li {
    display: flex;
    gap: 12px;
  }
  li span {
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    background: var(--grad);
  }
  .card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--text-2);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    padding: 4px 0;
  }
  .nm {
    flex: 1;
  }
  .item em {
    font-style: normal;
    font-size: 12px;
    color: var(--text-3);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-3);
  }
  .dot.on {
    background: var(--ok);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--ok) 25%, transparent);
  }
  @media (max-width: 1000px) {
    .wrap {
      grid-template-columns: 1fr;
    }
  }
</style>
