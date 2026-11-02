<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { LANGUAGES, type Lang } from '../../../../shared/i18n';
  import Icon from '../../../../shared/ui/Icon.svelte';
  import PouyamMark from '../../../../shared/ui/PouyamMark.svelte';
  import { t } from '../lib/i18n';
  import { ACCENTS, store, type AppSettings, type Settings } from '../lib/store.svelte';

  let name = $state(store.settings.deviceName);

  function setCore<K extends keyof Settings>(k: K, v: Settings[K]) {
    store.settings[k] = v;
    void store.save();
  }
  function setApp<K extends keyof AppSettings>(k: K, v: AppSettings[K]) {
    store.app[k] = v;
    void store.save();
  }
  async function pickFolder() {
    const r = await open({ directory: true, defaultPath: store.settings.downloadDir });
    if (typeof r === 'string') setCore('downloadDir', r);
  }
</script>

{#snippet toggle(label: string, value: boolean, onchange: (v: boolean) => void)}
  <label class="row">
    <span>{label}</span>
    <input type="checkbox" class="switch" checked={value} onchange={(e) => onchange((e.currentTarget as HTMLInputElement).checked)} />
  </label>
{/snippet}

<h1>{t('set.title')}</h1>

<div class="cols">
  <div class="col">
    <section class="card glass">
      <h3>{t('set.general')}</h3>
      <label class="field">
        <span>{t('set.name')}</span>
        <input bind:value={name} maxlength="40" onblur={() => name.trim() && name !== store.settings.deviceName && setCore('deviceName', name.trim())} onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
      </label>
      <label class="field">
        <span>{t('set.language')}</span>
        <select value={store.app.lang ?? ''} onchange={(e) => setApp('lang', ((e.currentTarget as HTMLSelectElement).value || null) as Lang | null)}>
          <option value="">Auto</option>
          {#each LANGUAGES as l (l.code)}<option value={l.code}>{l.name}</option>{/each}
        </select>
      </label>
      {#if store.platform === 'windows'}
        {@render toggle(t('set.autostart'), store.app.autostart, (v) => setApp('autostart', v))}
        {@render toggle(t('set.contextMenu'), store.app.contextMenu, (v) => setApp('contextMenu', v))}
      {/if}
      {@render toggle(t('set.tray'), store.app.tray, (v) => setApp('tray', v))}
      {@render toggle(t('set.notifications'), store.app.notifications, (v) => setApp('notifications', v))}
      {@render toggle(t('set.keepAwake'), store.app.keepAwake, (v) => setApp('keepAwake', v))}
    </section>

    <section class="card glass">
      <h3>{t('set.receiving')}</h3>
      <div class="field">
        <span>{t('set.folder')}</span>
        <div class="folder">
          <code dir="ltr">{store.settings.downloadDir}</code>
          <button class="btn btn-sm" onclick={pickFolder}>{t('set.change')}</button>
          <button class="btn btn-sm btn-ghost" onclick={() => store.openPath(store.settings.downloadDir)}><Icon name="external" size={15} /></button>
        </div>
      </div>
      {@render toggle(t('set.approval'), store.settings.requireApproval, (v) => setCore('requireApproval', v))}
      {@render toggle(t('set.askPhones'), store.settings.askBrowsers, (v) => setCore('askBrowsers', v))}
    </section>
  </div>

  <div class="col">
    <section class="card glass">
      <h3>{t('set.appearance')}</h3>
      <div class="field">
        <span>{t('set.theme')}</span>
        <div class="seg">
          {#each [['system', 'set.themeSystem'], ['dark', 'set.themeDark'], ['light', 'set.themeLight']] as const as [v, k] (v)}
            <button class:on={store.app.theme === v} onclick={() => setApp('theme', v)}>{t(k)}</button>
          {/each}
        </div>
      </div>
      <div class="field">
        <span>{t('set.accent')}</span>
        <div class="swatches">
          {#each Object.entries(ACCENTS) as [k, [a, b, c]] (k)}
            <button class="sw" class:on={store.app.accent === k} style="background:linear-gradient(135deg,{a},{b},{c})" aria-label={k} onclick={() => setApp('accent', k)}></button>
          {/each}
        </div>
      </div>
    </section>

    <section class="card glass">
      <h3>{t('set.security')}</h3>
      <div class="field">
        <span>{t('set.fingerprint')}</span>
        <code class="fp" dir="ltr">{store.info?.fingerprint}</code>
      </div>
      <div class="field">
        <span>{t('set.trustedList')}</span>
        {#each store.trusted as d (d.id)}
          <div class="trusted"><Icon name="shield" size={15} /><span dir="auto">{d.name}</span><button class="btn btn-sm btn-ghost" onclick={() => store.setTrusted(d.id, false)}>{t('devices.untrust')}</button></div>
        {:else}
          <span class="tiny">{t('set.none')}</span>
        {/each}
      </div>
      <p class="tiny">{t('set.privacy')}</p>
    </section>

    <section class="card glass about">
      <h3>{t('set.about')}</h3>
      <div class="ab"><b class="grad-text">Turbodrop</b><span class="tiny">{t('set.version', { v: store.info?.version ?? '' })}</span></div>
      <div class="links">
        <button class="btn btn-sm" onclick={() => store.openUrl('https://github.com/pouyamsmartcity/turbodrop')}><Icon name="github" size={15} />{t('set.github')}</button>
      </div>
      <div class="maker">
        <PouyamMark size={30} color="#c9b27c" />
        <p>{t('brand.about')}</p>
        <button class="btn btn-sm" onclick={() => store.openUrl('https://www.pouyam.com/?utm_source=turbodrop&utm_medium=app-about')}>{t('brand.visit')}</button>
      </div>
    </section>
  </div>
</div>

<style>
  h1 {
    margin: 8px 0 18px;
    font-size: 30px;
    letter-spacing: -0.03em;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: start;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .card {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h3 {
    margin: 0;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
  }
  .field > span {
    color: var(--text-2);
  }
  input:not([type='checkbox']),
  select {
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 0 12px;
    user-select: text;
  }
  select option {
    background: var(--surface-solid);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    font-size: 14px;
    cursor: pointer;
  }
  .switch {
    appearance: none;
    flex: none;
    width: 42px;
    height: 24px;
    border-radius: 99px;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    position: relative;
    transition: background 0.2s;
    cursor: pointer;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    inset-inline-start: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.25s var(--ease);
  }
  .switch:checked {
    background: var(--grad);
    border-color: transparent;
  }
  .switch:checked::after {
    transform: translateX(18px);
  }
  :global([dir='rtl']) .switch:checked::after {
    transform: translateX(-18px);
  }
  .folder {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  code {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--surface);
    font-size: 12.5px;
    user-select: text;
  }
  .fp {
    letter-spacing: 0.08em;
  }
  .seg {
    display: flex;
    padding: 3px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .seg button {
    flex: 1;
    border: 0;
    height: 32px;
    border-radius: 9px;
    background: transparent;
    color: var(--text-2);
    font-weight: 600;
    font-size: 13px;
  }
  .seg button.on {
    background: var(--surface-2);
    color: var(--text);
  }
  .swatches {
    display: flex;
    gap: 10px;
  }
  .sw {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: transform 0.2s var(--ease);
  }
  .sw.on {
    border-color: var(--text);
    transform: scale(1.1);
  }
  .trusted {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .trusted span {
    flex: 1;
  }
  .ab {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .ab b {
    font-size: 22px;
  }
  .links {
    display: flex;
    gap: 8px;
  }
  .maker {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 4px;
    padding: 14px;
    border-radius: var(--r);
    border: 1px solid color-mix(in oklab, #c9b27c 28%, var(--border));
    background: color-mix(in oklab, #c9b27c 6%, transparent);
  }
  .maker p {
    flex: 1;
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-2);
  }
  @media (max-width: 1000px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
