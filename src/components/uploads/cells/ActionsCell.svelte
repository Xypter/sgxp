<script lang="ts">
  import { Button } from '$lib/components';
  import { MessageSquare, Trash2, Pencil } from 'lucide-svelte';

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
  const canDelete = $derived(sprite.status !== 'rejected');

  function handleDelete() {
    onDelete?.();
  }
</script>

<div class="actions-cell">
  {#if canEdit}
    <Button variant="secondary" size="mini" icon={Pencil} href="/upload?edit={sprite.id}">Edit</Button>
  {/if}

  {#if hasFeedback || sprite.status === 'needs_revision' || sprite.status === 'revision'}
    <Button variant="secondary" size="mini" icon={MessageSquare} onclick={onViewFeedback}>Feedback</Button>
  {/if}

  <Button variant="danger" size="mini" icon={Trash2} onclick={handleDelete} loading={isDeleting} disabled={!canDelete}>Delete</Button>
</div>

<style>
  .actions-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

</style>
