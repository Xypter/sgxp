<script lang="ts">
  import { Modal, Button, Badge, Avatar, Card, Textarea } from '$lib/components';
  import { getDisplayName, getProfilePicture } from '$lib/spriteUtils';
  import { X, Send, CheckCircle, AlertCircle } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface AdminFeedback {
    id: string;
    message: string;
    reviewer: {
      id: number;
      username: string;
      displayName?: string;
      profilePicture?: { url: string };
    };
    statusAtTime: string;
    timestamp: string;
  }

  interface SubmitterResponse {
    id: string;
    message: string;
    timestamp: string;
  }

  interface Sprite {
    id: number;
    title: string;
    status: string;
    iconImage?: { url: string };
    adminFeedback?: AdminFeedback[];
    submitterResponse?: SubmitterResponse[];
    author?: {
      id: number;
      username: string;
      displayName?: string;
      profilePicture?: { url: string };
    };
  }

  interface Props {
    open: boolean;
    sprite: Sprite | null;
    currentUser: any;
    onClose: () => void;
    onResponseSubmitted?: (updatedSprite: Sprite) => void;
  }

  let {
    open = $bindable(false),
    sprite,
    currentUser,
    onClose,
    onResponseSubmitted
  }: Props = $props();

  let responseText = $state('');
  let isSubmitting = $state(false);

  // Combine and sort all messages chronologically
  function getConversationThread() {
    if (!sprite) return [];

    const thread: Array<{
      type: 'admin' | 'user';
      message: string;
      timestamp: string;
      author: any;
      statusAtTime?: string;
    }> = [];

    // Add admin feedback
    if (sprite.adminFeedback) {
      for (const feedback of sprite.adminFeedback) {
        thread.push({
          type: 'admin',
          message: feedback.message,
          timestamp: feedback.timestamp,
          author: feedback.reviewer,
          statusAtTime: feedback.statusAtTime
        });
      }
    }

    // Add submitter responses
    if (sprite.submitterResponse) {
      for (const response of sprite.submitterResponse) {
        thread.push({
          type: 'user',
          message: response.message,
          timestamp: response.timestamp,
          author: sprite.author
        });
      }
    }

    // Sort by timestamp
    thread.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return thread;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'needs_revision':
      case 'revision': return '#ef4444';
      case 'rejected': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'needs_revision':
      case 'revision': return 'Needs Revision';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  async function handleSubmitResponse() {
    if (!sprite || !responseText.trim() || isSubmitting) return;

    isSubmitting = true;

    try {
      const response = await fetch(`/api/sprites/${sprite.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: responseText.trim() })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit response');
      }

      toast.success('Response submitted successfully');
      responseText = '';

      if (onResponseSubmitted && result.doc) {
        onResponseSubmitted(result.doc);
      }

    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit response');
    } finally {
      isSubmitting = false;
    }
  }

  function handleClose() {
    responseText = '';
    open = false;
    onClose?.();
  }

  const thread = $derived(getConversationThread());
  const canRespond = $derived(sprite?.status !== 'approved');
</script>

<Modal bind:open themed onClose={handleClose}>
  <div class="feedback-modal">
    <!-- Header -->
    <div class="modal-header">
      <h2 class="modal-title">Admin Feedback</h2>
      <button class="close-btn" onclick={handleClose}>
        <X class="h-5 w-5" />
      </button>
    </div>

    {#if sprite}
      <!-- Sprite Info -->
      <div class="sprite-info">
        <div class="sprite-icon">
          {#if sprite.iconImage?.url}
            <img src={sprite.iconImage.url} alt={sprite.title} />
          {:else}
            <div class="icon-placeholder">?</div>
          {/if}
        </div>
        <div class="sprite-details">
          <h3 class="sprite-feedback-title">{sprite.title}</h3>
          <Badge themed color={getStatusColor(sprite.status)}>
            {getStatusLabel(sprite.status)}
          </Badge>
        </div>
      </div>

      <!-- Conversation Thread -->
      <div class="conversation-thread">
        {#if thread.length === 0}
          <div class="no-feedback">
            <AlertCircle class="h-8 w-8" />
            <p>No feedback yet.</p>
          </div>
        {:else}
          {#each thread as item}
            <div class="message-card {item.type === 'admin' ? 'admin-message' : 'user-message'}">
              <div class="message-header">
                <Avatar.Root class="message-avatar">
                  {#if getProfilePicture(item.author)}
                    <Avatar.Image
                      src={getProfilePicture(item.author)}
                      alt={getDisplayName(item.author)}
                    />
                  {:else}
                    <Avatar.Fallback class="avatar-fallback">
                      {getDisplayName(item.author)?.[0]?.toUpperCase() || '?'}
                    </Avatar.Fallback>
                  {/if}
                </Avatar.Root>
                <div class="message-meta">
                  <span class="message-author">
                    {getDisplayName(item.author)}
                    {#if item.author?.role && item.author.role !== 'user'}
                      <Badge
                        themed
                        color={item.author.roleColor || '#888888'}
                        class="role-badge"
                      >
                        {item.author.role}
                      </Badge>
                    {:else if item.author?.prestigeRole}
                      <Badge
                        themed
                        color={item.author.prestigeColor || '#888888'}
                        class="role-badge"
                      >
                        {item.author.prestigeRole}
                      </Badge>
                    {/if}
                  </span>
                  <span class="message-date">{formatDateTime(item.timestamp)}</span>
                </div>
              </div>
              <div class="message-body">
                <p>{item.message}</p>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Response Input -->
      <div class="response-section">
        {#if canRespond}
          <div class="response-form">
            <Textarea
              themed
              bind:value={responseText}
              placeholder="Write your response to the admin feedback..."
              rows={3}
              disabled={isSubmitting}
            />
            <Button
              themed
              onclick={handleSubmitResponse}
              disabled={!responseText.trim() || isSubmitting}
            >
              {#if isSubmitting}
                Submitting...
              {:else}
                <Send class="h-4 w-4" />
                Submit Response
              {/if}
            </Button>
          </div>
        {:else}
          <div class="approved-notice">
            <CheckCircle class="h-5 w-5" />
            <p>This submission has been approved. Feedback history is shown above.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Modal>

<style>
  .feedback-modal {
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .modal-title {
    font-family: 'saira', sans-serif;
    font-weight: 800;
    font-size: 20px;
    color: var(--font-color);
    margin: 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--font-color);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .sprite-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: color-mix(in srgb, var(--page-color) 90%, black);
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .sprite-icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .sprite-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .icon-placeholder {
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--font-color);
    font-size: 24px;
    font-weight: bold;
  }

  .sprite-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sprite-feedback-title {
    font-family: 'saira', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: var(--font-color);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 450px;
  }

  .conversation-thread {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
  }

  .no-feedback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: var(--font-color);
    opacity: 0.6;
  }

  .message-card {
    background: color-mix(in srgb, var(--page-color) 95%, white);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
    padding: 12px 16px;
  }

  .admin-message {
    border-left: 4px solid #6366f1;
  }

  .user-message {
    border-left: 4px solid var(--font-link-color);
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  :global(.message-avatar) {
    width: 32px !important;
    height: 32px !important;
    flex-shrink: 0;
  }

  :global(.avatar-fallback) {
    background: color-mix(in srgb, var(--page-color) 50%, black) !important;
    color: var(--font-color) !important;
    font-family: 'saira', sans-serif !important;
    font-weight: 600 !important;
    font-size: 14px !important;
  }

  .message-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .message-author {
    font-family: 'saira', sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: var(--font-color);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.role-badge) {
    font-size: 10px !important;
    padding: 1px 6px 2px !important;
  }

  .message-date {
    font-size: 12px;
    color: var(--font-color);
    opacity: 0.6;
  }

  .message-body {
    padding-left: 44px;
  }

  .message-body p {
    margin: 0;
    font-size: 14px;
    color: var(--font-color);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .response-section {
    padding: 16px 20px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .response-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .response-form :global(button) {
    align-self: flex-end;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .approved-notice {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: color-mix(in srgb, #22c55e 20%, var(--page-color));
    border: 2px solid #22c55e;
    color: var(--font-color);
  }

  .approved-notice p {
    margin: 0;
    font-size: 14px;
  }

  @media (max-width: 640px) {
    .feedback-modal {
      width: 100%;
    }

    .message-body {
      padding-left: 0;
      padding-top: 8px;
    }
  }
</style>
