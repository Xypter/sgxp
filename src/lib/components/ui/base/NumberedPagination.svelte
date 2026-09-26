<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { cn } from '$lib/utils';
  import * as Pagination from './Pagination.svelte';

  // The site's standard page picker: ‹ 1 2 3 … 37 › in the button standard's
  // secondary look, with the current page in the accent. Works bound
  // (`bind:page`) or controlled (`page` + `onPageChange`, e.g. from a
  // TanStack table's page state).
  interface Props {
    /** Total number of items across all pages. */
    count: number;
    perPage: number;
    /** 1-based current page. */
    page?: number;
    onPageChange?: (page: number) => void;
    /** Page numbers either side of the current one on desktop (default 1). */
    siblingCount?: number;
    /** Only for when paging genuinely isn't possible - not while a page
     *  loads (fading every button for the length of a fetch reads as a
     *  flicker; ignore stale responses in the caller instead). */
    disabled?: boolean;
    class?: string;
  }

  let {
    count,
    perPage,
    page = $bindable(1),
    onPageChange,
    siblingCount = 1,
    disabled = false,
    class: className,
  }: Props = $props();

  // Phones get a compact row that always fits on one line: â€¹ 4 5 6 â€º - the
  // current page with one either side, and no first/last/ellipsis (7+
  // buttons wrapped onto a second row inside a padded box at 390px).
  const isDesktop = new MediaQuery('(min-width: 768px)');
  const totalPages = $derived(Math.max(1, Math.ceil(count / perPage)));

  function compactPages(current: number) {
    const start = Math.max(1, Math.min(current - 1, totalPages - 2));
    const end = Math.min(totalPages, start + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => ({ type: 'page' as const, value: start + i, key: `page-${start + i}` }));
  }
</script>

<Pagination.Root {count} {perPage} bind:page {siblingCount} {onPageChange} class={cn('mx-0 w-auto', className)}>
  {#snippet children({ pages, currentPage })}
    <Pagination.Content class="flex-nowrap">
      <Pagination.Item>
        <Pagination.PrevButton {disabled} />
      </Pagination.Item>
      <!-- Keyed by position, not page number: when the numbers re-centre
           (1 2 3 -> 2 3 4) each button stays in its slot and only its label
           changes. Keyed by number, the button you just pressed was moved to
           a new slot mid-press and jumped. -->
      {#each isDesktop.current ? pages : compactPages(currentPage) as p, slot (slot)}
        {#if p.type === 'ellipsis'}
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
        {:else}
          <Pagination.Item>
            <Pagination.Link page={p} isActive={currentPage === p.value} {disabled} />
          </Pagination.Item>
        {/if}
      {/each}
      <Pagination.Item>
        <Pagination.NextButton {disabled} />
      </Pagination.Item>
    </Pagination.Content>
  {/snippet}
</Pagination.Root>
