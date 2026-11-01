<script lang="ts">
  import Icon from '../../../shared/ui/Icon.svelte';
  import { copyText, linkify, saveBlob } from '../lib/device';
  import { bytes, eta, speed, t } from '../lib/i18n';
  import { app, type InFile, type InTransfer } from '../lib/state.svelte';
  import { buildZip, ZIP_LIMIT } from '../lib/zip';

  let { tr }: { tr: InTransfer } = $props();
  let copied = $state(false);

  const total = $derived(tr.files.reduce((s, f) => s + f.meta.size, 0));
  const done = $derived(tr.files.reduce((s, f) => s + f.done, 0));
  const pct = $derived(total ? (done / total) * 100 : 100);
  const hasImages = $derived(tr.files.some((f) => isImage(f)));

  function isImage(f: InFile) {
    return (f.meta.mime ?? '').startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|avif|bmp)$/i.test(f.meta.name);
  }
  function isVideo(f: InFile) {
    return (f.meta.mime ?? '').startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.meta.name);
  }

  function saveAll() {
    const ready = tr.files.filter((f) => f.blob);
    if (ready.length === 1) return saveBlob(ready[0].blob!, ready[0].meta.name);
    const zip = buildZip(ready.map((f) => ({ path: f.meta.path, data: f.blob!, crc: f.crc, modified: f.meta.modified })));
    saveBlob(zip, `Turbodrop-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  function copy() {
    if (tr.text && copyText(tr.text)) {
      copied = true;
      setTimeout(() => (copied = false), 1600);
    }
  }
</script>

<article class="card glass">
  <header>
    <div class="from">
      <span class="badge"><Icon name="download" size={16} stroke={2.2} /></span>
      <b>{t('in.from', { name: tr.from })}</b>
    </div>
    <button class="btn btn-ghost btn-sm" onclick={() => app.dismissIn(tr)} aria-label="Close"><Icon name="x" size={16} /></button>
  </header>

  {#if tr.text}
    <div class="message" dir="auto">
      {#each linkify(tr.text) as part}
        {#if part.url}<a href={part.url} target="_blank" rel="noopener noreferrer">{part.text}</a>{:else}{part.text}{/if}
      {/each}
    </div>
    <div class="actions">
      <button class="btn btn-sm" onclick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? t('in.copied') : t('in.copy')}</button>
    </div>
  {/if}

  {#if tr.files.length}
    <ul class="files">
      {#each tr.files as f (f.meta.id)}
        <li>
          <div class="thumb">
            {#if f.url && isImage(f)}
              <img src={f.url} alt={f.meta.name} />
            {:else if f.url && isVideo(f)}
              <!-- svelte-ignore a11y_media_has_caption -->
              <video src={f.url} muted playsinline preload="metadata"></video>
            {:else}
              <Icon name={isImage(f) ? 'image' : isVideo(f) ? 'play' : 'file'} size={20} />
            {/if}
          </div>
          <div class="info">
            <div class="name" dir="auto">{f.meta.name}</div>
            <div class="tiny">{bytes(f.meta.size)}</div>
          </div>
          {#if f.status === 'done' && f.blob}
            <button class="btn btn-sm" onclick={() => saveBlob(f.blob!, f.meta.name)}><Icon name="download" size={16} />{t('in.save')}</button>
          {:else if f.status === 'active'}
            <span class="tiny">{Math.floor((f.done / Math.max(1, f.meta.size)) * 100)}%</span>
          {/if}
        </li>
      {/each}
    </ul>

    {#if tr.status === 'active'}
      <div class="progress"><i style="width:{pct}%"></i></div>
      <div class="tiny">{t('in.receiving')} {bytes(done)} / {bytes(total)} · {speed(tr.speed)}{#if tr.speed > 0} · {t('tr.left', { time: eta((total - done) / tr.speed) })}{/if}</div>
    {:else if tr.status === 'offered'}
      <div class="tiny">{t('in.bigHint', { size: bytes(total) })}</div>
      <div class="actions">
        <button class="btn btn-primary" onclick={() => app.receive(tr)}><Icon name="download" size={18} />{t('in.receive')}</button>
        <button class="btn" onclick={() => app.decline(tr)}>{t('in.decline')}</button>
      </div>
    {:else if tr.status === 'done'}
      <div class="actions">
        <button class="btn btn-primary" onclick={saveAll} disabled={total > ZIP_LIMIT && tr.files.length > 1}>
          <Icon name={tr.files.length > 1 ? 'zip' : 'download'} size={18} />{tr.files.length > 1 ? t('in.saveAll') : t('in.save')}
        </button>
        <span class="tiny ok"><Icon name="shield" size={14} /> {t('tr.verified')}</span>
      </div>
      {#if hasImages}<div class="tiny">{t('in.photoHint')}</div>{/if}
    {:else if tr.status === 'failed'}
      <div class="actions">
        <span class="tiny bad">{t('tr.failed')}</span>
        <button class="btn btn-sm" onclick={() => app.receive(tr)}><Icon name="refresh" size={16} />{t('in.receive')}</button>
      </div>
    {:else}
      <div class="tiny">{tr.status === 'declined' ? t('tr.declined') : t('tr.canceled')}</div>
    {/if}
  {/if}
</article>

<style>
  .card {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-color: color-mix(in oklab, var(--accent-1) 35%, var(--border));
    animation: pop 0.45s var(--ease);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .from {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .badge {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
  }
  .message {
    padding: 12px 14px;
    border-radius: var(--r);
    background: var(--surface-2);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    max-height: 260px;
    overflow: auto;
  }
  .message a {
    color: var(--accent-1);
  }
  .files {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 360px;
    overflow: auto;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .thumb {
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 12px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: var(--surface-2);
    color: var(--text-2);
  }
  .thumb img,
  .thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    -webkit-touch-callout: default;
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .ok {
    color: var(--ok);
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .bad {
    color: var(--danger);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.97) translateY(10px);
    }
  }
</style>
