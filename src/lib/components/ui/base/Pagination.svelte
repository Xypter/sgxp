<script lang="ts" module>
  // Re-export all Pagination components from shadcn with theme support
  export { default as Root } from '$components/ui/pagination/pagination.svelte';
  export { default as Content } from '$components/ui/pagination/pagination-content.svelte';
  export { default as Item } from '$components/ui/pagination/pagination-item.svelte';
  export { default as Link } from '$components/ui/pagination/pagination-link.svelte';
  export { default as PrevButton } from '$components/ui/pagination/pagination-prev-button.svelte';
  export { default as NextButton } from '$components/ui/pagination/pagination-next-button.svelte';
  export { default as Ellipsis } from '$components/ui/pagination/pagination-ellipsis.svelte';
</script>

<style>
  /* Theme-aware pagination styles */
  :global([data-slot="pagination-link"]) {
    color: var(--font-color) !important;
    background: var(--page-color) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    font-family: 'saira', monospace !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    cursor: url('/img/Sonic_Cursor.png'), pointer !important;
  }

  :global([data-slot="pagination-link"]:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--page-color) 90%, white) !important;
    border-color: var(--font-link-color) !important;
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
  }

  :global([data-slot="pagination-link"][data-active="true"]) {
    background: var(--font-link-color) !important;
    color: var(--page-color) !important;
    border-color: var(--font-link-color) !important;
  }

  :global([data-slot="pagination-link"]:disabled) {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }

  /* Previous/Next button styles */
  :global(button[aria-label*="previous"]),
  :global(button[aria-label*="next"]) {
    color: var(--font-color) !important;
    background: var(--page-color) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    font-family: 'saira', monospace !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    cursor: url('/img/Sonic_Cursor.png'), pointer !important;
  }

  :global(button[aria-label*="previous"]:hover:not(:disabled)),
  :global(button[aria-label*="next"]:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--page-color) 90%, white) !important;
    border-color: var(--font-link-color) !important;
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
  }

  :global(button[aria-label*="previous"]:disabled),
  :global(button[aria-label*="next"]:disabled) {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }

  /* Ellipsis styling */
  :global([data-slot="pagination-ellipsis"]) {
    color: var(--font-color) !important;
  }
</style>
