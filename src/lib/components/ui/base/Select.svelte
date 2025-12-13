<script lang="ts">
  import * as SelectPrimitive from '$components/ui/select';
  import type { Snippet } from 'svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface SelectProps {
    value?: string;
    options: Option[];
    placeholder?: string;
    themed?: boolean;
    class?: string;
    children?: Snippet;
    onValueChange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    options,
    placeholder = 'Select an option',
    themed = false,
    class: className,
    children,
    onValueChange
  }: SelectProps = $props();

  const triggerClass = themed
    ? `theme-select-trigger ${className || ''}`
    : className;
  const contentClass = themed ? 'theme-select-content' : '';
  const itemClass = themed ? 'theme-select-item' : '';

  function handleValueChange(newValue: string | undefined) {
    if (newValue !== undefined) {
      value = newValue;
      onValueChange?.(newValue);
    }
  }
</script>

<SelectPrimitive.Root type="single" bind:value={value} onSelectedChange={handleValueChange}>
  <SelectPrimitive.Trigger class={triggerClass}>
    {#if children}
      {@render children()}
    {:else}
      {options.find(opt => opt.value === value)?.label || placeholder}
    {/if}
  </SelectPrimitive.Trigger>
  <SelectPrimitive.Content class={contentClass}>
    {#each options as option (option.value)}
      <SelectPrimitive.Item value={option.value} label={option.label} class={itemClass}>
        {option.label}
      </SelectPrimitive.Item>
    {/each}
  </SelectPrimitive.Content>
</SelectPrimitive.Root>

<style>
  :global(.theme-select-trigger) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 8px 12px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
    min-width: 150px;
  }

  :global(.theme-select-trigger:hover) {
    border-color: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
  }

  :global(.theme-select-trigger:focus),
  :global(.theme-select-trigger:focus-visible) {
    border-color: var(--font-link-color) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-select-content) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 4px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
    width: var(--bits-select-trigger-width) !important;
  }

  :global(.theme-select-item) {
    padding: 8px 12px !important;
    color: var(--font-color) !important;
    cursor: pointer;
    transition: background-color var(--transition-speed, 200ms) ease-in-out !important;
  }

  :global(.theme-select-item:hover),
  :global(.theme-select-item[data-highlighted]) {
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-select-item[data-selected]) {
    background: color-mix(in srgb, var(--font-link-color) 30%, transparent) !important;
    color: var(--font-link-color) !important;
  }
</style>
