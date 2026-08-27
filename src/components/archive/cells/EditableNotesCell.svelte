<script lang="ts">
  import { Textarea } from '$lib/components';

  interface Props {
    value: string | undefined;
    disabled?: boolean;
    onSave: (value: string) => void;
  }

  let { value = $bindable(), disabled = false, onSave }: Props = $props();
  let localValue = $state(value ?? '');

  // Saves on blur only (clicking/tabbing away from the textarea - which
  // includes clicking the "Ready for review"/"Confirm Review" buttons,
  // since moving focus there blurs this field first) - not on every
  // keystroke.
  function handleBlur() {
    if (localValue === (value ?? '')) return;
    value = localValue;
    onSave(localValue);
  }
</script>

{#if disabled}
  <span class="readonly-value">{value || '—'}</span>
{:else}
  <Textarea
    bind:value={localValue}
    onblur={handleBlur}
    themed
    rows={2}
    class="cell-notes-textarea"
  />
{/if}

<style>
  .readonly-value {
    color: var(--font-color);
    opacity: 0.7;
    font-family: 'saira';
    font-size: 13px;
    white-space: pre-wrap;
  }

  :global(.cell-notes-textarea) {
    min-width: 200px !important;
    font-size: 13px !important;
    resize: vertical;
  }
</style>
