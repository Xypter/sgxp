<script lang="ts">
  interface ModalProps {
    open: boolean;
    onClose?: () => void;
    themed?: boolean;
    class?: string;
    children?: any;
  }

  let {
    open = $bindable(false),
    onClose,
    themed = false,
    class: className,
    children
  }: ModalProps = $props();

  function handleClose() {
    open = false;
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick() {
    handleClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleClose();
    }
  }

  // Prevent body scroll when modal is open
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
    class="modal-overlay"
    class:themed-modal={themed}
    role="dialog"
    aria-modal="true"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
    tabindex="-1"
  >
    <div
      class="modal-content {className || ''}"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
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

  .modal-content {
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    animation: slideUp 0.3s ease-out;
  }

  .themed-modal .modal-content {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
    box-shadow: var(--box-shadow);
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
