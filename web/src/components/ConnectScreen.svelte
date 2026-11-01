<script lang="ts">
  import Icon from '../../../shared/ui/Icon.svelte';
  import { t } from '../lib/i18n';

  let { revoked = false }: { revoked?: boolean } = $props();
</script>

<section class="connect glass">
  <div class="art" aria-hidden="true">
    <div class="screen"><Icon name="qr" size={54} stroke={1.6} /></div>
    <div class="beam"></div>
    <div class="phone"><Icon name="phone" size={40} stroke={1.6} /></div>
  </div>
  <h1>{t('conn.noSession')}</h1>
  <p class="muted">{revoked ? t('conn.revoked') : t('conn.noSessionBody')}</p>
  <ol>
    <li><span>1</span>{t('phone.tip')}</li>
    <li><span>2</span>{t('phone.sub')}</li>
    <li><span>3</span>{t('phone.e2e')}</li>
  </ol>
  <a class="btn" href="https://pouyamsmartcity.github.io/turbodrop/" target="_blank" rel="noopener">
    <Icon name="download" size={18} /> Turbodrop
  </a>
</section>

<style>
  .connect {
    padding: 28px 22px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  h1 {
    margin: 12px 0 2px;
    font-size: 24px;
  }
  p {
    margin: 0 0 8px;
    line-height: 1.6;
  }
  .art {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 6px;
  }
  .screen,
  .phone {
    display: grid;
    place-items: center;
    border-radius: 18px;
    border: 1px solid var(--border-strong);
    background: var(--surface-2);
  }
  .screen {
    width: 96px;
    height: 76px;
  }
  .phone {
    width: 54px;
    height: 88px;
    color: var(--accent-1);
  }
  .beam {
    width: 54px;
    height: 3px;
    border-radius: 3px;
    background: var(--grad);
    animation: beam 1.6s var(--ease) infinite;
  }
  @keyframes beam {
    0%,
    100% {
      opacity: 0.25;
      transform: scaleX(0.4);
    }
    50% {
      opacity: 1;
      transform: scaleX(1);
    }
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 6px 0 16px;
    text-align: start;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;
    color: var(--text-2);
    line-height: 1.55;
  }
  li {
    display: flex;
    gap: 10px;
  }
  li span {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: var(--grad);
  }
</style>
