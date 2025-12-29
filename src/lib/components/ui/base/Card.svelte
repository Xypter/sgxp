<script lang="ts" module>
  // Re-export all Card components from shadcn with theme support
  export { default as Root } from '$components/ui/card/card.svelte';
  export { default as Content } from '$components/ui/card/card-content.svelte';
  export { default as Description } from '$components/ui/card/card-description.svelte';
  export { default as Footer } from '$components/ui/card/card-footer.svelte';
  export { default as Header } from '$components/ui/card/card-header.svelte';
  export { default as Title } from '$components/ui/card/card-title.svelte';
  export { default as Action } from '$components/ui/card/card-action.svelte';
</script>

<style>
  /* Theme-aware card styles */
  :global(.theme-card) {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
    box-shadow: var(--box-shadow);
  }

  :global(.theme-card-title) {
    color: var(--font-color);
    font-family: 'saira', monospace;
    font-weight: 800;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  :global(.theme-card-description) {
    color: var(--font-color);
    font-family: 'saira', monospace;
    opacity: 0.8;
  }
</style>
