<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label as ShadcnLabel } from '$components/ui/label';
  import type { LabelProps as ShadcnLabelProps } from '$components/ui/label';

  interface LabelProps extends ShadcnLabelProps {
    themed?: boolean;
    children?: Snippet;
  }

  let {
    themed = false,
    class: className,
    children,
    ...restProps
  }: LabelProps = $props();

  const classes = themed ? `theme-label ${className || ''}` : className;
</script>

<ShadcnLabel class={classes} {...restProps}>
  {@render children?.()}
</ShadcnLabel>

<style>
  :global(.theme-label) {
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
  }
</style>