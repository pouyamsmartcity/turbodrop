<script lang="ts">
  import Icon from '../../../../shared/ui/Icon.svelte';
  import { bytes, num, platformIcon, t } from '../lib/i18n';
  import { store, type TransferView } from '../lib/store.svelte';

  let { req }: { req: TransferView } = $props();
  let trust = $state(false);
  const shown = $derived(req.files.slice(0, 5));
</script>

<div class="backdrop">
  <div class="modal glass" role="dialog" aria-modal="true" aria-labelledby="req-title">
    <div class="avatar"><Icon name={platformIcon(req.peerPlatform)} size={30} /></div>
    <h2 id="req-title">{t('req.title', { name: req.peerName })}</h2>
    <p class="muted">
      {#if req.files.length}{t('req.files', { n: num(req.files.length), size: bytes(req.totalBytes) })}{:else}{t('req.message')}{/if}
    </p>
    {#if req.files.length}
      <ul>
        {#each shown as f (f.id)}
          <li><Icon name="file" size={15} /><span dir="auto">{f.path}</span><em>{bytes(f.size)}</em></li>
        {/each}
        {#if req.files.length > shown.length}<li class="more">+{num(req.files.length - shown.length)}</li>{/if}
      </ul>
    {/if}
    {#if req.text}
      <div class="text" dir="auto">{req.text}</div>
    {/if}
    {#if req.verification}
      <div class="code">
        <span class="tiny">{t('req.code')}</span>
        <div class="emoji">{req.verification}</div>
        <span class="tiny">{t('req.codeHint')}</span>
      </div>
    {/if}
    {#if req.kind === 'device'}
      <label class="trust"><input type="checkbox" bind:checked={trust} /> {t('req.trust')}</label>
    {/if}
    <div class="actions">
      <button class="btn" onclick={() => store.respond(req.id, false, false)}><Icon name="x" size={18} />{t('req.decline')}</button>
      <button class="btn btn-primary" onclick={() => store.respond(req.id, true, trust)}><Icon name="check" size={18} />{t('req.accept')}</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    background: rgba(3, 5, 12, 0.55);
    backdrop-filter: blur(6px);
    animation: fade 0.2s;
  }
  .modal {
    width: min(440px, 92vw);
    padding: 26px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    background: var(--surface-solid);
    animation: pop 0.35s var(--ease);
  }
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--grad);
    box-shadow: 0 10px 40px -10px var(--accent-2);
  }
  h2 {
    margin: 6px 0 0;
    font-size: 19px;
  }
  p {
    margin: 0;
  }
  ul {
    list-style: none;
    padding: 10px;
    margin: 4px 0;
    width: 100%;
    border-radius: var(--r);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: start;
    font-size: 13px;
  }
  li {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  li span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  li em {
    font-style: normal;
    color: var(--text-3);
  }
  .more {
    color: var(--text-3);
    justify-content: center;
  }
  .text {
    width: 100%;
    max-height: 140px;
    overflow: auto;
    padding: 10px 12px;
    border-radius: var(--r);
    background: var(--surface);
    text-align: start;
    white-space: pre-wrap;
    user-select: text;
  }
  .code {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    padding: 10px 16px;
    border-radius: var(--r);
    border: 1px dashed var(--border-strong);
  }
  .emoji {
    font-size: 30px;
    letter-spacing: 6px;
  }
  .trust {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: var(--text-2);
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
    width: 100%;
  }
  .actions .btn {
    flex: 1;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
