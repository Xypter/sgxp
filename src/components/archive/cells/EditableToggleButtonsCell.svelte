<script lang="ts">
  import { ToggleGroup } from '$lib/components';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: Option[];
    disabled?: boolean;
    onSave: (value: string) => void;
  }

  let { value = $bindable(), options, disabled = false, onSave }: Props = $props();

  function handleChange(newValue: string) {
    if (newValue === value) return;
    value = newValue;
    onSave(newValue);
  }
</script>

<ToggleGroup {value} {options} {disabled} themed onValueChange={handleChange} class="cell-toggle-group" />
