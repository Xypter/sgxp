<script lang="ts">
  import { Sheet, Button } from '$lib/components';
  import { Square, SquareCheck, Circle, CircleDot, Search, X, Check } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
    count?: number;
  }

  interface Props {
    open: boolean;
    side?: 'bottom' | 'right';
    sortOptions: Option[];
    sortValue: string;
    onSortChange: (value: string) => void;
    ratingOptions: Option[];
    ratingSelected: string[];
    onRatingChange: (values: string[]) => void;
    categoryOptions: Option[];
    categorySelected: string[];
    onCategoryChange: (values: string[]) => void;
    /** How many of the archive's comics the viewer has bookmarked; null when
     *  logged out (no Bookmarks section then). */
    bookmarkCount?: number | null;
    bookmarkedOnly?: boolean;
    onBookmarkedOnlyChange?: (value: boolean) => void;
    resultCount: number;
    onClearAll: () => void;
  }

  let {
    open = $bindable(false),
    side = 'bottom',
    sortOptions,
    sortValue,
    onSortChange,
    ratingOptions,
    ratingSelected,
    onRatingChange,
    categoryOptions,
    categorySelected,
    onCategoryChange,
    bookmarkCount = null,
    bookmarkedOnly = false,
    onBookmarkedOnlyChange,
    resultCount,
    onClearAll,
  }: Props = $props();

  let categorySearch = $state('');
  const visibleCategories = $derived(
    categorySearch.trim()
      ? categoryOptions.filter((o) => o.label.toLowerCase().includes(categorySearch.trim().toLowerCase()))
      : categoryOptions
  );

  function toggle(selected: string[], value: string): string[] {
    return selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
  }

  const hasFilters = $derived(ratingSelected.length > 0 || categorySelected.length > 0 || bookmarkedOnly);
</script>

<Sheet
  bind:open
  {side}
  title="Filter & Sort"
  width={side === 'right' ? '420px' : '100%'}
  class="archive-filter-sheet archive-filter-sheet--{side}"
