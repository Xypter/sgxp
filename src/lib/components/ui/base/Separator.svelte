<script lang="ts">
  import { Separator as ShadcnSeparator } from '$components/ui/separator';
  import type { SeparatorRootProps } from 'bits-ui';

  interface ThemedSeparatorProps extends SeparatorRootProps {
    themed?: boolean;
    class?: string;
  }

  let {
    themed = false,
    class: className,
    ...restProps
  }: ThemedSeparatorProps = $props();

  const classes = themed ? `theme-separator ${className || ''}` : className;
</script>

<ShadcnSeparator class={classes} {...restProps} />

<style>
  :global(.theme-separator) {
    background: color-mix(in srgb, var(--font-color) 20%, transparent) !important;
    height: 2px !important;
  }

  :global(.theme-separator[data-orientation="vertical"]) {
    width: 2px !important;
    height: auto !important;
  }
</style>
