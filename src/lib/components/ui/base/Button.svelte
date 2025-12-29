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
  /* Use :global() because the class is applied to the Shadcn component 
    inside the child scope. !important ensures we override Tailwind defaults.
  */
  :global(.theme-button) {
    background: var(--font-link-color) !important;
    color: var(--page-color) !important;
    border: none !important;
    border-radius: 0px !important;
    font-family: 'saira', monospace !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    cursor: url('/img/Sonic_Cursor.png'), pointer !important;
    box-shadow: var(--box-shadow) !important;
  }

  :global(.theme-button:hover:not(:disabled)) {
    background: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
  }

  :global(.theme-button:disabled) {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
    transform: none !important;
  }
</style>