<script lang="ts">
  import SortableHeaderButton from './SortableHeaderButton.svelte';
  import DataTableFacetedFilter from './DataTableFacetedFilter.svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label: string;
    // Omit both when the column isn't sortable (e.g. Preparer/Reviewer,
    // which are relation fields with no server-side sort) - a plain label
    // is shown instead of the sort button.
    sorted?: false | 'asc' | 'desc';
    onSortClick?: (event: MouseEvent) => void;
    options: Option[];
    selected: string[];
    onFilterChange: (values: string[]) => void;
  }

  let { label, sorted, onSortClick, options, selected, onFilterChange }: Props = $props();
</script>

<div class="filterable-header">
  {#if onSortClick}
    <SortableHeaderButton {label} sorted={sorted ?? false} onclick={onSortClick} />
  {:else}
    <span class="filterable-header-label">{label}</span>
  {/if}
  <DataTableFacetedFilter title={label} {options} {selected} onChange={onFilterChange} />
</div>

<style>
  .filterable-header {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .filterable-header-label {
    font-family: 'saira', sans-serif;
    font-weight: 600;
  }
</style>
