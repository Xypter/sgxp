<script lang="ts">
  import Input from '../base/Input.svelte';

  interface SearchBarProps {
    value?: string;
    placeholder?: string;
    themed?: boolean;
    class?: string;
    inputClass?: string;
    onSearch?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Search...',
    themed = false,
    class: className,
    inputClass = '',
    onSearch
  }: SearchBarProps = $props();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    if (onSearch) {
      onSearch(value);
    }
  }
</script>

<div class="search-bar-wrapper {className || ''}">
  <svg
    class="search-icon {themed ? 'theme-icon' : ''}"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>

  <Input
    type="search"
    {value}
    {placeholder}
    {themed}
    class="search-input {inputClass}"
    oninput={handleInput}
  />
</div>

<style>
  .search-bar-wrapper {
    position: relative;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    opacity: 0.5;
    pointer-events: none;
  }

  :global(.search-input) {
    padding-left: 2.5rem !important;
  }

  :global(.theme-icon) {
    color: var(--font-color);
  }
</style>
