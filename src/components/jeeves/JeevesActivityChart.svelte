<script lang="ts">
  import { Axis, Bars, Chart, Grid, Highlight, Layer, Spline, Tooltip } from 'layerchart';
  import { scaleBand } from 'd3-scale';
  import { curveMonotoneX } from 'd3-shape';
  import { Activity, Table as TableIcon, ChartColumn } from 'lucide-svelte';
  import * as ChartUI from '@/components/ui/chart';
  import { archiveTime, type ArchiveChapter } from '$lib/jeevesArchive';

  // When the comic was being posted, and when readers were talking about it.
  // Pages and comments live on very different scales (4 pages vs 200 comments
  // in a month), so rather than two y-axes - which invent correlations - both
  // are shown as a share of their own busiest period on one 0-100% axis. Real
  // counts are in the tooltip and the table view. Pages are bars and comments
  // a line, so the two read apart by shape in every site theme, not just by
  // color.

  interface Props {
    chapters: ArchiveChapter[];
  }

  let { chapters }: Props = $props();

  type Unit = 'day' | 'week' | 'month' | 'quarter';
  interface Bucket {
    key: string;
    start: number;
    pages: number;
    comments: number;
    pagesPct: number;
    commentsPct: number;
  }

  const DAY = 86_400_000;

  function floorTo(unit: Unit, t: number): number {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    if (unit === 'month') return Date.UTC(y, m, 1);
    if (unit === 'quarter') return Date.UTC(y, m - (m % 3), 1);
    const day = Date.UTC(y, m, d.getUTCDate());
    if (unit === 'day') return day;
    return day - ((d.getUTCDay() + 6) % 7) * DAY; // Monday-start weeks
  }

  function next(unit: Unit, t: number): number {
    const d = new Date(t);
    if (unit === 'day') return t + DAY;
    if (unit === 'week') return t + 7 * DAY;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (unit === 'month' ? 1 : 3), 1);
  }

  function label(unit: Unit, t: number, short = false): string {
    const d = new Date(t);
    if (unit === 'quarter') return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${short ? `'${String(d.getUTCFullYear()).slice(2)}` : d.getUTCFullYear()}`;
    if (unit === 'month') {
      const month = d.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' });
      return short ? `${month} '${String(d.getUTCFullYear()).slice(2)}` : `${month} ${d.getUTCFullYear()}`;
    }
    const text = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: short ? undefined : 'numeric', timeZone: 'UTC' });
    return unit === 'week' && !short ? `Week of ${text}` : text;
  }

  const activity = $derived.by(() => {
    // Placeholder dates (see archiveTime) are left out rather than plotted.
    const pageTimes = chapters
      .map((c) => archiveTime(c.distributedDate))
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);
    if (pageTimes.length < 2) return null;
    const first = pageTimes[0];
    const last = pageTimes[pageTimes.length - 1];
    const span = last - first;

    // Roughly 12-70 buckets whatever the comic's length.
    const unit: Unit = span <= 60 * DAY ? 'day' : span <= 540 * DAY ? 'week' : span <= 6 * 365 * DAY ? 'month' : 'quarter';

    // Comments keep trickling in long after a comic ends (sometimes years).
    // Show a tail after the last page, and count the rest instead of
    // stretching the whole chart out to reach them.
    const windowEnd = last + Math.max(span * 0.25, 60 * DAY);
    let laterComments = 0;
    let lastComment = 0;
    const commentTimes: number[] = [];
    for (const chapter of chapters) {
      for (const comment of chapter.comments ?? []) {
        const t = archiveTime(comment.time);
        if (t === null || t < first) continue;
        if (t > windowEnd) {
          laterComments++;
          lastComment = Math.max(lastComment, t);
        } else {
          commentTimes.push(t);
        }
      }
    }
    let end = last;
    for (const t of commentTimes) if (t > end) end = t;

    const buckets: Bucket[] = [];
    const index = new Map<number, Bucket>();
    for (let t = floorTo(unit, first); t <= floorTo(unit, end); t = next(unit, t)) {
      const bucket = { key: label(unit, t), start: t, pages: 0, comments: 0, pagesPct: 0, commentsPct: 0 };
      buckets.push(bucket);
      index.set(t, bucket);
    }
    for (const t of pageTimes) index.get(floorTo(unit, t))!.pages++;
    for (const t of commentTimes) index.get(floorTo(unit, t))!.comments++;

    const peakPages = buckets.reduce((a, b) => (b.pages > a.pages ? b : a), buckets[0]);
    const peakComments = buckets.reduce((a, b) => (b.comments > a.comments ? b : a), buckets[0]);
    for (const b of buckets) {
      b.pagesPct = peakPages.pages ? (b.pages / peakPages.pages) * 100 : 0;
      b.commentsPct = peakComments.comments ? (b.comments / peakComments.comments) * 100 : 0;
    }

    // ~6 evenly spaced labels on the time axis.
    const step = Math.max(1, Math.ceil(buckets.length / 6));
    const ticks = buckets.filter((_, i) => i % step === 0).map((b) => b.key);
    const shortLabels = new Map(buckets.map((b) => [b.key, label(unit, b.start, true)]));

    return {
      unit,
      buckets,
      ticks,
      shortLabels,
      peakPages,
      peakComments: peakComments.comments ? peakComments : null,
      laterComments,
      lastComment,
    };
  });

  const UNIT_NAME: Record<Unit, string> = { day: 'day', week: 'week', month: 'month', quarter: 'quarter' };

  // Theme-driven: the accent for pages, the text color for comments.
  const chartConfig = {
    pages: { label: 'Pages posted', color: 'var(--font-link-color)' },
    comments: { label: 'Comments', color: 'var(--font-color)' },
  } satisfies ChartUI.ChartConfig;

  let showTable = $state(false);
  const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
