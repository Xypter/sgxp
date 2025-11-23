<script lang="ts">
  import UserAvatar from './UserAvatar.svelte';
  import * as Card from '../base/Card.svelte';
  import Badge from '../base/Badge.svelte';

  interface CommentItemProps {
    author: {
      name: string;
      avatar?: string | null;
      isAdmin?: boolean;
    };
    content: string;
    timestamp: string | Date;
    themed?: boolean;
    class?: string;
  }

  let {
    author,
    content,
    timestamp,
    themed = false,
    class: className
  }: CommentItemProps = $props();

  // Format timestamp
  const formattedTime = $derived(
    typeof timestamp === 'string'
      ? new Date(timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
  );

  const cardClass = themed ? 'theme-card' : '';
</script>

<div class="flex gap-3 {className || ''}">
  <UserAvatar
    src={author.avatar}
    alt={author.name}
    size="md"
    {themed}
  />

  <div class="flex-1 space-y-1">
    <div class="flex items-center gap-2">
      <span class="font-semibold {themed ? 'theme-label' : 'text-foreground'}">
        {author.name}
      </span>
      {#if author.isAdmin}
        <Badge themed={themed} class="text-xs">Admin</Badge>
      {/if}
      <span class="text-xs {themed ? 'theme-description' : 'text-muted-foreground'}">
        {formattedTime}
      </span>
    </div>

    <div class="text-sm {themed ? 'theme-description' : 'text-foreground'}">
      {content}
    </div>
  </div>
</div>
