<script lang="ts">
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import { ago, bytes, eta, num, platformIcon, speed, t } from '../lib/i18n';
  import { store, type TransferView } from '../lib/store.svelte';

  let { tr, compact = false }: { tr: TransferView; compact?: boolean } = $props();
  let open = $state(false);

  const pct = $derived(tr.totalBytes ? (tr.doneBytes / tr.totalBytes) * 100 : 100);
  const live = $derived(tr.status === 'active' || tr.status === 'waiting');
  const title = $derived(
    tr.files.length === 0 ? (tr.text ?? '') : tr.files.length === 1 ? tr.files[0].name : `${tr.files[0].path.split('/')[0]} +${num(tr.files.length - 1)}`,
  );
  const resumed = $derived(tr.files.some((f) => f.resumed));
  const statusKey = $derived(
    ({ waiting: 'tr.waiting', active: 'tr.active', done: 'tr.done', declined: 'tr.declined', canceled: 'tr.canceled', failed: 'tr.failed' } as const)[tr.status],
  );
  const allSkipped = $derived(tr.files.length > 0 && tr.files.every((f) => f.status === 'skipped'));

  function folderOf(p?: string) {
    return p;
  }
</script>

<article class="row" class:compact class:live>
  <div class="ic {tr.direction}" class:fail={tr.status === 'failed' || tr.status === 'declined'}>
    <Icon name={tr.files.length === 0 ? 'message' : tr.direction === 'in' ? 'download' : 'upload'} size={18} stroke={2.1} />
  </div>
  <div class="main">
    <div class="top">
      <span class="title" dir="auto">{title}</span>
      {#if resumed}<span class="chip">{t('tr.resumed')}</span>{/if}
    </div>
    <div class="sub tiny">
      <Icon name={platformIcon(tr.peerPlatform)} size={13} />
      <span>{tr.direction === 'in' ? t('tr.in', { name: tr.peerName }) : t('tr.out', { name: tr.peerName })}</span>
      <span>·</span>
      {#if tr.status === 'active'}
        <span class="ltr">{bytes(tr.doneBytes)} / {bytes(tr.totalBytes)}</span><span>·</span><span>{speed(tr.speed)}</span>
        {#if tr.speed > 0}<span>· {t('tr.left', { time: eta((tr.totalBytes - tr.doneBytes) / tr.speed) })}</span>{/if}
      {:else}
        <span class="st {tr.status}">{allSkipped ? t('tr.skipped') : t(statusKey)}</span>
        {#if tr.totalBytes}<span>· {bytes(tr.totalBytes)}</span>{/if}
        <span>· {ago(tr.finishedAt ?? tr.startedAt)}</span>
      {/if}
    </div>
    {#if live && tr.totalBytes}
      <div class="progress"><i style="width:{pct}%"></i></div>
    {/if}
    {#if tr.error}<div class="tiny err">{tr.error}</div>{/if}
  </div>
  <div class="acts">
    {#if live}
      <button class="btn btn-sm btn-ghost" onclick={() => store.cancel(tr.id)} title={t('tr.cancel')}><Icon name="x" size={16} /></button>
    {:else if tr.direction === 'in' && tr.status === 'done' && tr.files[0]?.localPath}
      {#if tr.files.length === 1}
        <button class="btn btn-sm" onclick={() => store.openPath(tr.files[0].localPath!)}>{t('tr.open')}</button>
      {/if}
      <button class="btn btn-sm btn-ghost" title={t('tr.showInFolder')} onclick={() => store.reveal(folderOf(tr.files[0].localPath)!)}><Icon name="folder" size={16} /></button>
    {/if}
    {#if tr.text}
      <button class="btn btn-sm btn-ghost" title={t('tr.copy')} onclick={() => writeText(tr.text!)}><Icon name="copy" size={16} /></button>
    {/if}
    {#if !compact && tr.files.length > 1}
      <button class="btn btn-sm btn-ghost" onclick={() => (open = !open)} aria-expanded={open}><Icon name={open ? 'x' : 'plus'} size={16} /></button>
    {/if}
  </div>
</article>
{#if open}
  <ul class="files">
    {#each tr.files as f (f.id)}
      <li>
        <Icon name="file" size={14} />
        <span dir="auto">{f.path}</span>
        <em>{f.status === 'skipped' ? t('tr.skipped') : bytes(f.size)}</em>
        {#if f.localPath && tr.direction === 'in' && f.status === 'done'}
          <button class="btn btn-sm btn-ghost" onclick={() => store.openPath(f.localPath!)}>{t('tr.open')}</button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: var(--r);
    background: var(--surface);
    border: 1px solid var(--border);
    transition: border-color 0.2s;
  }
  .row.live {
    border-color: color-mix(in oklab, var(--accent-2) 45%, var(--border));
  }
  .compact {
    padding: 10px 12px;
  }
  .ic {
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: var(--accent-1);
    background: var(--grad-soft);
  }
  .ic.in {
    color: var(--ok);
    background: color-mix(in oklab, var(--ok) 15%, transparent);
  }
  .ic.fail {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 14%, transparent);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .top {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .title {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip {
    flex: none;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 99px;
    color: var(--accent-1);
    background: color-mix(in oklab, var(--accent-1) 15%, transparent);
  }
  .sub {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-wrap: wrap;
  }
  .st.done {
    color: var(--ok);
  }
  .st.failed,
  .st.declined {
    color: var(--danger);
  }
  .err {
    color: var(--danger);
  }
  .acts {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .files {
    list-style: none;
    margin: -4px 0 4px;
    padding: 8px 14px 8px 66px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
  .files li {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .files span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .files em {
    font-style: normal;
    color: var(--text-3);
  }
</style>
