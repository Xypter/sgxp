<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import { ListFilter, Square, SquareCheck, X } from 'lucide-svelte';
  import { Button } from '$lib/components';
  import { sgxpButtonClass } from '$components/ui/button';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    title: string;
    options: Option[];
    selected: string[];
    onChange: (values: string[]) => void;
  }

  let { title, options, selected, onChange }: Props = $props();

  let open = $state(false);

  function toggle(value: string) {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    onChange(next);
  }

  function clear() {
    onChange([]);
  }

  // The standard subtle icon button (a popover trigger, so via the class
  // helper); how many values are picked shows as the standard corner badge.
  const triggerClass = sgxpButtonClass({ variant: 'subtle', size: 'icon-mini' });
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={triggerClass} aria-label="Filter {title}" title="Filter {title}">
    <ListFilter />
    {#if selected.length > 0}
      <span class="sgxp-btn-badge sgxp-btn-badge--corner">{selected.length}</span>
    {/if}
  </Popover.Trigger>
  <Popover.Content class="theme-faceted-filter-content" align="start">
    <div class="theme-faceted-filter-list">
      {#each options as option (option.value)}
        <button type="button" class="theme-faceted-filter-item" onclick={() => toggle(option.value)}>
          {#if selected.includes(option.value)}
            <SquareCheck size={15} />
          {:else}
            <Square size={15} />
          {/if}
          <span class="theme-faceted-filter-item-label">{option.label}</span>
        </button>
      {/each}
    </div>
    {#if selected.length > 0}
      <div class="theme-faceted-filter-clear">
        <Button variant="quiet" icon={X} onclick={clear}>Clear filter</Button>
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>

<style>
  :global(.theme-faceted-filter-content) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', monospace !important;
    font-size: 13px !important;
    padding: 6px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
    /* Same fix as Combobox.svelte's .theme-combobox-content - Payload's
       popover-content.svelte bakes in Tailwind's z-50, which loses to
       anything with a higher z-index (e.g. Quick Sort's fixed overlay, or
       a sticky table header). */
    z-index: 99999 !important;
    min-width: 180px;
  }

  .theme-faceted-filter-list {
    max-height: 260px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .theme-faceted-filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    color: var(--font-color);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    width: 100%;
    font-family: 'saira', monospace;
    font-size: 13px;
    transition: background-color var(--transition-speed, 200ms) ease-in-out;
  }

  .theme-faceted-filter-item:hover {
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent);
    color: var(--font-link-color);
  }

  .theme-faceted-filter-item-label {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-faceted-filter-clear {
    display: flex;
    justify-content: center;
    margin-top: 4px;
    padding-top: 6px;
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
  }
</style>
