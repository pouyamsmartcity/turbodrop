<script lang="ts">
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import { t } from '../lib/i18n';
  import { store, type Toast } from '../lib/store.svelte';

  function firstUrl(s: string) {
    return /\bhttps?:\/\/[^\s<>"']+/.exec(s)?.[0];
  }

  function openTransfer(toast: Toast) {
    const tr = store.transfers.find((x) => x.id === toast.transferId);
    const p = tr?.files[0]?.localPath;
    if (tr?.direction === 'in' && p) void store.reveal(p);
    else store.view = 'transfers';
    store.dismiss(toast.id);
  }

  async function copy(toast: Toast) {
    await writeText(toast.text ?? '');
    store.dismiss(toast.id);
    store.toast({ kind: 'info', title: 'toast.copied' }, 1800);
  }
</script>

<div class="stack">
  {#each store.toasts as toast (toast.id)}
    <div class="toast glass {toast.kind}">
      <span class="ic">
        <Icon name={toast.kind === 'ok' ? 'check' : toast.kind === 'error' ? 'x' : toast.kind === 'message' ? 'message' : 'bolt'} size={18} stroke={2.2} />
      </span>
      <div class="body">
        <b>{t(toast.title, toast.vars)}</b>
        {#if toast.text}
          <p dir="auto">{toast.text}</p>
          <div class="row">
            <button class="btn btn-sm" onclick={() => copy(toast)}><Icon name="copy" size={15} />{t('tr.copy')}</button>
            {#if firstUrl(toast.text)}
              <button class="btn btn-sm" onclick={() => store.openUrl(firstUrl(toast.text!)!)}><Icon name="external" size={15} />{t('in.open')}</button>
            {/if}
          </div>
        {:else if toast.transferId}
          <button class="link" onclick={() => openTransfer(toast)}>{t('tr.showInFolder')}</button>
        {/if}
      </div>
      <button class="x" aria-label="Close" onclick={() => store.dismiss(toast.id)}><Icon name="x" size={14} /></button>
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    inset-block-end: 18px;
    inset-inline-end: 18px;
    z-index: 80;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(380px, 90vw);
  }
  .toast {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px;
    border-radius: var(--r);
    background: var(--surface-solid);
    animation: slide 0.35s var(--ease);
  }
  .ic {
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
  }
  .ok .ic {
    background: var(--ok);
    color: #04130c;
  }
  .error .ic {
    background: var(--danger);
  }
  .body {
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }
  p {
    margin: 6px 0 8px;
    max-height: 120px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-2);
    user-select: text;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .link {
    margin-top: 4px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent-1);
    font-size: 13px;
  }
  .x {
    border: 0;
    background: none;
    color: var(--text-3);
    padding: 2px;
  }
  @keyframes slide {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
  }
</style>
