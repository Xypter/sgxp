<script lang="ts">
  import { Switch as ShadcnSwitch } from '$components/ui/switch';

  interface SwitchProps {
    checked?: boolean;
    themed?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    themed = false,
    class: className,
    ...restProps
  }: SwitchProps = $props();

  const classes = themed ? `theme-switch ${className || ''}` : className;
</script>

<ShadcnSwitch bind:checked class={classes} {...restProps} />

<style>
  :global(.theme-switch) {
    background: color-mix(in srgb, var(--page-color) 50%, black) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
    border-radius: 2px !important;
  }

  :global(.theme-switch[data-state="checked"]) {
    background: var(--font-link-color) !important;
    border-color: var(--font-link-color) !important;
  }

  :global(.theme-switch [data-slot="switch-thumb"]) {
    background: var(--bg-color) !important;
    border-radius: 1px !important;
  }

  :global(.theme-switch[data-state="checked"] [data-slot="switch-thumb"]) {
    background: var(--page-color) !important;
  }
</style>
