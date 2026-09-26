<script lang="ts">
  import type { Component } from 'svelte';
  import { Check, Trash2, X } from 'lucide-svelte';
  import Button from '../base/Button.svelte';

  interface AlertDialogProps {
    open: boolean;
    title: string;
    description: string;
    cancelText?: string;
    actionText?: string;
    variant?: 'default' | 'destructive';
    /** Icon for the action button; defaults to a trash can (destructive) or a check. */
    actionIcon?: Component;
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
    actionIcon,
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
        <Button variant="secondary" icon={X} onclick={handleCancel}>{cancelText}</Button>
        <Button
          variant={variant === 'destructive' ? 'danger' : 'primary'}
          icon={actionIcon ?? (variant === 'destructive' ? Trash2 : Check)}
          onclick={handleAction}
        >
          {actionText}
        </Button>
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
