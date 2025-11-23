<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button as ShadcnButton } from '$components/ui/button';
  import type { ButtonProps as ShadcnButtonProps } from '$components/ui/button';

  interface ButtonProps extends ShadcnButtonProps {
    themed?: boolean;
    children?: Snippet;
  }

  let {
    themed = false,
    class: className,
    children,
    ...restProps
  }: ButtonProps = $props();

  // Combine theme class with any custom classes
  const classes = themed ? `theme-button ${className || ''}` : className;
</script>

<ShadcnButton class={classes} {...restProps}>
  {@render children?.()}
</ShadcnButton>

<style>
  /* Theme-aware button styles */
  :global(.theme-button) {
    background: var(--font-link-color);
    color: var(--page-color);
    border: none;
    border-radius: 0px;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    transition: all var(--transition-speed, 200ms) ease-in-out;
    cursor: url('/img/Sonic_Cursor.png'), pointer;
    box-shadow: var(--box-shadow);
  }

  :global(.theme-button:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
  }

  :global(.theme-button:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
</style>
