<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { fade } from 'svelte/transition';
  import { X, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-svelte';
  import { Button, ToggleGroup } from '$lib/components';
  import { applyArchiveFilters } from '$lib/archiveFilterQuery';
  import ArchiveStatusBadge from './cells/ArchiveStatusBadge.svelte';
  import EditableComboboxCell from './cells/EditableComboboxCell.svelte';
  import QuickSortImage from './QuickSortImage.svelte';

  const YES_NO_OPTIONS = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  const STATUS_LABELS: Record<string, string> = {
    unsorted: 'unsorted',
    'ready-for-review': 'ready for review',
    'ready-for-rating': 'ready for rating',
    'ready-to-upload': 'ready to upload',
    uploaded: 'uploaded',
    excluded: 'excluded',
  };

  const STATUS_ORDER = ['unsorted', 'ready-for-review', 'ready-for-rating', 'ready-to-upload', 'uploaded', 'excluded'];

  interface UserRef {
    id: number | string;
    username?: string;
    displayName?: string;
  }

  interface ArchiveEntry {
    id: string | number;
    comicId: number;
    title?: string;
    author?: string;
    isSpriteComic?: boolean;
    isGameRelated?: boolean;
    category?: string | null;
    status: string;
    preparedBy?: UserRef | number | string | null;
  }

  interface PreviewMeta {
    totalPages: number;
    realPageCount: number;
    allPlaceholder: boolean;
    images: { n: number; ext: string }[];
  }

  interface Props {
    open: boolean;
    canEdit: boolean;
    isAdmin: boolean;
    currentUserId: number | string | undefined;
    // Mirrors the parent table's current filter/search/sort exactly, so
    // Quick Sort walks the same ordered list the archivist was just
    // looking at (e.g. "Ready for Review" filter -> Quick Sort doubles as
    // a review tool over that same queue) instead of always assuming
    // unsorted-by-comicId.
    statusFilter?: string;
    searchTerm?: string;
    // The parent table's other Excel-style column filters (Category, Sprite
    // Comic?, Game Related?, Preparer, Reviewer) - same deal, so a heavily
    // filtered-down table (e.g. "3 comics left") turns Quick Sort into a
    // queue over exactly those 3, not the whole unsorted backlog.
    categoryFilterValues?: string[];
    spriteComicFilterValues?: string[];
    gameRelatedFilterValues?: string[];
    preparerFilterValues?: string[];
    reviewerFilterValues?: string[];
    sortField: string;
    sortDesc: boolean;
    // Shared category list (backed by the archive-categories collection) -
    // mirrors what the parent table's Category column uses, kept in sync
    // there over SSE. onCategoryCreated lets Quick Sort feed a brand-new
    // category name back up so it shows up for everyone else too, same as
    // the table's saveCategoryField.
    categories: string[];
    onCategoryCreated: (name: string) => void;
    // When set, Quick Sort still walks the exact same filtered/sorted queue
    // as normal browsing (e.g. a "view in Quick Sort" button on a specific
    // table row) - it just jumps straight to wherever this comic sits in
    // that queue instead of starting at the front, so Previous/Next carry
    // on browsing its neighbors from there. See loadTargetQueue below.
    targetComicId?: number;
    onClose: () => void;
  }

  let {
    open = $bindable(false),
    canEdit,
    isAdmin,
    currentUserId,
    statusFilter,
    searchTerm,
    categoryFilterValues = [],
    spriteComicFilterValues = [],
    gameRelatedFilterValues = [],
    preparerFilterValues = [],
    reviewerFilterValues = [],
    sortField,
    sortDesc,
    categories,
    onCategoryCreated,
    targetComicId,
    onClose,
  }: Props = $props();

  const isTargetMode = $derived(targetComicId != null);
  const hasExtraFilters = $derived(
    categoryFilterValues.length > 0 ||
      spriteComicFilterValues.length > 0 ||
      gameRelatedFilterValues.length > 0 ||
      preparerFilterValues.length > 0 ||
      reviewerFilterValues.length > 0
  );

  const CATEGORY_EDIT_OPTIONS = $derived([{ value: '', label: '— Uncategorized —' }, ...categories.map((v) => ({ value: v, label: v }))]);

  // The native <select> (mobile) can't offer a free-text entry inline like
  // the desktop Combobox's "Add <value>" affordance - a trailing sentinel
  // option triggers a native prompt() instead, which mobile browsers render
  // fine, then routes through setCategory the same as any other pick.
  const NEW_CATEGORY_VALUE = '__qs_add_new_category__';
  const CATEGORY_NATIVE_OPTIONS = $derived([...CATEGORY_EDIT_OPTIONS, { value: NEW_CATEGORY_VALUE, label: '+ Add new category...' }]);

  const PAGE_SIZE = 25;

  function idOf(ref: UserRef | number | string | null | undefined): string {
    if (!ref) return '';
    if (typeof ref === 'object') return String(ref.id);
    return String(ref);
  }

  function isPreparer(entry: ArchiveEntry): boolean {
    return idOf(entry.preparedBy) === String(currentUserId);
  }

  // Mirrors the parent table's isRelevant() - Category only matters once an
  // entry is actually in scope for the archive.
  function isRelevant(entry: ArchiveEntry): boolean {
    return !!entry.isSpriteComic || !!entry.isGameRelated;
  }

  // Mirrors the parent table's locked() - once an entry reaches "ready for
  // rating" only admins can still touch it.
  function locked(entry: ArchiveEntry): boolean {
    return !isAdmin && STATUS_ORDER.indexOf(entry.status) >= STATUS_ORDER.indexOf('ready-for-rating');
  }

  let entries = $state<ArchiveEntry[]>([]);
  let index = $state(0);
  let page = 1;
  let hasNextPage = $state(true);
  let loadingInitial = $state(true);
  let loadingMore = $state(false);
  let totalDocs = $state<number | null>(null);
  let savingField = $state<string | null>(null); // 'isSpriteComic' | 'isGameRelated' | 'ready' | null
  let error = $state<string | null>(null);

  const current = $derived(entries[index] as ArchiveEntry | undefined);
  const doneForNow = $derived(!loadingInitial && entries.length === 0);

  // Mobile shows one preview image at a time (three side by side don't fit)
  // with dots to switch between them - resets whenever the comic changes.
  let mobileImageIndex = $state(0);
  $effect(() => {
    current?.id;
    mobileImageIndex = 0;
  });

  // Not a $state - it's just a plain memoization cache, keyed by comicId.
  // Reactivity for display is driven by currentMeta below, not this map.
  const metaCache = new Map<number, PreviewMeta | null>();
  let currentMeta = $state<PreviewMeta | null | undefined>(undefined);

  $effect(() => {
    const entry = current;
    if (!entry) {
      currentMeta = undefined;
      return;
    }
    const comicId = entry.comicId;
    if (metaCache.has(comicId)) {
      currentMeta = metaCache.get(comicId) ?? null;
      return;
    }
    currentMeta = undefined;
    fetch(`https://cdn.sgxp.me/archive-triage/${comicId}/meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PreviewMeta | null) => {
        metaCache.set(comicId, data);
        if (current?.comicId === comicId) currentMeta = data;
      })
      .catch(() => {
        metaCache.set(comicId, null);
        if (current?.comicId === comicId) currentMeta = null;
      });
  });

  // Falls back to 3 guessed slots while meta.json hasn't resolved yet (or
  // has no meta.json at all) - the images list drives both the desktop
  // side-by-side layout and the mobile one-at-a-time/dots layout below.
  const currentImages = $derived<{ n: number; ext?: string }[]>(
    currentMeta ? currentMeta.images : [{ n: 1 }, { n: 2 }, { n: 3 }]
  );

  async function fetchPage(pageNum: number) {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(pageNum));
    params.set('depth', '1');
    params.set('sort', `${sortDesc ? '-' : ''}${sortField}`);

    applyArchiveFilters(params, {
      statusFilter,
      searchTerm,
      categoryFilterValues,
      spriteComicFilterValues,
      gameRelatedFilterValues,
      preparerFilterValues,
      reviewerFilterValues,
    });

    const response = await fetch(`/api/archive-entries?${params.toString()}`);
    if (!response.ok) throw new Error(`Failed to load entries (${response.status})`);
    return response.json();
  }

  async function fetchTargetEntry(comicId: number) {
    const params = new URLSearchParams({ 'where[comicId][equals]': String(comicId), limit: '1', depth: '1' });
    const response = await fetch(`/api/archive-entries?${params.toString()}`);
    if (!response.ok) throw new Error(`Failed to load comic #${comicId} (${response.status})`);
    return response.json();
  }

  // Target mode isn't a single-entry view - it's the same filtered/sorted
  // queue the table is showing, just jumped to wherever the chosen comic
  // sits in it, so Previous/Next carry on browsing the surrounding entries
  // exactly like normal browsing does. Pages are fetched (and accumulated,
  // same shape loadMoreIfNeeded already expects) until the target comic
  // turns up. Capped so a comic that's hundreds of pages deep into an
  // unfiltered/lightly-filtered queue doesn't trigger an unbounded fetch
  // loop - past that cap it falls back to the old single-entry view.
  const TARGET_SCAN_MAX_PAGES = 20;

  async function loadTargetQueue(comicId: number) {
    let scannedEntries: ArchiveEntry[] = [];
    let pageNum = 1;
    let totalDocsResult = 0;
    let hasNextPageResult = false;
    while (pageNum <= TARGET_SCAN_MAX_PAGES) {
      const data = await fetchPage(pageNum);
      const docs: ArchiveEntry[] = data.docs || [];
      scannedEntries = scannedEntries.concat(docs);
      totalDocsResult = data.totalDocs ?? totalDocsResult;
      hasNextPageResult = !!data.hasNextPage;
      const foundIndex = scannedEntries.findIndex((e) => e.comicId === comicId);
      if (foundIndex !== -1) {
        return { entries: scannedEntries, index: foundIndex, totalDocs: totalDocsResult, hasNextPage: hasNextPageResult, page: pageNum };
      }
      if (!hasNextPageResult) break;
      pageNum++;
    }
    return null;
  }

  async function loadInitial() {
    loadingInitial = true;
    error = null;
    try {
      if (isTargetMode) {
        const queue = await loadTargetQueue(targetComicId!);
        if (queue) {
          entries = queue.entries;
          index = queue.index;
          totalDocs = queue.totalDocs;
          hasNextPage = queue.hasNextPage;
          page = queue.page;
        } else {
          // Not found within the scan cap (or it doesn't match the current
          // filters at all) - fall back to showing just this one comic on
          // its own, same as the original single-entry behavior.
          const data = await fetchTargetEntry(targetComicId!);
          entries = data.docs || [];
          totalDocs = data.totalDocs ?? null;
          hasNextPage = false;
          page = 1;
          index = 0;
          if (entries.length === 0) {
            error = `Comic #${targetComicId} not found.`;
          }
        }
      } else {
        const data = await fetchPage(1);
        entries = data.docs || [];
        totalDocs = data.totalDocs ?? null;
        hasNextPage = !!data.hasNextPage;
        page = 1;
        index = 0;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loadingInitial = false;
    }
  }

  async function loadMoreIfNeeded() {
    if (loadingMore || !hasNextPage) return;
    if (index < entries.length - 5) return;
    loadingMore = true;
    try {
      const data = await fetchPage(page + 1);
      entries = [...entries, ...(data.docs || [])];
      hasNextPage = !!data.hasNextPage;
      page += 1;
    } catch {
      // Non-fatal - user just won't be able to advance past what's loaded
      // until this succeeds on a later trigger.
    } finally {
      loadingMore = false;
    }
  }

  async function next() {
    if (index < entries.length - 1) {
      index++;
      loadMoreIfNeeded();
      return;
    }
    // Already on the last loaded entry - if more exist server-side but
    // prefetch (triggered a few entries back) hasn't landed yet, fetch now
    // and advance once it arrives instead of silently doing nothing.
    if (hasNextPage) {
      await loadMoreIfNeeded();
      if (index < entries.length - 1) index++;
    }
  }

  function prev() {
    if (index > 0) index--;
  }

  async function patchEntry(entry: ArchiveEntry, body: Record<string, unknown>) {
    const response = await fetch(`/api/archive-entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const serverMessage = data.errors?.[0]?.message || data.message;
      throw new Error(serverMessage || 'Failed to save');
    }
    return data;
  }

  async function setFlag(field: 'isSpriteComic' | 'isGameRelated', value: boolean) {
    if (!canEdit || !current || savingField) return;
    const entry = current;
    const previousValue = (entry as any)[field];
    savingField = field;
    entries = entries.map((e) => (e.id === entry.id ? { ...e, [field]: value } : e));
    try {
      await patchEntry(entry, { [field]: value });
    } catch (err) {
      entries = entries.map((e) => (e.id === entry.id ? { ...e, [field]: previousValue } : e));
      toast.error('Failed to save change', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      savingField = null;
    }
  }

  async function setCategory(value: string) {
    if (!canEdit || !current || savingField) return;
    const entry = current;
    const trimmed = value.trim();
    if (trimmed && !categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      onCategoryCreated(trimmed);
    }
    const newValue = trimmed === '' ? null : trimmed;
    if (newValue === (entry.category ?? null)) return;
    const previousValue = entry.category;
    savingField = 'category';
    entries = entries.map((e) => (e.id === entry.id ? { ...e, category: newValue } : e));
    try {
      await patchEntry(entry, { category: newValue });
    } catch (err) {
      entries = entries.map((e) => (e.id === entry.id ? { ...e, category: previousValue } : e));
      toast.error('Failed to save change', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      savingField = null;
    }
  }

  function handleNativeCategorySelect(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    const selected = select.value;
    if (selected !== NEW_CATEGORY_VALUE) {
      setCategory(selected);
      return;
    }
    const name = window.prompt('New category name:')?.trim();
    if (name) {
      setCategory(name);
    } else {
      // Cancelled/blank - snap the <select> back to whatever the entry's
      // category actually is, since selecting the sentinel already moved
      // the native control's displayed value away from it.
      select.value = current?.category ?? '';
    }
  }

  async function changeStatus(newStatus: string, savingKey: string, successMessage: (entry: ArchiveEntry) => string, failureMessage: string) {
    if (!canEdit || !current || savingField) return;
    const entry = current;
    savingField = savingKey;
    try {
      // The server derives preparedBy/reviewedBy/preparedAt/reviewedAt as a
      // side effect of this same status change (see ArchiveEntries.ts's
      // beforeChange) - merge its returned doc back in rather than just the
      // status we sent, otherwise the modal keeps showing this entry as
      // un-prepared/un-reviewed until the next SSE refresh catches up.
      const result = await patchEntry(entry, { status: newStatus });
      // The server can land on a different status than what was requested
      // (e.g. an admin marking ready-for-review auto-collapses straight to
      // ready-for-rating/excluded - see ArchiveEntries.ts's beforeChange),
      // so trust the response's actual status over the one we asked for.
      const finalStatus = result?.doc?.status ?? newStatus;
      const updatedEntry = { ...entry, ...(result?.doc ?? {}), status: finalStatus };
      // Mirrors the parent table's movesOutOfView logic - only drop the
      // entry from the local list if there's an active status filter and
      // the new status no longer matches it. Under "All Statuses" the
      // entry stays put, same as the main table. Applies in target mode
      // too now - it's a real queue (just jumped to a starting position),
      // not a single-entry view.
      if (statusFilter && finalStatus !== statusFilter) {
        entries = entries.filter((e) => e.id !== entry.id);
        totalDocs = totalDocs !== null ? Math.max(0, totalDocs - 1) : totalDocs;
        // Removing the entry shifts everything after it down one slot, so
        // the same index now points at what used to be the next comic - no
        // increment needed. If that emptied the tail, top up from the server.
        if (index >= entries.length) index = Math.max(0, entries.length - 1);
        loadMoreIfNeeded();
      } else {
        entries = entries.map((e) => (e.id === entry.id ? updatedEntry : e));
      }
      toast.success(successMessage(entry));
    } catch (err) {
      toast.error(failureMessage, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      savingField = null;
    }
  }

  function markReady() {
    if (current && isRelevant(current) && !current.category) {
      toast.error('Pick a category before submitting this for review');
      return;
    }
    changeStatus(
      'ready-for-review',
      'ready',
      (entry) => `Comic #${entry.comicId} sent for review`,
      'Failed to submit for review'
    );
  }

  function confirmReviewAction() {
    if (!current) return;
    const target = current.isSpriteComic || current.isGameRelated ? 'ready-for-rating' : 'excluded';
    changeStatus(
      target,
      'confirm',
      (entry) => (target === 'excluded' ? `Comic #${entry.comicId} excluded` : `Comic #${entry.comicId} confirmed for rating`),
      'Failed to confirm review'
    );
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  }

  function close() {
    open = false;
    onClose?.();
  }

  // Swipe support (mobile) - pages between the current comic's own preview
  // images (mobileImageIndex), not between comics - comic-to-comic
  // navigation on mobile is the dedicated prev/next buttons below the
  // image instead, so the two gestures never collide. A mostly-vertical
  // drag is left alone so page scroll/pull-to-refresh still works normally.
  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (currentImages.length <= 1) return;
    // Image-paging swipe is a mobile-layout concept (desktop shows every
    // image at once already) - guard against a touch-capable desktop
    // browser triggering it too.
    if (typeof window !== 'undefined' && window.innerWidth > 640) return;
    if (dx < 0) {
      mobileImageIndex = Math.min(mobileImageIndex + 1, currentImages.length - 1);
    } else {
      mobileImageIndex = Math.max(mobileImageIndex - 1, 0);
    }
  }

  // Plain `overflow: hidden` on body doesn't reliably stop background
  // scroll-through on mobile Safari/touch browsers - the page can still
  // scroll underneath a touch drag. Locking body to `position: fixed` at
  // its current scroll offset (and restoring both on close) is the
  // standard workaround that actually holds on mobile too.
  let lockedScrollY = 0;

  $effect(() => {
    if (open) {
      lockedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      loadInitial();
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, lockedScrollY);
    }
  });

  // The same live-update webhook that keeps the main table in sync (any
  // archive-entries change broadcasts `entry-updated` over SSE) - the
  // parent table's own connection stays open in the background while this
  // modal is up and already picks up changes *we* make here, but Quick
  // Sort had no way to notice changes made by someone ELSE while an
  // archivist is mid-session here. Refetches just the currently-viewed
  // entry (cheap) rather than the whole queue, and drops it from the
  // local list if someone else's edit moved it out of the active filter -
  // same movesOutOfView logic changeStatus already uses for our own edits.
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  async function refreshCurrentFromServer() {
    if (!current) return;
    const entry = current;
    try {
      const params = new URLSearchParams({ 'where[id][equals]': String(entry.id), limit: '1', depth: '1' });
      const response = await fetch(`/api/archive-entries?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      const updated = data.docs?.[0];
      if (!updated || updated.id !== entry.id) return;
      if (JSON.stringify(updated) === JSON.stringify(entry)) return;

      if (statusFilter && updated.status !== statusFilter) {
        entries = entries.filter((e) => e.id !== entry.id);
        totalDocs = totalDocs !== null ? Math.max(0, totalDocs - 1) : totalDocs;
        if (index >= entries.length) index = Math.max(0, entries.length - 1);
        loadMoreIfNeeded();
        toast.info(`Comic #${entry.comicId} was just updated by someone else and removed from this queue`);
      } else {
        entries = entries.map((e) => (e.id === entry.id ? { ...e, ...updated } : e));
      }
    } catch {
      // Best-effort - worst case the local copy just stays as-is until the
      // next event or the archivist navigates away and back.
    }
  }

  $effect(() => {
    if (!open) return;
    const source = new EventSource('/api/archive-entries/stream');
    source.addEventListener('entry-updated', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refreshCurrentFromServer, 400);
    });
    return () => {
      clearTimeout(refreshTimer);
      source.close();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="qs-overlay" role="dialog" aria-modal="true" transition:fade={{ duration: 200 }}>
    <div class="qs-top-bar">
      <Button themed variant="ghost" size="icon" onclick={close} aria-label="Close">
        <X size={22} />
      </Button>
      <div class="qs-top-bar-text">
        {#if current}
          <div class="qs-title">
            <span class="qs-comic-id">#{current.comicId}</span>
            <span class="qs-comic-title">{current.title || '(untitled)'}</span>
            {#if current.author}<span class="qs-comic-author">by {current.author}</span>{/if}
          </div>
        {/if}
        <div class="qs-top-bar-meta">
          {#if currentMeta || currentMeta === undefined}
            {#if currentMeta}
              <span
                class="qs-page-badge"
                title="Archive.org lists {currentMeta.totalPages} page image{currentMeta.totalPages === 1 ? '' : 's'} for this comic, but {currentMeta.realPageCount} of them are actual unique images - the rest are duplicate 'page unavailable' placeholders SmackJeeves generated for missing pages. Coverage is real images ÷ listed images."
              >
                {currentMeta.totalPages} listed images · {currentMeta.realPageCount} real image{currentMeta.realPageCount === 1 ? '' : 's'} · {currentMeta.totalPages > 0 ? Math.round((currentMeta.realPageCount / currentMeta.totalPages) * 100) : 0}% coverage
              </span>
            {:else}
              <span class="qs-page-badge qs-page-badge--loading">
                <LoaderCircle size={11} class="qs-spinner" /> loading info...
              </span>
            {/if}
            <span class="qs-meta-divider">—</span>
          {/if}
          <div class="qs-progress">
            {#if totalDocs !== null}
              {index + 1} / {totalDocs.toLocaleString()} {statusFilter ? STATUS_LABELS[statusFilter] || statusFilter : hasExtraFilters ? 'filtered entries' : 'entries'}
            {/if}
          </div>
        </div>
      </div>
    </div>

    {#if loadingInitial}
      <div class="qs-state-message">
        <LoaderCircle size={28} class="qs-spinner" />
        <p>{isTargetMode ? `Locating comic #${targetComicId}...` : `Loading ${statusFilter ? STATUS_LABELS[statusFilter] || statusFilter : ''} comics...`}</p>
      </div>
    {:else if error}
      <div class="qs-state-message">
        <p>{error}</p>
        <Button themed size="sm" onclick={loadInitial}>Retry</Button>
      </div>
    {:else if doneForNow}
      <div class="qs-state-message">
        <p>Nothing left in this list right now. 🎉</p>
      </div>
    {:else if current}
      <div
        class="qs-image-area"
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
      >
        <Button
          themed
          variant="ghost"
          size="icon"
          class="qs-nav-arrow qs-nav-arrow--prev"
          onclick={prev}
          disabled={index === 0}
          aria-label="Previous comic"
        >
          <ChevronLeft size={28} />
        </Button>

        {#key current.id}
          {#if currentMeta && currentMeta.images.length === 0}
            <div class="qs-images qs-images--empty">
              <p>No preview images available for this comic.</p>
            </div>
          {:else}
            <div class="qs-images-column">
              <div class="qs-images-viewport">
                <div class="qs-images-track" style="transform: translateX(-{mobileImageIndex * 100}%)">
                  {#each currentImages as img (img.n)}
                    <div class="qs-image-wrapper">
                      <QuickSortImage comicId={current.comicId} n={img.n} ext={img.ext} />
                    </div>
                  {/each}
                </div>
              </div>
              {#if currentImages.length > 1}
                <div class="qs-mobile-dots">
                  {#each currentImages as img, i (img.n)}
                    <button
                      class="qs-mobile-dot"
                      class:qs-mobile-dot--active={i === mobileImageIndex}
                      onclick={() => (mobileImageIndex = i)}
                      aria-label="Show image {i + 1} of {currentImages.length}"
                    ></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/key}

        <Button
          themed
          variant="ghost"
          size="icon"
          class="qs-nav-arrow qs-nav-arrow--next"
          onclick={next}
          disabled={index >= entries.length - 1 && !hasNextPage}
          aria-label="Next comic"
        >
          <ChevronRight size={28} />
        </Button>

        <div class="qs-mobile-comic-nav">
          <Button
            themed
            size="sm"
            class="qs-mobile-comic-nav-btn"
            onclick={prev}
            disabled={index === 0}
          >
            <ChevronLeft size={16} /> Previous
          </Button>
          <Button
            themed
            size="sm"
            class="qs-mobile-comic-nav-btn"
            onclick={next}
            disabled={index >= entries.length - 1 && !hasNextPage}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div class="qs-bottom-bar">
        {#if !canEdit}
          <div class="qs-readonly-note">Log in with archivist access to sort entries.</div>
        {:else}
          {@const entryLocked = locked(current)}
          {@const preparerOfThis = isPreparer(current)}
          {@const willExclude = !current.isSpriteComic && !current.isGameRelated}
          {@const relevant = isRelevant(current)}
          {@const missingCategory = relevant && !current.category}

          <div class="qs-flags-row">
            <div class="qs-flag-group">
              <span class="qs-flag-label">Sprite Comic?</span>
              <ToggleGroup
                value={String(current.isSpriteComic ?? false)}
                options={YES_NO_OPTIONS}
                disabled={!!savingField || entryLocked}
                themed
                onValueChange={(v) => setFlag('isSpriteComic', v === 'true')}
                class="qs-flag-buttons"
              />
            </div>

            {#if !current.isSpriteComic}
              <div class="qs-flag-group">
                <span class="qs-flag-label">Game Related?</span>
                <ToggleGroup
                  value={String(current.isGameRelated ?? false)}
                  options={YES_NO_OPTIONS}
                  disabled={!!savingField || entryLocked}
                  themed
                  onValueChange={(v) => setFlag('isGameRelated', v === 'true')}
                  class="qs-flag-buttons"
                />
              </div>
            {/if}
          </div>

          <div class="qs-flag-group qs-category-group">
            <span class="qs-flag-label">Category{missingCategory ? ' (required)' : ''}</span>
            <div class="qs-category-desktop">
              <EditableComboboxCell
                value={current.category ?? ''}
                options={CATEGORY_EDIT_OPTIONS}
                placeholder={relevant ? 'Uncategorized' : 'N/A'}
                searchPlaceholder="Search or add a category..."
                disabled={!!savingField || entryLocked || !relevant}
                faded
                creatable
                onSave={setCategory}
              />
            </div>
            <!-- Mobile-only: a real <select> instead of the popover-based
                 Combobox above, so tapping it opens the phone's own native
                 picker overlay (which the Combobox's custom popover isn't
                 doing reliably inside this fixed full-screen modal) rather
                 than trying to fix that popover's stacking/portal behavior
                 here. A trailing "+ Add new category..." option stands in
                 for the Combobox's inline creatable text field, since a
                 native <select> has no room for free text of its own. -->
            <select
              class="qs-category-native"
              value={current.category ?? ''}
              disabled={!!savingField || entryLocked || !relevant}
              onchange={handleNativeCategorySelect}
            >
              {#each CATEGORY_NATIVE_OPTIONS as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>

          {#if current.status === 'unsorted'}
            <Button
              themed
              class="qs-ready-btn"
              disabled={!!savingField || missingCategory}
              title={missingCategory ? 'Pick a category before submitting this for review' : undefined}
              onclick={markReady}
            >
              {#if savingField === 'ready'}
                <LoaderCircle size={16} class="qs-spinner" /> Submitting...
              {:else}
                Ready for Review →
              {/if}
            </Button>
          {:else if current.status === 'ready-for-review'}
            {#if preparerOfThis}
              <div class="qs-readonly-note qs-ready-btn">You prepared this one - awaiting review from another archivist.</div>
            {:else}
              <Button themed class="qs-ready-btn" disabled={!!savingField} onclick={confirmReviewAction}>
                {#if savingField === 'confirm'}
                  <LoaderCircle size={16} class="qs-spinner" /> Submitting...
                {:else}
                  {willExclude ? 'Confirm Exclusion' : 'Confirm Review'} →
                {/if}
              </Button>
            {/if}
          {:else}
            <div class="qs-ready-btn">
              <ArchiveStatusBadge status={current.status} />
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Buttons/toggles below are rendered by child components (Button,
     ToggleGroup) - the class names we pass them land on those components'
     own DOM output, outside this file's normal scoped-CSS boundary, so
     any selector targeting them has to use :global() to actually match. */

  .qs-overlay {
    position: fixed;
    inset: 0;
    background: var(--page-color);
    color: var(--font-color);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    font-family: 'saira', monospace;
    /* Stops a touch drag that reaches the edge of a scrollable area inside
       the modal (e.g. the images filmstrip) from chaining into the
       background page or triggering pull-to-refresh, on top of the body
       scroll lock in script. */
    overscroll-behavior: contain;
  }

  .qs-top-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    flex-shrink: 0;
  }

  .qs-top-bar-text {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .qs-title {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    overflow: hidden;
  }

  .qs-comic-id {
    font-weight: 700;
    flex-shrink: 0;
  }

  .qs-comic-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qs-comic-author {
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-size: 13px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .qs-page-badge {
    flex-shrink: 0;
    /* Same size as the progress counter next to it - both are plain
       secondary text now, not a boxed badge. */
    font-size: 13px;
    color: color-mix(in srgb, var(--font-color) 70%, transparent);
    white-space: nowrap;
  }

  .qs-page-badge--loading {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.7;
  }

  .qs-meta-divider {
    flex-shrink: 0;
    font-size: 13px;
    color: color-mix(in srgb, var(--font-color) 40%, transparent);
  }

  .qs-images--empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-size: 14px;
  }

  .qs-top-bar-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
    /* Sticks this whole block (counter, divider, page-info) to the right
       edge of .qs-top-bar-text on desktop, where .qs-title doesn't grow
       to fill the row on its own. */
    margin-left: auto;
  }

  .qs-progress {
    font-size: 13px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    flex-shrink: 0;
  }

  .qs-state-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
  }

  .qs-image-area {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    min-height: 0;
    overflow: hidden;
  }

  .qs-images-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }

  .qs-images {
    flex: 1;
    display: flex;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
    overflow-x: auto;
  }

  /* Desktop: a plain row showing every image side by side, same as before.
     mobileImageIndex (and thus the track's translateX offset) only ever
     moves via swipe/dots, which are gated to narrow viewports in script,
     so this stays at translateX(0) in practice on desktop. */
  .qs-images-viewport {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior: contain;
  }

  .qs-images-track {
    display: flex;
    gap: 0.5rem;
    height: 100%;
    transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .qs-image-wrapper {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
  }

  .qs-mobile-dots {
    display: none;
  }

  .qs-mobile-comic-nav {
    display: none;
  }

  :global(.qs-nav-arrow) {
    flex-shrink: 0;
  }

  .qs-bottom-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--page-color) 60%, black);
  }

  .qs-readonly-note {
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-size: 14px;
  }

  .qs-flags-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .qs-flag-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .qs-flag-label {
    font-size: 13px;
    color: color-mix(in srgb, var(--font-color) 70%, transparent);
    white-space: nowrap;
  }

  .qs-category-native {
    display: none;
  }

  :global(.qs-ready-btn) {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  :global(.qs-spinner) {
    animation: qs-spin 1s linear infinite;
  }

  @keyframes qs-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile: three images side by side don't fit on a phone screen, so
     instead each image becomes a full-width "slide" and the track slides
     between them (swipe, or the dots) with a real animated transition.
     Comic-to-comic navigation moves from the (now-hidden) side arrows to
     the dedicated Previous/Next buttons below, and the bottom bar's
     buttons stack full-width for easy thumb reach. */
  @media (max-width: 640px) {
    /* The title (id/title/author) and the meta row (page-count badge +
       progress counter) were all fighting for one narrow row - stack them
       instead. .qs-top-bar-text is its own independent column here, sized
       purely by its own two lines of text - not by the close button
       beside it, which is what caused the gap between the lines when this
       used to be done by wrapping the whole top bar (the button's height
       determined the wrapped row's height regardless of the shorter text
       inside it, pushing the second line down after the button's full
       height instead of right after the text). */
    .qs-top-bar {
      align-items: flex-start;
      padding: 0.35rem 0.75rem;
    }

    .qs-top-bar-text {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
    }

    .qs-title {
      line-height: 1.1;
    }

    .qs-comic-author {
      display: none;
    }

    .qs-top-bar-meta {
      justify-content: flex-start;
      gap: 0.4rem;
      line-height: 1.75;
      /* Undo the desktop right-alignment - mobile stacks everything
         left-aligned under the title instead. */
      margin-left: 0;
    }

    .qs-page-badge {
      /* Matches the counter's mobile size the same way it does - inherit
         through the ambient chain rather than a separate literal value. */
      font-size: inherit;
      white-space: normal;
    }

    .qs-progress {
      /* Matches the title's font size (the base rule's 13px is a desktop
         secondary-text size) by inheriting through the same ambient
         chain .qs-comic-title/.qs-comic-id resolve through, rather than
         guessing at a literal pixel value. */
      font-size: inherit;
      white-space: nowrap;
    }

    :global(.qs-nav-arrow) {
      display: none;
    }

    .qs-image-area {
      flex-direction: column;
      /* No side padding - the dark comic box should run edge to edge on
         mobile, not shrink-wrap to whatever size the loaded page happens
         to be. No top padding either, so the box starts immediately below
         the title bar instead of leaving a thin gap of bare background
         above it; bottom padding is kept for breathing room before the
         controls below. */
      padding: 0 0 0.5rem;
      gap: 0;
    }

    /* The modal locks body scroll and is a fixed full-viewport overlay
       while open, so 100vw reliably matches the actual available width
       here - using it explicitly at every level (instead of chained
       percentages depending on ancestor flex-grow having already
       resolved) is what actually stops the box rendering thin for a
       frame before settling to full width while an image is loading. */
    .qs-images-viewport {
      overflow: hidden;
      width: 100vw;
      min-height: 45vh;
    }

    .qs-images-track {
      gap: 0;
      width: 100vw;
    }

    .qs-image-wrapper {
      flex: 0 0 100vw;
      width: 100vw;
      min-width: 100vw;
    }

    .qs-mobile-dots {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
      flex-shrink: 0;
    }

    .qs-mobile-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      padding: 0;
      border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
      background: color-mix(in srgb, var(--page-color) 60%, black);
      cursor: pointer;
      transition: background 200ms ease, border-color 200ms ease;
    }

    .qs-mobile-dot--active {
      background: var(--font-link-color);
      border-color: var(--font-link-color);
    }

    .qs-mobile-comic-nav {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      width: 100%;
      padding-top: 0.6rem;
      flex-shrink: 0;
    }

    :global(.qs-mobile-comic-nav-btn) {
      flex: 1;
      max-width: 160px;
      justify-content: center;
      gap: 0.3rem;
    }

    .qs-bottom-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.6rem;
      /* The prev/next buttons directly above (in .qs-image-area) and this
         bar read as one continuous controls section on mobile - no
         divider, and the same background (.qs-image-area has none of its
         own, so it shows the overlay's plain page-color) rather than this
         bar's usual darker "well" tint, unlike desktop where the bottom
         bar sits below the actual image viewer as a visually separate
         toolbar. */
      border-top: none;
      padding-top: 0.4rem;
      background: var(--page-color);
    }

    /* Sprite Comic? and Game Related? share one row, each taking half the
       width - label stacked above its toggle (rather than side by side)
       since there isn't enough width in a half-row for both. */
    .qs-flags-row {
      gap: 0.6rem;
    }

    .qs-flags-row .qs-flag-group {
      flex: 1;
      min-width: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0.3rem;
    }

    /* ToggleGroup's root is inline-flex and its Yes/No items size to their
       own content by default - stretching the root to the full column
       width alone just leaves dead space after two narrow buttons. Making
       the root a real flex container and each item flex:1 splits that
       column width evenly between them, so Yes/No each end up a quarter of
       the full screen width (half the row, halved again by the two
       buttons) instead of small buttons floating in a too-wide box. */
    :global(.qs-flags-row .qs-flag-buttons) {
      width: 100%;
      display: flex !important;
    }

    :global(.qs-flags-row .qs-flag-buttons .theme-toggle-group-item) {
      flex: 1;
    }

    /* The category combobox (with its search input/dropdown) needs more
       room than a two-option toggle group - stack its label above it and
       let it take the full row width instead of squeezing it into the same
       space-between row the Yes/No toggles use. Always shown (even before
       the entry is flagged relevant, just disabled) so the layout doesn't
       jump around as soon as one of the toggles above is answered. */
    .qs-category-group {
      flex-direction: column;
      align-items: stretch;
      gap: 0.3rem;
    }

    :global(.qs-category-group .cell-combobox) {
      width: 100%;
    }

    /* Swap the popover-based Combobox for a real <select> on mobile - see
       the template comment above it. */
    .qs-category-desktop {
      display: none;
    }

    .qs-category-native {
      display: block;
      width: 100%;
      background: color-mix(in srgb, var(--page-color) 60%, black);
      border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
      color: var(--font-color);
      font-family: 'saira', monospace;
      font-size: 14px;
      padding: 8px 12px;
      min-height: 42px;
    }

    .qs-category-native:disabled {
      opacity: 0.5;
    }

    :global(.qs-ready-btn) {
      margin-left: 0;
      justify-content: center;
      width: 100%;
    }
  }
</style>
