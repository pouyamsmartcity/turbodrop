<script lang="ts">
  import Icon from '../../../shared/ui/Icon.svelte';
  import { bytes, eta, speed, t } from '../lib/i18n';
  import { app, type OutTransfer } from '../lib/state.svelte';

  let { tr }: { tr: OutTransfer } = $props();

  const total = $derived(tr.files.reduce((s, f) => s + f.meta.size, 0));
  const done = $derived(tr.files.reduce((s, f) => s + f.done, 0));
  const pct = $derived(total ? (done / total) * 100 : tr.status === 'done' ? 100 : 0);
  const live = $derived(tr.status === 'active' || tr.status === 'retrying' || tr.status === 'waiting');
  const resumed = $derived(tr.files.some((f) => f.resumed));
  const allSkipped = $derived(tr.files.length > 0 && tr.files.every((f) => f.status === 'skipped'));
  const title = $derived(tr.text && !tr.files.length ? tr.text : tr.files.length === 1 ? tr.files[0].meta.name : `${tr.files.length} × ${tr.files[0]?.meta.path.split('/')[0] ?? ''}`);
</script>

<article class="card glass" class:failed={tr.status === 'failed' || tr.status === 'declined'}>
  <div class="icon" class:ok={tr.status === 'done'}>
    {#if tr.status === 'done'}
      <Icon name="check" size={20} stroke={2.4} />
    {:else if tr.text && !tr.files.length}
      <Icon name="message" size={20} />
    {:else}
      <Icon name="upload" size={20} />
    {/if}
  </div>
  <div class="body">
    <div class="title" dir="auto">{title}</div>
    <div class="meta tiny">
      {#if tr.status === 'waiting'}
        {t('out.waiting')}
      {:else if tr.status === 'retrying'}
        <span class="warn">{t('out.retrying')}</span>
      {:else if tr.status === 'declined'}
        {t('out.declined')}
      {:else if tr.status === 'failed'}
        {t('out.failed')} · {t('out.reselect')}
      {:else if tr.status === 'canceled'}
        {t('tr.canceled')}
      {:else if tr.status === 'done'}
        {allSkipped ? t('out.skipped') : t('out.done')}{#if total} · {bytes(total)}{/if}
      {:else}
        {bytes(done)} / {bytes(total)} · {speed(tr.speed)}{#if tr.speed > 0} · {t('tr.left', { time: eta((total - done) / tr.speed) })}{/if}
      {/if}
      {#if resumed && tr.status !== 'done'}
        <span class="chip">{t('out.resumed')}</span>
      {/if}
    </div>
    {#if total && tr.status !== 'done' && tr.status !== 'declined'}
      <div class="progress" class:idle={!live}><i style="width:{pct}%"></i></div>
    {/if}
  </div>
  {#if live}
    <button class="btn btn-ghost btn-sm" onclick={() => app.cancelOut(tr)} aria-label={t('out.cancel')}><Icon name="x" size={16} /></button>
  {/if}
</article>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r);
    animation: in 0.35s var(--ease);
  }
  .icon {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--grad-soft);
    color: var(--accent-1);
  }
  .icon.ok {
    color: var(--ok);
    background: color-mix(in oklab, var(--ok) 16%, transparent);
  }
  .failed .icon {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 14%, transparent);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .title {
    font-weight: 600;
    font-size: 14.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: center;
    line-height: 1.5;
  }
  .warn {
    color: var(--warn);
  }
  .chip {
    padding: 1px 8px;
    border-radius: 99px;
    background: color-mix(in oklab, var(--accent-1) 18%, transparent);
    color: var(--accent-1);
    font-weight: 600;
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
