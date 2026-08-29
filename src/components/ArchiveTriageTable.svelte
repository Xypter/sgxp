<script lang="ts">
  import {
    type ColumnDef,
    type PaginationState,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from '@tanstack/table-core';
  import { createSvelteTable, renderComponent } from '$components/ui/data-table';
  import { DataTable, Select, Input, Button } from '$lib/components';
  import { ExternalLink, LoaderCircle, Check } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  import EditableSelectCell from './archive/cells/EditableSelectCell.svelte';
  import EditableComboboxCell from './archive/cells/EditableComboboxCell.svelte';
  import EditableNotesCell from './archive/cells/EditableNotesCell.svelte';
  import EditableCheckboxCell from './archive/cells/EditableCheckboxCell.svelte';
  import EditableToggleButtonsCell from './archive/cells/EditableToggleButtonsCell.svelte';
  import ArchiveStatusBadge from './archive/cells/ArchiveStatusBadge.svelte';
  import ReviewStatusCell from './archive/cells/ReviewStatusCell.svelte';
  import PlainTextCell from './archive/cells/PlainTextCell.svelte';
  import LinkCell from './archive/cells/LinkCell.svelte';
  import SortableHeaderButton from './archive/cells/SortableHeaderButton.svelte';

  function sortableHeader(label: string) {
    return ({ column }: any) =>
      renderComponent(SortableHeaderButton as any, {
        label,
        sorted: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      });
  }

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
    category?: string | null;
    isSpriteComic?: boolean;
    isGameRelated?: boolean;
    rating?: number | null;
    quality?: string | null;
    notes?: string;
    status: 'unsorted' | 'ready-for-review' | 'ready-for-rating' | 'ready-to-upload' | 'uploaded' | 'excluded';
    link?: string;
    preparedBy?: UserRef | number | string | null;
    reviewedBy?: UserRef | number | string | null;
    updatedAt?: string;
  }

  interface Props {
    user: any;
  }

  let { user }: Props = $props();

  const CATEGORY_OPTIONS = [
    'Chrono Trigger', 'Digimon', 'Donkey Kong', 'Dragonball', 'Earthbound', 'Final Fantasy',
    'Fire Emblem', 'Fox McCloud', 'Halo', 'Kingdom Hearts', 'Kirby', 'Klonoa Wolf', 'Mario',
    'Megaman', 'Memes', 'Metroid', 'Mixed', 'Naruto', 'One Piece', 'Pokemon', 'Random', 'Sonic',
    'Super Smash Bros', 'The Legend of Zelda', 'Yu-Gi-Oh',
  ].map((v) => ({ value: v, label: v }));

  // Separate from CATEGORY_OPTIONS (used as-is by the toolbar filter, whose
  // blank option already means "all categories") - this variant's blank
  // option is a real, selectable "clear the category" choice.
  const CATEGORY_EDIT_OPTIONS = [{ value: '', label: '— Uncategorized —' }, ...CATEGORY_OPTIONS];

  // Declaration order doubles as the pipeline order (and Postgres's default
  // sort order for this enum column) - keep it this way.
  const STATUS_OPTIONS = [
    { value: 'unsorted', label: 'Unsorted' },
    { value: 'ready-for-review', label: 'Ready for Review' },
    { value: 'ready-for-rating', label: 'Ready for Rating' },
    { value: 'ready-to-upload', label: 'Ready to Upload' },
    { value: 'uploaded', label: 'Uploaded' },
    { value: 'excluded', label: 'Excluded' },
  ];

  const YES_NO_OPTIONS = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  // 0-10: some existing entries genuinely use a rating of 0 ("Questioned my
  // sanity archiving this" quality tier), so it's included rather than 1-10.
  const RATING_OPTIONS = [
    { value: '', label: '— Unset —' },
    ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
  ];

  const isAdmin = user?.role === 'admin' || user?.role === 'king-of-mobius';
  // Flips true on a live access-granted SSE push (see the EventSource
  // listener below) without needing a page reload.
  let accessGrantedLive = $state(false);
  // isArchivist is an additive grant layered on top of a user's existing
  // role (e.g. Comic Creator keeps their role and also gets archive access).
  const canEdit = $derived(isAdmin || user?.role === 'archivist' || user?.isArchivist === true || accessGrantedLive);
  const currentUserId = user?.id;

  // Archivist access request (see src/pages/api/request-archivist-access.ts)
  let archivistRequestedAt = $state<string | null>(user?.archivistRequestedAt ?? null);
  let requestingAccess = $state(false);

  async function requestArchivistAccess() {
    requestingAccess = true;
    try {
      const response = await fetch('/api/request-archivist-access', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to send request');
      archivistRequestedAt = data.archivistRequestedAt ?? new Date().toISOString();
      toast.success('Request sent!', { description: "You'll be notified once access is granted." });
    } catch (err) {
      toast.error('Failed to send request', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      requestingAccess = false;
    }
  }

  // State
  let entries = $state<ArchiveEntry[]>([]);
  let totalEntries = $state(0);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Save status indicator (top-right of the toolbar box)
  let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
  let activeSaveCount = 0;
  let savedResetTimer: ReturnType<typeof setTimeout>;

  // Filters
  let searchInput = $state('');
  // Unsorted is the overwhelming majority of the 34k+ row backlog and the
  // actual triage starting point - default to it instead of "All Statuses"
  // so the page opens on what there's actually work to do on.
  let statusFilter = $state('unsorted');
  let searchDebounceTimer: ReturnType<typeof setTimeout>;

  // Table state
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 25 });
  // Postgres enum ordering for status matches declaration order (see
  // STATUS_ORDER below), so ascending sort surfaces the earliest-pipeline-
  // stage entries first - exactly the triage priority we want.
  let sorting = $state<SortingState>([{ id: 'status', desc: false }]);

  let pageCount = $derived(Math.ceil(totalEntries / pagination.pageSize));

  function buildQuery(): string {
    const params = new URLSearchParams();
    params.set('limit', String(pagination.pageSize));
    params.set('page', String(pagination.pageIndex + 1));
    params.set('depth', '1');

    const sortField = sorting[0]?.id || 'comicId';
    const sortDir = sorting[0]?.desc ? '-' : '';
    params.set('sort', `${sortDir}${sortField}`);

    let clauseIndex = 0;
    if (statusFilter) {
      params.set(`where[and][${clauseIndex}][status][equals]`, statusFilter);
      clauseIndex++;
    }
    if (searchInput.trim()) {
      params.set(`where[and][${clauseIndex}][or][0][title][contains]`, searchInput.trim());
      params.set(`where[and][${clauseIndex}][or][1][author][contains]`, searchInput.trim());
      clauseIndex++;
    }

    return params.toString();
  }

  // Collection-wide totals for the results-count line - independent of the
  // current page/filters, so these always reflect the whole 34k+ row
  // archive rather than whatever's currently filtered/paginated.
  let collectionStats = $state({ total: 0, unsorted: 0, excluded: 0 });

  let sortedCount = $derived(collectionStats.total - collectionStats.unsorted);
  // Kept is "sorted but not excluded" (not a separate query) so it and
  // Excluded always add up to exactly Sorted.
  let keptCount = $derived(sortedCount - collectionStats.excluded);
  let percentSorted = $derived(collectionStats.total > 0 ? (sortedCount / collectionStats.total) * 100 : 0);
  let percentExcluded = $derived(collectionStats.total > 0 ? (collectionStats.excluded / collectionStats.total) * 100 : 0);
  let percentKept = $derived(percentSorted - percentExcluded);

  async function fetchStats() {
    try {
      const [total, unsorted, excluded] = await Promise.all([
        fetch('/api/archive-entries?limit=1').then((r) => r.json()),
        fetch('/api/archive-entries?limit=1&where[status][equals]=unsorted').then((r) => r.json()),
        fetch('/api/archive-entries?limit=1&where[status][equals]=excluded').then((r) => r.json()),
      ]);
      collectionStats = {
        total: total.totalDocs || 0,
        unsorted: unsorted.totalDocs || 0,
        excluded: excluded.totalDocs || 0,
      };
    } catch {
      // Best-effort - a failed stats fetch just leaves the last known numbers showing.
    }
  }

  $effect(() => {
    fetchStats();
  });

  async function fetchEntries() {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`/api/archive-entries?${buildQuery()}`);
      if (!response.ok) throw new Error('Failed to load archive entries');
      const data = await response.json();
      entries = data.docs || [];
      totalEntries = data.totalDocs || 0;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load archive entries';
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    const _ = [pagination.pageIndex, pagination.pageSize, sorting, statusFilter];
    fetchEntries();
  });

  // The default sort funnels every archivist toward the same unreviewed rows
  // at the top of page 1, so silent same-row edits from someone else are
  // otherwise invisible until a manual refresh. The SSE connection below
  // (fed by Payload's archive-entry-updated webhook) delivers near-instant
  // notice of a change; this poll is just the fallback for when that
  // connection is down or reconnecting. Always the current page (not the
  // whole 34k-row collection).
  const POLL_INTERVAL_MS = 60000;
  const POLL_DEBOUNCE_MS = 500;
  let pollDebounceTimer: ReturnType<typeof setTimeout>;

  function pollEntriesDebounced() {
    clearTimeout(pollDebounceTimer);
    pollDebounceTimer = setTimeout(pollEntries, POLL_DEBOUNCE_MS);
  }

  async function pollEntries() {
    // A save in flight means `entries` holds an optimistic local edit that
    // hasn't round-tripped yet - overwriting it here would either flicker
    // the field back to its old value or clobber the pending write.
    if (activeSaveCount > 0) return;
    fetchStats();
    try {
      const response = await fetch(`/api/archive-entries?${buildQuery()}`);
      if (!response.ok) return;
      const data = await response.json();
      const fresh: ArchiveEntry[] = data.docs || [];

      const changedByOthers = fresh.filter((f) => {
        const existing = entries.find((e) => e.id === f.id);
        return existing && existing.updatedAt !== f.updatedAt;
      });

      entries = fresh;
      totalEntries = data.totalDocs || 0;

      if (changedByOthers.length > 0) {
        toast.info(
          changedByOthers.length === 1
            ? `"${changedByOthers[0].title || '(untitled)'}" was just updated by someone else`
            : `${changedByOthers.length} entries on this page were just updated by someone else`,
          { description: 'Refreshed with their changes.' }
        );
      }
    } catch {
      // A background poll failing shouldn't interrupt the user - the next
      // tick (or their next manual action) will retry.
    }
  }

  $effect(() => {
    const interval = setInterval(pollEntries, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  });

  // EventSource auto-reconnects on drop, so this is the "instant" path -
  // the interval above only matters while a connection is down/reconnecting.
  $effect(() => {
    const source = new EventSource('/api/archive-entries/stream');
    source.onopen = () => console.log('[SSE] connected');
    source.onerror = (e) => console.warn('[SSE] error/reconnecting', e);
    source.addEventListener('entry-updated', (e) => {
      console.log('[SSE] entry-updated received', e.data);
      pollEntriesDebounced();
    });
    source.addEventListener('access-granted', () => {
      if (accessGrantedLive) return;
      accessGrantedLive = true;
      toast.success('🎉 Archivist access granted!', { description: 'You can now edit entries on this page.' });
    });
    return () => {
      source.close();
      clearTimeout(pollDebounceTimer);
    };
  });

  function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      pagination = { ...pagination, pageIndex: 0 };
      fetchEntries();
    }, 400);
  }

  async function saveField(entry: ArchiveEntry, field: string, value: unknown) {
    if (!canEdit) return;

    activeSaveCount++;
    saveStatus = 'saving';
    clearTimeout(savedResetTimer);

    const previous = entries;
    entries = entries.map((e) => (e.id === entry.id ? { ...e, [field]: value } : e));

    let succeeded = false;
    try {
      const response = await fetch(`/api/archive-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Payload wraps thrown hook errors as { errors: [{ message }] } over
        // HTTP - there's no top-level `message` field, so checking that
        // alone always fell through to the generic fallback below.
        const serverMessage = data.errors?.[0]?.message || data.message;
        throw new Error(serverMessage || 'Failed to save');
      }
      // Merge the server's returned doc back in - picks up server-computed
      // fields (e.g. quality is derived from rating) that the optimistic
      // update above wouldn't know about.
      if (data.doc) {
        entries = entries.map((e) => (e.id === entry.id ? { ...e, ...data.doc } : e));
      }
      succeeded = true;
    } catch (err) {
      entries = previous;
      toast.error('Failed to save change', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      activeSaveCount--;
      if (activeSaveCount === 0) {
        if (succeeded) {
          saveStatus = 'saved';
          savedResetTimer = setTimeout(() => {
            saveStatus = 'idle';
          }, 2000);
        } else {
          saveStatus = 'idle';
        }
      }
    }
  }

  function markReady(entry: ArchiveEntry) {
    saveField(entry, 'status', 'ready-for-review');
  }

  // Confirming review has two possible outcomes, decided by whether the
  // entry is actually worth archiving - sprite comic or game related lands
  // it at ready-for-rating, neither means it gets excluded instead. Same
  // "any archivist but the preparer" action either way (see
  // ReviewStatusCell), just a different destination.
  function confirmReview(entry: ArchiveEntry) {
    const target = entry.isSpriteComic || entry.isGameRelated ? 'ready-for-rating' : 'excluded';
    saveField(entry, 'status', target);
  }

  function markReadyToUpload(entry: ArchiveEntry) {
    saveField(entry, 'status', 'ready-to-upload');
  }

  function markUploaded(entry: ArchiveEntry) {
    saveField(entry, 'status', 'uploaded');
  }

  const STATUS_ORDER = [
    'unsorted',
    'ready-for-review',
    'ready-for-rating',
    'ready-to-upload',
    'uploaded',
    'excluded',
  ];

  // Once an entry reaches "ready for rating" it's locked in for everyone
  // except admins (mirrors the backend's archivistAccess Where-clause
  // restriction) - this single check replaces what used to be two separate
  // locks (identification flags locking on review, then a full row lock on
  // upload), since the whole pipeline is now one field.
  function locked(entry: ArchiveEntry): boolean {
    return !isAdmin && STATUS_ORDER.indexOf(entry.status) >= STATUS_ORDER.indexOf('ready-for-rating');
  }

  // Category/Rating only matter once an entry is actually worth archiving -
  // either it's a sprite comic outright, or it's been flagged game-related
  // (e.g. a game fan comic that isn't a sprite comic but is still in scope).
  function isRelevant(entry: ArchiveEntry): boolean {
    return !!entry.isSpriteComic || !!entry.isGameRelated;
  }

  function nameOf(ref: UserRef | number | string | null | undefined): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === 'object') return ref.displayName || ref.username || `User #${ref.id}`;
    return `User #${ref}`;
  }

  // Rating/Quality/Notes are admin-only - hidden entirely for everyone else
  // rather than shown locked, since archivists have no use for them.
  const adminOnlyColumns: ColumnDef<ArchiveEntry>[] = isAdmin
    ? [
        {
          accessorKey: 'rating',
          header: sortableHeader('Rating'),
          cell: ({ row }) =>
            renderComponent(EditableSelectCell as any, {
              value: row.original.rating !== undefined && row.original.rating !== null ? String(row.original.rating) : '',
              options: RATING_OPTIONS,
              placeholder: 'Unset',
              disabled: !isRelevant(row.original),
              faded: !isRelevant(row.original),
              onSave: (value: string) => saveField(row.original, 'rating', value === '' ? null : Number(value)),
            }),
        },
        {
          accessorKey: 'quality',
          header: 'Quality',
          cell: ({ row }) =>
            renderComponent(PlainTextCell as any, {
              value: row.original.quality,
              fallback: '—',
              class: 'entry-quality',
            }),
          enableSorting: false,
        },
        {
          accessorKey: 'notes',
          header: 'Notes',
          cell: ({ row }) =>
            renderComponent(EditableNotesCell as any, {
              value: row.original.notes ?? '',
              onSave: (value: string) => saveField(row.original, 'notes', value),
            }),
          enableSorting: false,
        },
      ]
    : [];

  const columns: ColumnDef<ArchiveEntry>[] = [
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
      accessorKey: 'isSpriteComic',
      header: sortableHeader('Sprite Comic?'),
      cell: ({ row }) =>
        renderComponent(EditableToggleButtonsCell as any, {
          value: String(row.original.isSpriteComic ?? false),
          options: YES_NO_OPTIONS,
          disabled: !canEdit || locked(row.original),
          onSave: (value: string) => saveField(row.original, 'isSpriteComic', value === 'true'),
        }),
    },
    {
      accessorKey: 'isGameRelated',
      header: sortableHeader('Game Related?'),
      cell: ({ row }) =>
        row.original.isSpriteComic
          ? renderComponent(PlainTextCell as any, { fallback: '—', class: 'entry-na' })
          : renderComponent(EditableCheckboxCell as any, {
              value: row.original.isGameRelated ?? false,
              disabled: !canEdit || locked(row.original),
              onSave: (value: boolean) => saveField(row.original, 'isGameRelated', value),
            }),
    },
    {
      accessorKey: 'category',
      header: sortableHeader('Category'),
      cell: ({ row }) =>
        renderComponent(EditableComboboxCell as any, {
          value: row.original.category ?? '',
          options: CATEGORY_EDIT_OPTIONS,
          placeholder: 'Uncategorized',
          searchPlaceholder: 'Search or add a category...',
          disabled: !canEdit || !isRelevant(row.original) || locked(row.original),
          faded: !isRelevant(row.original),
          creatable: true,
          onSave: (value: string) => saveField(row.original, 'category', value === '' ? null : value),
        }),
    },
    // Rating/Quality/Notes are admin-only fields - hidden entirely for
    // everyone else rather than shown locked, since archivists (and any
    // other logged-in viewer) have no use for them.
    ...adminOnlyColumns,
    {
      accessorKey: 'status',
      header: sortableHeader('Status'),
      cell: ({ row }) =>
        isAdmin
          ? renderComponent(EditableSelectCell as any, {
              value: row.original.status,
              options: STATUS_OPTIONS,
              onSave: (value: string) => saveField(row.original, 'status', value),
            })
          : renderComponent(ArchiveStatusBadge as any, { status: row.original.status }),
    },
    {
      id: 'preparedBy',
      header: 'Preparer',
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: nameOf(row.original.preparedBy),
          fallback: '—',
        }),
      enableSorting: false,
    },
    {
      id: 'reviewedBy',
      header: 'Reviewer',
      cell: ({ row }) =>
        renderComponent(PlainTextCell as any, {
          value: nameOf(row.original.reviewedBy),
          fallback: '—',
        }),
      enableSorting: false,
    },
    {
      id: 'review',
      header: 'Review',
      cell: ({ row }) =>
        renderComponent(ReviewStatusCell as any, {
          status: row.original.status,
          isSpriteComic: row.original.isSpriteComic,
          isGameRelated: row.original.isGameRelated,
          preparedBy: row.original.preparedBy,
          reviewedBy: row.original.reviewedBy,
          currentUserId,
          canEdit,
          isAdmin,
          onMarkReady: () => markReady(row.original),
          onConfirm: () => confirmReview(row.original),
          onMarkReadyToUpload: () => markReadyToUpload(row.original),
          onMarkUploaded: () => markUploaded(row.original),
        }),
      enableSorting: false,
    },
    {
      id: 'link',
      header: 'Link',
      cell: ({ row }) =>
        renderComponent(LinkCell as any, {
          // Always this exact pattern - derive it from comicId rather than
          // trusting the stored `link` field, which is missing/inconsistent
          // for most of the archive. Only shown once the comic is actually
          // live on the site.
          href: row.original.status === 'uploaded' ? `/jeevespage?comic_id=${row.original.comicId}` : undefined,
        }),
      enableSorting: false,
    },
  ];

  // Derived (not a plain const) so a fresh table instance is built whenever
  // entries/pagination/sorting/totalEntries change - avoids relying on
  // createSvelteTable's internal getter-based option updates, which only
  // reliably re-render for callers that pre-populate data via SSR props
  // (see UserUploadsViewer.svelte) rather than starting empty and fetching.
  let table = $derived.by(() =>
    createSvelteTable({
      data: entries,
      columns,
      state: { pagination, sorting },
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      manualPagination: true,
      manualSorting: true,
      pageCount: Math.ceil(totalEntries / pagination.pageSize),
      onPaginationChange: (updater) => {
        pagination = typeof updater === 'function' ? updater(pagination) : updater;
      },
      onSortingChange: (updater) => {
        sorting = typeof updater === 'function' ? updater(sorting) : updater;
        pagination = { ...pagination, pageIndex: 0 };
      },
    })
  );