>
  <section class="filter-section">
    <h3 class="filter-section-title">Sort by</h3>
    <div class="sort-grid" role="radiogroup" aria-label="Sort by">
      {#each sortOptions as option (option.value)}
        {@const active = option.value === sortValue}
        <!-- Standard toggles; "on" comes from data-state because role=radio
             already carries the checked state for screen readers. -->
        <Button
          variant="toggle"
          icon={active ? CircleDot : Circle}
          role="radio"
          aria-checked={active}
          data-state={active ? 'on' : undefined}
          class="sort-option"
          onclick={() => onSortChange(option.value)}
        >
          {option.label}
        </Button>
      {/each}
    </div>
  </section>

  {#if bookmarkCount !== null}
    <section class="filter-section">
      <h3 class="filter-section-title">Bookmarks</h3>
      <div class="check-list">
        <button
          type="button"
          role="checkbox"
          aria-checked={bookmarkedOnly}
          class="check-row"
          class:check-row--checked={bookmarkedOnly}
          onclick={() => onBookmarkedOnlyChange?.(!bookmarkedOnly)}
        >
          {#if bookmarkedOnly}<SquareCheck size={17} />{:else}<Square size={17} />{/if}
          <span class="check-row-label">Only my bookmarks</span>
          <span class="check-row-count">{bookmarkCount}</span>
        </button>
      </div>
    </section>
  {/if}

  <section class="filter-section">
    <div class="filter-section-head">
      <h3 class="filter-section-title">Rating</h3>
      {#if ratingSelected.length > 0}
        <Button variant="quiet" icon={X} onclick={() => onRatingChange([])}>Clear</Button>
      {/if}
    </div>
    <div class="check-list">
      {#each ratingOptions as option (option.value)}
        {@const checked = ratingSelected.includes(option.value)}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          class="check-row"
          class:check-row--checked={checked}
          onclick={() => onRatingChange(toggle(ratingSelected, option.value))}
        >
          {#if checked}<SquareCheck size={17} />{:else}<Square size={17} />{/if}
          <span class="check-row-label">{option.label}</span>
          {#if option.count !== undefined}<span class="check-row-count">{option.count}</span>{/if}
        </button>
      {/each}
    </div>
  </section>

  <section class="filter-section">
    <div class="filter-section-head">
      <h3 class="filter-section-title">Category</h3>
      {#if categorySelected.length > 0}
        <Button variant="quiet" icon={X} onclick={() => onCategoryChange([])}>Clear</Button>
      {/if}
    </div>
    <label class="category-search">
      <Search size={15} />
      <input type="search" bind:value={categorySearch} placeholder="Search categories..." />
    </label>
    <div class="check-list">
      {#each visibleCategories as option (option.value)}
        {@const checked = categorySelected.includes(option.value)}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          class="check-row"
          class:check-row--checked={checked}
          onclick={() => onCategoryChange(toggle(categorySelected, option.value))}
        >
          {#if checked}<SquareCheck size={17} />{:else}<Square size={17} />{/if}
          <span class="check-row-label">{option.label}</span>
          {#if option.count !== undefined}<span class="check-row-count">{option.count}</span>{/if}
        </button>
      {:else}
        <p class="check-list-empty">No categories match "{categorySearch}".</p>
      {/each}
    </div>
  </section>

  {#snippet footer()}
    <Button variant="secondary" icon={X} class="sheet-clear-btn" disabled={!hasFilters} onclick={onClearAll}>Clear all</Button>
    <Button variant="primary" icon={Check} class="sheet-apply-btn" onclick={() => (open = false)}>
      Show {resultCount.toLocaleString()} {resultCount === 1 ? 'comic' : 'comics'}
    </Button>
  {/snippet}
</Sheet>

<style>
  /* Bottom sheet: full width, capped height with its own scroll area (the
     themed wrapper's .sheet-body already scrolls), so the Show/Clear footer
     stays pinned in thumb reach. */
  :global(.archive-filter-sheet--bottom) {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 85dvh;
    border-left: none !important;
  }

  :global(.archive-filter-sheet .sheet-inner) {
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom)) !important;
    min-height: 0;
    max-height: inherit;
  }

  :global(.archive-filter-sheet--bottom .sheet-inner) {
    max-height: 85dvh;
  }

  :global(.archive-filter-sheet .sheet-body) {
    min-height: 0;
  }

  :global(.archive-filter-sheet .themed-sheet-header) {
    margin-bottom: 12px !important;
  }

  :global(.archive-filter-sheet .themed-sheet-footer) {
    margin-top: 12px !important;
  }

  /* `auto` basis, not 0: the bottom sheet stacks the footer in a column,
     where a zero basis squashed the button's height instead of widening it. */
  :global(.archive-filter-sheet .sheet-clear-btn) {
    flex: 0 0 auto;
  }

  :global(.archive-filter-sheet .sheet-apply-btn) {
    flex: 1 1 auto;
  }

  .filter-section {
    padding: 14px 0;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .filter-section:first-child {
    border-top: none;
    padding-top: 0;
  }

  .filter-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .filter-section-title {
    margin: 0 0 10px;
    font-family: 'saira', sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--font-color);
    opacity: 0.75;
  }

  .sort-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  /* Standard toggles, filling their grid cell with the label at the left. */
  .sort-grid :global(.sort-option) {
    width: 100%;
    justify-content: flex-start;
    padding: 0 12px;
  }

  .check-list {
    display: flex;
    flex-direction: column;
  }

  .check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 4px;
    background: none;
    border: none;
    border-bottom: 1px solid color-mix(in srgb, var(--page-color) 88%, white);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }

  .check-row:last-child {
    border-bottom: none;
  }

  .check-row :global(svg) {
    flex-shrink: 0;
    opacity: 0.6;
  }

  .check-row--checked :global(svg) {
    color: var(--font-link-color);
    opacity: 1;
  }

  .check-row--checked .check-row-label {
    font-weight: 700;
  }

  .check-row-label {
    flex: 1;
    min-width: 0;
  }

  .check-row-count {
    font-size: 13px;
    opacity: 0.55;
    font-variant-numeric: tabular-nums;
  }

  .category-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 12px;
    margin-bottom: 6px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 75%, white);
    color: var(--font-color);
  }

  .category-search :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .category-search input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    outline: none;
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 16px; /* 16px+ keeps iOS Safari from zooming on focus */
  }

  .check-list-empty {
    margin: 8px 4px;
    font-family: 'saira', sans-serif;
    font-size: 14px;
    opacity: 0.6;
  }
</style>
