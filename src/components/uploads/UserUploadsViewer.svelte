<script lang="ts">
  import { createRawSnippet } from 'svelte';
  import {
    type ColumnDef,
    type PaginationState,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from '@tanstack/table-core';
  import { createSvelteTable, FlexRender, renderComponent, renderSnippet } from '$components/ui/data-table';
  import { DataTable, Badge, Button, AlertDialog } from '$lib/components';
  import { formatDate } from '$lib/spriteUtils';
  import { MessageSquare, ExternalLink } from 'lucide-svelte';
  import AdminFeedbackModal from './AdminFeedbackModal.svelte';
  import { toast } from 'svelte-sonner';

  // Cell components
  import StatusBadge from './cells/StatusBadge.svelte';
  import SpriteIconCell from './cells/SpriteIconCell.svelte';
  import ActionsCell from './cells/ActionsCell.svelte';

  interface Sprite {
    id: number;
    title: string;
    status: string;
    createdAt: string;
    iconImage?: { url: string };
    section?: { name: string };
    adminFeedback?: any[];
    submitterResponse?: any[];
    author?: any;
  }

  interface Props {
    user: any;
    initialSprites?: Sprite[];
    initialTotal?: number;
  }

  let { user, initialSprites = [], initialTotal = 0 }: Props = $props();

  // State
  let sprites = $state<Sprite[]>(initialSprites);
  let totalSprites = $state(initialTotal);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let hasInitialLoad = $state(false);

  // Modal state
  let feedbackModalOpen = $state(false);
  let selectedSprite = $state<Sprite | null>(null);

  // Delete dialog state
  let deleteDialogOpen = $state(false);
  let pendingDelete = $state<number | null>(null);
  let deletingSprite = $state<number | null>(null);

  // Table state
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
  let sorting = $state<SortingState>([{ id: 'createdAt', desc: true }]);

  // Fetch sprites
  async function fetchSprites() {
    if (!user?.id) return;

    isLoading = true;
    error = null;

    try {
      const page = pagination.pageIndex + 1;
      const sortField = sorting[0]?.id || 'createdAt';
      const sortDir = sorting[0]?.desc ? '-' : '';

      const params = new URLSearchParams({
        'where[author][equals]': user.id.toString(),
        'depth': '1',
        'limit': pagination.pageSize.toString(),
        'page': page.toString(),
        'sort': `${sortDir}${sortField}`
      });

      const response = await fetch(`/api/sprites?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sprites');
      }

      const data = await response.json();
      sprites = data.docs || [];
      totalSprites = data.totalDocs || 0;

    } catch (err) {
      console.error('Error fetching sprites:', err);
      error = err instanceof Error ? err.message : 'Failed to load sprites';
    } finally {
      isLoading = false;
    }
  }

  // Fetch sprites when pagination or sorting changes
  // Skip initial load if we already have SSR data
  $effect(() => {
    // Track pagination and sorting changes
    const _ = [pagination.pageIndex, pagination.pageSize, sorting];

    if (!user?.id) return;

    // Skip initial load if we have SSR data
    if (!hasInitialLoad && sprites.length > 0) {
      hasInitialLoad = true;
      return;
    }

    // Fetch on first load (if no SSR data) or when pagination/sorting changes
    hasInitialLoad = true;
    fetchSprites();
  });

  function openFeedbackModal(sprite: Sprite) {
    selectedSprite = sprite;
    feedbackModalOpen = true;
  }

  function closeFeedbackModal() {
    feedbackModalOpen = false;
    selectedSprite = null;
  }

  function handleResponseSubmitted(updatedSprite: Sprite) {
    // Update the sprite in the list
    sprites = sprites.map(s => s.id === updatedSprite.id ? updatedSprite : s);
    selectedSprite = updatedSprite;
  }

  function handleDeleteSprite(spriteId: number) {
    // Open confirmation dialog instead of using confirm()
    pendingDelete = spriteId;
    deleteDialogOpen = true;
  }

  // Execute the delete after confirmation
  async function executeDelete() {
    if (!pendingDelete) return;

    const spriteId = pendingDelete;
    pendingDelete = null;
    deletingSprite = spriteId;

    try {
      const response = await fetch(`/api/sprites/${spriteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[deleteSprite] API Error Response:', errorData);
        throw new Error(errorData.message || `Failed to delete sprite (${response.status})`);
      }

      // Success! Remove the sprite from the list and update total count
      sprites = sprites.filter(s => s.id !== spriteId);
      totalSprites = totalSprites - 1;

      // If current page is now empty and we're not on the first page, go back one page
      if (sprites.length === 0 && pagination.pageIndex > 0) {
        pagination = { ...pagination, pageIndex: pagination.pageIndex - 1 };
      } else if (sprites.length === 0) {
        // If we're on the first page and it's empty, refetch
        await fetchSprites();
      }

      toast.success('Sprite deleted successfully');
    } catch (err) {
      console.error('[deleteSprite] Error deleting sprite:', err);
      toast.error('Failed to delete sprite', {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      deletingSprite = null;
    }
  }

  // Column definitions
  const columns: ColumnDef<Sprite>[] = [
    {
      accessorKey: 'iconImage',
      header: 'Icon',
      cell: ({ row }) => renderComponent(SpriteIconCell as any, {
        iconUrl: row.original.iconImage?.url,
        title: row.original.title
      }),
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const titleSnippet = createRawSnippet<[{ title: string; id: number; status: string }]>((getData) => {
          const { title, id, status } = getData();
          if (status === 'approved') {
            return {
              render: () => `<a href="/sprites/${id}" class="sprite-item-title-link">${title}</a>`
            };
          }
          return {
            render: () => `<span class="sprite-item-title">${title}</span>`
          };
        });
        return renderSnippet(titleSnippet, {
          title: row.original.title,
          id: row.original.id,
          status: row.original.status
        });
      },
    },
    {
      accessorKey: 'section',
      header: 'Section',
      cell: ({ row }) => {
        const sectionSnippet = createRawSnippet<[{ name: string }]>((getData) => {
          const { name } = getData();
          return {
            render: () => `<span class="section-name">${name || 'N/A'}</span>`
          };
        });
        return renderSnippet(sectionSnippet, {
          name: row.original.section?.name || ''
        });
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => renderComponent(StatusBadge as any, { status: row.original.status }),
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ row }) => {
        const dateSnippet = createRawSnippet<[{ date: string }]>((getData) => {
          const { date } = getData();
          return {
            render: () => `<span class="date-cell">${formatDate(date)}</span>`
          };
        });
        return renderSnippet(dateSnippet, { date: row.original.createdAt });
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderComponent(ActionsCell as any, {
        sprite: row.original,
        onViewFeedback: () => openFeedbackModal(row.original),
        onDelete: () => handleDeleteSprite(row.original.id),
        isDeleting: deletingSprite === row.original.id
      }),
      enableSorting: false,
    },
  ];

  // Create table
  const table = createSvelteTable({
    get data() { return sprites; },
    columns,
    state: {
      get pagination() { return pagination; },
      get sorting() { return sorting; },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    get pageCount() { return Math.ceil(totalSprites / pagination.pageSize); },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        pagination = updater(pagination);
      } else {
        pagination = updater;
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
  });
</script>

<div class="uploads-viewer">
  <div class="main-content-title">
    <span>My Uploads</span>
    <span class="sprite-count">({totalSprites} total)</span>
  </div>

  <div class="main-content-box">
    {#if isLoading && sprites.length === 0}
      <div class="loading-state">
        <p>Loading your uploads...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>{error}</p>
        <Button themed onclick={fetchSprites}>Try Again</Button>
      </div>
    {:else if sprites.length === 0}
      <div class="empty-state">
        <p>You haven't uploaded any sprites yet.</p>
        <a href="/upload" class="upload-link">
          <Button themed>Upload Your First Sprite</Button>
        </a>
      </div>
    {:else}
      <DataTable {table} themed showPagination emptyMessage="No sprites found." />
    {/if}
  </div>
</div>

<!-- Admin Feedback Modal -->
<AdminFeedbackModal
  bind:open={feedbackModalOpen}
  sprite={selectedSprite}
  currentUser={user}
  onClose={closeFeedbackModal}
  onResponseSubmitted={handleResponseSubmitted as any}
/>

<!-- Delete Confirmation Dialog -->
<AlertDialog
  bind:open={deleteDialogOpen}
  title="Delete Sprite"
  description="Are you sure you want to delete this sprite? This action cannot be undone."
  cancelText="Cancel"
  actionText="Delete"
  variant="destructive"
  themed
  onCancel={() => { pendingDelete = null; }}
  onAction={executeDelete}
/>

<style>
  .uploads-viewer {
    width: 100%;
  }

  .main-content-title {
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 12px 20px;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    font-family: 'saira', sans-serif;
    font-weight: 800;
    font-size: 20px;
    color: var(--font-color);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sprite-count {
    font-weight: 400;
    font-size: 16px;
    opacity: 0.7;
  }

  .main-content-box {
    background: var(--page-color);
    padding: 20px;
    border-left: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 16px;
    color: var(--font-color);
    text-align: center;
  }

  .loading-state p,
  .error-state p,
  .empty-state p {
    margin: 0;
    font-size: 16px;
  }

  .upload-link {
    text-decoration: none;
  }

  /* Global styles for table cells */
  :global(.sprite-item-title-link) {
    color: var(--font-link-color) !important;
    text-decoration: none;
    font-weight: 500;
    display: block;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.sprite-item-title-link:hover) {
    text-decoration: underline;
  }

  :global(.sprite-item-title) {
    display: block;
    color: var(--font-color);
    font-weight: 500;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    justify-content: left;
  }

  :global(.section-name) {
    color: var(--font-color);
    opacity: 0.8;
  }

  :global(.date-cell) {
    color: var(--font-color);
    opacity: 0.7;
    font-size: 13px;
  }
</style>
