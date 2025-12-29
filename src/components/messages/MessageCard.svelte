<script lang="ts">
  import { Badge } from '$lib/components';
  import { formatDate } from '$lib/spriteUtils';
  import type { Message, User } from '$lib/types/message';
  import MessageTypeBadge from './cells/MessageTypeBadge.svelte';

  interface Props {
    message: Message;
    isReply?: boolean;
  }

  let { message, isReply = false }: Props = $props();

  // Get display name for sender
  function getDisplayName(user: User): string {
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  }
</script>

<div class="message-card" class:is-reply={isReply}>
  <div class="message-header">
    <div class="message-meta">
      <div class="sender-info">
        {#if message.sender.profilePicture?.url}
          <img
            src={message.sender.profilePicture.url}
            alt={getDisplayName(message.sender)}
            class="sender-avatar"
          />
        {:else}
          <div class="avatar-placeholder">
            {getDisplayName(message.sender).charAt(0).toUpperCase()}
          </div>
        {/if}
        <div class="sender-details">
          <span class="sender-name">{getDisplayName(message.sender)}</span>
          <span class="message-date">{formatDate(message.createdAt)}</span>
        </div>
      </div>

      <div class="message-badges">
        <MessageTypeBadge messageType={message.messageType} />
        {#if message.priority !== 'normal'}
          <Badge themed color="#f59e0b">
            {message.priority}
          </Badge>
        {/if}
      </div>
    </div>

    {#if !isReply}
      <h3 class="message-subject">{message.subject}</h3>
    {/if}
  </div>

  <div class="message-body">
    <p class="message-content">{message.content}</p>
  </div>

  {#if message.contentReference && message.contentReference.referenceType !== 'none'}
    <div class="message-reference">
      <span class="reference-label">Related to:</span>
      <span class="reference-type">{message.contentReference.referenceType}</span>
    </div>
  {/if}
</div>

<style>
  .message-card {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 20px;
    margin-bottom: 15px;
    border-radius: 4px;
  }

  .message-card.is-reply {
    margin-left: 40px;
    border-left: 3px solid var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 95%, white);
  }

  .message-header {
    margin-bottom: 15px;
  }

  .message-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .sender-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sender-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 2px solid color-mix(in srgb, var(--page-color) 80%, white);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'saira', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: var(--font-color);
  }

  .sender-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sender-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--font-color);
  }

  .message-date {
    font-size: 13px;
    color: var(--font-color);
    opacity: 0.6;
  }

  .message-badges {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .message-subject {
    font-family: 'saira', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: var(--font-color);
    margin: 0;
  }

  .message-body {
    padding: 15px 0;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .message-content {
    color: var(--font-color);
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    font-size: 14px;
  }

  .message-reference {
    margin-top: 15px;
    padding: 10px;
    background: color-mix(in srgb, var(--page-color) 90%, white);
    border-left: 3px solid var(--font-link-color);
    font-size: 13px;
  }

  .reference-label {
    color: var(--font-color);
    opacity: 0.7;
    margin-right: 6px;
  }

  .reference-type {
    color: var(--font-link-color);
    font-weight: 600;
    text-transform: capitalize;
  }
</style>
