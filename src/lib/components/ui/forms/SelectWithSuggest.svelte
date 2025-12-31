<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import Input from '../base/Input.svelte';
  import { ChevronDown, Check, Plus } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface SelectWithSuggestProps {
    value?: string;
    options: Option[];
    placeholder?: string;
    searchPlaceholder?: string;
    themed?: boolean;
    class?: string;
    label?: string;
    name?: string;
    required?: boolean;
    error?: string;
    helperText?: string;
    allowSuggestions?: boolean;
    onValueChange?: (value: string) => void;
    onAddNew?: () => void; // Called when plus button is clicked
  }

  let {
    value = $bindable(),
    options,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search...',
    themed = false,
    class: className,
    label,
    name,
    required = false,
    error,
    helperText,
    allowSuggestions = true,
    onValueChange,
    onAddNew
  }: SelectWithSuggestProps = $props();

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

  function handleAddNew(event: MouseEvent) {
    event.stopPropagation();
    onAddNew?.();
  }

  const triggerClass = themed
    ? `theme-select-suggest-trigger ${className || ''}`
    : `flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md ${className || ''}`;
  const contentClass = themed ? 'theme-select-suggest-content w-[var(--bits-popover-trigger-width)]' : 'w-[var(--bits-popover-trigger-width)]';
  const itemClass = themed ? 'theme-select-suggest-item' : '';
</script>

<div class="select-with-suggest-wrapper">
  {#if label}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label id="{name || 'select-with-suggest'}-label" class="theme-label" class:themed>
      {label}
      {#if required}<span class="required-asterisk">*</span>{/if}
    </label>
  {/if}

  <div class="select-with-button-row">
    <Popover.Root bind:open>
      <Popover.Trigger aria-labelledby={label ? `${name || 'select-with-suggest'}-label` : undefined} class={triggerClass}>
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
          class="theme-select-suggest-search"
        />

        <div class="theme-select-suggest-list">
          {#if filteredOptions.length === 0 && !searchTerm}
            <div class="theme-select-suggest-empty">
              No options available
            </div>
          {:else if filteredOptions.length === 0}
            <div class="theme-select-suggest-empty">
              No results found for "{searchTerm}"
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

  {#if allowSuggestions && onAddNew}
    <button
      type="button"
      class="add-new-btn"
      onclick={handleAddNew}
      title="Suggest new {label?.toLowerCase() || 'item'}"
    >
      <Plus class="h-4 w-4" />
    </button>
  {/if}
</div>

  {#if error}
    <span class="field-error">{error}</span>
  {:else if helperText}
    <span class="field-helper">{helperText}</span>
  {/if}

  {#if name}
    <input type="hidden" {name} value={value || ''} />
  {/if}
</div>

<style>
  .select-with-suggest-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .select-with-button-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .select-with-button-row :global(.theme-select-suggest-trigger) {
    flex: 1;
  }

  .theme-label {
    display: block;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  .required-asterisk {
    color: #ef4444;
    margin-left: 2px;
  }

  .add-new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    background: var(--font-link-color);
    color: var(--page-color);
    border: none;
    border-radius: 0px;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 16px;
    transition: all var(--transition-speed, 200ms) ease-in-out;
    cursor: url('/img/Sonic_Cursor.png'), pointer;
    box-shadow: var(--box-shadow);
    flex-shrink: 0;
  }

  .add-new-btn:hover {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
    cursor: url('/img/Sonic_Cursor_Spin.gif'), progress;
  }

  .add-new-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
    margin-top: 4px;
  }

  .field-helper {
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    margin-top: 4px;
  }

  :global(.theme-select-suggest-trigger) {
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
    width: 100%;
    cursor: pointer;
  }

  :global(.theme-select-suggest-trigger:hover) {
    border-color: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
  }

  :global(.theme-select-suggest-trigger:focus),
  :global(.theme-select-suggest-trigger:focus-visible) {
    border-color: var(--font-link-color) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-select-suggest-content) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 8px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
  }

  :global(.theme-select-suggest-search) {
    margin-bottom: 4px;
  }

  :global(.theme-select-suggest-list) {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.theme-select-suggest-item) {
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

  :global(.theme-select-suggest-item:hover) {
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-select-suggest-item.selected) {
    background: color-mix(in srgb, var(--font-link-color) 30%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-select-suggest-empty) {
    padding: 12px;
    text-align: center;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-family: 'saira', monospace;
    font-size: 14px;
  }

  /* Custom scrollbar for the list */
  :global(.theme-select-suggest-list::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.theme-select-suggest-list::-webkit-scrollbar-track) {
    background: color-mix(in srgb, var(--page-color) 40%, black);
  }

  :global(.theme-select-suggest-list::-webkit-scrollbar-thumb) {
    background: color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
  }

  :global(.theme-select-suggest-list::-webkit-scrollbar-thumb:hover) {
    background: var(--font-link-color);
  }
</style>
