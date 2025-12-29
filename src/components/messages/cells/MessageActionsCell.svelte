<script lang="ts">
  import { Button } from '$lib/components';
  import * as DropdownMenu from '$components/ui/dropdown-menu';
  import { MoreVertical, Archive, Trash2, Mail } from 'lucide-svelte';

  interface Props {
    messageId: string;
    isRead: boolean;
    isArchived: boolean;
    onMarkRead?: (messageId: string) => void;
    onArchive?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
  }

  let { messageId, isRead, isArchived, onMarkRead, onArchive, onDelete }: Props = $props();

  function handleMarkRead(e: Event) {
    e.stopPropagation();
    onMarkRead?.(messageId);
  }

  function handleArchive(e: Event) {
    e.stopPropagation();
    onArchive?.(messageId);
  }

  function handleDelete(e: Event) {
    e.stopPropagation();
    onDelete?.(messageId);
  }
</script>

<div class="actions-cell">
  {#if !isRead}
    <Button themed size="sm" variant="ghost" onclick={handleMarkRead}>
      <Mail class="w-4 h-4" />
      <span class="ml-1">Mark Read</span>
    </Button>
  {/if}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button themed builders={[builder]} size="icon" variant="ghost" class="actions-button">
        <MoreVertical class="w-4 h-4" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      {#if !isArchived}
        <DropdownMenu.Item onclick={handleArchive}>
          <Archive class="w-4 h-4 mr-2" />
          Archive
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item onclick={handleArchive}>
          <Archive class="w-4 h-4 mr-2" />
          Unarchive
        </DropdownMenu.Item>
      {/if}
      <DropdownMenu.Item onclick={handleDelete} class="text-red-600">
        <Trash2 class="w-4 h-4 mr-2" />
        Delete
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<style>
  .actions-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  :global(.actions-button) {
    cursor: url('/img/Sonic_Cursor.png'), pointer;
  }

  :global(.actions-button:hover) {
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
  }
</style>
