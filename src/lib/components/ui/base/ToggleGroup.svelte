<script lang="ts">
  import * as ToggleGroupPrimitive from '$components/ui/toggle-group';

  interface Option {
    value: string;
    label: string;
  }

  interface ToggleGroupProps {
    value?: string;
    options: Option[];
    themed?: boolean;
    disabled?: boolean;
    class?: string;
    onValueChange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    options,
    themed = false,
    disabled = false,
    class: className,
    onValueChange
  }: ToggleGroupProps = $props();

  const rootClass = themed ? `theme-toggle-group ${className || ''}` : className;
  const itemClass = themed ? 'theme-toggle-group-item' : '';

  function handleValueChange(newValue: string | undefined) {
    if (newValue !== undefined && newValue !== '') {
      value = newValue;
      onValueChange?.(newValue);
    }
  }
</script>

<ToggleGroupPrimitive.Root
  type="single"
  bind:value={value}
  {disabled}
  class={rootClass}
  onValueChange={handleValueChange}
>
  {#each options as option (option.value)}
    <ToggleGroupPrimitive.Item value={option.value} class={itemClass}>
      {option.label}
    </ToggleGroupPrimitive.Item>
  {/each}
</ToggleGroupPrimitive.Root>

<style>
  :global(.theme-toggle-group) {
    display: inline-flex !important;
    gap: 2px !important;
  }

  :global(.theme-toggle-group-item) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 12px !important;
    height: 30px !important;
    padding: 0 10px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
  }

  :global(.theme-toggle-group-item:hover:not([data-disabled])) {
    border-color: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
  }

  :global(.theme-toggle-group-item[data-state='on']) {
    background: var(--font-link-color) !important;
    border-color: var(--font-link-color) !important;
    color: var(--page-color) !important;
  }

  :global(.theme-toggle-group-item[data-disabled]) {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
  }
</style>
