<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import Input from '../base/Input.svelte';
  import Badge from '../base/Badge.svelte';
  import { ChevronDown, Check, Plus, X } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface MultiSelectProps {
    value?: string[];
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
    onValueChange?: (value: string[]) => void;
    onAddNew?: () => void; // Called when plus button is clicked
  }

  let {
    value = $bindable([]),
    options,
    placeholder = 'Select options',
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
  }: MultiSelectProps = $props();

  let open = $state(false);
  let searchTerm = $state('');

  const filteredOptions = $derived(
    options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedOptions = $derived(
    options.filter(opt => value.includes(opt.value))
  );

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      value = value.filter(v => v !== optionValue);
    } else {
      value = [...value, optionValue];
    }
    onValueChange?.(value);
  }

  function removeOption(optionValue: string, event: MouseEvent) {
    event.stopPropagation();
    value = value.filter(v => v !== optionValue);
    onValueChange?.(value);
  }

  function handleAddNew(event: MouseEvent) {
    event.stopPropagation();
    onAddNew?.();
  }

  const triggerClass = themed
    ? `theme-multiselect-trigger ${className || ''}`
    : `flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md ${className || ''}`;
  const contentClass = themed ? 'theme-multiselect-content w-[var(--bits-popover-trigger-width)]' : 'w-[var(--bits-popover-trigger-width)]';
  const itemClass = themed ? 'theme-multiselect-item' : '';
</script>

<div class="multiselect-wrapper">
  {#if label}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label id="{name || 'multiselect'}-label" class="theme-label" class:themed>
      {label}
      {#if required}<span class="required-asterisk">*</span>{/if}
    </label>
  {/if}

  <div class="multiselect-with-button-row">
    <Popover.Root bind:open>
      <Popover.Trigger aria-labelledby={label ? `${name || 'multiselect'}-label` : undefined} class={triggerClass}>
      <div class="selected-tags">
        {#if selectedOptions.length === 0}
          <span class="placeholder-text">{placeholder}</span>
        {:else}
          {#each selectedOptions as option (option.value)}
            <Badge themed class="selected-badge">
              {#snippet children()}
                <span>{option.label}</span>
                <button
                  type="button"
                  class="remove-tag"
                  onclick={(e) => removeOption(option.value, e)}
                >
                  <X class="h-3 w-3" />
                </button>
              {/snippet}
            </Badge>
          {/each}
        {/if}
      </div>
      <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Popover.Trigger>
    <Popover.Content class={contentClass} align="start">
      <div class="flex flex-col gap-2">
        <Input
          themed={themed}
          bind:value={searchTerm}
          placeholder={searchPlaceholder}
          class="theme-multiselect-search"
        />

        <div class="theme-multiselect-list">
          {#if filteredOptions.length === 0 && !searchTerm}
            <div class="theme-multiselect-empty">
              No options available
            </div>
          {:else if filteredOptions.length === 0}
            <div class="theme-multiselect-empty">
              No results found for "{searchTerm}"
            </div>
          {:else}
            {#each filteredOptions as option (option.value)}
              <button
                type="button"
                class={itemClass}
                class:selected={value.includes(option.value)}
                onclick={() => toggleOption(option.value)}
              >
                <div class="checkbox-indicator" class:checked={value.includes(option.value)}>
                  {#if value.includes(option.value)}
                    <Check class="h-3 w-3" />
                  {/if}
                </div>
                <span class="flex-1 text-left truncate">
                  {option.label}
                </span>
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
    <input type="hidden" {name} value={JSON.stringify(value)} />
  {/if}
</div>

<style>
  .multiselect-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .multiselect-with-button-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .multiselect-with-button-row :global(.theme-multiselect-trigger) {
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

  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
    align-items: center;
  }

  .placeholder-text {
    color: color-mix(in srgb, var(--font-color) 50%, transparent);
  }

  :global(.selected-badge) {
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
  }

  .remove-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    margin-left: 2px;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .remove-tag:hover {
    opacity: 1;
  }

  .checkbox-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: 2px solid color-mix(in srgb, var(--font-color) 40%, transparent);
    background: transparent;
    transition: all 0.2s;
  }

  .checkbox-indicator.checked {
    background: var(--font-link-color);
    border-color: var(--font-link-color);
    color: white;
  }

  :global(.theme-multiselect-trigger) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 8px 12px !important;
    min-height: 42px !important;
    transition: all var(--transition-speed, 200ms) ease-in-out !important;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color) !important;
    width: 100%;
    cursor: pointer;
  }

  :global(.theme-multiselect-trigger:hover) {
    border-color: color-mix(in srgb, var(--font-link-color) 80%, white) !important;
  }

  :global(.theme-multiselect-trigger:focus),
  :global(.theme-multiselect-trigger:focus-visible) {
    border-color: var(--font-link-color) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    outline: none !important;
  }

  :global(.theme-multiselect-content) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 14px !important;
    padding: 8px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
  }

  :global(.theme-multiselect-search) {
    margin-bottom: 4px;
  }

  :global(.theme-multiselect-list) {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.theme-multiselect-item) {
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

  :global(.theme-multiselect-item:hover) {
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent) !important;
    color: var(--font-link-color) !important;
  }

  :global(.theme-multiselect-item.selected) {
    background: color-mix(in srgb, var(--font-link-color) 15%, transparent) !important;
  }

  :global(.theme-multiselect-empty) {
    padding: 12px;
    text-align: center;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-family: 'saira', monospace;
    font-size: 14px;
  }

  /* Custom scrollbar for the list */
  :global(.theme-multiselect-list::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.theme-multiselect-list::-webkit-scrollbar-track) {
    background: color-mix(in srgb, var(--page-color) 40%, black);
  }

  :global(.theme-multiselect-list::-webkit-scrollbar-thumb) {
    background: color-mix(in srgb, var(--page-color) 80%, white);
    border-radius: 0px;
  }

  :global(.theme-multiselect-list::-webkit-scrollbar-thumb:hover) {
    background: var(--font-link-color);
  }
</style>
