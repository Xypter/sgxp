<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { Input as ShadcnInput } from '$components/ui/input';

  interface InputProps {
    themed?: boolean;
    value?: any;
    class?: string;
    [key: string]: any;
  }

  let {
    themed = false,
    class: className,
    value = $bindable(),
    ...restProps
  }: InputProps = $props();

  const classes = themed ? `theme-input ${className || ''}` : className;
</script>

<ShadcnInput bind:value class={classes} {...restProps} />

<style>
  :global(.theme-input) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
  }

  :global(.theme-input:focus) {
    border-color: var(--font-link-color) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-input::placeholder) {
    color: color-mix(in srgb, var(--font-color) 60%, transparent) !important;
  }
</style>