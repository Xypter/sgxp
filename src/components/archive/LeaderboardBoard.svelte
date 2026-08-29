<script lang="ts">
  import LeaderboardTable from './LeaderboardTable.svelte';

  interface LeaderboardUser {
    id: number | string;
    username?: string;
    displayName?: string;
    archivePreparedCount?: number;
    archiveReviewedCount?: number;
  }

  interface Row {
    id: number | string;
    name: string;
    count: number;
  }

  function nameOf(u: LeaderboardUser): string {
    return u.displayName || u.username || `User #${u.id}`;
  }

  let preparerRows = $state<Row[]>([]);
  let reviewerRows = $state<Row[]>([]);
  // Starts true (not false) so the initial empty rows don't flash the
  // "no one has..." empty message before the first fetch resolves.
  let isLoading = $state(true);

  async function fetchTop(sortField: string): Promise<LeaderboardUser[]> {
    try {
      const response = await fetch(`/api/users?sort=-${sortField}&limit=20&where[${sortField}][greater_than]=0`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.docs || [];
    } catch {
      return [];
    }
  }

  async function fetchLeaderboards() {
    const [preparers, reviewers] = await Promise.all([
      fetchTop('archivePreparedCount'),
      fetchTop('archiveReviewedCount'),
    ]);
    preparerRows = preparers.map((u) => ({ id: u.id, name: nameOf(u), count: u.archivePreparedCount ?? 0 }));
    reviewerRows = reviewers.map((u) => ({ id: u.id, name: nameOf(u), count: u.archiveReviewedCount ?? 0 }));
    isLoading = false;
  }

  $effect(() => {
    fetchLeaderboards();
  });

  // Fallback poll for when the SSE connection below is down/reconnecting -
  // same resilience pattern as ArchiveTriageTable.svelte.
  const POLL_INTERVAL_MS = 60000;
  const POLL_DEBOUNCE_MS = 500;
  let pollDebounceTimer: ReturnType<typeof setTimeout>;

  function fetchLeaderboardsDebounced() {
    clearTimeout(pollDebounceTimer);
    pollDebounceTimer = setTimeout(fetchLeaderboards, POLL_DEBOUNCE_MS);
  }

  $effect(() => {
    const interval = setInterval(fetchLeaderboards, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  });

  // Prepared/reviewed counts only ever change as a side effect of an
  // archive-entry status change, so the same entry-updated broadcast the
  // triage table listens on is exactly the right signal to refetch these
  // leaderboards too - no separate webhook/event needed.
  $effect(() => {
    const source = new EventSource('/api/archive-entries/stream');
    source.addEventListener('entry-updated', fetchLeaderboardsDebounced);
    return () => {
      source.close();
      clearTimeout(pollDebounceTimer);
    };
  });
</script>

<div class="leaderboard-columns">
  <div class="leaderboard-panel">
    <h2>Top Preparers</h2>
    <LeaderboardTable
      rows={preparerRows}
      countLabel="Prepared"
      emptyMessage={isLoading ? 'Loading...' : 'No one has prepared any entries yet.'}
    />
  </div>

  <div class="leaderboard-panel">
    <h2>Top Reviewers</h2>
    <LeaderboardTable
      rows={reviewerRows}
      countLabel="Reviewed"
      emptyMessage={isLoading ? 'Loading...' : 'No one has reviewed any entries yet.'}
    />
  </div>
</div>

<style>
  .leaderboard-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap, 20px);
  }

  .leaderboard-panel {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 20px;
  }

  .leaderboard-panel h2 {
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-color);
    margin: 0 0 16px 0;
  }

  @media (max-width: 768px) {
    .leaderboard-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
