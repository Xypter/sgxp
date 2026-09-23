<script lang="ts">
  import * as Tooltip from '$components/ui/tooltip';

  interface Props {
    value?: string | null;
    fallback?: string;
  }

  let { value, fallback = '—' }: Props = $props();
</script>

{#if value}
  <!-- Truncated to one line in the cell; the full note shows on hover (or
       keyboard focus - the trigger is a real <button>, so it's tabbable). -->
  <Tooltip.Root>
    <Tooltip.Trigger class="notes-tooltip-trigger">{value}</Tooltip.Trigger>
    <Tooltip.Content
      side="top"
      sideOffset={6}
      class="theme-notes-tooltip"
      arrowClasses="theme-notes-tooltip-arrow"
    >
      {value}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <span class="entry-na">{fallback}</span>
{/if}

<style>
  :global(.notes-tooltip-trigger) {
    display: block;
    max-width: 260px;
    padding: 0;
    background: none;
    border: none;
    color: var(--font-color);
    opacity: 0.85;
    font: inherit;
    font-size: 13px;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: help;
  }

  :global(.notes-tooltip-trigger:hover),
  :global(.notes-tooltip-trigger:focus-visible) {
    opacity: 1;
    color: var(--font-link-color);
  }

  /* Matches DataTableFacetedFilter's .theme-faceted-filter-content so every
     floating panel on the archive tables looks the same. */
  :global(.theme-notes-tooltip) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', sans-serif !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
    max-width: 340px !important;
    padding: 8px 12px !important;
    text-wrap: pretty !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
    z-index: 1000 !important;
  }

  :global(.theme-notes-tooltip-arrow) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border-radius: 0 !important;
  }
</style>
