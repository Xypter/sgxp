<script lang="ts" module>
  // Re-export all Alert components from shadcn with theme support
  export { default as Root } from '$components/ui/alert/alert.svelte';
  export { default as Description } from '$components/ui/alert/alert-description.svelte';
  export { default as Title } from '$components/ui/alert/alert-title.svelte';
  export { alertVariants, type AlertVariant } from '$components/ui/alert/alert.svelte';
</script>

<style>
  /* Theme-aware alert styles */
  :global(.theme-alert) {
    background: var(--page-color) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    box-shadow: var(--box-shadow) !important;
    color: var(--font-color) !important;
  }

  :global(.theme-alert-info) {
    border-left: 4px solid var(--font-link-color) !important;
  }

  :global(.theme-alert-warning) {
    border-left: 4px solid #f59e0b !important;
  }

  :global(.theme-alert-destructive) {
    border-left: 4px solid #ef4444 !important;
  }

  :global(.theme-alert-success) {
    border-left: 4px solid #10b981 !important;
  }

  :global(.theme-alert-title) {
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-weight: 700 !important;
    font-size: 0.875rem !important;
    line-height: 1.25rem !important;
  }

  :global(.theme-alert-description) {
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    opacity: 0.9 !important;
    font-size: 0.875rem !important;
    line-height: 1.5rem !important;
  }
</style>