</script>

{#if activity}
  <section class="jeeves-panel activity-panel">
    <h3 class="jeeves-panel-title">
      <Activity size={18} /> Activity
      <button
        type="button"
        class="view-switch"
        onclick={() => (showTable = !showTable)}
        aria-pressed={showTable}
        title={showTable ? 'Show as chart' : 'Show as table'}
      >
        {#if showTable}<ChartColumn size={15} /> Chart{:else}<TableIcon size={15} /> Table{/if}
      </button>
    </h3>

    <div class="jeeves-panel-body">
      <div class="activity-head">
        <dl class="activity-peaks">
          <div>
            <dt>Busiest {UNIT_NAME[activity.unit]} for pages</dt>
            <dd>{activity.peakPages.key} <span>· {plural(activity.peakPages.pages, 'page')}</span></dd>
          </div>
          {#if activity.peakComments}
            <div>
              <dt>Busiest {UNIT_NAME[activity.unit]} for comments</dt>
              <dd>{activity.peakComments.key} <span>· {plural(activity.peakComments.comments, 'comment')}</span></dd>
            </div>
          {/if}
        </dl>

        <!-- Legend mirrors the marks: a bar for pages, a line for comments. -->
        <ul class="activity-legend">
          <li><span class="swatch swatch--bar"></span>Pages posted</li>
          {#if activity.peakComments}<li><span class="swatch swatch--line"></span>Comments</li>{/if}
        </ul>
      </div>

      {#if showTable}
        <div class="activity-table-wrap">
          <table class="activity-table">
            <thead>
              <tr><th scope="col">{UNIT_NAME[activity.unit][0].toUpperCase() + UNIT_NAME[activity.unit].slice(1)}</th><th scope="col">Pages</th><th scope="col">Comments</th></tr>
            </thead>
            <tbody>
              {#each activity.buckets.filter((b) => b.pages || b.comments) as bucket (bucket.key)}
                <tr><th scope="row">{bucket.key}</th><td>{bucket.pages}</td><td>{bucket.comments}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <ChartUI.Container config={chartConfig} class="activity-chart">
          <Chart
            data={activity.buckets}
            x="key"
            xScale={scaleBand().paddingInner(0.25).paddingOuter(0.1)}
            y="pagesPct"
            yDomain={[0, 100]}
            padding={{ top: 8, right: 4, bottom: 24, left: 38 }}
            tooltipContext={{ mode: 'band' }}
          >
            <Layer type="svg">
              <Grid y={{ class: 'activity-grid' }} />
              <Axis
                placement="left"
                ticks={[0, 50, 100]}
                format={(v: number) => `${v}%`}
                classes={{ tickLabel: 'activity-tick' }}
              />
              <Axis
                placement="bottom"
                ticks={activity.ticks}
                format={(v: string) => activity.shortLabels.get(v) ?? v}
                classes={{ tickLabel: 'activity-tick' }}
              />
              <Highlight area={{ class: 'activity-highlight' }} />
              <Bars y="pagesPct" radius={2} rounded="top" fill="var(--color-pages)" />
              {#if activity.peakComments}
                <Spline y="commentsPct" curve={curveMonotoneX} stroke="var(--color-comments)" class="activity-line" />
              {/if}
            </Layer>

            <Tooltip.Root variant="none">
              {#snippet children({ data })}
                <div class="activity-tooltip">
                  <div class="activity-tooltip-title">{data.key}</div>
                  <div class="activity-tooltip-row">
                    <span class="key key--bar"></span>
                    <strong>{data.pages.toLocaleString()}</strong>
                    <span>{data.pages === 1 ? 'page' : 'pages'}</span>
                  </div>
                  {#if activity.peakComments}
                    <div class="activity-tooltip-row">
                      <span class="key key--line"></span>
                      <strong>{data.comments.toLocaleString()}</strong>
                      <span>{data.comments === 1 ? 'comment' : 'comments'}</span>
                    </div>
                  {/if}
                </div>
              {/snippet}
            </Tooltip.Root>
          </Chart>
        </ChartUI.Container>
        <p class="activity-axis-note">Each series as a share of its own busiest {UNIT_NAME[activity.unit]}.</p>
      {/if}

      {#if activity.laterComments}
        <p class="activity-later">
          + {plural(activity.laterComments, 'more comment')} came in later, the last on
          {new Date(activity.lastComment).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.
        </p>
      {/if}
    </div>
  </section>
{/if}

<style>
  .activity-panel :global(.jeeves-panel-title) {
    justify-content: flex-start;
  }

  .view-switch {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--page-color) 60%, white);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-shadow: none;
    cursor: pointer;
  }

  @media (hover: hover) {
    .view-switch:hover {
      border-color: var(--font-link-color);
    }
  }

  .activity-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px 24px;
    margin-bottom: 12px;
  }

  .activity-peaks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
    margin: 0;
  }

  .activity-peaks dt {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.65;
  }

  .activity-peaks dd {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }

  .activity-peaks dd span {
    font-weight: 600;
    opacity: 0.7;
  }

  .activity-legend {
    display: flex;
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    opacity: 0.85;
  }

  .activity-legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    display: inline-block;
  }

  .swatch--bar {
    width: 10px;
    height: 12px;
    border-radius: 2px 2px 0 0;
    background: var(--font-link-color);
  }

  .swatch--line {
    width: 16px;
    height: 2px;
    background: var(--font-color);
  }

  /* The chart itself: recessive hairline grid, theme-colored ticks. */
  .activity-panel :global(.activity-chart) {
    aspect-ratio: auto;
    height: 220px;
    width: 100%;
  }

  .activity-panel :global(.activity-grid),
  .activity-panel :global(.activity-grid line) {
    stroke: color-mix(in srgb, var(--font-color) 12%, transparent);
    stroke-width: 1px;
  }

  .activity-panel :global(.activity-tick),
  .activity-panel :global(.lc-axis-tick-label) {
    fill: color-mix(in srgb, var(--font-color) 60%, transparent) !important;
    font-family: 'saira', sans-serif;
    font-size: 11px;
  }

  /* The site's global text-shadow outline reads as heavy on small axis text. */
  .activity-panel :global(svg text) {
    text-shadow: none;
  }

  .activity-panel :global(.activity-line),
  .activity-panel :global(.activity-line path) {
    stroke-width: 2px;
    fill: none;
  }

  .activity-panel :global(.activity-highlight) {
    fill: color-mix(in srgb, var(--font-color) 8%, transparent);
  }

  .activity-tooltip {
    min-width: 130px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 13px;
  }

  .activity-tooltip-title {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 700;
    opacity: 0.75;
  }

  .activity-tooltip-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .activity-tooltip-row strong {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
  }

  .activity-tooltip-row span:last-child {
    opacity: 0.75;
  }

  /* Tooltip keys are short strokes of the series color. */
  .key {
    width: 12px;
    height: 3px;
    border-radius: 1px;
  }

  .key--bar {
    background: var(--font-link-color);
  }

  .key--line {
    background: var(--font-color);
  }

  .activity-axis-note,
  .activity-later {
    margin: 6px 0 0;
    font-size: 12px;
    opacity: 0.6;
  }

  .activity-table-wrap {
    max-height: 320px;
    overflow-y: auto;
  }

  .activity-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .activity-table th,
  .activity-table td {
    padding: 5px 10px;
    text-align: left;
    border-bottom: 1px solid color-mix(in srgb, var(--page-color) 80%, white);
  }

  .activity-table td {
    font-variant-numeric: tabular-nums;
  }

  .activity-table thead th {
    position: sticky;
    top: 0;
    background: var(--page-color);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }
</style>
