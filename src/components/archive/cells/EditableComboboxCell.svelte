<script lang="ts">
  import { Combobox } from '$lib/components';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: Option[];
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    faded?: boolean;
    creatable?: boolean;
    onSave: (value: string) => void;
  }

  let {
    value = $bindable(),
    options,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    disabled = false,
    faded = false,
    creatable = false,
    onSave,
  }: Props = $props();

  function handleChange(newValue: string) {
    if (newValue === value) return;
    value = newValue;
    onSave(newValue);
  }
</script>

{#if disabled && !faded}
  <span class="readonly-value">{options.find(o => o.value === value)?.label || value || '—'}</span>
{:else}
  <Combobox {value} {options} {placeholder} {searchPlaceholder} {disabled} {creatable} themed onValueChange={handleChange} class="cell-combobox" />
{/if}

<style>
  .readonly-value {
    color: var(--font-color);
    opacity: 0.7;
    font-family: 'saira';
    font-size: 13px;
  }

  :global(.cell-combobox) {
    min-width: 150px !important;
    min-height: 34px !important;
    height: 34px !important;
    padding: 4px 8px !important;
    font-size: 13px !important;
  }
</style>
