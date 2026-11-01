<script lang="ts">
  import Icon from '../../../shared/ui/Icon.svelte';
  import { t } from '../lib/i18n';
  import { app } from '../lib/state.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let text = $state('');
  let area: HTMLTextAreaElement;

  $effect(() => {
    area?.focus();
  });

  function send() {
    if (!text.trim()) return;
    void app.sendText(text);
    onclose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" role="presentation" onclick={onclose}>
  <div class="sheet glass" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-modal="true" aria-label={t('send.text')}>
    <div class="head">
      <b>{t('send.text')}</b>
      <button class="btn btn-ghost btn-sm" onclick={onclose} aria-label="Close"><Icon name="x" size={18} /></button>
    </div>
    <textarea
      bind:this={area}
      bind:value={text}
      dir="auto"
      rows="5"
      maxlength="100000"
      placeholder={t('send.textPlaceholder')}
      onkeydown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && send()}
    ></textarea>
    <button class="btn btn-primary" disabled={!text.trim()} onclick={send}><Icon name="upload" size={18} />{t('send.textSend')}</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(3, 5, 12, 0.55);
    animation: fade 0.2s;
  }
  .sheet {
    width: min(560px, 100%);
    margin: 0 8px max(8px, env(safe-area-inset-bottom));
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface-solid);
    animation: up 0.3s var(--ease);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  textarea {
    width: 100%;
    resize: vertical;
    min-height: 120px;
    border-radius: var(--r);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 12px 14px;
    font-size: 16px;
    line-height: 1.5;
  }
  @keyframes up {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
