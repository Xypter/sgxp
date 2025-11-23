<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Badge as ShadcnBadge, badgeVariants } from '$components/ui/badge';
  import type { BadgeVariant } from '$components/ui/badge';

  interface BadgeProps {
    variant?: BadgeVariant;
    themed?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    themed = false,
    class: className,
    children,
    ...restProps
  }: BadgeProps = $props();

  // Combine theme class with any custom classes
  const classes = themed ? `theme-badge ${className || ''}` : className;
</script>

<ShadcnBadge class={classes} {...restProps}>
  {@render children?.()}
</ShadcnBadge>

<style>
  /* Theme-aware badge styles */
  :global(.theme-badge) {
    background: var(--font-link-color);
    color: var(--page-color);
    border: none;
    border-radius: 0px;
    font-family: 'saira', monospace;
    font-weight: 600;
    font-size: 12px;
    padding: 2px 8px;
  }
</style>
