<script lang="ts">
  import { Badge } from '$lib/components';

  interface Props {
    subject: string;
    isRead: boolean;
    replyCount: number;
  }

  let { subject, isRead, replyCount }: Props = $props();
</script>

<div class="subject-cell" class:unread={!isRead}>
  {#if !isRead}
    <div class="unread-indicator" />
  {/if}
  <span class="subject-text">{subject}</span>
  {#if replyCount > 0}
    <Badge themed variant="secondary" class="reply-badge">
      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
    </Badge>
  {/if}
</div>

<style>
  .subject-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 400px;
  }

  .subject-cell.unread .subject-text {
    font-weight: 600;
    color: var(--font-color);
  }

  .unread-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--font-link-color);
    flex-shrink: 0;
  }

  .subject-text {
    color: var(--font-color);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  :global(.reply-badge) {
    flex-shrink: 0;
    font-size: 11px;
  }
</style>
