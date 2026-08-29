<script lang="ts">
  import { type ColumnDef, getCoreRowModel } from '@tanstack/table-core';
  import { createSvelteTable, renderComponent } from '$components/ui/data-table';
  import { DataTable } from '$lib/components';
  import PlainTextCell from './cells/PlainTextCell.svelte';
  import LeaderboardNameCell from './cells/LeaderboardNameCell.svelte';

  interface LeaderboardRow {
    id: number | string;
    name: string;
    count: number;
  }

  interface Props {
    rows: LeaderboardRow[];
    countLabel: string;
    emptyMessage: string;
  }

  let { rows, countLabel, emptyMessage }: Props = $props();

  const columns: ColumnDef<LeaderboardRow>[] = [
    {
      id: 'rank',
      header: 'Rank',
      cell: ({ row }) => renderComponent(PlainTextCell as any, { value: `#${row.index + 1}` }),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => renderComponent(LeaderboardNameCell as any, { id: row.original.id, name: row.original.name }),
      enableSorting: false,
    },
    {
      accessorKey: 'count',
      header: countLabel,
      cell: ({ row }) => renderComponent(PlainTextCell as any, { value: String(row.original.count), class: 'leaderboard-count' }),
      enableSorting: false,
    },
  ];

  // No pagination model - these are fixed top-20 lists, not paginated data.
  let table = $derived.by(() =>
    createSvelteTable({
      data: rows,
      columns,
      getCoreRowModel: getCoreRowModel(),
    })
  );
</script>

<DataTable {table} themed showPagination={false} class="leaderboard-data-table" {emptyMessage} />

<style>
  :global(.leaderboard-count) {
    display: block;
    text-align: right;
    font-weight: 700;
  }
</style>
