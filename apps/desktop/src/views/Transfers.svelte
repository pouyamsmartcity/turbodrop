<script lang="ts">
  import Icon from '../../../../shared/ui/Icon.svelte';
  import TransferRow from '../components/TransferRow.svelte';
  import { bytes, t } from '../lib/i18n';
  import { store } from '../lib/store.svelte';

  let filter = $state<'all' | 'in' | 'out'>('all');
  const list = $derived(store.transfers.filter((x) => filter === 'all' || x.direction === filter));
  const totals = $derived({
    in: store.transfers.filter((x) => x.direction === 'in' && x.status === 'done').reduce((s, x) => s + x.totalBytes, 0),
    out: store.transfers.filter((x) => x.direction === 'out' && x.status === 'done').reduce((s, x) => s + x.totalBytes, 0),
  });
</script>

<div class="head">
  <h1>{t('nav.transfers')}</h1>
  <div class="stats">
    <span class="stat"><Icon name="download" size={15} />{bytes(totals.in)}</span>
    <span class="stat"><Icon name="upload" size={15} />{bytes(totals.out)}</span>
  </div>
</div>
<div class="bar">
  <div class="seg" role="tablist">
    <button role="tab" aria-selected={filter === 'all'} class:on={filter === 'all'} onclick={() => (filter = 'all')}>{t('list.activity')}</button>
    <button role="tab" aria-selected={filter === 'in'} class:on={filter === 'in'} onclick={() => (filter = 'in')}><Icon name="download" size={14} /></button>
    <button role="tab" aria-selected={filter === 'out'} class:on={filter === 'out'} onclick={() => (filter = 'out')}><Icon name="upload" size={14} /></button>
  </div>
  <div class="right">
    <button class="btn btn-sm" onclick={() => store.reveal(store.settings.downloadDir)}><Icon name="folder" size={15} />{t('set.openFolder')}</button>
    <button class="btn btn-sm btn-ghost" onclick={() => store.clearHistory()}><Icon name="trash" size={15} />{t('tr.clear')}</button>
  </div>
</div>
<div class="list">
  {#each list as tr (tr.id)}
    <TransferRow {tr} />
  {:else}
    <div class="empty glass"><Icon name="bolt" size={34} /><p class="muted">{t('tr.empty')}</p></div>
  {/each}
</div>

<style>
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin: 8px 0 16px;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: -0.03em;
  }
  .stats {
    display: flex;
    gap: 10px;
  }
  .stat {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 6px 12px;
    border-radius: 99px;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 13px;
    font-weight: 600;
  }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    gap: 10px;
  }
  .seg {
    display: flex;
    padding: 3px;
    border-radius: 99px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .seg button {
    border: 0;
    background: transparent;
    height: 30px;
    padding: 0 14px;
    border-radius: 99px;
    color: var(--text-2);
    font-weight: 600;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
  }
  .seg button.on {
    background: var(--surface-2);
    color: var(--text);
  }
  .right {
    display: flex;
    gap: 6px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 50px;
    color: var(--text-3);
  }
</style>
