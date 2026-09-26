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
  /* Page links and arrows use the button standard (secondary; see
     src/styles/buttons.css and pagination-link.svelte). */
  :global([data-slot="pagination-ellipsis"]) {
    color: var(--font-color);
  }
</style>
