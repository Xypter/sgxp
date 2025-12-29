<script lang="ts">
  import { Checkbox, Label } from '$lib/components';

  interface FormCheckboxProps {
    checked?: boolean;
    label?: string;
    description?: string;
    themed?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    description,
    themed = false,
    disabled = false,
    error,
    class: className,
    ...restProps
  }: FormCheckboxProps = $props();
</script>

<div class="form-checkbox-wrapper {className || ''}">
  <label class="checkbox-container" class:disabled>
    <Checkbox
      bind:checked
      {themed}
      {disabled}
      class="checkbox-input"
      {...restProps}
    />
    <div class="checkbox-content">
      {#if label}
        <span class="checkbox-label" class:themed>{label}</span>
      {/if}
      {#if description}
        <span class="checkbox-description" class:themed>{description}</span>
      {/if}
    </div>
  </label>
  {#if error}
    <span class="checkbox-error" class:themed>{error}</span>
  {/if}
</div>

<style>
  .form-checkbox-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .checkbox-container {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .checkbox-container:hover {
    background: color-mix(in srgb, var(--page-color) 95%, white);
  }

  .checkbox-container.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .checkbox-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .checkbox-label {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
  }

  .checkbox-label.themed {
    font-family: 'saira', monospace;
    font-weight: 700;
    color: var(--font-color);
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  .checkbox-description {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #666;
    line-height: 1.4;
  }

  .checkbox-description.themed {
    font-family: 'saira', monospace;
    color: color-mix(in srgb, var(--font-color) 70%, transparent);
  }

  .checkbox-error {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #ef4444;
    padding-left: 12px;
  }

  .checkbox-error.themed {
    font-family: 'saira', monospace;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }
</style>
