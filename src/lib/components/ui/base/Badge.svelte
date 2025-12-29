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
    padding: 3px 8px 4px 8px !important;
    line-height: 1 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transform: translateZ(0) !important;
    text-transform: capitalize !important;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(-1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(-1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(-1px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(0px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%),
      calc(1px * var(--multiply-factor)) calc(-1px * var(--multiply-factor)) 0px color-mix(in srgb, var(--badge-color, var(--font-link-color)) 70%, black 30%);
  }
</style>