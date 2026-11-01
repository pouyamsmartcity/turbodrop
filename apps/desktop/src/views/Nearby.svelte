<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import Logo from '../../../../shared/ui/Logo.svelte';
  import { platformIcon, t } from '../lib/i18n';
  import { store, type Peer } from '../lib/store.svelte';

  let address = $state('');
  let adding = $state(false);
  let selected = $state<string | null>(null);

  type Blip = { id: string; kind: 'device' | 'browser'; name: string; platform: string; x: number; y: number; peer?: Peer };

  function hash(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296;
  }

  const blips = $derived.by<Blip[]>(() => {
    const items: Omit<Blip, 'x' | 'y'>[] = [
      ...store.peers.map((p) => ({ id: p.device.id, kind: 'device' as const, name: p.device.name, platform: p.device.platform, peer: p })),
      ...store.onlinePhones.map((c) => ({ id: c.id, kind: 'browser' as const, name: c.name, platform: c.platform })),
    ];
    return items.map((it, i) => {
      const angle = (hash(it.id) + i / Math.max(1, items.length)) * Math.PI * 2;
      const r = 0.3 + (hash(it.id + 'r') * 0.14 + (i % 2) * 0.1);
      return { ...it, x: 50 + Math.cos(angle) * r * 100, y: 50 + Math.sin(angle) * r * 100 };
    });
  });

  const current = $derived(store.peers.find((p) => p.device.id === selected));

  async function add() {
    if (!address.trim()) return;
    adding = true;
    if (await store.addPeer(address.trim())) address = '';
    adding = false;
  }

  async function sendTo(b: Blip) {
    if (store.selection.length || store.selectionText) {
      await store.send({ kind: b.kind, id: b.id });
      return;
    }
    const r = await open({ multiple: true });
    if (r) await store.sendDirect({ kind: b.kind, id: b.id }, Array.isArray(r) ? r : [r]);
  }
</script>

