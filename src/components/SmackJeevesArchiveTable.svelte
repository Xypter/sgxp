<script lang="ts" module>
  // The uploaded-comics list, kept across client-side navigations (Astro's router
  // keeps this module loaded), so coming back to the archive within a few minutes
  // doesn't re-download all ~900 entries. Every visit still gets its own shuffle.
  const ARCHIVE_CACHE_MS = 5 * 60 * 1000;
  let archiveCache: { docs: unknown[]; at: number } | null = null;
</script>

<script lang="ts">
  import {
    type ColumnDef,
    type PaginationState,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from '@tanstack/table-core';
  import { onMount, tick, untrack } from 'svelte';
  import { isReturnVisit } from '$lib/navIntent';
  import { scale } from 'svelte/transition';
  import { createSvelteTable, renderComponent } from '$components/ui/data-table';
  import * as Tooltip from '$components/ui/tooltip';
  import * as Accordion from '$components/ui/accordion';
  import { DataTable, Input, Button, ButtonGroup, NumberedPagination } from '$lib/components';
  import { sgxpButtonClass } from '$components/ui/button';
  import { Bookmark, LayoutGrid, RotateCw, SlidersHorizontal, Table, X } from 'lucide-svelte';

  import ArchiveComicCard from './archive/ArchiveComicCard.svelte';
  import ArchiveFilterSheet from './archive/ArchiveFilterSheet.svelte';
  import { toast } from 'svelte-sonner';
  import {
    BOOKMARKS_CHANGED,
    addArchiveBookmark,
    fetchArchiveBookmarks,
    removeBookmark,
    type BookmarksChangedDetail,
    type ComicBookmark,
  } from '$lib/comicBookmarks';

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
    /** How many readers have bookmarked it (public; who is private). */
    bookmarkCount?: number | null;
  }

  const SELECT_FIELDS = [
    'comicId', 'title', 'author', 'category', 'pagesMetadata',
    'pagesFolder', 'percentSaved', 'quality', 'rating', 'notes', 'link', 'bookmarkCount',
  ];

  let { loggedIn = false }: { loggedIn?: boolean } = $props();

  let comics = $state<ArchiveComic[]>([]);
  // Always fetches on mount, so start true - avoids a flash of the empty
  // state before the first fetch even starts.
  let isLoading = $state(true);
  let error = $state('');

  function shuffle<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  async function fetchComics() {
    isLoading = true;
    error = '';
    try {
      let docs: ArchiveComic[];
      if (archiveCache && Date.now() - archiveCache.at < ARCHIVE_CACHE_MS) {
        docs = archiveCache.docs as ArchiveComic[];
      } else {
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
        docs = data.docs || [];
        archiveCache = { docs, at: Date.now() };
      }
      const saved = isReturnVisit('/smackjeeves') ? readSavedState() : null;
      if (saved) {
        restoreState(docs, saved);
      } else {
        // Shuffled once per visit - "Random" (no sort) is the default order,
        // so every fresh visit starts somewhere different in the archive.
        comics = shuffle(docs);
      }
      restored = true;
      isLoading = false;
      if (saved) {
        await tick();
        // Instant (the site's CSS makes scrolling smooth), and again next
        // frame in case the router's own scroll restoration lands after us.
        const scroll = () => window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
        scroll();
        requestAnimationFrame(scroll);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load the archive.';
    } finally {
      isLoading = false;
    }
  }

  onMount(fetchComics);

  // Intro text starts collapsed, same as the triage page's "About This
  // Project" - opening it is remembered per-browser. Guarded for SSR
  // (client:load renders this server-side first, without localStorage).
  const INTRO_STORAGE_KEY = 'smackjeeves-archive-intro-open';
  let introValue = $state(typeof localStorage !== 'undefined' && localStorage.getItem(INTRO_STORAGE_KEY) === 'open' ? 'intro' : '');

  $effect(() => {
    localStorage.setItem(INTRO_STORAGE_KEY, introValue ? 'open' : 'closed');
  });

  // The viewer's private bookmarks (logged-in only): a toggle on each card,
  // and a "Bookmarked" filter. The full list lives on /bookmarks.
  let bookmarks = $state<ComicBookmark[]>([]);
  let bookmarkBusy = $state(new Set<number>());
  const bookmarkByEntry = $derived(new Map(bookmarks.map((b) => [b.entryId, b])));
  // Only the ones still in the public archive, as /bookmarks lists them.
  const archiveBookmarkCount = $derived(bookmarks.filter((b) => comics.some((c) => Number(c.id) === b.entryId)).length);

  onMount(() => {
    if (!loggedIn) return;
    fetchArchiveBookmarks()
      .then((result) => (bookmarks = result))
      .catch((err) => console.error('Error loading bookmarks:', err));

    // Every add/remove (including the cards' own toggles) lands here.
    const onChange = (event: Event) => {
      const { entryId, bookmark } = (event as CustomEvent<BookmarksChangedDetail>).detail;
      const had = bookmarkByEntry.has(entryId);
      if (!had && bookmark) adjustBookmarkCount(entryId, 1);
      else if (had && !bookmark) adjustBookmarkCount(entryId, -1);
      const others = bookmarks.filter((b) => b.entryId !== entryId);
      bookmarks = bookmark ? [bookmark, ...others] : others;
    };
    window.addEventListener(BOOKMARKS_CHANGED, onChange);
    return () => window.removeEventListener(BOOKMARKS_CHANGED, onChange);
  });

  function comicHref(comic: ArchiveComic) {
    return comic.link || `/jeevespage?comic_id=${comic.comicId}`;
  }

  function readLocalProgress(comicId: number): number | null {
    try {
      const page = JSON.parse(localStorage.getItem('sgxp-jeeves-progress') || '{}')?.[comicId];
      return typeof page === 'number' && page > 0 ? page : null;
    } catch {
      return null;
    }
  }

  // Mirrors what the CMS's recount will store, so the viewer's own bookmark
  // shows up in the count right away - here and in the cached list the next
  // visit reuses.
  function adjustBookmarkCount(entryId: number, delta: number) {
    for (const list of [comics, (archiveCache?.docs ?? []) as ArchiveComic[]]) {
      const comic = list.find((c) => Number(c.id) === entryId);
      if (comic) comic.bookmarkCount = Math.max(0, (comic.bookmarkCount ?? 0) + delta);
    }
  }

  async function toggleBookmark(comic: ArchiveComic) {
    const entryId = Number(comic.id);
    if (bookmarkBusy.has(entryId)) return;
    bookmarkBusy = new Set(bookmarkBusy).add(entryId);
    const existing = bookmarkByEntry.get(entryId);
    try {
      // The list itself updates from the BOOKMARKS_CHANGED event.
      if (existing) {
        await removeBookmark(existing);
      } else {
        // Carries over how far this browser already got (the reader's own
        // localStorage progress), so bookmarking mid-read keeps the place.
        await addArchiveBookmark(entryId, readLocalProgress(comic.comicId));
      }
    } catch (err) {
      console.error('Error updating bookmark:', err);
      toast.error(err instanceof Error ? err.message : 'Could not update the bookmark');
    } finally {
      const next = new Set(bookmarkBusy);
      next.delete(entryId);
      bookmarkBusy = next;
    }
  }

  // Coming back to the archive (browser back, or the "Smack Jeeves Archive"
  // buttons in the comic reader - see navIntent.ts) picks up exactly where it
  // was left: same shuffle order, page, sort, filters and scroll position. A
  // real page load or the navbar link starts fresh with a new shuffle.
  const STATE_KEY = 'sgxp-smackjeeves-state';
  interface SavedState {
    order: number[];
    pageIndex: number;
    pageSize: number;
    sorting: SortingState;
    search: string;
    categories: string[];
    ratings: string[];
    bookmarkedOnly?: boolean;
    scrollY: number;
  }
  // Nothing is saved until the list is in place, so the initial empty state
  // never overwrites what a return visit is about to restore.
  let restored = false;

  function readSavedState(): SavedState | null {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null');
      return saved && Array.isArray(saved.order) ? saved : null;
    } catch {
      return null;
    }
  }

  function restoreState(docs: ArchiveComic[], saved: SavedState) {
    const byId = new Map(docs.map((c) => [c.comicId, c]));
    const ordered = saved.order.map((id) => byId.get(id)).filter((c): c is ArchiveComic => !!c);
    // Anything added to the archive since then goes on the end.
    const known = new Set(saved.order);
    comics = [...ordered, ...shuffle(docs.filter((c) => !known.has(c.comicId)))];
    sorting = saved.sorting ?? [];
    searchInput = saved.search ?? '';
    categoryFilterValues = saved.categories ?? [];
    ratingFilterValues = saved.ratings ?? [];
    bookmarkedOnly = !!saved.bookmarkedOnly && loggedIn;
    pagination = { pageIndex: saved.pageIndex ?? 0, pageSize: saved.pageSize ?? BASE_PAGE_SIZE };
  }

  function saveState(scrollY = window.scrollY) {
    if (!restored) return;
    const state: SavedState = {
      order: comics.map((c) => c.comicId),
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sorting,
      search: searchInput,
      categories: categoryFilterValues,
      ratings: ratingFilterValues,
      bookmarkedOnly,
      scrollY,
    };
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {}
  }

  $effect(() => {
    // Re-saved whenever any of these change.
    comics; pagination; sorting; searchInput; categoryFilterValues; ratingFilterValues; bookmarkedOnly;
    untrack(() => saveState());
  });

  onMount(() => {
    // Scroll position is captured on the way out (clicking a comic, or any
    // other navigation), not on every scroll.
    const onLeave = () => saveState();
    document.addEventListener('astro:before-preparation', onLeave);
    window.addEventListener('pagehide', onLeave);
    return () => {
      document.removeEventListener('astro:before-preparation', onLeave);
      window.removeEventListener('pagehide', onLeave);
    };
  });

  // Filters
  let searchInput = $state('');
  let categoryFilterValues = $state<string[]>([]);
  let ratingFilterValues = $state<string[]>([]);
  let bookmarkedOnly = $state(false);

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
  function setBookmarkedOnly(value: boolean) {
    bookmarkedOnly = value;
    resetPage();
  }

  const hasActiveFilters = $derived(
    !!searchInput.trim() || categoryFilterValues.length > 0 || ratingFilterValues.length > 0 || bookmarkedOnly
  );

  function clearFilters() {
    searchInput = '';
    categoryFilterValues = [];
    ratingFilterValues = [];
    bookmarkedOnly = false;
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
      if (bookmarkedOnly && !bookmarkByEntry.has(Number(c.id))) return false;
      return true;
    });
  });

  const totalPages = $derived(comics.reduce((sum, c) => sum + (c.pagesFolder || 0), 0));

  // Table state
  // Page size is ~24, rounded up to a whole number of card-grid rows. The
  // 1400px+ grid is auto-fill, so its column count (4, 5, ...) depends on the
  // viewport - a fixed 24 left a ragged last row whenever it wasn't a divisor.
  const BASE_PAGE_SIZE = 24;
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: BASE_PAGE_SIZE });
  let cardsGrid = $state<HTMLElement>();
  let gridColumns = $state(1);

  $effect(() => {
    const el = cardsGrid;
    if (!el) return;
    const measure = () => {
      // Hidden (table view) grids report 0 width and an unresolved template;
      // keep the last real measurement instead.
      if (el.clientWidth === 0) return;
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (cols > 0) gridColumns = cols;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  $effect(() => {
    const size = Math.ceil(BASE_PAGE_SIZE / gridColumns) * gridColumns;
    const current = untrack(() => pagination);
    if (size === current.pageSize) return;
    // Keep the first comic on screen in view across the resize.
    const firstIndex = current.pageIndex * current.pageSize;
    pagination = { pageIndex: Math.floor(firstIndex / size), pageSize: size };
  });
  // Empty = the shuffled load order ("Random").
  let sorting = $state<SortingState>([]);

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
      accessorKey: 'bookmarkCount',
      header: sortableHeader('Bookmarks'),
      sortUndefined: 'last',
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: row.original.bookmarkCount ? row.original.bookmarkCount.toLocaleString() : undefined,
          fallback: '—',
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
    { value: 'random', label: 'Random' },
    { value: 'comicId:asc', label: 'Oldest first' },
    { value: 'comicId:desc', label: 'Newest first' },
    { value: 'title:asc', label: 'Title A–Z' },
    { value: 'title:desc', label: 'Title Z–A' },
    { value: 'rating:desc', label: 'Highest rated' },
    { value: 'rating:asc', label: 'Lowest rated' },
    { value: 'pagesFolder:desc', label: 'Most pages' },
    { value: 'percentSaved:desc', label: 'Best preserved' },
    { value: 'bookmarkCount:desc', label: 'Most bookmarked' },
  ];
  const sortValue = $derived(sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : 'random');
  const sortLabel = $derived(
    CARD_SORT_OPTIONS.find((o) => o.value === sortValue)?.label ?? 'Custom'
  );

  function setSort(value: string) {
    const [id, dir] = value.split(':');
    sorting = value === 'random' ? [] : [{ id, desc: dir === 'desc' }];
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

  const activeFilterCount = $derived(categoryFilterValues.length + ratingFilterValues.length + (bookmarkedOnly ? 1 : 0));
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
  // Only the view actually on screen is rendered (the table is 9 cell components
  // per row, so building it hidden behind the cards, as the default card view used
  // to, roughly doubled every page's render). Same breakpoint as the CSS below.
  let tableFits = $state(false);
  const showTable = $derived(tableFits && viewMode === 'table');
  onMount(() => {
    const stopPhone = watchMedia('(max-width: 768px)', (m) => (isPhone = m));
    const stopHamburger = watchMedia('(max-width: 1199px)', (m) => (hamburgerShown = m));
    const stopTableFits = watchMedia('(min-width: 1400px)', (m) => (tableFits = m));
    return () => {
      stopPhone();
      stopHamburger();
      stopTableFits();
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
  function goToPage(page: number) {
    table.setPageIndex(page - 1);
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
          <Accordion.Root type="single" bind:value={introValue} class="intro-accordion">
            <Accordion.Item value="intro" class="intro-accordion-item">
              <Accordion.Trigger class="intro-accordion-trigger">
                About This Archive
                <span class="intro-toggle-label">({introValue ? 'Collapse' : 'Expand'})</span>
              </Accordion.Trigger>
              <Accordion.Content class="intro-accordion-content">
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
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
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
        <Button
          variant="primary"
          icon={SlidersHorizontal}
          class="filter-trigger card-view-only"
          aria-haspopup="dialog"
          bind:ref={inlineFilterTrigger}
          onclick={() => (filterSheetOpen = true)}
        >
          Filter & Sort
          {#if activeFilterCount > 0}
            <span class="sgxp-btn-badge">{activeFilterCount}</span>
          {/if}
        </Button>
        <Button variant="secondary" icon={X} class="clear-filters-btn" disabled={!hasActiveFilters} onclick={clearFilters}>
          Clear Filters
        </Button>
        {#if loggedIn}
          <!-- ?from= gives /bookmarks a link straight back here. -->
          <Button
            variant="secondary"
            icon={Bookmark}
            href="/bookmarks?from=smackjeeves"
            class="bookmarks-link"
            title="My bookmarks"
            aria-label="My bookmarks ({archiveBookmarkCount})"
          >
            <span class="bookmarks-link-label">My Bookmarks</span>
            {#if archiveBookmarkCount > 0}
              <span class="sgxp-btn-count">{archiveBookmarkCount}</span>
            {/if}
          </Button>
        {/if}
        <!-- Only at 1400px+, where the table fits; narrower is always cards. -->
        <ButtonGroup label="View as" class="view-toggle">
          <Button variant="toggle" icon={LayoutGrid} aria-pressed={viewMode === 'cards'} onclick={() => setViewMode('cards')}>
            Cards
          </Button>
          <Button variant="toggle" icon={Table} aria-pressed={viewMode === 'table'} onclick={() => setViewMode('table')}>
            Table
          </Button>
        </ButtonGroup>
      </div>

      <!-- What's currently applied, removable one at a time - the card view
           has no column headers to show active filters on. -->
      {#if activeFilterCount > 0 || sortValue !== 'random'}
        <div class="active-chips card-view-only">
          <!-- Mini toggles shown "on" (data-state rather than aria-pressed: to a
               screen reader they're remove buttons, not toggles); the trailing
               X says a tap removes it. -->
          {#if sortValue !== 'random'}
            <Button variant="toggle" size="mini" data-state="on" aria-label="Remove sort: {sortLabel}" onclick={() => setSort('random')}>
              Sort: {sortLabel} <X />
            </Button>
          {/if}
          {#if bookmarkedOnly}
            <Button variant="toggle" size="mini" data-state="on" aria-label="Remove filter: Bookmarked" onclick={() => setBookmarkedOnly(false)}>
              Bookmarked <X />
            </Button>
          {/if}
          {#each ratingFilterValues as value (value)}
            <Button
              variant="toggle"
              size="mini"
              data-state="on"
              aria-label="Remove filter: Rating {ratingLabel(value)}"
              onclick={() => setRatingFilter(ratingFilterValues.filter((v) => v !== value))}
            >
              Rating {ratingLabel(value)} <X />
            </Button>
          {/each}
          {#each categoryFilterValues as value (value)}
            <Button
              variant="toggle"
              size="mini"
              data-state="on"
              aria-label="Remove filter: {value}"
              onclick={() => setCategoryFilter(categoryFilterValues.filter((v) => v !== value))}
            >
              {value} <X />
            </Button>
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
        <Button variant="secondary" icon={RotateCw} onclick={fetchComics}>Try Again</Button>
      </div>
    {:else if isLoading}
      <div class="loading-state">
        <p>Loading archive...</p>
      </div>
    {:else if showTable}
      <!-- Desktop Table -->
      <div class="table-view">
        <DataTable {table} themed showPagination class="archive-data-table" emptyMessage="No comics match your filters." />
      </div>
    {:else}
      <!-- Mobile Cards -->
      <div class="card-view" bind:this={cardsTop}>
        <div class="cards-grid" bind:this={cardsGrid}>
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
              bookmarkCount={comic.bookmarkCount ?? 0}
              href={comicHref(comic)}
              bookmarked={bookmarkByEntry.has(Number(comic.id))}
              bookmarkBusy={bookmarkBusy.has(Number(comic.id))}
              onToggleBookmark={loggedIn ? () => toggleBookmark(comic) : undefined}
            />
          {:else}
            <div class="loading-state cards-empty">
              <p>No comics match your filters.</p>
              {#if hasActiveFilters}
                <Button variant="secondary" icon={X} onclick={clearFilters}>Clear Filters</Button>
              {/if}
            </div>
          {/each}
        </div>

        {#if pageCount > 1}
          <!-- Same markup/components as DataTable.svelte's own pagination, so
               the card and table views page identically. -->
          <div class="card-pagination">
            <div class="card-pagination-info">Page {pagination.pageIndex + 1} of {pageCount}</div>
            <NumberedPagination
              count={table.getRowCount()}
              perPage={pagination.pageSize}
              page={pagination.pageIndex + 1}
              onPageChange={goToPage}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Tooltip.Provider>

{#if showFloatingFilter}
  <!-- A plain <button> (use:portal and transition: can't go on a component)
       wearing the standard's boxed icon-button look. -->
  <button
    type="button"
    class="{sgxpButtonClass({ variant: 'tool', size: 'icon' })} floating-filter-trigger"
    aria-haspopup="dialog"
    aria-label={activeFilterCount > 0 ? `Filter & sort (${activeFilterCount} active)` : 'Filter & sort'}
    use:portal
    transition:scale={{ duration: 150, start: 0.85 }}
    onclick={() => (filterSheetOpen = true)}
  >
    <SlidersHorizontal size={20} />
    {#if activeFilterCount > 0}
      <span class="sgxp-btn-badge sgxp-btn-badge--corner">{activeFilterCount}</span>
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
  bookmarkCount={loggedIn ? archiveBookmarkCount : null}
  {bookmarkedOnly}
  onBookmarkedOnlyChange={setBookmarkedOnly}
  resultCount={filteredComics.length}
  onClearAll={() => {
    categoryFilterValues = [];
    ratingFilterValues = [];
    bookmarkedOnly = false;
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

  /* Collapsible intro - same look as the triage page's (ArchiveTriageTable.svelte). */
  :global(.intro-accordion) {
    max-width: 100%;
  }

  :global(.intro-accordion-item) {
    border: none !important;
  }

  :global(.intro-accordion-trigger) {
    font-family: 'saira' !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--font-color) !important;
    opacity: 0.75;
    padding: 0 0 4px 0 !important;
    display: inline-flex !important;
    flex: none !important;
    width: auto !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 6px !important;
  }

  :global(.intro-accordion-trigger:hover) {
    opacity: 1;
    text-decoration: none !important;
  }

  :global(.intro-toggle-label) {
    font-style: italic;
    font-weight: 400 !important;
    text-transform: none;
    opacity: 0.65;
  }

  :global(.intro-accordion-content) {
    font-size: inherit !important;
  }

  :global(.intro-accordion-content > div) {
    padding: 4px 0 0 0 !important;
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

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .intro a:hover {
      text-decoration: underline;
    }
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

  @media (hover: hover) {
    .table-view :global(.entry-link:hover) {
      text-decoration: underline;
    }
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

  /* Card grid: auto-fill 320px+ columns at 1400px+ (page size follows the
     measured column count), two on tablet/small-desktop, one on phones. */
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
  /* Stacks and centres on narrow screens. */
  .card-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 16px;
    padding: 15px 15px 22px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  @media (max-width: 768px) {
    .card-pagination {
      justify-content: center;
    }
  }

  .card-pagination-info {
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.8;
  }


  /* Card-view controls (the Filter & Sort trigger and the removable chips
     for whatever's applied) are hidden while the table, which has its own
     header filters, is showing. The buttons themselves are the standard
     ones (src/styles/buttons.css); only layout lives here. */

  /* Room below for the chips' block shadows. */
  .active-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }

  /* Stacked 8px below the Navbar's floating hamburger (fixed top-3/right-3,
     42px). z-index 40 keeps it under the hamburger and any open sheet (both
     z-50). The look is the standard tool button; two classes so `fixed`
     outranks the standard's `position: relative`. */
  :global(.sgxp-btn.floating-filter-trigger) {
    position: fixed;
    top: calc(12px + 42px + 8px);
    right: 12px;
    z-index: 40;
  }


  .toolbar :global(.view-toggle) {
    display: none;
    margin-left: auto;
  }

  /* 1400px+ is the only range wide enough for the table's rows, so that's
     the only place the Cards/Table switch appears and the table can show. */
  @media (min-width: 1400px) {
    .toolbar :global(.view-toggle) {
      display: inline-flex;
    }

    .cards-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }

    .view--table .table-view {
      display: block;
    }

    .view--table .card-view,
    .view--table :global(.card-view-only) {
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

    /* A zero basis (and min-width 0) makes Filter & Sort the one that
       gives up room, so Clear and the bookmarks button always stay on its
       row instead of the bookmarks button wrapping onto a line of its own
       on narrow phones. */
    .toolbar :global(.filter-trigger) {
      flex: 1 1 0;
      min-width: 0;
    }

    /* Too tight for the icon on the smallest phones - the label wins. */
    @media (max-width: 340px) {
      .toolbar :global(.filter-trigger > svg) {
        display: none;
      }
    }

    /* Icon (and count) only, to share the row with Filter & Sort and Clear. */
    .toolbar :global(.bookmarks-link) {
      padding: 0 12px;
      gap: 6px;
    }

    .bookmarks-link-label {
      display: none;
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
