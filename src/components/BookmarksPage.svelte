<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { ArrowLeft, ArrowRight, Bookmark, RotateCw } from 'lucide-svelte';
  import { Button } from '$lib/components';
  import ArchiveComicCard from './archive/ArchiveComicCard.svelte';
  import {
    BOOKMARKS_CHANGED,
    addArchiveBookmark,
    fetchBookmarkList,
    removeBookmark,
    type BookmarkListItem,
  } from '$lib/comicBookmarks';

  // /bookmarks: everything the viewer has bookmarked, from every source,
  // most recently read first. Server-rendered with the list already in place
  // (see bookmarks.astro); this only handles removing and staying current.

  interface Props {
    initialItems: BookmarkListItem[];
    initialError?: string | null;
    /** `?from=` - the page that linked here, offered as a way back. */
    from?: string | null;
  }

  let { initialItems, initialError = null, from = null }: Props = $props();

  // Pages that link here with `?from=`. data-restore-state on the link has
  // the archive come back with its shuffle order, page and filters intact.
  const BACK_LINKS: Record<string, { href: string; label: string }> = {
    smackjeeves: { href: '/smackjeeves', label: 'Back to the Smack Jeeves Archive' },
  };
  const backLink = $derived(from ? BACK_LINKS[from] ?? null : null);

  // svelte-ignore state_referenced_locally
  let items = $state<BookmarkListItem[]>(initialItems);
  // svelte-ignore state_referenced_locally
  let error = $state<string | null>(initialError);
  let sourceFilter = $state<string | null>(null);
  let removing = $state(new Set<number>());

  async function refresh() {
    try {
      items = await fetchBookmarkList();
      error = null;
    } catch (err) {
      console.error('Error loading bookmarks:', err);
    }
  }

  onMount(() => {
    // Changes from elsewhere in this tab (e.g. an Undo below re-adding one).
    window.addEventListener(BOOKMARKS_CHANGED, refresh);
    // Back from reading: progress moved on while this page sat in history.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener(BOOKMARKS_CHANGED, refresh);
      window.removeEventListener('pageshow', onPageShow);
    };
  });

  // Source chips only once there's more than one kind of bookmark to tell apart.
  const sources = $derived(
    [...new Map(items.map((i) => [i.source, i.sourceLabel])).entries()].map(([value, label]) => ({
      value,
      label,
      count: items.filter((i) => i.source === value).length,
    }))
  );
  // One section per source, each under its own heading.
  const sections = $derived(
    sources
      .filter((s) => !sourceFilter || s.value === sourceFilter)
      .map((s) => {
        const sectionItems = items.filter((i) => i.source === s.value);
        return { ...s, home: sectionItems[0].sourceHome, items: sectionItems };
      })
  );

  // A filter left pointing at a source that has since been emptied.
  $effect(() => {
    if (sourceFilter && !sources.some((s) => s.value === sourceFilter)) sourceFilter = null;
  });

  // Built once - Intl formatters are expensive to create per item.
  const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
  ];

  function timeAgo(iso: string) {
    const seconds = (Date.parse(iso) - Date.now()) / 1000;
    if (!Number.isFinite(seconds)) return '';
    for (const [unit, size] of RELATIVE_STEPS) {
      if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
    }
    return 'just now';
  }

  async function remove(item: BookmarkListItem) {
    if (removing.has(item.id)) return;
    removing = new Set(removing).add(item.id);
    try {
      await removeBookmark(item);
      items = items.filter((i) => i.id !== item.id);
      toast(`Removed "${item.title}"`, {
        action: {
          label: 'Undo',
          // Comes back with its reading progress; the list refreshes itself
          // from the BOOKMARKS_CHANGED event.
          onClick: () => {
            addArchiveBookmark(item.entryId, item.lastPage).catch((err) =>
              toast.error(err instanceof Error ? err.message : 'Could not restore the bookmark')
            );
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the bookmark');
    } finally {
      const next = new Set(removing);
      next.delete(item.id);
      removing = next;
    }
  }
</script>

<div class="bookmarks-page">
  <h1 class="mobile-page-title">Bookmarks</h1>

  <header class="bookmarks-header">
    {#if backLink}
      <a href={backLink.href} class="bookmarks-back no-theme-styles" data-restore-state>
        <ArrowLeft size={15} /> {backLink.label}
      </a>
    {/if}
    <h1 class="bookmarks-title"><Bookmark size={22} /> Bookmarks</h1>
    <p class="bookmarks-intro">
      Only you can see these. Bookmarked comics remember the page you're on, on any device you're logged in to.
    </p>

    {#if sources.length > 1}
      <div class="source-chips" role="group" aria-label="Show bookmarks from">
        <Button variant="toggle" size="mini" aria-pressed={sourceFilter === null} onclick={() => (sourceFilter = null)}>
          All <span class="sgxp-btn-count">{items.length}</span>
        </Button>
        {#each sources as source (source.value)}
          <Button variant="toggle" size="mini" aria-pressed={sourceFilter === source.value} onclick={() => (sourceFilter = source.value)}>
            {source.label} <span class="sgxp-btn-count">{source.count}</span>
          </Button>
        {/each}
      </div>
    {/if}
  </header>

  {#if error}
    <div class="bookmarks-empty">
      <p class="bookmarks-error">{error}</p>
      <Button variant="secondary" icon={RotateCw} onclick={refresh}>Try again</Button>
    </div>
  {:else if items.length === 0}
    <div class="bookmarks-empty">
      <p>No bookmarks yet.</p>
      <p class="bookmarks-empty-hint">
        Tap the <Bookmark size={14} class="inline-icon" /> icon on any comic in the
        <a href="/smackjeeves">Smack Jeeves archive</a> to keep your place here.
      </p>
    </div>
  {:else}
    {#each sections as section (section.value)}
      <section class="bookmark-section" aria-labelledby="bookmark-section-{section.value}">
        <div class="bookmark-section-header">
          <h2 class="bookmark-section-title" id="bookmark-section-{section.value}">
            {section.label} <span class="bookmark-section-count">{section.count}</span>
          </h2>
          {#if !backLink || backLink.href !== section.home}
            <a href={section.home} class="bookmark-section-link no-theme-styles">
              Browse the archive <ArrowRight size={14} />
            </a>
          {/if}
        </div>
        <ul class="bookmark-grid">
          {#each section.items as item (item.id)}
            <!-- The archive's own card, so a comic looks the same here as in
                 the archive. Its bookmark toggle is shown "on"; pressing it
                 removes the bookmark (with an Undo toast). -->
            <li>
              <ArchiveComicCard
                comicId={item.comicId}
                title={item.title}
                author={item.author ?? undefined}
                category={item.category}
                pagesMetadata={item.pagesMetadata}
                pagesFolder={item.pageCount}
                percentSaved={item.percentSaved}
                rating={item.rating}
                notes={item.notes}
                bookmarkCount={item.bookmarkCount}
                href={item.href}
                bookmarked
                bookmarkBusy={removing.has(item.id)}
                onToggleBookmark={() => remove(item)}
                ctaLabel={item.lastPage ? `Continue from page ${item.lastPage.toLocaleString()}` : 'Start reading'}
              >
                {#snippet footnote()}
                  {#if item.lastPage}
                    On page {item.lastPage.toLocaleString()}{item.pageCount ? ` of ${item.pageCount.toLocaleString()}` : ''}
                  {:else}
                    Not started
                  {/if}
                  · {timeAgo(item.updatedAt)}
                {/snippet}
              </ArchiveComicCard>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</div>

<style>
  .bookmarks-page {
    width: 100%;
    font-family: 'saira', sans-serif;
    color: var(--font-color);
  }

  .mobile-page-title {
    display: none;
  }

  /* Same panel look as the archive's toolbar panel. */
  .bookmarks-header {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    padding: 16px;
    margin-bottom: var(--gap, 20px);
  }

  .bookmarks-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: var(--font-link-color);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    text-shadow: none;
  }

  .bookmarks-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 8px;
    font-family: 'saira';
    font-size: 24px;
    font-weight: 800;
    color: var(--font-color);
  }

  .bookmarks-title :global(svg) {
    color: var(--font-link-color);
  }

  .bookmarks-intro {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.85;
  }

  .source-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .bookmarks-empty {
    padding: 40px 20px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    text-align: center;
    font-size: 15px;
  }

  .bookmarks-empty p {
    margin: 0 0 8px;
  }

  .bookmarks-empty-hint {
    opacity: 0.75;
    font-size: 14px;
  }

  .bookmarks-empty :global(.inline-icon) {
    display: inline;
    vertical-align: -2px;
  }

  .bookmarks-empty a {
    color: var(--font-link-color);
    font-weight: 700;
  }

  .bookmarks-error {
    color: #ff6b6b;
  }

  .bookmark-section + .bookmark-section {
    margin-top: var(--gap, 20px);
  }

  /* A slim bar in the header panel's style, naming where these came from. */
  .bookmark-section-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 16px;
    padding: 10px 16px;
    margin-bottom: 12px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .bookmark-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-family: 'saira', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--font-color);
  }

  .bookmark-section-count {
    font-size: 14px;
    font-weight: 600;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  .bookmark-section-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--font-link-color);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    text-shadow: none;
  }

  /* Same grid as the archive's card view. */
  .bookmark-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 15px;
  }

  /* Each item is the archive's comic card, stretched to its grid cell so
     cards in a row line up. */
  .bookmark-grid > li {
    display: flex;
    min-width: 0;
  }

  .bookmark-grid > li > :global(.comic-card) {
    flex: 1;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .bookmarks-back:hover,
    .bookmark-section-link:hover {
      color: var(--font-link-color);
      text-decoration: underline;
    }
  }

  @media (max-width: 768px) {
    .mobile-page-title {
      display: block;
      font-family: spritelogo;
      font-weight: normal;
      font-size: 10vw;
      color: var(--font-color);
      text-align: center;
      padding: 0 0 20px 0;
      margin: 0;
      text-shadow:
        -2px -2px 0 var(--bg-color),
        0px -2px 0 var(--bg-color),
        2px -2px 0 var(--bg-color),
        2px 0px 0 var(--bg-color),
        2px 2px 0 var(--bg-color),
        0px 2px 0 var(--bg-color),
        -2px 2px 0 var(--bg-color),
        -2px 0px 0 var(--bg-color);
    }

    .bookmarks-title {
      display: none;
    }

    /* Edge to edge on phones, like the archive's panels and cards. */
    .bookmarks-header,
    .bookmarks-empty,
    .bookmark-section-header {
      border-left: none;
      border-right: none;
      box-shadow: none;
      width: 100vw;
      margin-left: calc(-50vw + 50%);
    }

    .bookmark-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
  }
</style>
