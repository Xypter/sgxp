<script lang="ts">
  interface AlertDialogProps {
    open: boolean;
    title: string;
    description: string;
    cancelText?: string;
    actionText?: string;
    variant?: 'default' | 'destructive';
    themed?: boolean;
    onCancel?: () => void;
    onAction?: () => void;
    class?: string;
  }

  let {
    open = $bindable(false),
    title,
    description,
    cancelText = 'Cancel',
    actionText = 'Continue',
    variant = 'default',
    themed = false,
    onCancel,
    onAction,
    class: className
  }: AlertDialogProps = $props();

  function handleCancel() {
    open = false;
    if (onCancel) {
      onCancel();
    }
  }

  function handleAction() {
    open = false;
    if (onAction) {
      onAction();
    }
  }

  function handleBackdropClick() {
    handleCancel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleCancel();
    }
  }

  // Prevent body scroll when dialog is open
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="alert-dialog-overlay"
    class:themed-alert={themed}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="alert-title"
    aria-describedby="alert-description"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
    tabindex="-1"
  >
    <div
      class="alert-dialog-content {className || ''}"
      class:themed
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div class="alert-dialog-header">
        <h2 id="alert-title" class="alert-dialog-title" class:themed>
          {title}
        </h2>
        <p id="alert-description" class="alert-dialog-description" class:themed>
          {description}
        </p>
      </div>

      <div class="alert-dialog-footer">
        <button
          type="button"
          class="alert-dialog-button cancel"
          class:themed
          onclick={handleCancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="alert-dialog-button action"
          class:themed
          class:destructive={variant === 'destructive'}
          onclick={handleAction}
        >
          {actionText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .alert-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.2s ease-out;
  }

  .alert-dialog-content {
    max-width: 500px;
    width: 90vw;
    background: white;
    border-radius: 8px;
    padding: 0;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }

  .alert-dialog-content.themed {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    border-radius: 0px;
    box-shadow: var(--box-shadow);
  }

  .alert-dialog-header {
    padding: 24px 24px 16px;
  }

  .alert-dialog-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #1a1a1a;
  }

  .alert-dialog-title.themed {
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 20px;
    color: var(--font-color);
  }

  .alert-dialog-description {
    font-size: 14px;
    margin: 0;
    color: #666;
    line-height: 1.5;
  }

  .alert-dialog-description.themed {
    font-family: 'saira', monospace;
    color: var(--font-color);
    opacity: 0.8;
  }

  .alert-dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 24px 24px;
  }

  .alert-dialog-button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    background: white;
    color: #333;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .alert-dialog-button:hover {
    background: #f5f5f5;
  }

  .alert-dialog-button.cancel {
    background: transparent;
  }

  .alert-dialog-button.action {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }

  .alert-dialog-button.action:hover {
    background: #0052a3;
  }

  .alert-dialog-button.destructive {
    background: #dc2626;
    border-color: #dc2626;
  }

  .alert-dialog-button.destructive:hover {
    background: #b91c1c;
  }

  /* Themed button styles */
  .alert-dialog-button.themed {
    background: var(--page-color);
    color: var(--font-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white);
    border-radius: 0px;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    transition: all var(--transition-speed, 200ms) ease-in-out;
    cursor: url('/img/Sonic_Cursor.png'), pointer;
    box-shadow: var(--box-shadow);
  }

  .alert-dialog-button.themed:hover {
    background: color-mix(in srgb, var(--page-color) 90%, var(--font-color));
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
  }

  .alert-dialog-button.action.themed {
    background: var(--font-link-color);
    color: var(--page-color);
    border-color: color-mix(in srgb, var(--page-color) 60%, white);
  }

  .alert-dialog-button.action.themed:hover {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
  }

  .alert-dialog-button.destructive.themed {
    background: var(--font-link-color);
    color: var(--page-color);
    border-color: color-mix(in srgb, var(--page-color) 60%, white);
  }

  .alert-dialog-button.destructive.themed:hover {
    background: var(--font-link-color);
    border-color: color-mix(in srgb, var(--page-color) 60%, white);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
