<script lang="ts">
  import Input from '../base/Input.svelte';
  import Label from '../base/Label.svelte';

  interface FormInputProps {
    label: string;
    name: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    maxLength?: number;
    themed?: boolean;
    class?: string;
    inputClass?: string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
  }

  let {
    label,
    name,
    type = 'text',
    value = $bindable(''),
    placeholder,
    required = false,
    disabled = false,
    error,
    helperText,
    maxLength,
    themed = false,
    class: className,
    inputClass,
    onInput,
    onChange
  }: FormInputProps = $props();

  const characterCount = $derived(value?.length || 0);
  const showCharCount = maxLength !== undefined;

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    if (onInput) {
      onInput(value);
    }
  }

  function handleChange(event: Event) {
    if (onChange) {
      onChange(value);
    }
  }
</script>

<div class="form-field {className || ''}">
  <div class="label-row">
    <Label
      for={name}
      {themed}
      class="form-label"
    >
      {label}
      {#if required}
        <span class="text-destructive">*</span>
      {/if}
    </Label>

    {#if showCharCount}
      <span class="char-count {themed ? 'theme-description' : ''}">
        {characterCount}/{maxLength}
      </span>
    {/if}
  </div>

  <Input
    id={name}
    {name}
    {type}
    bind:value={value}
    {placeholder}
    {required}
    {disabled}
    maxlength={maxLength}
    {themed}
    class="form-input {inputClass || ''} {error ? 'border-destructive' : ''}"
    oninput={handleInput}
    onchange={handleChange}
  />

  {#if error}
    <p class="form-error {themed ? 'theme-error-text' : ''}">
      {error}
    </p>
  {/if}

  {#if helperText && !error}
    <p class="form-helper {themed ? 'theme-description' : ''}">
      {helperText}
    </p>
  {/if}
</div>

<style>
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-label {
    display: block;
  }

  .char-count {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .form-input {
    width: 100%;
  }

  .form-error {
    font-size: 0.875rem;
    color: hsl(var(--destructive));
    margin-top: -0.25rem;
  }

  .form-helper {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-top: -0.25rem;
  }
</style>
