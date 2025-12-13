<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { Textarea as ShadcnTextarea } from '$components/ui/textarea';

  interface TextareaProps extends HTMLTextareaAttributes {
    themed?: boolean;
    value?: any;
  }

  let {
    themed = false,
    class: className,
    value = $bindable(),
    ...restProps
  }: TextareaProps = $props();

  const classes = themed ? `theme-textarea ${className || ''}` : className;
</script>

<ShadcnTextarea bind:value class={classes} {...restProps} />

<style>
  :global(.theme-textarea) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 4px !important; /* Slight rounding for modern feel, set to 0px if you prefer hard edges */
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    transition: border-color 0.2s ease !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
    resize: vertical;
  }

  :global(.theme-textarea:focus) {
    border-color: color-mix(in srgb, var(--font-link-color) 70%, white) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 30%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-textarea::placeholder) {
    color: color-mix(in srgb, var(--font-color) 60%, transparent) !important;
  }
  
  :global(.theme-textarea:disabled) {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
  }
</style>