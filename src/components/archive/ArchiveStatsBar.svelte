<script lang="ts">
  // Presentational only - callers fetch the three counts however fits their
  // context (ArchiveTriageTable.svelte keeps them live via poll/SSE;
  // leaderboard.astro fetches them once server-side) and just pass numbers.
  interface Props {
    total: number;
    unsorted: number;
    excluded: number;
  }

  let { total, unsorted, excluded }: Props = $props();

  let sortedCount = $derived(total - unsorted);
  // Kept is "sorted but not excluded" rather than its own query, so Kept +
  // Excluded always add up to exactly Sorted.
  let keptCount = $derived(sortedCount - excluded);

  let percentSorted = $derived(total > 0 ? (sortedCount / total) * 100 : 0);
  let percentExcluded = $derived(total > 0 ? (excluded / total) * 100 : 0);
  let percentKept = $derived(percentSorted - percentExcluded);

  function fmt(n: number): string {
    return n.toLocaleString();
  }
</script>

{#if total > 0}
  <div class="archive-stats-bar">
    <div class="stats-row">
      <span>{fmt(sortedCount)} Sorted</span>
      <span class="stat-divider">—</span>
      <span>{fmt(keptCount)} Kept</span>
      <span class="stat-divider">—</span>
      <span>{fmt(excluded)} Excluded</span>
    </div>
    <div class="stats-row stats-row--percent">
      <span>{percentSorted.toFixed(2)}% Sorted</span>
      <span class="stat-divider">—</span>
      <span>{percentKept.toFixed(2)}% Kept</span>
      <span class="stat-divider">—</span>
      <span>{percentExcluded.toFixed(2)}% Excluded</span>
    </div>
  </div>
{/if}

<style>
  .archive-stats-bar {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 10px 16px;
    margin-bottom: var(--gap, 20px);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'saira';
    font-size: 14px;
    font-weight: 700;
    color: var(--font-color);
    flex-wrap: wrap;
  }

  .stats-row--percent {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.75;
  }

  .stat-divider {
    opacity: 0.5;
  }

  @media (max-width: 768px) {
    .stats-row {
      font-size: 12px;
    }

    .stats-row--percent {
      font-size: 11px;
    }
  }
</style>
