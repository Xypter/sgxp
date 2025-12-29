<script lang="ts">
  import { Progress as ShadcnProgress } from '$components/ui/progress';

  interface ProgressProps {
    value?: number;
    max?: number;
    color?: string;
    themed?: boolean;
    class?: string;
  }

  let {
    value = 0,
    max = 100,
    color,
    themed = false,
    class: className,
    ...restProps
  }: ProgressProps = $props();

  const classes = themed ? `theme-progress ${className || ''}` : className;
  const style = color ? `--progress-color: ${color};` : undefined;
</script>

<ShadcnProgress {value} {max} class={classes} style={style} {...restProps} />

<style>
  :global(.theme-progress) {
    background: color-mix(in srgb, var(--page-color) 50%, black) !important;
    border-radius: 2px !important;
    height: 8px !important;
    overflow: hidden !important;
    position: relative !important;
  }

  :global(.theme-progress [data-slot="progress-indicator"]) {
    background: var(--progress-color, var(--font-link-color)) !important;
    border-radius: 1px !important;
    height: 100% !important;
    width: 100% !important;
    display: block !important;
    transition: transform 0.3s ease !important;
  }
</style>
