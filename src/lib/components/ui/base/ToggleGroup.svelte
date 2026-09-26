<script lang="ts">
  import * as ToggleGroupPrimitive from '$components/ui/toggle-group';
  import { sgxpButtonClass } from '$components/ui/button';

  interface Option {
    value: string;
    label: string;
  }

  interface ToggleGroupProps {
    value?: string;
    options: Option[];
    themed?: boolean;
    disabled?: boolean;
    /** The standard's sizes: mini (24px) for table rows. */
    size?: 'default' | 'mini';
    class?: string;
    onValueChange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    options,
    themed = false,
    disabled = false,
    size = 'default',
    class: className,
    onValueChange
  }: ToggleGroupProps = $props();

  // Themed: the button standard's toggles joined as a group (the selected
  // item is data-state="on", which the toggle variant lights up).
  const rootClass = $derived(themed ? `sgxp-btn-group ${className || ''}` : className);
  const itemClass = $derived(themed ? sgxpButtonClass({ variant: 'toggle', size }) : '');

  function handleValueChange(newValue: string | undefined) {
    if (newValue !== undefined && newValue !== '') {
      value = newValue;
      onValueChange?.(newValue);
    }
  }
</script>

<ToggleGroupPrimitive.Root
  type="single"
  bind:value={value}
  {disabled}
  class={rootClass}
  onValueChange={handleValueChange}
>
  {#each options as option (option.value)}
    <ToggleGroupPrimitive.Item value={option.value} class={itemClass}>
      {option.label}
    </ToggleGroupPrimitive.Item>
  {/each}
</ToggleGroupPrimitive.Root>

