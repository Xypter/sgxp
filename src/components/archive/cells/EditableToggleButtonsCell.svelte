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
    /** Mini in table rows; the phone cards use the full size. */
    size?: 'default' | 'mini';
    onSave: (value: string) => void;
  }

  let { value = $bindable(), options, disabled = false, size = 'mini', onSave }: Props = $props();

  function handleChange(newValue: string) {
    if (newValue === value) return;
    value = newValue;
    onSave(newValue);
  }
</script>

<ToggleGroup {value} {options} {disabled} {size} themed onValueChange={handleChange} class="cell-toggle-group" />