</script>

<div class="triage-table">
  <div class="toolbar-panel">
    <div class="toolbar-header">
      <div class="toolbar-header-text">
        <h1>Smack Jeeves Archive Triage</h1>
        <p>
          Help sort the SmackJeeves comic archive: flag whether each entry is actually a sprite
          comic, and fill in category, rating, and quality for anything still unlabeled.
        </p>
      </div>

      <div class="header-side">
        <div class="access-status">
          {#if canEdit}
            <span class="access-badge access-badge--granted">
              <Check size={14} /> Archivist Access
            </span>
          {:else if archivistRequestedAt}
            <span class="access-badge access-badge--pending">Archivist Request Pending</span>
          {:else}
            <Button themed size="sm" disabled={requestingAccess} onclick={requestArchivistAccess}>
              {requestingAccess ? 'Sending...' : 'Request Archivist Access'}
            </Button>
          {/if}
        </div>

        <div class="save-status save-status--{saveStatus}">
          {#if saveStatus === 'saving'}
            <LoaderCircle size={16} class="save-status-spinner" />
            <span>Saving...</span>
          {:else if saveStatus === 'saved'}
            <Check size={16} />
            <span>Saved</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="toolbar">
      <Input
        bind:value={searchInput}
        oninput={handleSearchInput}
        placeholder="Search by title or author..."
        themed
        class="toolbar-search"
      />
      <Select
        bind:value={statusFilter}
        options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
        placeholder="All Statuses"
        themed
      />
    </div>

    <div class="results-count">
      {totalEntries} entries
      {#if collectionStats.total > 0}
        <span class="stat-divider">—</span>
        <span>{collectionStats.total.toLocaleString()} total comics</span>
        <span class="stat-divider">—</span>
        <span title="{sortedCount.toLocaleString()} of {collectionStats.total.toLocaleString()} entries not unsorted">
          {sortedCount.toLocaleString()} Sorted ({percentSorted.toFixed(2)}%)
        </span>
        <span class="stat-divider">—</span>
        <span
          title="{keptCount.toLocaleString()} sorted entries not excluded, out of {collectionStats.total.toLocaleString()}"
        >
          {keptCount.toLocaleString()} Kept ({percentKept.toFixed(2)}%)
        </span>
        <span class="stat-divider">—</span>
        <span title="{collectionStats.excluded.toLocaleString()} of {collectionStats.total.toLocaleString()} entries excluded">
          {collectionStats.excluded.toLocaleString()} Excluded ({percentExcluded.toFixed(2)}%)
        </span>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error-state">
      <p>{error}</p>
    </div>
  {:else if isLoading && entries.length === 0}
    <div class="loading-state">
      <p>Loading archive entries...</p>
    </div>
  {:else}
    <!-- Desktop Table -->
    <div class="desktop-table">
      <DataTable {table} themed showPagination class="triage-data-table" emptyMessage="No entries match your filters." />
    </div>

    <!-- Mobile Cards -->
    <div class="mobile-cards">
      {#each entries as entry (entry.id)}
        <div class="entry-card">
          <div class="entry-card-header">
            <span class="entry-card-id">#{entry.comicId}</span>
            <span class="entry-card-title">{entry.title || '(untitled)'}</span>
            {#if entry.status === 'uploaded'}
              <a
                href="https://sgxp.me/jeevespage?comic_id={entry.comicId}"
                target="_blank"
                rel="noopener noreferrer"
                class="entry-card-link"
              >
                <ExternalLink size={16} />
              </a>
            {/if}
          </div>
          <div class="entry-card-author">By {entry.author || 'Unknown'}</div>

          <div class="entry-card-field-row">
            <div class="entry-card-field entry-card-field--checkbox">
              <label>Sprite Comic?</label>
              <EditableToggleButtonsCell
                value={String(entry.isSpriteComic ?? false)}
                options={YES_NO_OPTIONS}
                disabled={!canEdit || locked(entry)}
                onSave={(v) => saveField(entry, 'isSpriteComic', v === 'true')}
              />
            </div>
            <div class="entry-card-field entry-card-field--checkbox">
              <label>Game Related?</label>
              {#if entry.isSpriteComic}
                <span class="entry-na">—</span>
              {:else}
                <EditableCheckboxCell
                  value={entry.isGameRelated ?? false}
                  disabled={!canEdit || locked(entry)}
                  onSave={(v) => saveField(entry, 'isGameRelated', v)}
                />
              {/if}
            </div>
          </div>

          <div class="entry-card-field">
            <label>Category</label>
            <EditableComboboxCell
              value={entry.category ?? ''}
              options={CATEGORY_EDIT_OPTIONS}
              placeholder="Uncategorized"
              searchPlaceholder="Search or add a category..."
              disabled={!canEdit || !isRelevant(entry) || locked(entry)}
              faded={!isRelevant(entry)}
              creatable={true}
              onSave={(v) => saveField(entry, 'category', v === '' ? null : v)}
            />
          </div>

          <div class="entry-card-field-row">
            <div class="entry-card-field">
              <label>Preparer</label>
              <span class="entry-quality">{nameOf(entry.preparedBy) || '—'}</span>
            </div>
            <div class="entry-card-field">
              <label>Reviewer</label>
              <span class="entry-quality">{nameOf(entry.reviewedBy) || '—'}</span>
            </div>
          </div>

          <div class="entry-card-field">
            <label>Review</label>
            <ReviewStatusCell
              status={entry.status}
              isSpriteComic={entry.isSpriteComic}
              isGameRelated={entry.isGameRelated}
              preparedBy={entry.preparedBy}
              reviewedBy={entry.reviewedBy}
              {currentUserId}
              {canEdit}
              {isAdmin}
              onMarkReady={() => markReady(entry)}
              onConfirm={() => confirmReview(entry)}
              onMarkReadyToUpload={() => markReadyToUpload(entry)}
              onMarkUploaded={() => markUploaded(entry)}
            />
          </div>

          <div class="entry-card-field-row">
            {#if isAdmin}
              <div class="entry-card-field">
                <label>Rating</label>
                <EditableSelectCell
                  value={entry.rating !== undefined && entry.rating !== null ? String(entry.rating) : ''}
                  options={RATING_OPTIONS}
                  placeholder="Unset"
                  disabled={!isRelevant(entry)}
                  faded={!isRelevant(entry)}
                  onSave={(v) => saveField(entry, 'rating', v === '' ? null : Number(v))}
                />
              </div>
            {/if}
            <div class="entry-card-field">
              <label>Status</label>
              {#if isAdmin}
                <EditableSelectCell
                  value={entry.status}
                  options={STATUS_OPTIONS}
                  onSave={(v) => saveField(entry, 'status', v)}
                />
              {:else}
                <ArchiveStatusBadge status={entry.status} />
              {/if}
            </div>
          </div>

          {#if isAdmin}
            <div class="entry-card-field">
              <label>Quality</label>
              <span class="entry-quality">{entry.quality || '— (set by rating)'}</span>
            </div>

            <div class="entry-card-field">
              <label>Notes</label>
              <EditableNotesCell value={entry.notes ?? ''} onSave={(v) => saveField(entry, 'notes', v)} />
            </div>
          {/if}
        </div>
      {/each}

      {#if pageCount > 1}
        <div class="mobile-pagination">
          <button
            class="pagination-btn"
            onclick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <span class="pagination-info">Page {pagination.pageIndex + 1} of {pageCount}</span>
          <button
            class="pagination-btn"
            onclick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .triage-table {
    width: 100%;
  }

  .toolbar-panel {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 16px;
    margin-bottom: var(--gap, 20px);
  }

  .toolbar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .toolbar-header-text {
    flex: 1;
    min-width: 0;
  }

  .toolbar-header-text h1 {
    font-family: 'saira';
    font-weight: 800;
    font-size: 24px;
    color: var(--font-color);
    margin: 0 0 8px 0;
  }

  .toolbar-header-text p {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.8;
    margin: 0;
    max-width: 700px;
  }

  .header-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }

  .access-status {
    display: flex;
    align-items: center;
  }

  .access-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'saira';
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    padding: 6px 10px;
  }

  .access-badge--granted {
    color: #22c55e;
  }

  .access-badge--pending {
    color: var(--font-color);
    opacity: 0.7;
    font-style: italic;
  }

  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'saira';
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
    padding-top: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .save-status--saving {
    color: var(--font-color);
    opacity: 0.7;
  }

  .save-status--saved {
    color: #22c55e;
    opacity: 1;
  }

  :global(.save-status-spinner) {
    animation: save-status-spin 0.8s linear infinite;
  }

  @keyframes save-status-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  :global(.toolbar-search) {
    flex: 1;
    min-width: 220px;
    height: 42px !important;
    min-height: 42px !important;
  }

  .results-count {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    opacity: 0.7;
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

  :global(.triage-data-table [data-slot="table-head"]) {
    padding: 6px 10px !important;
    font-size: 12px !important;
  }

  :global(.triage-data-table [data-slot="table-cell"]) {
    padding: 6px 10px !important;
  }

  /* DataTable.svelte's pagination controls render outside .triage-data-table
     (a sibling of the table, not inside it), so this can't be scoped through
     that class - reaches directly into the shared component's own markup.
     Matches .mobile-pagination's boxed look below for consistency. */
  :global(.desktop-table .pagination-controls) {
    padding: 15px !important;
    background: var(--page-color) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    box-shadow: var(--box-shadow) !important;
    margin-top: 16px;
  }

  :global(.entry-quality) {
    display: block;
    width: 150px;
    color: var(--font-color);
    opacity: 0.75;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }


  :global(.entry-title),
  :global(.entry-author) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.entry-title) {
    color: var(--font-color);
    font-weight: 600;
    max-width: 240px;
  }

  :global(.entry-author) {
    color: var(--font-color);
    opacity: 0.85;
    max-width: 160px;
  }

  :global(.entry-link) {
    color: var(--font-link-color);
    text-decoration: none;
    font-weight: 600;
  }

  :global(.entry-link:hover) {
    text-decoration: underline;
  }


  .desktop-table {
    display: block;
  }

  .mobile-cards {
    display: none;
  }

  /* Mobile Cards */
  .entry-card {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: var(--box-shadow);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .entry-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'saira';
  }

  .entry-card-id {
    color: var(--font-color);
    opacity: 0.6;
    font-size: 13px;
  }

  .entry-card-title {
    color: var(--font-color);
    font-weight: 700;
    font-size: 15px;
    flex: 1;
  }

  .entry-card-link {
    color: var(--font-link-color);
    display: flex;
    align-items: center;
  }

  .entry-card-author {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    opacity: 0.7;
    margin-top: -6px;
  }

  .entry-card-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .entry-card-field--checkbox {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .entry-card-field--checkbox label {
    margin: 0;
  }

  .entry-card-field label {
    font-family: 'saira';
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--font-color);
    opacity: 0.7;
  }

  .entry-card-field-row {
    display: flex;
    gap: 10px;
  }

  .mobile-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 15px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .pagination-btn {
    padding: 8px 16px;
    background: var(--font-link-color);
    color: white;
    border: none;
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-info {
    font-family: 'saira';
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
  }

  @media (max-width: 768px) {
    .desktop-table {
      display: none;
    }

    .mobile-cards {
      display: block;
    }

    .toolbar {
      flex-direction: column;
    }
  }

  :global(.entry-na) {
    color: var(--font-color);
    opacity: 0.4;
    font-size: 13px;
    font-style: italic;
  }
</style>