<div class="wrap">
  <section class="radar-card glass">
    <div class="radar">
      <span class="circle c1"></span>
      <span class="circle c2"></span>
      <span class="circle c3"></span>
      <span class="sweep"></span>
      <div class="me"><Logo size={46} glow /><b>{store.info?.name}</b></div>
      {#each blips as b (b.id)}
        <button
          class="blip"
          class:sel={selected === b.id}
          style="left:{b.x}%;top:{b.y}%"
          onclick={() => (selected = b.kind === 'device' ? b.id : null)}
          ondblclick={() => sendTo(b)}
          title={b.name}
        >
          <span class="dotav"><Icon name={platformIcon(b.platform)} size={20} /></span>
          <span class="nm" dir="auto">{b.name}</span>
        </button>
      {/each}
    </div>
    {#if blips.length === 0}
      <p class="muted hint">{t('devices.searching')}</p>
    {/if}
  </section>

  <section class="side">
    {#if current}
      <div class="card glass detail">
        <div class="dh">
          <span class="dotav big"><Icon name={platformIcon(current.device.platform)} size={26} /></span>
          <div>
            <b dir="auto">{current.device.name}</b>
            <div class="tiny ltr">{current.address}:{current.device.port} · {current.device.platform}</div>
          </div>
        </div>
        {#if current.keyChanged}<div class="warn tiny"><Icon name="shield" size={14} /> {t('devices.keyChanged')}</div>{/if}
        <div class="codebox">
          <span class="tiny">{t('req.code')}</span>
          <span class="emoji">{current.verification}</span>
        </div>
        <div class="btns">
          <button class="btn btn-primary" onclick={() => sendTo({ id: current!.device.id, kind: 'device', name: '', platform: '', x: 0, y: 0 })}><Icon name="upload" size={17} />{t('home.chooseFiles')}</button>
          <button class="btn" onclick={() => store.setTrusted(current!.device.id, !current!.trusted)}>
            <Icon name="shield" size={17} />{current.trusted ? t('devices.untrust') : t('devices.trust')}
          </button>
        </div>
      </div>
    {/if}

    <div class="card glass">
      <h3>{t('devices.computers')}</h3>
      {#each store.peers as p (p.device.id)}
        <button class="item" class:sel={selected === p.device.id} onclick={() => (selected = p.device.id)}>
          <Icon name={platformIcon(p.device.platform)} size={18} />
          <span dir="auto">{p.device.name}</span>
          {#if p.trusted}<em class="ok">{t('devices.trusted')}</em>{/if}
        </button>
      {:else}
        <p class="tiny">{t('devices.searching')}</p>
      {/each}
      <form class="add" onsubmit={(e) => (e.preventDefault(), add())}>
        <input bind:value={address} placeholder="192.168.1.20" aria-label={t('devices.addByIp')} class="ltr" />
        <button class="btn btn-sm" disabled={adding || !address.trim()}><Icon name="plus" size={15} />{t('devices.add')}</button>
      </form>
      <span class="tiny">{t('devices.addByIp')}</span>
    </div>

    <div class="card glass">
      <h3>{t('devices.phones')}</h3>
      {#each store.clients as c (c.id)}
        <div class="item static">
          <span class="dot" class:on={c.online}></span>
          <Icon name={platformIcon(c.platform)} size={18} />
          <span dir="auto">{c.name}</span>
          <em>{c.online ? t('devices.online') : t('devices.offline')}</em>
          <button class="btn btn-sm btn-ghost" title={t('devices.forget')} onclick={() => store.forgetClient(c.id)}><Icon name="trash" size={14} /></button>
        </div>
      {:else}
        <button class="btn btn-sm" onclick={() => (store.view = 'phone')}><Icon name="qr" size={15} />{t('phone.title')}</button>
      {/each}
    </div>
  </section>
</div>

<style>
  .wrap {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
    gap: 22px;
    align-items: start;
  }
  .radar-card {
    padding: 22px;
    border-radius: var(--r-xl);
  }
  .radar {
    position: relative;
    aspect-ratio: 1;
    max-height: 560px;
    margin: 0 auto;
  }
  .circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    inset: 0;
  }
  .c2 {
    inset: 17%;
  }
  .c3 {
    inset: 34%;
    background: radial-gradient(circle, color-mix(in oklab, var(--accent-2) 16%, transparent), transparent 70%);
  }
  .sweep {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in oklab, var(--accent-1) 32%, transparent) 99%, transparent 100%);
    animation: rot 4.5s linear infinite;
  }
  @keyframes rot {
    to {
      transform: rotate(360deg);
    }
  }
  .me {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .blip {
    position: absolute;
    transform: translate(-50%, -50%);
    border: 0;
    background: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--text);
    animation: appear 0.6s var(--ease);
  }
  .blip:hover .dotav,
  .blip.sel .dotav {
    transform: scale(1.12);
    box-shadow: 0 0 0 6px color-mix(in oklab, var(--accent-1) 25%, transparent), 0 10px 40px -8px var(--accent-2);
  }
  .nm {
    font-size: 12.5px;
    font-weight: 600;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--surface-2);
  }
  .dotav {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
    transition: transform 0.25s var(--ease), box-shadow 0.25s;
  }
  .dotav.big {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    flex: none;
  }
  @keyframes appear {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.4);
    }
  }
  .hint {
    text-align: center;
    margin: 12px 0 0;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--text-2);
  }
  .detail {
    gap: 14px;
    animation: appear2 0.35s var(--ease);
  }
  @keyframes appear2 {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .dh {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .codebox {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-radius: var(--r);
    border: 1px dashed var(--border-strong);
  }
  .emoji {
    font-size: 22px;
    letter-spacing: 4px;
  }
  .warn {
    color: var(--warn);
    display: flex;
    gap: 6px;
  }
  .btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 0;
    background: transparent;
    text-align: start;
    font-size: 14px;
  }
  .item span:not(.dot) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item:not(.static):hover,
  .item.sel {
    background: var(--surface-2);
  }
  .item em {
    font-style: normal;
    font-size: 12px;
    color: var(--text-3);
  }
  .item em.ok {
    color: var(--ok);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-3);
    flex: none;
  }
  .dot.on {
    background: var(--ok);
  }
  .add {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .add input {
    flex: 1;
    min-width: 0;
    height: 34px;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 0 10px;
    user-select: text;
  }
  @media (max-width: 1000px) {
    .wrap {
      grid-template-columns: 1fr;
    }
  }
</style>
