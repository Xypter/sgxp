<script lang="ts">
  import { Button } from '$lib/components';
  import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';

  interface Props {
    label: string;
    sorted: false | 'asc' | 'desc';
    onclick: (event: MouseEvent) => void;
  }

  let { label, sorted, onclick }: Props = $props();
</script>

<Button variant="ghost" size="sm" {onclick} class="sortable-header-btn">
  {label}
  {#if sorted === 'asc'}
    <ArrowUp size={14} />
  {:else if sorted === 'desc'}
    <ArrowDown size={14} />
  {:else}
    <ArrowUpDown size={14} />
  {/if}
</Button>

<style>
  :global(.sortable-header-btn) {
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 0 !important;
    height: auto !important;
    background: transparent !important;
    color: inherit !important;
    font-family: 'saira', sans-serif !important;
    font-weight: 600 !important;
    font-size: inherit !important;
  }

  :global(.sortable-header-btn:hover) {
    background: transparent !important;
    color: var(--font-link-color) !important;
  }
</style>
