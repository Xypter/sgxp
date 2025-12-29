<script lang="ts">
  import { Button } from '$lib/components';
  import { ArrowLeft } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import type { Message, User } from '$lib/types/message';
  import MessageCard from './MessageCard.svelte';

  let {
    conversationId,
    user
  }: {
    conversationId: string;
    user: User | null;
  } = $props();

  // State
  let conversation = $state<Message[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Fetch conversation on mount
  async function fetchConversation() {
    if (!conversationId) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      conversation = data.messages || [];

    } catch (err) {
      console.error('Error fetching conversation:', err);
      error = err instanceof Error ? err.message : 'Failed to load conversation';
      toast.error('Failed to load conversation');
    } finally {
      isLoading = false;
    }
  }

  // Auto-mark unread messages as read
  async function markMessagesAsRead() {
    const unreadIds = conversation
      .filter(m => !m.isRead && m.recipient.id === user?.id)
      .map(m => m.id);

    if (unreadIds.length === 0) return;

    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds: unreadIds })
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read');
        return;
      }

      // Optimistically update local state
      conversation = conversation.map(m =>
        unreadIds.includes(m.id) ? { ...m, isRead: true } : m
      );

    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }

  // Effect: Fetch conversation on mount
  $effect(() => {
    fetchConversation();
  });

  // Effect: Auto-mark as read when conversation loads
  $effect(() => {
    if (conversation.length > 0 && user?.id) {
      markMessagesAsRead();
    }
  });

  // Navigate back to messages
  function goBack() {
    window.location.href = '/messages';
  }

  // Get root message and replies
  const rootMessage = $derived(conversation.find(m => !m.isReply));
  const replies = $derived(conversation.filter(m => m.isReply).sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ));

  const canReply = $derived(
    rootMessage && rootMessage.messageType !== 'moderation'
  );
</script>

<div class="conversation-view">
  <div class="conversation-header">
    <Button themed variant="outline" onclick={goBack} class="back-button">
      <ArrowLeft class="w-4 h-4" />
      <span class="ml-2">Back to Messages</span>
    </Button>

    {#if rootMessage}
      <h1 class="conversation-title">{rootMessage.subject}</h1>
    {/if}
  </div>

  <div class="conversation-content">
    {#if isLoading}
      <div class="loading-state">
        <p>Loading conversation...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>{error}</p>
        <Button themed onclick={fetchConversation}>Try Again</Button>
      </div>
    {:else if conversation.length === 0}
      <div class="empty-state">
        <p>Conversation not found.</p>
        <Button themed onclick={goBack}>Back to Messages</Button>
      </div>
    {:else}
      <!-- Root message -->
      {#if rootMessage}
        <MessageCard message={rootMessage} isReply={false} />
      {/if}

      <!-- Replies -->
      {#if replies.length > 0}
        <div class="replies-section">
          <h3 class="replies-header">Replies ({replies.length})</h3>
          {#each replies as reply (reply.id)}
            <MessageCard message={reply} isReply={true} />
          {/each}
        </div>
      {/if}

      <!-- Reply button (if allowed) -->
      {#if canReply}
        <div class="reply-actions">
          <Button themed variant="outline" onclick={() => toast.info('Reply functionality coming soon')}>
            Reply to this message
          </Button>
        </div>
      {:else if rootMessage && rootMessage.messageType === 'moderation'}
        <div class="no-reply-notice">
          <p>Moderation messages cannot be replied to.</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .conversation-view {
    width: 100%;
  }

  .conversation-header {
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 20px;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: 20px;
  }

  :global(.back-button) {
    margin-bottom: 15px;
    display: inline-flex !important;
    align-items: center !important;
  }

  .conversation-title {
    font-family: 'saira', sans-serif;
    font-weight: 800;
    font-size: 24px;
    color: var(--font-color);
    margin: 0;
  }

  .conversation-content {
    background: var(--page-color);
    padding: 20px;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    min-height: 400px;
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

  .replies-section {
    margin-top: 30px;
  }

  .replies-header {
    font-family: 'saira', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: var(--font-color);
    margin: 0 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .reply-actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .no-reply-notice {
    margin-top: 30px;
    padding: 15px;
    background: color-mix(in srgb, var(--page-color) 90%, white);
    border-left: 3px solid #f59e0b;
    border-radius: 4px;
  }

  .no-reply-notice p {
    margin: 0;
    color: var(--font-color);
    opacity: 0.8;
    font-size: 14px;
  }
</style>
