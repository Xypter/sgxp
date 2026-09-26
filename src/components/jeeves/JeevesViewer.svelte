<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { ArrowLeft, ArrowUp, Bookmark, ChevronLeft, ChevronRight, Library } from 'lucide-svelte';
  import Spinner from '../Spinner.svelte';
  import { Button, Select } from '$lib/components';
  import {
    addArchiveBookmark,
    fetchArchiveBookmark,
    removeBookmark,
    saveBookmarkProgress,
    type ComicBookmark,
  } from '$lib/comicBookmarks';
  import JeevesPageStage from './JeevesPageStage.svelte';
  import JeevesComicHome from './JeevesComicHome.svelte';
  import JeevesComments from './JeevesComments.svelte';
  import {
    chapterImageUrl,
    formatDate,
    loadArchiveEntry,
    loadComicMetadata,
    type ArchiveEntryInfo,
    type ComicMetadata,
  } from '$lib/jeevesArchive';

  // The page is ?comic_id=<id>, and the URL hash is the page being read
  // (#0 / no hash = the comic's home: info + page list).

  let { loggedIn = false }: { loggedIn?: boolean } = $props();

  let comicId = $state<string | null>(null);
  let metadata = $state<ComicMetadata | null>(null);
  let entry = $state<ArchiveEntryInfo | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let currentPage = $state(0);
  let immersive = $state(false);
  let resumePage = $state<number | null>(null);
  let readerEl = $state<HTMLElement>();

  const pageCount = $derived(metadata?.chapters.length ?? 0);
  const chapter = $derived(currentPage > 0 ? metadata?.chapters[currentPage - 1] : undefined);
  const pageSrc = $derived(comicId && chapter ? chapterImageUrl(comicId, chapter) : null);
  const authorName = $derived(metadata?.authors?.find((a) => a.name)?.name);
  const pageOptions = $derived([
    { value: '0', label: 'Comic info & page list' },
    ...(metadata?.chapters ?? []).map((ch, i) => ({
      value: String(i + 1),
      label: `${i + 1} / ${pageCount} · ${ch.articleTitle || `Page ${i + 1}`}`,
    })),
  ]);

  // "Continue from page N" - remembered per browser, purely a convenience.
  const PROGRESS_KEY = 'sgxp-jeeves-progress';

  function readProgress(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') ?? {};
    } catch {
      return {};
    }
  }

  function saveProgress(page: number) {
    if (!comicId || page < 1) return;
    resumePage = page;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...readProgress(), [comicId]: page }));
    } catch {}
    if (bookmark && bookmark.lastPage !== page) queueBookmarkProgress(page);
  }

  // Bookmarked comics also keep their progress on the account, so "Continue
  // from page N" follows the reader to other devices. Private to the reader
  // (see the CMS's Bookmarks collection).
  let bookmark = $state<ComicBookmark | null>(null);
  let bookmarkBusy = $state(false);
  let progressTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingProgress: number | null = null;

  // Debounced so flipping through pages quickly is one request, not dozens.
  function queueBookmarkProgress(page: number) {
    pendingProgress = page;
    clearTimeout(progressTimer);
    progressTimer = setTimeout(flushBookmarkProgress, 1000);
  }

  function flushBookmarkProgress() {
    clearTimeout(progressTimer);
    const page = pendingProgress;
    pendingProgress = null;
    if (!bookmark || page === null || bookmark.lastPage === page) return;
    bookmark.lastPage = page;
    saveBookmarkProgress(bookmark.id, page).catch((err) => console.error('Error saving reading progress:', err));
  }

  async function loadBookmark(entryId: number) {
    try {
      bookmark = await fetchArchiveBookmark(entryId);
      if (!bookmark) return;
      // Already reading (opened straight onto a page): that's the progress now.
      // Otherwise the account's progress wins over this browser's - it's from
      // whichever device was used last.
      if (currentPage > 0) {
        if (bookmark.lastPage !== currentPage) queueBookmarkProgress(currentPage);
      } else if (bookmark.lastPage) {
        resumePage = bookmark.lastPage;
      }
    } catch (err) {
      console.error('Error loading bookmark:', err);
    }
  }

  async function toggleBookmark() {
    if (!loggedIn) {
      toast('Log in to bookmark comics', {
        description: 'Bookmarks are private - only you can see them.',
        action: { label: 'Log in', onClick: () => (window.location.href = '/login') },
      });
      return;
    }
    if (!entry || bookmarkBusy) return;
    bookmarkBusy = true;
    try {
      if (bookmark) {
        clearTimeout(progressTimer);
        pendingProgress = null;
        await removeBookmark(bookmark);
        bookmark = null;
        entry.bookmarkCount = Math.max(0, (entry.bookmarkCount ?? 0) - 1);
        toast.success('Bookmark removed');
      } else {
        bookmark = await addArchiveBookmark(entry.id, currentPage || resumePage);
        // What the CMS's recount will store - no refetch needed to show it.
        entry.bookmarkCount = (entry.bookmarkCount ?? 0) + 1;
        toast.success('Bookmarked', {
          description: 'Your place is saved.',
          action: { label: 'View bookmarks', onClick: () => (window.location.href = '/bookmarks') },
        });
      }
    } catch (err) {
      console.error('Error updating bookmark:', err);
      toast.error(err instanceof Error ? err.message : 'Could not update the bookmark');
    } finally {
      bookmarkBusy = false;
    }
  }

  function pageFromHash(): number {
    const page = parseInt(window.location.hash.slice(1), 10);
    return Number.isFinite(page) && page > 0 ? page : 0;
  }

  function clampPage(page: number) {
    return Math.min(Math.max(page, 0), pageCount);
  }

  // Where the comic's home (page list) was when a page was opened, so coming
  // back lands on the card that was tapped. Kept as "this card, this far
  // from the top of the screen" rather than a raw scroll offset: the home
  // page's layout shifts slightly once something's been read (the "Continue
  // from page N" button appears), which would throw a raw offset off.
  let homeAnchor: { page: number; top: number } | null = null;
  let homeScrollY = 0;

  function restoreHomeScroll() {
    const card = homeAnchor && document.querySelector<HTMLElement>(`.page-card[data-page="${homeAnchor.page}"]`);
    if (card && homeAnchor) {
      window.scrollBy({ top: card.getBoundingClientRect().top - homeAnchor.top, behavior: 'instant' });
    } else {
      window.scrollTo({ top: homeScrollY, behavior: 'instant' });
    }
  }

  /** Switches the view; `setPage` also records it in the URL/history. */
  async function showPage(page: number) {
    if (!metadata) return;
    page = clampPage(page);
    const previous = currentPage;
    if (page === previous) return;
    if (previous === 0) {
      homeScrollY = window.scrollY;
      const card = document.querySelector<HTMLElement>(`.page-card[data-page="${page}"]`);
      const top = card?.getBoundingClientRect().top;
      // Only anchor to a card that was actually on screen (not e.g. page 1
      // when "Start reading" was pressed at the top of the page).
      homeAnchor = card && top !== undefined && top > -card.offsetHeight && top < window.innerHeight ? { page, top } : null;
    }
    if (page === 0) immersive = false;
    // Phones read in fullscreen: opening a page from the list goes straight
    // into it (the shrink button still leaves it, for the comments).
    else if (previous === 0 && window.matchMedia('(max-width: 768px)').matches) immersive = true;
    currentPage = page;

    await tick();
    // `instant` because the site's CSS sets smooth scrolling, which would
    // animate every page change (and land short if layout moves meanwhile).
    // Applied again next frame: the browser's own scroll anchoring and
    // history restoration can nudge it after the view swap.
    const applyScroll = () => {
      if (page === 0) {
        restoreHomeScroll();
      } else if (previous === 0) {
        // Opening a page from the list always starts at the top of it.
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    applyScroll();
    requestAnimationFrame(applyScroll);
    if (page > 0 && previous > 0 && readerEl && readerEl.getBoundingClientRect().top < 0) {
      // Turning the page from down in the comments: back to the top of the
      // new page, not the top of the site.
      readerEl.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function setPage(page: number) {
    if (!metadata) return;
    page = clampPage(page);
    if (page === currentPage) return;
    showPage(page);
    window.location.hash = String(page);
  }

  $effect(() => {
    const page = currentPage;
    if (page > 0) untrack(() => saveProgress(page));
  });

  // Next page is almost always what's wanted next - have it cached.
  $effect(() => {
    if (!comicId || !metadata || currentPage >= pageCount) return;
    const next = chapterImageUrl(comicId, metadata.chapters[currentPage]);
    if (next) new Image().src = next;
  });

  $effect(() => {
    if (metadata?.title) document.title = currentPage > 0 ? `${metadata.title} - Page ${currentPage} | SGXP` : `${metadata.title} | SGXP`;
  });

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' && currentPage > 1) setPage(currentPage - 1);
    else if (event.key === 'ArrowRight' && currentPage < pageCount) setPage(currentPage + 1);
  }

  onMount(() => {
    comicId = new URLSearchParams(window.location.search).get('comic_id');
    if (!comicId || !/^\d+$/.test(comicId)) {
      error = 'No comic selected. Pick one from the Smack Jeeves archive.';
      loading = false;
      return;
    }
    resumePage = readProgress()[comicId] ?? null;

    const id = comicId;
    loadArchiveEntry(id).then((result) => {
      entry = result;
      if (result && loggedIn) loadBookmark(result.id);
    });
    loadComicMetadata(id)
      .then((result) => {
        metadata = result;
        currentPage = Math.min(pageFromHash(), result.chapters.length);
      })
      .catch((err) => {
        console.error('Error loading comic metadata:', err);
        error = 'This comic could not be loaded from the archive.';
      })
      .finally(() => (loading = false));

    const onHashChange = () => {
      // Browser/phone back and forward.
      showPage(pageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', handleKeydown);
    // Leaving mid-debounce still saves the last page read.
    window.addEventListener('pagehide', flushBookmarkProgress);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('pagehide', flushBookmarkProgress);
      flushBookmarkProgress();
    };
  });
</script>

{#snippet pageNav()}
  <nav class="page-nav" aria-label="Page navigation">
    <Button
      variant="secondary"
      icon={ChevronLeft}
      data-icon="plain"
      class="page-nav-btn"
      onclick={() => setPage(currentPage - 1)}
      disabled={currentPage <= 1}
      title="Previous page (Left Arrow)"
      aria-label="Previous page"
    >
      <span class="page-nav-btn-label">Prev</span>
    </Button>

    <div class="page-select">
      <Select
        themed
        class="page-select-trigger"
        contentClass="page-select-content"
        value={String(currentPage)}
        options={pageOptions}
        onValueChange={(value) => setPage(parseInt(value, 10))}
      />
    </div>

    <Button
      variant="secondary"
      data-icon="plain"
      class="page-nav-btn"
      onclick={() => setPage(currentPage + 1)}
      disabled={currentPage >= pageCount}
      title="Next page (Right Arrow)"
      aria-label="Next page"
    >
      <!-- Arrow after the label (the icon prop always leads). -->
      <span class="page-nav-btn-label">Next</span><ChevronRight />
    </Button>
  </nav>
{/snippet}

<div class="jeeves-viewer">
  {#if loading}
    <div class="jeeves-status"><Spinner size={22} label={null} /> Loading comic...</div>
  {:else if error || !metadata || !comicId}
    <div class="jeeves-status jeeves-status--error">
      <p>{error ?? 'Something went wrong.'}</p>
      <a href="/smackjeeves">Back to the archive</a>
    </div>
  {:else if currentPage === 0}
    <JeevesComicHome
      {comicId}
      {metadata}
      {entry}
      {resumePage}
      onOpenPage={setPage}
      bookmarked={!!bookmark}
      {bookmarkBusy}
      onToggleBookmark={toggleBookmark}
    />

    <Button variant="secondary" icon={ArrowUp} class="back-to-top" onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      Top
    </Button>
  {:else if chapter}
    <div class="reader" bind:this={readerEl}>
      <JeevesPageStage
        src={pageSrc}
        alt="{metadata.title}, page {currentPage}"
        bind:immersive
      >
        {#snippet lead()}
          <Button
            variant="tool"
            size="icon"
            icon={ArrowLeft}
            onclick={() => setPage(0)}
            title="Comic info & page list"
            aria-label="Back to comic info and page list"
          />
          <Button
            variant="tool"
            size="icon"
            icon={Library}
            href="/smackjeeves"
            data-restore-state
            title="Smack Jeeves Archive"
            aria-label="Back to the Smack Jeeves archive"
          />
          {#if entry}
            <!-- Two-state: the icon fills in when bookmarked. Not disabled
                 while saving (that fade reads as a flicker); toggleBookmark
                 ignores repeat taps. -->
            <Button
              variant="tool"
              size="icon"
              icon={Bookmark}
              onclick={toggleBookmark}
              aria-busy={bookmarkBusy || undefined}
              aria-pressed={!!bookmark}
              title={bookmark ? 'Remove bookmark' : 'Bookmark this comic'}
              aria-label={bookmark ? 'Remove bookmark' : 'Bookmark this comic'}
            />
          {/if}
        {/snippet}
        {#snippet info()}
          <!-- The page's own title lives in the page picker below. -->
          <div class="stage-comic-title" title={metadata.title}>{metadata.title}</div>
          <div class="stage-page-num">
            Page {currentPage} of {pageCount} ·
            <span class="stage-page-name">{chapter.articleTitle || `Page ${currentPage}`}</span>
            · {formatDate(chapter.distributedDate)}
          </div>
        {/snippet}
        {#snippet footer()}
          {@render pageNav()}
        {/snippet}
      </JeevesPageStage>

      <div class="reader-below">
        <JeevesComments {chapter} {authorName} />
      </div>

      <!-- Last in the reader so `sticky` keeps it pinned to the bottom of the
           screen all the way down through the comments. -->
      {#if !immersive}
        <div class="reader-nav">{@render pageNav()}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .jeeves-viewer {
    width: 100%;
    font-family: 'saira', sans-serif;
    color: var(--font-color);
  }

  .jeeves-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 60px 20px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    font-size: 15px;
    text-align: center;
  }

  .jeeves-status p {
    margin: 0;
  }

  .jeeves-status--error p {
    color: #ff6b6b;
  }

  /* Panels shared by the home and reader views (About, page list,
     comments). */
  .jeeves-viewer :global(.jeeves-panel) {
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap, 20px);
  }

  .jeeves-viewer :global(.jeeves-panel-title) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 8px 14px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    font-size: 16px;
    font-weight: 800;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor, 1)) 0 0 var(--bg-color),
      calc(1px * var(--multiply-factor, 1)) calc(1px * var(--multiply-factor, 1)) 0 var(--bg-color),
      0 calc(1px * var(--multiply-factor, 1)) 0 var(--bg-color);
  }

  .jeeves-viewer :global(.jeeves-panel-body) {
    padding: 14px;
  }

  .jeeves-viewer :global(.empty-note) {
    margin: 0;
    font-size: 14px;
    font-style: italic;
    opacity: 0.55;
  }

  .jeeves-viewer :global(.rich-text) {
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .jeeves-viewer :global(.rich-text a) {
    color: var(--font-link-color);
    text-decoration: underline;
  }

  .jeeves-viewer :global(.rich-text img) {
    max-width: 100%;
    display: inline-block;
  }

  .stage-comic-title {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow:
      calc(1px * var(--multiply-factor, 1)) 0 0 var(--bg-color),
      calc(1px * var(--multiply-factor, 1)) calc(1px * var(--multiply-factor, 1)) 0 var(--bg-color),
      0 calc(1px * var(--multiply-factor, 1)) 0 var(--bg-color);
  }

  .stage-page-num {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
  }

  /* The page's own title, a step brighter than the numbers around it. */
  .stage-page-name {
    color: var(--font-color);
    font-weight: 700;
  }

  .reader-below {
    margin-top: var(--gap, 20px);
  }

  .reader-nav {
    position: sticky;
    bottom: 0;
    z-index: 20;
    margin-top: var(--gap, 20px);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.35);
  }

  /* Right and bottom padding leave room for the buttons' block shadows. */
  .page-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 15px 15px 8px;
    background: color-mix(in srgb, var(--page-color) 70%, black);
  }

  /* Standard secondary buttons with plain arrows (data-icon="plain"), like
     the pagination's; this only sets their spacing. */
  .page-nav :global(.page-nav-btn) {
    padding: 0 14px;
    gap: 4px;
  }

  .page-select {
    flex: 1;
    min-width: 0;
    display: flex;
  }

  /* Themed Select (.theme-select-trigger) - already the shared control
     height, so it sits level with the Prev/Next buttons. */
  .page-select :global(.page-select-trigger) {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  /* Page titles can be long - without a cap the open list grows wider than
     a phone's screen, and the phone zooms the whole page out to fit it. */
  :global(.page-select-content) {
    max-width: calc(100vw - 16px) !important;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  /* A standard secondary button, pinned to the corner. Two classes so
     `fixed` outranks the standard's `position: relative`. */
  :global(.sgxp-btn.back-to-top) {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 100;
  }

  @media (max-width: 768px) {
    .jeeves-viewer :global(.jeeves-panel),
    .jeeves-status,
    .reader-nav {
      border-left: none;
      border-right: none;
      box-shadow: none;
      width: 100vw;
      margin-left: calc(-50vw + 50%);
    }

    .reader-nav {
      box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.35);
      padding-bottom: env(safe-area-inset-bottom);
      background: color-mix(in srgb, var(--page-color) 70%, black);
    }

    .page-nav :global(.page-nav-btn) {
      padding: 0 10px;
    }

    :global(.sgxp-btn.back-to-top) {
      bottom: 16px;
      right: 16px;
    }
  }

  @media (max-width: 420px) {
    /* Arrows alone on narrow phones - the page picker needs the room. */
    .page-nav-btn-label {
      display: none;
    }
  }
</style>
