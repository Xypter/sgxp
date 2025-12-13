<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import Input from './Input.svelte';
  import { ChevronDown, Check } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface ComboboxProps {
    value?: string;
    options: Option[];
    placeholder?: string;
    searchPlaceholder?: string;
    themed?: boolean;
    class?: string;
    onValueChange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    options,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search...',
    themed = false,
    class: className,
    onValueChange
  }: ComboboxProps = $props();

  let open = $state(false);
  let searchTerm = $state('');

  const filteredOptions = $derived(
    options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedOption = $derived(
    options.find(opt => opt.value === value)
  );

  function selectOption(optionValue: string) {
    value = optionValue;
    open = false;
    searchTerm = '';
    onValueChange?.(optionValue);
  }

  const triggerClass = themed
    ? `theme-combobox-trigger ${className || ''}`
    : `flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md ${className || ''}`;
  const contentClass = themed ? 'theme-combobox-content w-[var(--bits-popover-trigger-width)]' : 'w-[var(--bits-popover-trigger-width)]';
  const itemClass = themed ? 'theme-combobox-item' : '';
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={triggerClass}>
    <span class="truncate">
      {selectedOption?.label || placeholder}
    </span>
    <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
  </Popover.Trigger>
  <Popover.Content class={contentClass} align="start">
    <div class="flex flex-col gap-2">
      <Input
        themed={themed}
        bind:value={searchTerm}
        placeholder={searchPlaceholder}
        class="theme-combobox-search"
      />
      <div class="theme-combobox-list">
        {#if filteredOptions.length === 0}
          <div class="theme-combobox-empty">
            No results found
          </div>
        {:else}
          {#each filteredOptions as option (option.value)}
            <button
              type="button"
              class={itemClass}
              class:selected={value === option.value}
              onclick={() => selectOption(option.value)}
            >
              <span class="flex-1 text-left truncate">
                {option.label}
              </span>
              {#if value === option.value}
                <Check class="h-4 w-4 shrink-0" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </Popover.Content>
</Popover.Root>

<style>
  :global(.theme-combobox-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    cursor: pointer;
  }

  :global(.theme-combobox-trigger:hover) {
    border-color: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
  }

  :global(.theme-combobox-trigger:focus),
  :global(.theme-combobox-trigger:focus-visible) {
    border-color: var(--font-link-color) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-combobox-content) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 8px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
  }

  :global(.theme-combobox-search) {
    margin-bottom: 4px;
  }

  :global(.theme-combobox-list) {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.theme-combobox-item) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px !important;
    color: var(--font-color) !important;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color var(--transition-speed, 200ms) ease-in-out !important;
    text-align: left;
    width: 100%;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
  }

  :global(.theme-combobox-item:hover) {
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-combobox-item.selected) {
    background: color-mix(in srgb, var(--font-link-color) 30%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-combobox-empty) {
    padding: 12px;
    text-align: center;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-family: 'saira', monospace;
    font-size: 14px;
  }

  /* Custom scrollbar for the list */
  :global(.theme-combobox-list::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.theme-combobox-list::-webkit-scrollbar-track) {
    background: color-mix(in srgb, var(--page-color) 40%, black);
  }

  :global(.theme-combobox-list::-webkit-scrollbar-thumb) {
    background: color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
  }

  :global(.theme-combobox-list::-webkit-scrollbar-thumb:hover) {
    background: var(--font-link-color);
  }
</style>
