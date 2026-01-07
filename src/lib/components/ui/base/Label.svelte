<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label as ShadcnLabel } from '$components/ui/label';
  import { Label as LabelPrimitive } from 'bits-ui';

  interface LabelProps extends LabelPrimitive.RootProps {
    themed?: boolean;
    class?: string;
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
    font-weight: 700 !important;
    font-size: 14px !important;
    text-transform: none !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
  }
</style>