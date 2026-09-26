<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button as ShadcnButton, isSgxpVariant } from '$components/ui/button';
  import type { ButtonProps as ShadcnButtonProps } from '$components/ui/button';

  interface ButtonProps extends ShadcnButtonProps {
    themed?: boolean;
    children?: Snippet;
  }

  let {
    themed = false,
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: ButtonProps = $props();

  // `themed` is the pre-standard look. The standard variants (primary,
  // secondary, ... - see src/styles/buttons.css) are themed already, and
  // .theme-button's !important rules would override them, so it's skipped.
  const classes = $derived(
    themed && !isSgxpVariant(restProps.variant) ? `theme-button ${className || ''}` : className
  );
</script>

<ShadcnButton bind:ref class={classes} {...restProps}>
  {@render children?.()}
</ShadcnButton>

<style>
  /* Use :global() because the class is applied to the Shadcn component 
    inside the child scope. !important ensures we override Tailwind defaults.
  */
  :global(.theme-button) {
    background: var(--font-link-color) !important;
    color: var(--page-color) !important;
    /* When rendered as an <a> (href set), the site-wide `a { text-shadow }`
       rule (main.css) - meant to outline link text against the page
       background - otherwise bleeds through here too and looks wrong
       against this button's own solid background. */
    text-shadow: none !important;
    border: none !important;
    border-radius: 0px !important;
    font-family: 'saira', monospace !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    cursor: url('/img/Sonic_Cursor.png'), pointer !important;
    box-shadow: var(--box-shadow) !important;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    :global(.theme-button:hover:not(:disabled)) {
      background: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
      cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
    }
  }

  :global(.theme-button:disabled) {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
    transform: none !important;
  }
</style>