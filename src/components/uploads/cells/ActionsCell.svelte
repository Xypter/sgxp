<script lang="ts">
  import { Button } from '$lib/components';
  import { MessageSquare, Trash2, Pencil, Loader2 } from 'lucide-svelte';

  interface Sprite {
    id: number;
    status: string;
    adminFeedback?: any[];
  }

  interface Props {
    sprite: Sprite;
    onViewFeedback: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
  }

  let { sprite, onViewFeedback, onDelete, isDeleting = false }: Props = $props();

  const hasFeedback = $derived(sprite.adminFeedback && sprite.adminFeedback.length > 0);
  const canEdit = $derived(
    sprite.status === 'pending' ||
    sprite.status === 'needs_revision' ||
    sprite.status === 'revision' ||
    sprite.status === 'approved'
  );

  function handleDelete() {
    onDelete?.();
  }
</script>

<div class="actions-cell">
  {#if canEdit}
    <a href="/upload?edit={sprite.id}" class="edit-link">
      <Button
        themed
        variant="outline"
        size="sm"
        class="edit-btn"
      >
        <Pencil class="h-4 w-4" />
        Edit
      </Button>
    </a>
  {/if}

  {#if hasFeedback || sprite.status === 'needs_revision' || sprite.status === 'revision'}
    <Button
      themed
      variant="outline"
      size="sm"
      onclick={onViewFeedback}
      class="feedback-btn"
    >
      <MessageSquare class="h-4 w-4" />
      Feedback
    </Button>
  {/if}

  <Button
    themed
    variant="outline"
    size="sm"
    onclick={handleDelete}
    class="delete-btn"
    disabled={isDeleting}
  >
    {#if isDeleting}
      <Loader2 class="h-4 w-4 animate-spin" />
    {:else}
      <Trash2 class="h-4 w-4" />
    {/if}
    Delete
  </Button>
</div>

<style>
  .actions-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .edit-link {
    text-decoration: none;
  }

  :global(.feedback-btn),
  :global(.edit-btn),
  :global(.delete-btn) {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }
</style>
