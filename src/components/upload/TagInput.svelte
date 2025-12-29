<script lang="ts">
  import { X, Plus } from 'lucide-svelte';
  import { Input } from '$lib/components';

  interface TagInputProps {
    value?: string[];
    label?: string;
    placeholder?: string;
    helperText?: string;
    themed?: boolean;
    class?: string;
    maxTags?: number;
    onTagsChange?: (tags: string[]) => void;
  }

  let {
    value = $bindable([]),
    label,
    placeholder = 'Add a tag...',
    helperText,
    themed = false,
    class: className,
    maxTags = 10,
    onTagsChange
  }: TagInputProps = $props();

  let inputValue = $state('');
  let inputRef: HTMLInputElement;

  function addTag() {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue) && value.length < maxTags) {
      value = [...value, trimmedValue];
      inputValue = '';
      onTagsChange?.(value);
    }
  }

  function removeTag(tagToRemove: string) {
    value = value.filter(tag => tag !== tagToRemove);
    onTagsChange?.(value);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    } else if (event.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      value = value.slice(0, -1);
      onTagsChange?.(value);
    }
  }
</script>

<div class="tag-input-wrapper {className || ''}" class:themed>
  {#if label}
    <label class="theme-label">
      {label}
    </label>
  {/if}

  <div class="tag-input-container">
    <div class="tags-list">
      {#each value as tag (tag)}
        <span class="tag">
          {tag}
          <button
            type="button"
            class="remove-tag-btn"
            onclick={() => removeTag(tag)}
            title="Remove tag"
          >
            <X class="h-3 w-3" />
          </button>
        </span>
      {/each}
    </div>

    {#if value.length < maxTags}
      <div class="tag-input-row">
        <Input
          themed={themed}
          bind:value={inputValue}
          {placeholder}
          class="tag-text-input"
          onkeydown={handleKeyDown}
        />
        <button
          type="button"
          class="add-tag-btn"
          onclick={addTag}
          disabled={!inputValue.trim()}
          title="Add tag"
        >
          <Plus class="h-4 w-4" />
        </button>
      </div>
    {:else}
      <div class="max-tags-message">
        Maximum {maxTags} tags reached
      </div>
    {/if}
  </div>

  {#if helperText}
    <span class="field-helper">{helperText}</span>
  {/if}
</div>

<style>
  .tag-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .theme-label {
    display: block;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    margin-bottom: 4px;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  .tag-input-container {
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--font-link-color);
    color: white;
    font-family: 'saira', monospace;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .remove-tag-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .remove-tag-btn:hover {
    opacity: 1;
  }

  .tag-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  :global(.tag-text-input) {
    flex: 1;
  }

  .add-tag-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--font-link-color);
    border: none;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-tag-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
  }

  .add-tag-btn:disabled {
    background: color-mix(in srgb, var(--page-color) 40%, black);
    color: color-mix(in srgb, var(--font-color) 40%, transparent);
    cursor: not-allowed;
  }

  .max-tags-message {
    font-family: 'saira', monospace;
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    font-style: italic;
  }

  .field-helper {
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    margin-top: 4px;
  }
</style>
