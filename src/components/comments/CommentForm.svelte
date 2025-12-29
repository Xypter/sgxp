<script>
  import { Button, Card, Avatar, Textarea } from '$lib/components';
  import { Bold, Italic, Underline } from 'lucide-svelte';
  import { applyFormatting, getDisplayName } from '$lib/spriteUtils';

  /**
   * Props for CommentForm component
   * @prop {string} value - The current text value
   * @prop {Function} onSubmit - Callback when form is submitted
   * @prop {Function} [onCancel] - Optional callback when cancel is clicked
   * @prop {string} [placeholder] - Textarea placeholder text
   * @prop {string} [submitText] - Submit button text
   * @prop {string} [submittingText] - Text to show while submitting (defaults to "Posting...")
   * @prop {boolean} isSubmitting - Whether the form is currently submitting
   * @prop {Object} user - User object with profile information
   * @prop {number} [rows] - Number of textarea rows
   * @prop {boolean} [showCancel] - Whether to show cancel button
   * @prop {string} [textareaId] - Unique ID for textarea element
   * @prop {boolean} [showAvatar] - Whether to show user avatar (default: true)
   * @prop {boolean} [compact] - Use compact mode without Card wrapper (default: false)
   */
  let {
    value = $bindable(''),
    onSubmit,
    onCancel = null,
    placeholder = 'Write a comment... Use **bold**, *italic*, or __underline__ for formatting.',
    submitText = 'Post Comment',
    submittingText = 'Posting...',
    isSubmitting = false,
    user,
    rows = 4,
    showCancel = false,
    textareaId = `comment-textarea-${Math.random().toString(36).substr(2, 9)}`,
    showAvatar = true,
    compact = false
  } = $props();

  /**
   * Apply formatting to the textarea selection
   * @param {('bold'|'italic'|'underline')} type - Type of formatting to apply
   */
  function formatText(type) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      console.warn(`[CommentForm] Textarea with id "${textareaId}" not found`);
      return;
    }

    const result = applyFormatting(textarea, type);
    value = result.newValue;

    // Refocus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newCursorPos, result.newCursorPos);
    }, 0);
  }

  /**
   * Handle form submission
   */
  function handleSubmit() {
    if (!value.trim() || isSubmitting) return;
    onSubmit();
  }

  /**
   * Handle cancel action
   */
  function handleCancel() {
    if (onCancel) {
      onCancel();
    }
  }
</script>

{#if compact}
  <!-- Compact mode: No Card wrapper, optional avatar -->
  <div class="comment-form-compact">
    {#if showAvatar}
      <Avatar.Root class="comment-avatar-small">
        {#if user?.profilePicture?.url}
          <Avatar.Image
            src={user.profilePicture.url}
            alt={getDisplayName(user)}
          />
        {:else}
          <Avatar.Fallback class="avatar-fallback-small">
            {getDisplayName(user)[0]?.toUpperCase() || '?'}
          </Avatar.Fallback>
        {/if}
      </Avatar.Root>
    {/if}

    <div class="comment-input-wrapper-compact">
      <!-- Textarea -->
      <Textarea
        id={textareaId}
        bind:value
        {placeholder}
        {rows}
        disabled={isSubmitting}
        class="comment-textarea-modern"
      />

      <!-- Formatting Toolbar -->
      <div class="formatting-toolbar {showAvatar ? '' : 'edit-toolbar'}">
        <!-- Formatting Buttons -->
        <div class="toolbar-buttons">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => formatText('bold')}
            disabled={isSubmitting}
            title="Bold"
            class="toolbar-btn"
          >
            <Bold class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => formatText('italic')}
            disabled={isSubmitting}
            title="Italic"
            class="toolbar-btn"
          >
            <Italic class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => formatText('underline')}
            disabled={isSubmitting}
            title="Underline"
            class="toolbar-btn"
          >
            <Underline class="h-4 w-4" />
          </Button>
        </div>

        <!-- Action Buttons -->
        <div class="{showAvatar ? 'reply-form-actions' : 'edit-form-actions'}">
          <Button
            onclick={handleSubmit}
            disabled={isSubmitting || !value.trim()}
            size="sm"
          >
            {isSubmitting ? submittingText : submitText}
          </Button>
          {#if showCancel && onCancel}
            <Button
              onclick={handleCancel}
              disabled={isSubmitting}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Standard mode: With Card wrapper -->
  <Card.Root class="comment-form-card">
    <div class="comment-form-header">
      <!-- User Avatar -->
      {#if showAvatar}
        <Avatar.Root class="comment-avatar">
          {#if user?.profilePicture?.url}
            <Avatar.Image
              src={user.profilePicture.url}
              alt={getDisplayName(user)}
            />
          {:else}
            <Avatar.Fallback class="avatar-fallback">
              {getDisplayName(user)[0]?.toUpperCase() || '?'}
            </Avatar.Fallback>
          {/if}
        </Avatar.Root>
      {/if}

      <!-- Input Wrapper -->
      <div class="comment-input-wrapper">
        <!-- Textarea -->
        <Textarea
          id={textareaId}
          bind:value
          {placeholder}
          {rows}
          disabled={isSubmitting}
          class="comment-textarea-modern"
        />

        <!-- Formatting Toolbar -->
        <div class="formatting-toolbar">
          <!-- Formatting Buttons -->
          <div class="toolbar-buttons">
            <Button
              variant="ghost"
              size="sm"
              onclick={() => formatText('bold')}
              disabled={isSubmitting}
              title="Bold"
              class="toolbar-btn"
            >
              <Bold class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => formatText('italic')}
              disabled={isSubmitting}
              title="Italic"
              class="toolbar-btn"
            >
              <Italic class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => formatText('underline')}
              disabled={isSubmitting}
              title="Underline"
              class="toolbar-btn"
            >
              <Underline class="h-4 w-4" />
            </Button>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <Button
              onclick={handleSubmit}
              disabled={isSubmitting || !value.trim()}
              size="sm"
            >
              {isSubmitting ? submittingText : submitText}
            </Button>
            {#if showCancel && onCancel}
              <Button
                onclick={handleCancel}
                disabled={isSubmitting}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </Card.Root>
{/if}
