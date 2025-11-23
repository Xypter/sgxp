<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { Input as ShadcnInput } from '$components/ui/input';

  interface InputProps extends HTMLInputAttributes {
    themed?: boolean;
    value?: any;
  }

  let {
    themed = false,
    class: className,
    value = $bindable(),
    ...restProps
  }: InputProps = $props();

  // Combine theme class with any custom classes
  const classes = themed ? `theme-input ${className || ''}` : className;
</script>

<ShadcnInput bind:value class={classes} {...restProps} />

<style>
  /* Theme-aware input styles */
  :global(.theme-input) {
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
    color: var(--font-color);
    font-family: 'saira', monospace;
    font-size: 14px;
    transition: all var(--transition-speed, 200ms) ease-in-out;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  :global(.theme-input:focus) {
    border-color: var(--font-link-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent);
    outline: none;
  }

  :global(.theme-input::placeholder) {
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
  }
</style>
