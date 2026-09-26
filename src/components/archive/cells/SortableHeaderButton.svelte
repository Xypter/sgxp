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

<!-- The standard subtle button at mini size (12px, like the header text
     around it); the sorted column's arrow is lit. -->
<Button
  variant="subtle"
  size="mini"
  {onclick}
  class="sortable-header-btn"
  data-state={sorted ? 'on' : undefined}
  data-icon-fill="false"
>
  {label}
  {#if sorted === 'asc'}
    <ArrowUp />
  {:else if sorted === 'desc'}
    <ArrowDown />
  {:else}
    <ArrowUpDown />
  {/if}
</Button>

<style>
  /* Text lines up with the column's cells (the button's own padding sits
     outside the header's). */
  :global(.sortable-header-btn) {
    margin-left: -8px;
  }
</style>
