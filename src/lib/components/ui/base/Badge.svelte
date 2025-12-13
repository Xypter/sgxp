<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Badge as ShadcnBadge } from '$components/ui/badge';
  import type { BadgeVariant } from '$components/ui/badge';

  interface BadgeProps {
    variant?: BadgeVariant;
    themed?: boolean;
    color?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    themed = false,
    color,
    class: className,
    children,
    ...restProps
  }: BadgeProps = $props();

  const classes = themed ? `theme-badge ${className || ''}` : className;
  const style = color ? `--badge-color: ${color};` : undefined;
</script>

<ShadcnBadge class={classes} style={style} {...restProps}>
  {@render children?.()}
</ShadcnBadge>

<style>
  :global(.theme-badge) {
    background: var(--badge-color, var(--font-link-color)) !important;
    color: white !important;
    border: none !important;
    border-radius: 2px !important;
    font-family: 'saira', monospace !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    padding: 2px 8px 4px !important;
    text-shadow: none;
  }
</style>