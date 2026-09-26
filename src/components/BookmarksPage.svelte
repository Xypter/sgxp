<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { ArrowLeft, ArrowRight, Bookmark, ImageOff, X } from 'lucide-svelte';
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
  let failedPreviews = $state(new Set<number>());
  let loadedPreviews = $state(new Set<number>());

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

  function progressPercent(item: BookmarkListItem) {
    if (!item.lastPage || !item.pageCount) return 0;
    return Math.min(100, Math.round((item.lastPage / item.pageCount) * 100));
  }

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
        <button type="button" class="source-chip" aria-pressed={sourceFilter === null} onclick={() => (sourceFilter = null)}>
          All <span class="source-chip-count">{items.length}</span>
        </button>
        {#each sources as source (source.value)}
          <button
            type="button"
            class="source-chip"
            aria-pressed={sourceFilter === source.value}
            onclick={() => (sourceFilter = source.value)}
          >
            {source.label} <span class="source-chip-count">{source.count}</span>
          </button>
        {/each}
      </div>
    {/if}
  </header>

  {#if error}
    <div class="bookmarks-empty">
      <p class="bookmarks-error">{error}</p>
      <button type="button" class="empty-link" onclick={refresh}>Try again</button>
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
            <li class="bookmark-card">
              <a href={item.href} class="bookmark-preview no-theme-styles" tabindex="-1" aria-hidden="true">
                {#if item.previewUrl && !failedPreviews.has(item.id)}
                  <!-- The archive's pre-cropped 100x100 preview, shown 1:1. -->
                  <img
                    src={item.previewUrl}
                    alt=""
                    width="100"
                    height="100"
                    loading="lazy"
                    decoding="async"
                    class:loaded={loadedPreviews.has(item.id)}
                    onload={() => (loadedPreviews = new Set(loadedPreviews).add(item.id))}
                    onerror={() => (failedPreviews = new Set(failedPreviews).add(item.id))}
                  />
                {:else}
                  <ImageOff size={22} />
                {/if}
              </a>

              <div class="bookmark-body">
                <a href={item.href} class="bookmark-title no-theme-styles">{item.title}</a>
                <span class="bookmark-byline">
                  {#if item.author}by <span class="bookmark-author">{item.author}</span>{/if}
                  {#if sources.length > 1}<span class="bookmark-source">{item.sourceLabel}</span>{/if}
                </span>

                <div class="bookmark-progress">
                  <span class="bookmark-progress-text">
                    {#if item.lastPage}
                      Page {item.lastPage.toLocaleString()}{item.pageCount ? ` of ${item.pageCount.toLocaleString()}` : ''}
                    {:else}
                      Not started
                    {/if}
                    <span class="bookmark-when">· {timeAgo(item.updatedAt)}</span>
                  </span>
                  <span class="bookmark-meter" aria-hidden="true">
                    <span class="bookmark-meter-fill" style:width="{progressPercent(item)}%"></span>
                  </span>
                </div>

                <a href={item.href} class="bookmark-continue no-theme-styles">
                  {item.lastPage ? 'Continue reading' : 'Start reading'} <ArrowRight size={15} />
                </a>
              </div>

              <button
                type="button"
                class="bookmark-remove"
                onclick={() => remove(item)}
                disabled={removing.has(item.id)}
                title="Remove bookmark"
                aria-label="Remove bookmark for {item.title}"
              >
                <X size={16} />
              </button>
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
    gap: 6px;
    margin-top: 14px;
  }

  .source-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 12px;
    background: color-mix(in srgb, var(--page-color) 85%, white);
    border: 1px solid color-mix(in srgb, var(--page-color) 75%, white);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    font-size: 14px;
    cursor: pointer;
  }

  .source-chip[aria-pressed='true'] {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--font-link-color) 18%, var(--page-color));
    font-weight: 700;
  }

  .source-chip-count {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
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

  .bookmarks-empty a,
  .empty-link {
    color: var(--font-link-color);
    font-weight: 700;
  }

  .empty-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 14px;
    text-decoration: underline;
    cursor: pointer;
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

  .bookmark-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 12px;
  }

  /* Styled after the archive's comic cards. */
  .bookmark-card {
    position: relative;
    display: flex;
    gap: 14px;
    padding: 14px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    min-width: 0;
  }

  .bookmark-preview {
    flex-shrink: 0;
    align-self: flex-start;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    overflow: hidden;
    background: color-mix(in srgb, var(--page-color) 70%, black);
    outline: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 75%, white);
    color: var(--font-color);
  }

  .bookmark-preview :global(svg) {
    opacity: 0.35;
  }

  .bookmark-preview img {
    width: 100px;
    height: 100px;
    object-fit: none;
    image-rendering: pixelated;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .bookmark-preview img.loaded {
    opacity: 1;
  }

  .bookmark-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    /* Clear of the remove button in the corner. */
    padding-right: 22px;
  }

  .bookmark-title {
    font-size: 17px;
    font-weight: 800;
    line-height: 1.25;
    color: var(--font-color);
    text-decoration: none;
    text-shadow: none;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .bookmark-byline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    font-size: 13px;
    opacity: 0.75;
  }

  .bookmark-author {
    font-weight: 600;
  }

  .bookmark-source {
    padding: 0 6px;
    border: 1px solid color-mix(in srgb, var(--font-link-color) 60%, transparent);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
  }

  .bookmark-progress {
    margin-top: auto;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .bookmark-progress-text {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .bookmark-when {
    font-weight: 400;
    opacity: 0.6;
  }

  .bookmark-meter {
    display: block;
    height: 5px;
    background: color-mix(in srgb, var(--page-color) 70%, white);
    overflow: hidden;
  }

  .bookmark-meter-fill {
    display: block;
    height: 100%;
    background: var(--font-link-color);
  }

  .bookmark-continue {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
    color: var(--font-link-color);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    text-shadow: none;
  }

  .bookmark-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    color: var(--font-color);
    opacity: 0.5;
    cursor: pointer;
  }

  .bookmark-remove:disabled {
    cursor: default;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .bookmark-title:hover,
    .bookmark-continue:hover,
    .bookmarks-back:hover,
    .bookmark-section-link:hover {
      color: var(--font-link-color);
      text-decoration: underline;
    }

    .bookmark-remove:hover:not(:disabled) {
      opacity: 1;
      border-color: color-mix(in srgb, var(--font-color) 40%, transparent);
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
      gap: 10px;
    }

    .bookmark-card {
      padding: 12px;
    }

    /* Bigger target on touchscreens. */
    .bookmark-remove {
      width: 38px;
      height: 38px;
      top: 4px;
      right: 4px;
    }
  }
</style>
