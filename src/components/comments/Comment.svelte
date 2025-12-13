<script>
  // Import shadcn components
  import { Card, Avatar, Button } from '$lib/components';
  import { Separator } from '$components/ui/separator';

  // Import Lucide icons
  import { Reply, Edit2, Trash2, Heart, Flag } from 'lucide-svelte';

  // Import utility functions
  import { formatDate, getDisplayName, getProfilePicture, renderCommentText } from '$lib/spriteUtils';

  // Import child components
  import CommentForm from './CommentForm.svelte';

  // Props
  let {
    comment,
    user = null,
    onEdit = () => {},
    onDelete = () => {},
    onLike = () => {},
    onReport = () => {},
    onReply = () => {},
    onToggleReplies = () => {},
    onSubmitReply = () => {},
    onUpdateComment = () => {},
    onCancelReply = () => {},
    onCancelEdit = () => {},
    expanded = false,
    loadingReplies = false,
    isReply = false,
    parentCommentId = null,
    replyingTo = null,
    replyText = $bindable(''),
    editingComment = null,
    editText = $bindable(''),
    submittingComment = false
  } = $props();

  // Helper function to check if user can edit/delete
  function canEditDelete(comment) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return comment.author?.id === user.id || comment.author === user.id;
  }

  // Get the correct parent comment ID for replies
  // For a reply, parentComment could be an object or ID
  function getParentId(comment) {
    if (!comment.parentComment) return null;
    return typeof comment.parentComment === 'object' ? comment.parentComment.id : comment.parentComment;
  }
</script>

<Card.Root class="comment-card {isReply ? 'reply-card' : ''} {comment.isPending ? 'pending' : ''} {comment.isDeleting ? 'deleting' : ''} {comment.isEditing ? 'editing' : ''}">
  <!-- Comment Header -->
  <div class="comment-header">
    <Avatar.Root class="{isReply ? 'comment-avatar-small' : 'comment-avatar-large'}">
      {#if getProfilePicture(comment.author)}
        <Avatar.Image
          src={getProfilePicture(comment.author)}
          alt={getDisplayName(comment.author)}
        />
      {:else}
        <Avatar.Fallback class="{isReply ? 'avatar-fallback-small' : 'avatar-fallback-large'}">
          {getDisplayName(comment.author)[0].toUpperCase()}
        </Avatar.Fallback>
      {/if}
    </Avatar.Root>

    <div class="comment-meta">
      <h4 class="comment-author">
        {getDisplayName(comment.author)}
      </h4>
      <p class="comment-date">
        {formatDate(comment.createdAt)}
        {#if comment.isEdited}
          <span class="edited-badge">(edited)</span>
        {/if}
      </p>
    </div>

    {#if canEditDelete(comment)}
      <div class="comment-actions">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onEdit(comment)}
          title="Edit"
          class="comment-action-btn"
        >
          <Edit2 class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onDelete(comment.id, isReply, parentCommentId || getParentId(comment))}
          title="Delete"
          class="comment-action-btn delete-btn"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    {/if}
  </div>

  <Separator class="comment-separator" />

  <!-- Comment Body -->
  <div class="comment-body {isReply ? 'reply-body' : ''}">
    {#if editingComment === comment.id}
      <div class="edit-form">
        <CommentForm
          bind:value={editText}
          onSubmit={() => onUpdateComment(comment.id)}
          onCancel={onCancelEdit}
          placeholder={isReply ? "Edit your reply..." : "Edit your comment..."}
          submitText="Save"
          submittingText="Saving..."
          isSubmitting={submittingComment}
          {user}
          rows={isReply ? 2 : 3}
          showCancel={true}
          showAvatar={false}
          compact={true}
          textareaId="edit-textarea-{comment.id}"
        />
      </div>
    {:else}
      <p class="comment-text">{@html renderCommentText(comment.text)}</p>
    {/if}
  </div>

  <!-- Comment Footer -->
  {#if !isReply}
    <!-- Top-level comment footer with reply button and view replies -->
    <div class="comment-footer">
      <div class="comment-footer-left">
        {#if user}
          <button
            class="reply-btn"
            onclick={() => onReply(comment.id)}
          >
            <Reply class="h-4 w-4" />
            Reply
          </button>
        {/if}

        {#if comment.replyCount > 0}
          <button
            class="view-replies-btn"
            onclick={() => onToggleReplies(comment.id)}
          >
            {expanded ? 'Hide' : 'View'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        {/if}
      </div>

      <div class="comment-footer-right">
        {#if user}
          <button
            class="like-btn {comment.userHasLiked ? 'liked' : ''}"
            onclick={() => onLike(comment.id, false, null)}
            title={comment.userHasLiked ? 'Unlike' : 'Like'}
          >
            <Heart class="h-4 w-4" fill={comment.userHasLiked ? 'currentColor' : 'none'} />
            {#if comment.likeCount > 0}
              <span class="like-count">{comment.likeCount}</span>
            {/if}
          </button>
          {#if !canEditDelete(comment)}
            <button
              class="report-btn"
              onclick={() => onReport(comment.id)}
              title="Report comment"
            >
              <Flag class="h-4 w-4" />
            </button>
          {/if}
        {/if}
      </div>
    </div>
  {:else}
    <!-- Reply footer with just like and report -->
    {#if user}
      <div class="comment-footer reply-footer">
        <div class="comment-footer-right">
          <button
            class="like-btn {comment.userHasLiked ? 'liked' : ''}"
            onclick={() => onLike(comment.id, true, parentCommentId || getParentId(comment))}
            title={comment.userHasLiked ? 'Unlike' : 'Like'}
          >
            <Heart class="h-4 w-4" fill={comment.userHasLiked ? 'currentColor' : 'none'} />
            {#if comment.likeCount > 0}
              <span class="like-count">{comment.likeCount}</span>
            {/if}
          </button>
          {#if !canEditDelete(comment)}
            <button
              class="report-btn"
              onclick={() => onReport(comment.id)}
              title="Report comment"
            >
              <Flag class="h-4 w-4" />
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Reply Form (only for top-level comments) -->
  {#if !isReply && replyingTo === comment.id}
    <div class="reply-form">
      <CommentForm
        bind:value={replyText}
        onSubmit={() => onSubmitReply(comment.id)}
        onCancel={onCancelReply}
        placeholder="Write a reply..."
        submitText="Post Reply"
        submittingText="Posting..."
        isSubmitting={submittingComment}
        {user}
        rows={3}
        showCancel={true}
        textareaId="reply-textarea-{comment.id}"
      />
    </div>
  {/if}

  <!-- Replies List (only for top-level comments) -->
  {#if !isReply && expanded && comment.replies}
    <div class="replies-list">
      {#each comment.replies as reply}
        <svelte:self
          comment={reply}
          {user}
          {onEdit}
          {onDelete}
          {onLike}
          {onReport}
          {onSubmitReply}
          {onUpdateComment}
          {onCancelReply}
          {onCancelEdit}
          isReply={true}
          parentCommentId={comment.id}
          {replyingTo}
          bind:replyText
          {editingComment}
          bind:editText
          {submittingComment}
        />
      {/each}
    </div>
  {/if}

  {#if !isReply && loadingReplies}
    <div class="loading-replies">
      <p>Loading replies...</p>
    </div>
  {/if}
</Card.Root>
