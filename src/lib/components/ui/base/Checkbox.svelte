<script lang="ts">
  import { Checkbox as ShadcnCheckbox } from '$components/ui/checkbox';

  interface CheckboxProps {
    checked?: boolean;
    themed?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    themed = false,
    disabled = false,
    class: className,
    ...restProps
  }: CheckboxProps = $props();

  const classes = themed ? `theme-checkbox ${className || ''}` : className;
</script>

<ShadcnCheckbox bind:checked {disabled} class={classes} {...restProps} />

<style>
  :global(.theme-checkbox) {
    background: var(--page-color) !important;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white) !important;
    border-radius: 2px !important;
    color: var(--font-color) !important;
  }

  :global(.theme-checkbox[data-state="checked"]) {
    background: var(--font-link-color) !important;
    border-color: var(--font-link-color) !important;
    color: var(--page-color) !important;
  }

  :global(.theme-checkbox:hover) {
    border-color: var(--font-link-color) !important;
  }

  :global(.theme-checkbox:focus-visible) {
    outline: none !important;
    ring: 2px solid var(--font-link-color) !important;
    ring-offset: 2px !important;
  }
</style>
