<script lang="ts" generics="TData">
  import type { Snippet } from 'svelte';
  import type { Table as TableType } from '@tanstack/table-core';
  import * as Table from '$components/ui/table';
  import { FlexRender } from '$components/ui/data-table';
  import { Button } from '$lib/components';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  interface DataTableProps<TData> {
    table: TableType<TData>;
    themed?: boolean;
    class?: string;
    showPagination?: boolean;
    emptyMessage?: string;
    children?: Snippet;
    onRowClick?: (row: TData) => void;
  }

  let {
    table,
    themed = false,
    class: className,
    showPagination = true,
    emptyMessage = 'No results.',
    children,
    onRowClick
  }: DataTableProps<TData> = $props();

  const tableClass = themed ? `theme-table ${className || ''}` : className;
</script>

<div class="data-table-wrapper" class:themed-data-table={themed}>
  <div class="table-container">
    <Table.Root class={tableClass}>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row
            data-state={row.getIsSelected() && "selected"}
            onclick={() => onRowClick?.(row.original)}
          >
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender
                  content={cell.column.columnDef.cell}
                  context={cell.getContext()}
                />
              </Table.Cell>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell
              colspan={table.getAllColumns().length}
              class="h-24 text-center"
            >
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  {#if showPagination && table.getPageCount() > 1}
    <div class="pagination-controls">
      <div class="pagination-info">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </div>
      <div class="pagination-buttons">
        <Button
          themed={themed}
          variant="outline"
          size="sm"
          onclick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </Button>
        <Button
          themed={themed}
          variant="outline"
          size="sm"
          onclick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .data-table-wrapper {
    width: 100%;
  }

  .table-container {
    width: 100%;
    overflow-x: auto;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    gap: 16px;
  }

  .pagination-info {
    font-size: 14px;
    color: var(--font-color, #888);
  }

  .pagination-buttons {
    display: flex;
    gap: 8px;
  }

  /* Themed styles */
  .themed-data-table .table-container {
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  :global(.theme-table) {
    width: 100%;
    background: var(--page-color) !important;
    border-collapse: collapse;
  }

  :global(.theme-table [data-slot="table-header"]) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
  }

  :global(.theme-table [data-slot="table-head"]) {
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    color: var(--font-color) !important;
    font-family: 'saira', sans-serif !important;
    font-weight: 600 !important;
    padding: 12px 16px !important;
    text-align: left !important;
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
  }

  :global(.theme-table [data-slot="table-cell"]) {
    padding: 12px 16px !important;
    color: var(--font-color) !important;
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 70%, white) !important;
  }

  :global(.theme-table [data-slot="table-row"]:hover [data-slot="table-cell"]) {
    background: color-mix(in srgb, var(--page-color) 90%, white) !important;
  }

  :global(.theme-table [data-slot="table-body"] [data-slot="table-row"]:last-child [data-slot="table-cell"]) {
    border-bottom: none !important;
  }

  .themed-data-table .pagination-controls {
    color: var(--font-color);
  }

  .themed-data-table .pagination-info {
    color: var(--font-color);
    opacity: 0.8;
  }
</style>
