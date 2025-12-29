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
  import { DataTable, Button } from '$lib/components';
  import * as Tabs from '$components/ui/tabs';
  import { toast } from 'svelte-sonner';
  import type { Message, MessageFilters, User } from '$lib/types/message';

  // Cell components
  import MessageSenderCell from './cells/MessageSenderCell.svelte';
  import MessageSubjectCell from './cells/MessageSubjectCell.svelte';
  import MessageTypeBadge from './cells/MessageTypeBadge.svelte';
  import MessageDateCell from './cells/MessageDateCell.svelte';
  import MessageActionsCell from './cells/MessageActionsCell.svelte';

  // Filter component
  import MessageFiltersComponent from './MessageFilters.svelte';

  export interface Props {
    user: User | null;
  }

  let { user }: Props = $props();

  // State
  let messages = $state<Message[]>([]);
  let totalMessages = $state(0);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let hasInitialLoad = $state(false);

  // UI state
  let currentTab = $state<'inbox' | 'sent'>('inbox');
  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });
  let sorting = $state<SortingState>([{ id: 'createdAt', desc: true }]);
  let filters = $state<MessageFilters>({
    unreadOnly: false,
    messageType: 'all',
    search: '',
    archived: false
  });

  // Fetch messages
  async function fetchMessages() {
    if (!user?.id) return;

    isLoading = true;
    error = null;

    try {
      const page = pagination.pageIndex + 1;
      const sortField = sorting[0]?.id || 'createdAt';
      const sortDir = sorting[0]?.desc ? '-' : '';

      const params = new URLSearchParams({
        tab: currentTab,
        page: page.toString(),
        limit: pagination.pageSize.toString(),
        sort: `${sortDir}${sortField}`,
        unreadOnly: filters.unreadOnly.toString(),
        messageType: filters.messageType,
        search: filters.search,
        archived: filters.archived.toString()
      });

      const response = await fetch(`/api/messages?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      messages = data.docs || [];
      totalMessages = data.totalDocs || 0;

    } catch (err) {
      console.error('Error fetching messages:', err);
      error = err instanceof Error ? err.message : 'Failed to load messages';
      toast.error('Failed to load messages');
    } finally {
      isLoading = false;
    }
  }

  // Fetch messages when dependencies change
  $effect(() => {
    // Track dependencies
    const _ = [pagination.pageIndex, pagination.pageSize, sorting, filters, currentTab];

    if (!user?.id) return;

    // Skip initial load if we have SSR data
    if (!hasInitialLoad) {
      hasInitialLoad = true;
      fetchMessages();
      return;
    }

    // Reset to first page when filters or tab change
    if (pagination.pageIndex > 0 && (filters || currentTab)) {
      pagination = { ...pagination, pageIndex: 0 };
      return;
    }

    fetchMessages();
  });

  // Handle row click - navigate to conversation
  function handleRowClick(message: Message) {
    window.location.href = `/messages/${message.conversationId}`;
  }

  // Handle mark as read
  async function handleMarkAsRead(messageId: string) {
    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds: [messageId] })
      });

      if (!response.ok) throw new Error('Failed to mark message as read');

      // Update local state
      messages = messages.map(m =>
        m.id === messageId ? { ...m, isRead: true } : m
      );

      toast.success('Message marked as read');
    } catch (err) {
      console.error('Error marking message as read:', err);
      toast.error('Failed to mark message as read');
    }
  }

  // Handle archive
  async function handleArchive(messageId: string) {
    // TODO: Implement archive functionality when backend endpoint is ready
    toast.info('Archive functionality coming soon');
  }

  // Handle delete
  async function handleDelete(messageId: string) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      // TODO: Implement delete when backend endpoint is ready
      toast.info('Delete functionality coming soon');
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Failed to delete message');
    }
  }

  // Handle filter changes
  function handleFiltersChange(newFilters: MessageFilters) {
    filters = newFilters;
  }

  // Column definitions
  const columns: ColumnDef<Message>[] = [
    {
      accessorKey: 'sender',
      header: 'From',
      cell: ({ row }) => renderComponent(MessageSenderCell as any, {
        sender: row.original.sender
      }),
      enableSorting: false,
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => renderComponent(MessageSubjectCell as any, {
        subject: row.original.subject,
        isRead: row.original.isRead,
        replyCount: row.original.replyCount
      }),
    },
    {
      accessorKey: 'messageType',
      header: 'Type',
      cell: ({ row }) => renderComponent(MessageTypeBadge as any, {
        messageType: row.original.messageType
      }),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => renderComponent(MessageDateCell as any, {
        date: row.original.createdAt
      }),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => renderComponent(MessageActionsCell as any, {
        messageId: row.original.id,
        isRead: row.original.isRead,
        isArchived: row.original.isArchived,
        onMarkRead: handleMarkAsRead,
        onArchive: handleArchive,
        onDelete: handleDelete
      }),
      enableSorting: false,
    },
  ];

  // Create table
  const table = createSvelteTable({
    get data() { return messages; },
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
    pageCount: Math.ceil(totalMessages / pagination.pageSize),
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

<div class="messages-list">
  <div class="main-content-title">
    <span>Messages</span>
    <span class="message-count">({totalMessages} total)</span>
  </div>

  <div class="main-content-box">
    <Tabs.Root bind:value={currentTab}>
      <Tabs.List class="tabs-list">
        <Tabs.Trigger value="inbox" class="tabs-trigger">
          Inbox
        </Tabs.Trigger>
        <Tabs.Trigger value="sent" class="tabs-trigger">
          Sent
        </Tabs.Trigger>
      </Tabs.List>

      <div class="tabs-content-wrapper">
        <MessageFiltersComponent {filters} onFiltersChange={handleFiltersChange} />

        {#if isLoading && messages.length === 0}
          <div class="loading-state">
            <p>Loading messages...</p>
          </div>
        {:else if error}
          <div class="error-state">
            <p>{error}</p>
            <Button themed onclick={fetchMessages}>Try Again</Button>
          </div>
        {:else if messages.length === 0}
          <div class="empty-state">
            <p>No messages found.</p>
          </div>
        {:else}
          <div class="table-wrapper">
            <DataTable
              {table}
              themed
              showPagination
              emptyMessage="No messages found."
              onRowClick={handleRowClick}
            />
          </div>
        {/if}
      </div>
    </Tabs.Root>
  </div>
</div>

<style>
  .messages-list {
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

  .message-count {
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

  :global(.tabs-list) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    box-shadow: var(--box-shadow) !important;
    margin-bottom: 20px;
  }

  :global(.tabs-trigger) {
    color: var(--font-color) !important;
    font-family: 'saira', sans-serif !important;
    font-weight: 600 !important;
    font-size: 16px !important;
  }

  :global(.tabs-trigger[data-state="active"]) {
    background: var(--page-color) !important;
    border-bottom: 2px solid var(--font-link-color) !important;
  }

  .tabs-content-wrapper {
    margin-top: 20px;
  }

  .table-wrapper {
    margin-top: 15px;
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

  /* Clickable rows */
  :global(.messages-list tbody tr) {
    cursor: url('/img/Sonic_Cursor.png'), pointer;
    transition: background 0.2s ease;
  }

  :global(.messages-list tbody tr:hover) {
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
    background: color-mix(in srgb, var(--page-color) 90%, white) !important;
  }
</style>
