<script lang="ts">
  // The Turbodrop mark: a drop with a bolt cut through it.
  let { size = 32, glow = false }: { size?: number; glow?: boolean } = $props();
  const id = `td-${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg class:glow width={size} height={size} viewBox="0 0 64 64" aria-label="Turbodrop" role="img">
  <defs>
    <linearGradient id="{id}-g" x1="12" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22d3ee" />
      <stop offset="0.55" stop-color="#6366f1" />
      <stop offset="1" stop-color="#d946ef" />
    </linearGradient>
    <linearGradient id="{id}-s" x1="20" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".55" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="M32 4C42 16 52 28 52 39a20 20 0 0 1-40 0C12 28 22 16 32 4z" fill="url(#{id}-g)" />
  <path d="M32 9c-7 8.5-15 18.5-15 27 0 2 .3 3.8 1 5.5C22 28 28 19 32 9z" fill="url(#{id}-s)" />
  <path d="M35.5 20 24 37h8.5L29 51l12.5-18H33l2.5-13z" fill="#fff" />
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
  .glow {
    filter: drop-shadow(0 0 14px rgba(99, 102, 241, 0.55)) drop-shadow(0 0 4px rgba(34, 211, 238, 0.5));
  }
</style>
