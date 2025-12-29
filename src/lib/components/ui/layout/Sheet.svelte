<script lang="ts" module>
  // Re-export the base sheet components for convenience
  export {
    Root,
    Trigger,
    Close,
    Portal,
    Overlay,
    Header,
    Footer,
    Title,
    Description
  } from '$components/ui/sheet';
</script>

<script lang="ts">
  import * as SheetPrimitive from '$components/ui/sheet';
  import type { Snippet } from 'svelte';

  type Side = 'top' | 'bottom' | 'left' | 'right';

  interface ThemedSheetProps {
    open?: boolean;
    side?: Side;
    title?: string;
    description?: string;
    themed?: boolean;
    class?: string;
    width?: string;
    children?: Snippet;
    footer?: Snippet;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    side = 'right',
    title,
    description,
    themed = true,
    class: className,
    width = '400px',
    children,
    footer,
    onClose
  }: ThemedSheetProps = $props();

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    if (!isOpen) {
      onClose?.();
    }
  }
</script>

<SheetPrimitive.Root bind:open onOpenChange={handleOpenChange}>
  <SheetPrimitive.Content
    {side}
    class="themed-sheet-content {className || ''}"
    style="--sheet-width: {width};"
  >
    <div class="sheet-inner" class:themed>
      {#if title || description}
        <SheetPrimitive.Header class="themed-sheet-header">
          {#if title}
            <SheetPrimitive.Title class="themed-sheet-title">
              {title}
            </SheetPrimitive.Title>
          {/if}
          {#if description}
            <SheetPrimitive.Description class="themed-sheet-description">
              {description}
            </SheetPrimitive.Description>
          {/if}
        </SheetPrimitive.Header>
      {/if}

      <div class="sheet-body">
        {#if children}
          {@render children()}
        {/if}
      </div>

      {#if footer}
        <SheetPrimitive.Footer class="themed-sheet-footer">
          {@render footer()}
        </SheetPrimitive.Footer>
      {/if}
    </div>
  </SheetPrimitive.Content>
</SheetPrimitive.Root>

<style>
  :global(.themed-sheet-content) {
    background: var(--page-color) !important;
    border-left: 2px solid color-mix(in srgb, var(--page-color) 80%, white) !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    width: var(--sheet-width) !important;
    max-width: 90vw !important;
  }

  :global(.themed-sheet-content[data-side="left"]) {
    border-left: none !important;
    border-right: 2px solid color-mix(in srgb, var(--page-color) 80%, white) !important;
  }

  :global(.themed-sheet-content[data-side="top"]) {
    border-left: none !important;
    border-bottom: 2px solid color-mix(in srgb, var(--page-color) 80%, white) !important;
  }

  :global(.themed-sheet-content[data-side="bottom"]) {
    border-left: none !important;
    border-top: 2px solid color-mix(in srgb, var(--page-color) 80%, white) !important;
  }

  .sheet-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px;
  }

  :global(.themed-sheet-header) {
    margin-bottom: 24px;
    flex-shrink: 0;
  }

  :global(.themed-sheet-title) {
    font-family: 'saira', monospace !important;
    font-weight: 800 !important;
    font-size: 20px !important;
    color: var(--font-color) !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
  }

  :global(.themed-sheet-description) {
    font-family: 'saira', monospace !important;
    font-size: 13px !important;
    color: color-mix(in srgb, var(--font-color) 70%, transparent) !important;
    line-height: 1.5 !important;
    margin-top: 8px !important;
  }

  .sheet-body {
    flex: 1;
    overflow-y: auto;
  }

  :global(.themed-sheet-footer) {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
    flex-shrink: 0;
  }

  /* Custom close button styling */
  :global(.themed-sheet-content > button),
  :global(.themed-sheet-content [data-bits-dialog-close]) {
    background: transparent !important;
    color: var(--font-color) !important;
    opacity: 0.7;
    transition: all 0.2s ease;
  }

  :global(.themed-sheet-content > button:hover),
  :global(.themed-sheet-content [data-bits-dialog-close]:hover) {
    opacity: 1;
    color: var(--font-link-color) !important;
  }

  /* Overlay styling */
  :global([data-bits-dialog-overlay]) {
    background: rgba(0, 0, 0, 0.6) !important;
  }
</style>
