<script lang="ts">
  import {
    type ColumnDef,
    type PaginationState,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from '@tanstack/table-core';
  import { onMount } from 'svelte';
  import { scale } from 'svelte/transition';
  import { createSvelteTable, renderComponent } from '$components/ui/data-table';
  import * as Tooltip from '$components/ui/tooltip';
  import { DataTable, Input, Button } from '$lib/components';
  import { ChevronLeft, ChevronRight, LayoutGrid, SlidersHorizontal, Table, X } from 'lucide-svelte';

  import ArchiveComicCard from './archive/ArchiveComicCard.svelte';
  import ArchiveFilterSheet from './archive/ArchiveFilterSheet.svelte';

  import PlainTextCell from './archive/cells/PlainTextCell.svelte';
  import LinkCell from './archive/cells/LinkCell.svelte';
  import NotesTooltipCell from './archive/cells/NotesTooltipCell.svelte';
  import SortableHeaderButton from './archive/cells/SortableHeaderButton.svelte';
  import FilterableSortHeader from './archive/cells/FilterableSortHeader.svelte';

  // Public, read-only view of every archive entry that made it all the way
  // through triage (status = uploaded) - the same `archive-entries` rows the
  // triage table edits, so anything newly uploaded there shows up here
  // automatically. Small enough (~900 rows) to fetch in one request and
  // sort/filter client-side, unlike the triage table's 34k-row server-side
  // pagination.
  interface ArchiveComic {
    id: string | number;
    comicId: number;
    title?: string;
    author?: string;
    category?: string | null;
    pagesMetadata?: number | null;
    pagesFolder?: number | null;
    percentSaved?: number | null;
    quality?: string | null;
    rating?: number | null;
    notes?: string | null;
    link?: string;
  }

  const SELECT_FIELDS = [
    'comicId', 'title', 'author', 'category', 'pagesMetadata',
    'pagesFolder', 'percentSaved', 'quality', 'rating', 'notes', 'link',
  ];

  let comics = $state<ArchiveComic[]>([]);
  // Always fetches on mount, so start true - avoids a flash of the empty
  // state before the first fetch even starts.
  let isLoading = $state(true);
  let error = $state('');

  async function fetchComics() {
    isLoading = true;
    error = '';
    try {
      const params = new URLSearchParams({
        'where[status][equals]': 'uploaded',
        limit: '5000',
        depth: '0',
        sort: 'comicId',
      });
      for (const field of SELECT_FIELDS) params.set(`select[${field}]`, 'true');

      const response = await fetch(`/api/archive-entries?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || data.message || 'Failed to load the archive.');
      }
      comics = data.docs || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load the archive.';
    } finally {
      isLoading = false;
    }
  }

  onMount(fetchComics);

  // Filters
  let searchInput = $state('');
  let categoryFilterValues = $state<string[]>([]);
  let ratingFilterValues = $state<string[]>([]);

  function resetPage() {
    pagination = { ...pagination, pageIndex: 0 };
  }
  function setCategoryFilter(values: string[]) {
    categoryFilterValues = values;
    resetPage();
  }
  function setRatingFilter(values: string[]) {
    ratingFilterValues = values;
    resetPage();
  }

  const hasActiveFilters = $derived(
    !!searchInput.trim() || categoryFilterValues.length > 0 || ratingFilterValues.length > 0
  );

  function clearFilters() {
    searchInput = '';
    categoryFilterValues = [];
    ratingFilterValues = [];
    resetPage();
  }

  const CATEGORY_OPTIONS = $derived(
    [...new Set(comics.map((c) => c.category).filter((c): c is string => !!c))]
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }))
  );

  // Quality is a 1:1 label for each rating (8 is always "Solid title"), so
  // one Rating filter labeled with both covers what used to be two
  // separate DataTables search panes.
  const RATING_OPTIONS = $derived.by(() => {
    const qualityByRating = new Map<number, string>();
    for (const c of comics) {
      if (c.rating !== null && c.rating !== undefined && !qualityByRating.has(c.rating)) {
        qualityByRating.set(c.rating, c.quality || '');
      }
    }
    return [...qualityByRating.entries()]
      .sort(([a], [b]) => b - a)
      .map(([rating, quality]) => ({
        value: String(rating),
        label: quality ? `${rating} · ${quality}` : String(rating),
      }));
  });

  const filteredComics = $derived.by(() => {
    const search = searchInput.trim().toLowerCase();
    return comics.filter((c) => {
      if (
        search &&
        !(c.title || '').toLowerCase().includes(search) &&
        !(c.author || '').toLowerCase().includes(search) &&
        !(c.notes || '').toLowerCase().includes(search)
      ) {
        return false;
      }
      if (categoryFilterValues.length > 0 && !categoryFilterValues.includes(c.category || '')) return false;
      if (ratingFilterValues.length > 0 && !ratingFilterValues.includes(String(c.rating ?? ''))) return false;
      return true;
    });
  });

  const totalPages = $derived(comics.reduce((sum, c) => sum + (c.pagesFolder || 0), 0));

  // Table state
  // 24 divides evenly into the 1/2/3-column card grids, so full pages never
  // end on a ragged last row.
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 24 });
  let sorting = $state<SortingState>([{ id: 'comicId', desc: false }]);

  // Cards are the default everywhere; at 1400px+ (where the table fits) the
  // viewer can switch to the table instead. Remembered per browser - purely a
  // convenience, so storage failures (private mode etc.) just fall back.
  type ViewMode = 'cards' | 'table';
  const VIEW_STORAGE_KEY = 'sgxp-smackjeeves-view';
  let viewMode = $state<ViewMode>('cards');
  onMount(() => {
    try {
      if (localStorage.getItem(VIEW_STORAGE_KEY) === 'table') viewMode = 'table';
    } catch {}
  });
  function setViewMode(mode: ViewMode) {
    viewMode = mode;
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {}
  }

  function sortableHeader(label: string) {
    return ({ column }: any) =>
      renderComponent(SortableHeaderButton as any, {
        label,
        sorted: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      });
  }

  function filterableHeader(
    label: string,
    getOptions: () => { value: string; label: string }[],
    getSelected: () => string[],
    onFilterChange: (values: string[]) => void
  ) {
    return ({ column }: any) =>
      renderComponent(FilterableSortHeader as any, {
        label,
        sorted: column.getIsSorted(),
        onSortClick: column.getToggleSortingHandler(),
        options: getOptions(),
        selected: getSelected(),
        onFilterChange,
      });
  }

  function formatPercent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
  }

  const columns: ColumnDef<ArchiveComic>[] = [
    {
      accessorKey: 'comicId',
      header: sortableHeader('Comic #'),
    },
    {
      accessorKey: 'title',
      header: sortableHeader('Title'),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.title,
          fallback: '(untitled)',
          class: 'entry-title',
        }),
    },
    {
      accessorKey: 'author',
      header: sortableHeader('Author'),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.author,
          fallback: '—',
          class: 'entry-author',
        }),
    },
    {
      accessorKey: 'category',
      header: filterableHeader('Category', () => CATEGORY_OPTIONS, () => categoryFilterValues, setCategoryFilter),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.category ?? undefined,
          fallback: '—',
          class: 'entry-category',
        }),
    },
    {
      accessorKey: 'pagesFolder',
      header: sortableHeader('Pages'),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value:
            row.original.pagesFolder !== null && row.original.pagesFolder !== undefined
              ? `${row.original.pagesFolder} / ${row.original.pagesMetadata ?? '?'}`
              : undefined,
          fallback: '—',
          class: 'entry-numeric',
        }),
    },
    {
      accessorKey: 'percentSaved',
      header: sortableHeader('% Saved'),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: formatPercent(row.original.percentSaved),
          class: 'entry-numeric',
        }),
    },
    {
      accessorKey: 'rating',
      header: filterableHeader('Rating', () => RATING_OPTIONS, () => ratingFilterValues, setRatingFilter),
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.rating !== null && row.original.rating !== undefined ? `${row.original.rating}/10` : undefined,
          fallback: '—',
          class: 'entry-rating',
        }),
    },
    {
      accessorKey: 'quality',
      header: 'Quality',
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.quality ?? undefined,
          fallback: '—',
          class: 'entry-quality',
        }),
      enableSorting: false,
    },
    {
      accessorKey: 'notes',
      header: "Xypter's Notes",
      cell: ({ row }) => renderComponent(NotesTooltipCell as any, { value: row.original.notes }),
      enableSorting: false,
    },
    {
      id: 'link',
      header: '',
      cell: ({ row }) =>
        renderComponent(LinkCell as any, {
          href: row.original.link || `/jeevespage?comic_id=${row.original.comicId}`,
          label: 'View',
          origin: '',
        }),
      enableSorting: false,
    },
  ];

  // Derived (not a plain const) so a fresh table instance is built whenever
  // its inputs change - see CLAUDE.md's note on createSvelteTable's fragile
  // reactivity for components that start empty and fetch on mount.
  let table = $derived.by(() =>
    createSvelteTable({
      data: filteredComics,
      columns,
      state: { pagination, sorting },
      getRowId: (row) => String(row.id),
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onPaginationChange: (updater) => {
        pagination = typeof updater === 'function' ? updater(pagination) : updater;
      },
      onSortingChange: (updater) => {
        sorting = typeof updater === 'function' ? updater(sorting) : updater;
        resetPage();
      },
    })
  );

  const pageCount = $derived(Math.ceil(filteredComics.length / pagination.pageSize));

  // Card view (< 1400px) has no column headers to click, so sorting and the
  // header filters move into a sheet instead - same underlying state as the
  // table, so switching widths never loses what's selected.
  const CARD_SORT_OPTIONS = [
    { value: 'comicId:asc', label: 'Oldest first' },
    { value: 'comicId:desc', label: 'Newest first' },
    { value: 'title:asc', label: 'Title A–Z' },
    { value: 'title:desc', label: 'Title Z–A' },
    { value: 'rating:desc', label: 'Highest rated' },
    { value: 'rating:asc', label: 'Lowest rated' },
    { value: 'pagesFolder:desc', label: 'Most pages' },
    { value: 'percentSaved:desc', label: 'Best preserved' },
  ];
  const sortValue = $derived(sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : 'comicId:asc');
  const sortLabel = $derived(
    CARD_SORT_OPTIONS.find((o) => o.value === sortValue)?.label ?? 'Custom'
  );

  function setSort(value: string) {
    const [id, dir] = value.split(':');
    sorting = [{ id, desc: dir === 'desc' }];
    resetPage();
  }

  // Counts over the whole archive, shown next to each sheet option.
  function countBy(key: (c: ArchiveComic) => string) {
    const counts = new Map<string, number>();
    for (const c of comics) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);
    return counts;
  }
  const categoryCounts = $derived(countBy((c) => c.category || ''));
  const ratingCounts = $derived(countBy((c) => String(c.rating ?? '')));
  const SHEET_CATEGORY_OPTIONS = $derived(
    CATEGORY_OPTIONS.map((o) => ({ ...o, count: categoryCounts.get(o.value) ?? 0 }))
  );
  const SHEET_RATING_OPTIONS = $derived(
    RATING_OPTIONS.map((o) => ({ ...o, count: ratingCounts.get(o.value) ?? 0 }))
  );

  const activeFilterCount = $derived(categoryFilterValues.length + ratingFilterValues.length);
  const ratingLabel = (value: string) => RATING_OPTIONS.find((o) => o.value === value)?.label ?? value;

  let filterSheetOpen = $state(false);
  function watchMedia(query: string, set: (matches: boolean) => void) {
    const list = window.matchMedia(query);
    set(list.matches);
    const onChange = (e: MediaQueryListEvent) => set(e.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }

  // Bottom sheet on phones (thumb reach), side panel on tablet widths.
  let isPhone = $state(false);
  // Matches the Navbar's own breakpoint for its floating hamburger (see the
  // 1200px notes in Navbar.svelte) - the floating filter button stacks under it.
  let hamburgerShown = $state(false);
  onMount(() => {
    const stopPhone = watchMedia('(max-width: 768px)', (m) => (isPhone = m));
    const stopHamburger = watchMedia('(max-width: 1199px)', (m) => (hamburgerShown = m));
    return () => {
      stopPhone();
      stopHamburger();
    };
  });

  // Floating Filter & Sort button (tucked under the navbar's floating
  // hamburger, so only while that's showing) - shown once the toolbar's own
  // trigger has scrolled up out of view, so filters are reachable from
  // anywhere in the list.
  let inlineFilterTrigger = $state<HTMLElement | null>(null);
  let inlineTriggerScrolledPast = $state(false);
  $effect(() => {
    if (!inlineFilterTrigger) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only "past" when it left through the top - not when it's merely
      // below the fold on first load.
      inlineTriggerScrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    });
    observer.observe(inlineFilterTrigger);
    return () => observer.disconnect();
  });
  const showFloatingFilter = $derived(hamburgerShown && inlineTriggerScrolledPast && !isLoading && !error);

  // Renders the floating button at the end of <body> - a `position: fixed`
  // element is positioned relative to any transformed ancestor instead of the
  // viewport, and page-transition wrappers are exactly that kind of ancestor.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  let cardsTop = $state<HTMLElement | null>(null);
  function goToPage(direction: 'previous' | 'next') {
    if (direction === 'previous') table.previousPage();
    else table.nextPage();
    // Back to the top of the card list, not the page - the intro and toolbar
    // above it would otherwise push the first new card off-screen.
    const top = (cardsTop?.getBoundingClientRect().top ?? 0) + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
</script>

<Tooltip.Provider delayDuration={200}>
  <div class="archive-table" class:view--table={viewMode === 'table'}>
    <h1 class="mobile-page-title">Smack Jeeves Archive</h1>

    <div class="toolbar-panel">
      <div class="toolbar-header">
        <div class="toolbar-header-text">
          <h1>Smack Jeeves Archive</h1>
          <div class="intro">
            <p>
              Welcome to this archive, a sanctuary for comics and their original user comments, preserved
              from a now-vanished website. The thoughts and views expressed in these works belong solely to
              their creators. They do not, in any way, reflect the opinions or beliefs of this website or its
              keeper.
            </p>
            <p>
              This collection exists to honor history, to educate, and perhaps even to entertain. It is not an
              endorsement but a preservation of voices from another time. So, as you journey through these
              pages, remember: discretion is your guide. Take what you will, leave what you must, and
              understand it for what it is—a glimpse into the past.
            </p>
            <p class="intro-cta">
              Want to help preserve more? Join the <a href="/smackjeevesarchivetriage">archive triage project</a>.
            </p>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <Input
          bind:value={searchInput}
          oninput={resetPage}
          placeholder="Search by title, author, or notes..."
          themed
          class="toolbar-search"
        />
        <button
          type="button"
          class="filter-trigger card-view-only"
          aria-haspopup="dialog"
          bind:this={inlineFilterTrigger}
          onclick={() => (filterSheetOpen = true)}
        >
          <SlidersHorizontal size={16} />
          Filter & Sort
          {#if activeFilterCount > 0}
            <span class="filter-trigger-badge">{activeFilterCount}</span>
          {/if}
        </button>
        <Button themed variant="ghost" size="sm" class="clear-filters-btn" disabled={!hasActiveFilters} onclick={clearFilters}>
          <X size={14} /> Clear Filters
        </Button>
        <!-- Only at 1400px+, where the table fits; narrower is always cards. -->
        <div class="view-toggle" role="group" aria-label="View as">
          <button
            type="button"
            class="view-toggle-btn"
            aria-pressed={viewMode === 'cards'}
            onclick={() => setViewMode('cards')}
          >
            <LayoutGrid size={16} /> Cards
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            aria-pressed={viewMode === 'table'}
            onclick={() => setViewMode('table')}
          >
            <Table size={16} /> Table
          </button>
        </div>
      </div>

      <!-- What's currently applied, removable one at a time - the card view
           has no column headers to show active filters on. -->
      {#if activeFilterCount > 0 || sortValue !== 'comicId:asc'}
        <div class="active-chips card-view-only">
          {#if sortValue !== 'comicId:asc'}
            <button type="button" class="active-chip active-chip--sort" onclick={() => setSort('comicId:asc')}>
              Sort: {sortLabel} <X size={13} />
            </button>
          {/if}
          {#each ratingFilterValues as value (value)}
            <button
              type="button"
              class="active-chip"
              onclick={() => setRatingFilter(ratingFilterValues.filter((v) => v !== value))}
            >
              Rating {ratingLabel(value)} <X size={13} />
            </button>
          {/each}
          {#each categoryFilterValues as value (value)}
            <button
              type="button"
              class="active-chip"
              onclick={() => setCategoryFilter(categoryFilterValues.filter((v) => v !== value))}
            >
              {value} <X size={13} />
            </button>
          {/each}
        </div>
      {/if}

      <div class="results-count">
        <span class="stat-chip stat-chip--primary">{filteredComics.length.toLocaleString()} Results</span>
        {#if comics.length > 0}
          <span class="stat-divider">—</span>
          <span class="stat-chip">{comics.length.toLocaleString()} Archived Comics</span>
          <span class="stat-divider">—</span>
          <span class="stat-chip">{totalPages.toLocaleString()} Pages Preserved</span>
        {/if}
      </div>
    </div>

    {#if error}
      <div class="error-state">
        <p>{error}</p>
        <Button themed size="sm" onclick={fetchComics}>Try Again</Button>
      </div>
    {:else if isLoading}
      <div class="loading-state">
        <p>Loading archive...</p>
      </div>
    {:else}
      <!-- Desktop Table -->
      <div class="table-view">
        <DataTable {table} themed showPagination class="archive-data-table" emptyMessage="No comics match your filters." />
      </div>

      <!-- Mobile Cards -->
      <div class="card-view" bind:this={cardsTop}>
        <div class="cards-grid">
          {#each table.getRowModel().rows as row (row.id)}
            {@const comic = row.original}
            <ArchiveComicCard
              comicId={comic.comicId}
              title={comic.title}
              author={comic.author}
              category={comic.category}
              pagesMetadata={comic.pagesMetadata}
              pagesFolder={comic.pagesFolder}
              percentSaved={comic.percentSaved}
              rating={comic.rating}
              notes={comic.notes}
              href={comic.link || `/jeevespage?comic_id=${comic.comicId}`}
            />
          {:else}
            <div class="loading-state cards-empty">
              <p>No comics match your filters.</p>
              {#if hasActiveFilters}
                <Button themed size="sm" onclick={clearFilters}>Clear Filters</Button>
              {/if}
            </div>
          {/each}
        </div>

        {#if pageCount > 1}
          <!-- Same markup/components as DataTable.svelte's own pagination, so
               the card and table views page identically. -->
          <div class="card-pagination">
            <div class="card-pagination-info">Page {pagination.pageIndex + 1} of {pageCount}</div>
            <div class="card-pagination-buttons">
              <Button
                themed
                variant="outline"
                size="sm"
                onclick={() => goToPage('previous')}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft class="h-4 w-4" />
                Previous
              </Button>
              <Button
                themed
                variant="outline"
                size="sm"
                onclick={() => goToPage('next')}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Tooltip.Provider>

{#if showFloatingFilter}
  <button
    type="button"
    class="floating-filter-trigger no-theme-styles"
    aria-haspopup="dialog"
    aria-label={activeFilterCount > 0 ? `Filter & sort (${activeFilterCount} active)` : 'Filter & sort'}
    use:portal
    transition:scale={{ duration: 150, start: 0.85 }}
    onclick={() => (filterSheetOpen = true)}
  >
    <SlidersHorizontal size={20} />
    {#if activeFilterCount > 0}
      <span class="floating-filter-badge">{activeFilterCount}</span>
    {/if}
  </button>
{/if}

<ArchiveFilterSheet
  bind:open={filterSheetOpen}
  side={isPhone ? 'bottom' : 'right'}
  sortOptions={CARD_SORT_OPTIONS}
  {sortValue}
  onSortChange={setSort}
  ratingOptions={SHEET_RATING_OPTIONS}
  ratingSelected={ratingFilterValues}
  onRatingChange={setRatingFilter}
  categoryOptions={SHEET_CATEGORY_OPTIONS}
  categorySelected={categoryFilterValues}
  onCategoryChange={setCategoryFilter}
  resultCount={filteredComics.length}
  onClearAll={() => {
    categoryFilterValues = [];
    ratingFilterValues = [];
    resetPage();
  }}
/>

<!-- Toolbar/table/card styles mirror ArchiveTriageTable.svelte's so the two
     archive pages look like one system - keep them in step if either changes. -->
<style>
  .archive-table {
    width: 100%;
  }

  .mobile-page-title {
    display: none;
  }

  .toolbar-panel {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 16px;
    margin-bottom: var(--gap, 20px);
  }

  .toolbar-header {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .toolbar-header-text h1 {
    font-family: 'saira';
    font-weight: 800;
    font-size: 24px;
    color: var(--font-color);
    margin: 0 0 8px 0;
  }

  .intro p {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.85;
    line-height: 1.5;
    margin: 0 0 8px 0;
  }

  .intro p:last-child {
    margin-bottom: 0;
  }

  .intro a {
    color: var(--font-link-color);
    font-weight: 700;
    text-decoration: none;
  }

  .intro a:hover {
    text-decoration: underline;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .toolbar :global(.toolbar-search) {
    flex: 1;
    min-width: 220px;
    height: 42px !important;
    min-height: 42px !important;
  }

  /* Matches the search input's 42px height rather than the button's
     default shadcn `size="sm"` height. */
  .toolbar :global(.clear-filters-btn) {
    height: 42px !important;
    min-height: 42px !important;
  }

  .results-count {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    opacity: 0.7;
  }

  .stat-chip {
    white-space: nowrap;
  }

  .stat-divider {
    margin: 0 6px;
    opacity: 0.5;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 20px;
    font-family: 'saira';
    color: var(--font-color);
  }

  .error-state p {
    margin-bottom: 12px;
  }

  :global(.archive-data-table [data-slot="table-head"]) {
    padding: 6px 10px !important;
    font-size: 12px !important;
    white-space: nowrap;
  }

  :global(.archive-data-table [data-slot="table-cell"]) {
    padding: 6px 10px !important;
  }

  .table-view :global(.pagination-controls) {
    padding: 15px !important;
    background: var(--page-color) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    box-shadow: var(--box-shadow) !important;
    margin-top: 16px;
  }

  .table-view :global(.entry-title),
  .table-view :global(.entry-author),
  .table-view :global(.entry-category),
  .table-view :global(.entry-quality) {
    display: block;
    color: var(--font-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-view :global(.entry-title) {
    font-weight: 600;
    max-width: 240px;
  }

  .table-view :global(.entry-author) {
    opacity: 0.85;
    max-width: 160px;
  }

  .table-view :global(.entry-category) {
    max-width: 140px;
  }

  .table-view :global(.entry-quality) {
    opacity: 0.75;
    font-size: 13px;
    max-width: 170px;
  }

  .table-view :global(.entry-numeric) {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .table-view :global(.entry-rating) {
    color: var(--font-link-color);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .table-view :global(.entry-link) {
    color: var(--font-link-color);
    text-decoration: none;
    font-weight: 600;
  }

  .table-view :global(.entry-link:hover) {
    text-decoration: underline;
  }

  .table-view :global(.entry-na) {
    color: var(--font-color);
    opacity: 0.4;
    font-size: 13px;
  }

  /* Cards are the default at every width; the table only replaces them at
     1400px+ when chosen (see the view--table rules further down). */
  .table-view {
    display: none;
  }

  .card-view {
    display: block;
  }

  /* Card grid: three-up on desktop (see the 1400px rule), two on
     tablet/small-desktop widths, one on phones (768px). */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 15px;
  }

  .cards-empty {
    grid-column: 1 / -1;
  }

  /* Mirrors DataTable.svelte's .pagination-controls plus the boxed
     .table-view override above, so both views' pagers look the same. */
  .card-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 15px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .card-pagination-info {
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.8;
  }

  .card-pagination-buttons {
    display: flex;
    gap: 8px;
  }

  /* Card-view controls: the Filter & Sort sheet trigger and the removable
     chips for whatever's applied - hidden while the table (which has its own
     header filters) is showing. */
  .filter-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 42px;
    padding: 0 16px;
    background: var(--font-link-color);
    color: var(--page-color);
    border: none;
    font-family: 'saira', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    /* Same as the themed Button's (.theme-button) so it sits level with
       Clear Filters beside it. */
    box-shadow: var(--box-shadow);
  }

  .filter-trigger:hover {
    background: color-mix(in srgb, var(--font-link-color) 85%, white);
  }

  .filter-trigger-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    background: var(--page-color);
    color: var(--font-link-color);
    border-radius: 10px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .active-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .active-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
    background: color-mix(in srgb, var(--font-link-color) 15%, var(--page-color));
    border: 1px solid color-mix(in srgb, var(--font-link-color) 55%, transparent);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .active-chip :global(svg) {
    opacity: 0.7;
  }

  .active-chip:hover :global(svg) {
    opacity: 1;
    color: var(--font-link-color);
  }

  .active-chip--sort {
    background: transparent;
    border-style: dashed;
  }

  /* Sized and styled to match the Navbar's floating hamburger (fixed
     top-3/right-3, p-2.5 + 20px icon + 1px border = 42px, rounded-lg,
     shadow-lg) and stacked 8px below it. z-index 40 keeps it under the
     hamburger and any open sheet (both z-50). */
  .floating-filter-trigger {
    position: fixed;
    top: calc(12px + 42px + 8px);
    right: 12px;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 0;
    background-color: var(--page-color);
    color: var(--font-color);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    cursor: pointer;
  }

  .floating-filter-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: var(--font-link-color);
    color: var(--font-color);
    border-radius: 9px;
    font-family: 'saira', sans-serif;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .view-toggle {
    display: none;
    margin-left: auto;
    box-shadow: var(--box-shadow);
  }

  .view-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 42px;
    padding: 0 14px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 14px;
    font-weight: 600;
    opacity: 0.75;
    cursor: pointer;
  }

  .view-toggle-btn + .view-toggle-btn {
    border-left: none;
  }

  .view-toggle-btn:hover {
    opacity: 1;
  }

  .view-toggle-btn[aria-pressed='true'] {
    background: var(--font-link-color);
    border-color: var(--font-link-color);
    opacity: 1;
    font-weight: 700;
  }

  /* 1400px+ is the only range wide enough for the table's rows, so that's
     the only place the Cards/Table switch appears and the table can show. */
  @media (min-width: 1400px) {
    .view-toggle {
      display: inline-flex;
    }

    .cards-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .view--table .table-view {
      display: block;
    }

    .view--table .card-view,
    .view--table .card-view-only {
      display: none;
    }
  }

  @media (max-width: 768px) {
    /* Search gets its own full-width row; Filter & Sort and Clear share the
       one below it. */
    .toolbar :global(.toolbar-search) {
      flex-basis: 100%;
      min-width: 0;
    }

    .filter-trigger {
      flex: 1;
      height: 46px;
    }

    .toolbar :global(.clear-filters-btn) {
      height: 46px !important;
      min-height: 46px !important;
    }

    .cards-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .toolbar-panel {
      border-left: none !important;
      border-right: none !important;
      box-shadow: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
    }

    .toolbar-header-text h1 {
      display: none;
    }

    .mobile-page-title {
      display: block;
      font-family: spritelogo;
      font-weight: normal;
      font-size: 10vw;
      color: var(--font-color);
      text-align: center;
      padding: 0 0 20px 0;
      margin: 0;
      text-shadow:
        -2px -2px 0 var(--bg-color),
        0px -2px 0 var(--bg-color),
        2px -2px 0 var(--bg-color),
        2px 0px 0 var(--bg-color),
        2px 2px 0 var(--bg-color),
        0px 2px 0 var(--bg-color),
        -2px 2px 0 var(--bg-color),
        -2px 0px 0 var(--bg-color);
    }

    .results-count {
      gap: 6px;
      opacity: 1;
    }

    .stat-divider {
      display: none;
    }

    .stat-chip {
      background: color-mix(in srgb, var(--page-color) 85%, white);
      border: var(--border-width, 1px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 75%, white);
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 12px;
      white-space: normal;
    }

    .stat-chip--primary {
      background: var(--font-link-color);
      border-color: var(--font-link-color);
      color: white;
      font-weight: 700;
    }
  }
</style>
