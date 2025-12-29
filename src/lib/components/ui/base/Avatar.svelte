<script lang="ts" module>
  // Re-export all Avatar components from shadcn
  export { default as Root } from '$components/ui/avatar/avatar.svelte';
  export { default as Image } from '$components/ui/avatar/avatar-image.svelte';
  export { default as Fallback } from '$components/ui/avatar/avatar-fallback.svelte';
</script>

<style>
  /* Theme-aware avatar styles */
  :global(.theme-avatar) {
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
  }

  :global(.theme-avatar-fallback) {
    background: var(--font-link-color);
    color: var(--page-color);
    font-family: 'saira', monospace;
    font-weight: 700;
  }
</style>
