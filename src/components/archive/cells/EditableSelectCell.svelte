<script lang="ts">
  import { Select } from '$lib/components';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    faded?: boolean;
    onSave: (value: string) => void;
  }

  let { value = $bindable(), options, placeholder = 'Select...', disabled = false, faded = false, onSave }: Props = $props();

  function handleChange(newValue: string) {
    if (newValue === value) return;
    value = newValue;
    onSave(newValue);
  }
</script>

{#if disabled && !faded}
  <span class="readonly-value">{options.find(o => o.value === value)?.label || value || '—'}</span>
{:else}
  <Select {value} {options} {placeholder} {disabled} themed onValueChange={handleChange} class="cell-select" />
{/if}

<style>
  .readonly-value {
    color: var(--font-color);
    opacity: 0.7;
    font-family: 'saira';
    font-size: 13px;
  }

  :global(.cell-select) {
    min-width: 130px !important;
    min-height: 34px !important;
    height: 34px !important;
    padding: 4px 8px !important;
    font-size: 13px !important;
  }
</style>
