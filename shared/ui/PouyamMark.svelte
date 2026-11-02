<script lang="ts">
  // The Pouyam mark: a "p" with a satellite — small, quiet, gold on hover where the parent wants it.
  let { size = 16, color = 'currentColor' }: { size?: number; color?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 32 32"
  fill="none"
  stroke={color}
  stroke-width={size > 20 ? 2.6 : 2.9}
  stroke-linecap="round"
  aria-hidden="true"
>
  <path d="M10 13v16" />
  <circle cx="18" cy="13" r="8" />
  <circle cx="26.2" cy="5.2" r="2.2" fill={color} stroke="none" />
</svg>

<style>
  svg {
    display: inline-block;
    flex: none;
    vertical-align: middle;
  }
</style>
