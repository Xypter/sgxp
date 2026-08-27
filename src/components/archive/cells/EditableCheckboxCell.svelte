<script lang="ts">
  import { Checkbox } from '$lib/components';

  interface Props {
    value: boolean;
    disabled?: boolean;
    onSave: (value: boolean) => void;
  }

  let { value = $bindable(), disabled = false, onSave }: Props = $props();

  function handleChange(checked: boolean) {
    if (checked === value) return;
    value = checked;
    onSave(checked);
  }
</script>

<Checkbox checked={value} {disabled} themed onCheckedChange={handleChange} />
