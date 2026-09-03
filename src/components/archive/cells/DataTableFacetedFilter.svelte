<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import { ListFilter, Square, SquareCheck, X } from 'lucide-svelte';

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

  const triggerClass = $derived(
    `theme-faceted-filter-trigger${selected.length > 0 ? ' theme-faceted-filter-trigger--active' : ''}`
  );
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={triggerClass} aria-label="Filter {title}" title="Filter {title}">
    <ListFilter size={13} />
    {#if selected.length > 0}
      <span class="theme-faceted-filter-badge">{selected.length}</span>
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
      <button type="button" class="theme-faceted-filter-clear" onclick={clear}>
        <X size={13} /> Clear filter
      </button>
    {/if}
  </Popover.Content>
</Popover.Root>

<style>
  :global(.theme-faceted-filter-trigger) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 2px !important;
    background: transparent !important;
    border: none !important;
    color: color-mix(in srgb, var(--font-color) 60%, transparent) !important;
    cursor: pointer;
    padding: 2px !important;
    border-radius: 0px !important;
    position: relative;
  }

  :global(.theme-faceted-filter-trigger:hover) {
    color: var(--font-link-color) !important;
  }

  :global(.theme-faceted-filter-trigger--active) {
    color: var(--font-link-color) !important;
  }

  :global(.theme-faceted-filter-badge) {
    font-size: 10px;
    line-height: 1;
    font-family: 'saira', monospace;
    background: var(--font-link-color);
    color: var(--page-color);
    border-radius: 999px;
    padding: 1px 5px;
    font-weight: 700;
  }

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
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin-top: 4px;
    padding: 6px 8px;
    border: none;
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    background: transparent;
    color: color-mix(in srgb, var(--font-color) 70%, transparent);
    cursor: pointer;
    font-family: 'saira', monospace;
    font-size: 12px;
  }

  .theme-faceted-filter-clear:hover {
    color: var(--font-link-color);
  }
</style>
