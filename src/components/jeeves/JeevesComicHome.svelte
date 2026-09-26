<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import { Button } from '$lib/components';
  import JeevesActivityChart from './JeevesActivityChart.svelte';
  import { sgxpButtonClass } from '$components/ui/button';
  import { ArrowLeft, BookOpen, Bookmark, ImageOff, Info, List, MessageSquare, RotateCcw, Users } from 'lucide-svelte';
  import {
    archiveAssetUrl,
    archiveTime,
    formatDate,
    sanitizeArchiveHtml,
    type ArchiveEntryInfo,
    type ComicMetadata,
  } from '$lib/jeevesArchive';

  interface Props {
    comicId: string;
    metadata: ComicMetadata;
    entry: ArchiveEntryInfo | null;
    /** Last page this browser read, if any. */
    resumePage: number | null;
    onOpenPage: (page: number) => void;
    /** Whether the viewer has this comic in their (private) bookmarks. */
    bookmarked?: boolean;
    bookmarkBusy?: boolean;
    onToggleBookmark?: () => void;
  }

  let {
    comicId,
    metadata,
    entry,
    resumePage,
    onOpenPage,
    bookmarked = false,
    bookmarkBusy = false,
    onToggleBookmark,
  }: Props = $props();

  const chapters = $derived(metadata.chapters);
  const authors = $derived(metadata.authors?.filter((a) => a.name) ?? []);
  // Earliest/latest real dates rather than the first/last page's: a single
  // placeholder date (see archiveTime) shouldn't become the start date.
  const pageTimes = $derived(
    chapters.map((c) => archiveTime(c.distributedDate)).filter((t): t is number => t !== null)
  );
  const firstPosted = $derived(pageTimes.length ? formatDate(new Date(Math.min(...pageTimes)).toISOString()) : 'Unknown');
  const lastPosted = $derived(pageTimes.length ? formatDate(new Date(Math.max(...pageTimes)).toISOString()) : 'Unknown');
  const totalComments = $derived(chapters.reduce((sum, c) => sum + (c.comments?.length ?? 0), 0));
  const savedPercent = $derived(
    entry?.percentSaved === null || entry?.percentSaved === undefined ? null : Math.round(entry.percentSaved * 100)
  );
  const bookmarkCount = $derived(entry?.bookmarkCount ?? 0);
  const bookmarkCountLabel = $derived(
    `Bookmarked by ${bookmarkCount.toLocaleString()} ${bookmarkCount === 1 ? 'reader' : 'readers'}`
  );
  const ratingLabel = $derived(
    entry?.rating !== null && entry?.rating !== undefined ? `Rated ${entry.rating} out of 10` : 'Unrated'
  );

  let previewFailed = $state(false);
  let previewLoaded = $state(false);
  let failedThumbs = $state(new Set<number>());
  let loadedThumbs = $state(new Set<number>());
  let failedAvatars = $state(new Set<number>());
  let creatorsEl = $state<HTMLElement>();

  // Group comics can list a dozen+ creators - the byline names the first
  // two and points to the full grid below for the rest.
  const BYLINE_NAMES = 2;
  const bylineAuthors = $derived(authors.slice(0, BYLINE_NAMES));
  const extraAuthors = $derived(Math.max(0, authors.length - BYLINE_NAMES));
</script>

<section class="comic-hero">
  <!-- A breadcrumb-style text link above the preview on desktop; on phones a
       standard tool button in the empty band beside the hamburger instead
       (CSS shows one or the other). -->
  <nav class="hero-nav" aria-label="Archive">
    <a href="/smackjeeves" class="hero-back no-theme-styles" data-restore-state>
      <ArrowLeft size={14} />
      Smack Jeeves Archive
    </a>
    <Button variant="tool" icon={ArrowLeft} href="/smackjeeves" class="hero-back-btn" data-restore-state>
      Smack Jeeves Archive
    </Button>
  </nav>
  <div class="hero-top">
    <!-- Same pre-cropped 1:1 preview as the archive's cards. -->
    <div class="hero-preview" aria-hidden="true">
      {#if previewFailed}
        <ImageOff size={22} />
      {:else}
        <img
          src="/api/smackjeeves-preview/{comicId}"
          alt=""
          width="100"
          height="100"
          class:loaded={previewLoaded}
          onload={() => (previewLoaded = true)}
          onerror={() => (previewFailed = true)}
        />
      {/if}
    </div>

    <div class="hero-heading">
      <h1 class="hero-title">{metadata.title || '(untitled)'}</h1>
      <div class="hero-byline">
        <span class="hero-by">by</span>
        {#each bylineAuthors as author, i (i)}
          <span class="hero-author">{author.name}{#if i < bylineAuthors.length - 1},{/if}</span>
        {:else}
          <span class="hero-author">Unknown</span>
        {/each}
        {#if extraAuthors > 0}
          <button
            type="button"
            class="hero-more-authors"
            onclick={() => creatorsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            +{extraAuthors} more
          </button>
        {/if}
      </div>
      <div class="hero-chips">
        {#if entry?.category}<span class="chip chip--accent">{entry.category}</span>{/if}
        {#each metadata.genres ?? [] as genre (genre)}<span class="chip">{genre}</span>{/each}
        {#if metadata.isCompleted}<span class="chip">Completed</span>{/if}
      </div>
    </div>

    {#snippet ratingContent()}
      <span class="rating-number">{entry?.rating ?? '–'}</span>
      <span class="rating-scale">/10</span>
    {/snippet}

    {#if entry}
      {#if entry.notes}
        <Popover.Root>
          <Popover.Trigger
            class="{sgxpButtonClass({ variant: 'secondary', size: 'icon' })} rating-block rating-block--notes"
            aria-label="{ratingLabel}. Show Xypter's notes"
          >
            {@render ratingContent()}
          </Popover.Trigger>
          <Popover.Content side="bottom" align="end" sideOffset={6} class="theme-card-notes-popover">
            <span class="notes-popover-label">Xypter's Notes</span>
            <p class="notes-popover-text">{entry.notes}</p>
          </Popover.Content>
        </Popover.Root>
      {:else}
        <div class="{sgxpButtonClass({ variant: 'secondary', size: 'icon', static: true })} rating-block" aria-label={ratingLabel}>{@render ratingContent()}</div>
      {/if}
    {/if}
  </div>

  <div class="hero-stats-row">
    <dl class="hero-stats">
      <div><dt>Pages</dt><dd>{chapters.length.toLocaleString()}</dd></div>
      <div><dt>Comments</dt><dd>{totalComments.toLocaleString()}</dd></div>
      <div><dt>Started</dt><dd>{firstPosted}</dd></div>
      <div><dt>Last page</dt><dd>{lastPosted}</dd></div>
      {#if savedPercent !== null}
        <div class="hero-saved">
          <dt>Preserved</dt>
          <dd>
            <span class="saved-meter-track"><span class="saved-meter-fill" style:width="{Math.min(savedPercent, 100)}%"></span></span>
            {savedPercent}%
          </dd>
        </div>
      {/if}
    </dl>
    {#if entry && onToggleBookmark}
      <!-- Same subtle two-state toggle + reader count as the archive cards'
           (end of the stats row). Not disabled while saving - fading it for
           the request reads as a flicker; the handler ignores repeat taps. -->
      <Button
        variant="subtle"
        icon={Bookmark}
        class="hero-bookmark"
        onclick={onToggleBookmark}
        aria-busy={bookmarkBusy || undefined}
        aria-pressed={bookmarked}
        title="{bookmarkCountLabel}. {bookmarked ? 'Remove your bookmark' : 'Bookmark it (only you can see your bookmarks)'}"
        aria-label="{bookmarked ? 'Remove bookmark' : 'Bookmark this comic'} ({bookmarkCountLabel})"
      >
        {#if bookmarkCount > 0}<span class="sgxp-btn-count">{bookmarkCount.toLocaleString()}</span>{/if}
      </Button>
    {/if}
  </div>

  <div class="hero-actions">
    {#if chapters.length > 0}
      <Button variant="primary" icon={BookOpen} class="hero-cta" onclick={() => onOpenPage(1)}>
        Start reading
      </Button>
      {#if resumePage && resumePage > 1 && resumePage <= chapters.length}
        <Button variant="secondary" icon={RotateCcw} class="hero-cta" onclick={() => onOpenPage(resumePage)}>
          Continue from page {resumePage}
        </Button>
      {/if}
    {/if}
  </div>
</section>

{#if metadata.description?.trim()}
  <section class="jeeves-panel">
    <h3 class="jeeves-panel-title"><Info size={18} /> About</h3>
    <div class="jeeves-panel-body rich-text">{@html sanitizeArchiveHtml(metadata.description)}</div>
  </section>
{/if}

<JeevesActivityChart {chapters} />

{#if authors.length > 0}
  <section class="jeeves-panel creators-panel" bind:this={creatorsEl}>
    <h3 class="jeeves-panel-title">
      <Users size={18} /> {authors.length === 1 ? 'Creator' : `Creators (${authors.length})`}
    </h3>
    <ul class="creator-grid">
      {#each authors as author, i (i)}
        <li class="creator">
          {#if author.imgPath && !failedAvatars.has(i)}
            <img
              src={archiveAssetUrl(author.imgPath)}
              alt=""
              class="creator-avatar"
              loading="lazy"
              onerror={() => (failedAvatars = new Set(failedAvatars).add(i))}
            />
          {:else}
            <div class="creator-avatar creator-avatar--fallback" aria-hidden="true">
              {author.name?.[0]?.toUpperCase() || '?'}
            </div>
          {/if}
          <span class="creator-name" title={author.name}>{author.name}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<section class="jeeves-panel">
  <h3 class="jeeves-panel-title"><List size={18} /> Pages ({chapters.length})</h3>
  <ol class="page-list">
    {#each chapters as chapter, i (i)}
      {@const pagePath = chapter.pagesPath?.[0]}
      <li>
        <button type="button" class="page-card" data-page={i + 1} class:current={resumePage === i + 1} onclick={() => onOpenPage(i + 1)}>
          <!-- Same 1:1 "best spot" crop as the archive cards, for this page. -->
          <span class="page-preview" aria-hidden="true">
            {#if pagePath && !failedThumbs.has(i)}
              <img
                src="/api/smackjeeves-preview/{comicId}?path={encodeURIComponent(pagePath)}"
                alt=""
                width="100"
                height="100"
                loading="lazy"
                decoding="async"
                class:loaded={loadedThumbs.has(i)}
                onload={() => (loadedThumbs = new Set(loadedThumbs).add(i))}
                onerror={() => (failedThumbs = new Set(failedThumbs).add(i))}
              />
            {:else}
              <ImageOff size={22} />
            {/if}
          </span>
          <span class="page-text">
            <span class="page-num">
              Page {i + 1}
              {#if resumePage === i + 1}<span class="page-resume">Last read</span>{/if}
            </span>
            <span class="page-title">{chapter.articleTitle || `Page ${i + 1}`}</span>
            <span class="page-meta">
              {formatDate(chapter.distributedDate)}
              {#if chapter.comments?.length}
                <span class="page-comments"><MessageSquare size={12} /> {chapter.comments.length}</span>
              {/if}
            </span>
          </span>
        </button>
      </li>
    {/each}
</section>

<style>
  .comic-hero {
    position: relative;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap, 20px);
  }

  .hero-nav {
    display: flex;
    padding: 12px 16px 0;
  }

  .hero-back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--font-link-color);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    text-decoration: none;
    text-shadow: none;
  }

  @media (hover: hover) {
    .hero-back:hover {
      text-decoration: underline;
    }
  }

  /* The phone version; hidden on desktop. */
  .hero-nav :global(.hero-back-btn) {
    display: none;
  }

  .hero-top {
    display: flex;
    gap: 16px;
    padding: 10px 16px 12px;
  }

  .hero-preview {
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
  }

  .hero-preview :global(svg) {
    opacity: 0.35;
  }

  .hero-preview img {
    width: 100px;
    height: 100px;
    object-fit: none;
    image-rendering: pixelated;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .hero-preview img.loaded {
    opacity: 1;
  }

  .hero-heading {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .hero-title {
    /* Pulls the line box's leading up so the tallest letters sit flush with
       the preview's top edge rather than a few pixels below it. */
    margin: -5px 0 0;
    font-size: 28px;
    font-weight: 800;
    line-height: 1.15;
    color: var(--font-color);
    overflow-wrap: anywhere;
    text-shadow:
      calc(2px * var(--multiply-factor, 1)) 0 0 var(--bg-color),
      calc(2px * var(--multiply-factor, 1)) calc(2px * var(--multiply-factor, 1)) 0 var(--bg-color),
      0 calc(2px * var(--multiply-factor, 1)) 0 var(--bg-color);
  }

  .hero-byline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
    font-size: 14px;
  }

  .hero-by {
    opacity: 0.7;
  }

  .hero-author {
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .hero-more-authors {
    padding: 0 6px;
    background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--font-link-color) 60%, transparent);
    color: var(--font-link-color);
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    line-height: 20px;
    cursor: pointer;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .hero-more-authors:hover {
      background: color-mix(in srgb, var(--font-link-color) 30%, transparent);
    }
  }

  .hero-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .chip {
    padding: 2px 8px;
    border: 1px solid color-mix(in srgb, var(--page-color) 60%, white);
    font-size: 12px;
    font-weight: 700;
  }

  .chip--accent {
    border-color: color-mix(in srgb, var(--font-link-color) 60%, transparent);
    background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
  }

  /* Same secondary-look rating square as ArchiveComicCard (a real button
     with notes, the same classes with `static` without), a size up for the
     page's headline rating. Only the layout lives here. */
  .comic-hero :global(.rating-block) {
    position: relative;
    flex-shrink: 0;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 52px;
    height: 52px;
    padding: 0;
    font-family: 'saira', sans-serif;
    line-height: 1;
  }

  .comic-hero :global(.rating-block--notes[data-state="open"]) {
    border-color: var(--font-link-color);
  }

  /* The eyebrow row above the preview pushes this row down; pull the rating
     back up to 16px from the card's top, level with the eyebrow (12px nav
     padding + 16px link + 10px row padding = 38px down otherwise). Phones
     move the eyebrow out of the card, so there's nothing to undo there. */
  @media (min-width: 769px) {
    .comic-hero :global(.rating-block) {
      margin-top: -22px;
    }
  }

  .rating-number {
    font-size: 22px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .rating-scale {
    font-size: 10px;
    font-weight: 700;
    opacity: 0.8;
    margin-top: 1px;
  }

  .hero-stats-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 85%, white);
  }

  .hero-stats {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 28px;
    margin: 0;
  }

  /* The standard subtle button, its 42px hit area pulled into the row's
     padding so it doesn't make the row taller. */
  .hero-stats-row :global(.hero-bookmark) {
    align-self: center;
    margin: -10px -10px -10px 0;
    padding: 0 10px;
    gap: 5px;
  }

  .hero-stats dt {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.65;
  }

  .hero-stats dd {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .hero-saved {
    flex: 1 1 160px;
  }

  .hero-saved dd {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .saved-meter-track {
    flex: 1;
    height: 6px;
    background: color-mix(in srgb, var(--page-color) 70%, white);
    overflow: hidden;
  }

  .saved-meter-fill {
    display: block;
    height: 100%;
    background: var(--font-link-color);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 16px 16px;
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 85%, white);
  }

  /* Standard buttons; this only shares out the row between them. */
  .hero-actions :global(.hero-cta) {
    flex: 1 1 200px;
  }

  /* Even columns however many creators there are (group comics list 14+). */
  .creator-grid {
    list-style: none;
    margin: 0;
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px;
  }

  .creator {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 6px;
    background: color-mix(in srgb, var(--page-color) 85%, black);
  }

  /* Smack Jeeves avatars were 125x125 (some smaller) - shown at their true
     size, pixel for pixel; only the rare oversized upload is shrunk to fit. */
  .creator-avatar {
    flex-shrink: 0;
    width: 125px;
    height: 125px;
    object-fit: scale-down;
    image-rendering: pixelated;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    outline: 2px solid color-mix(in srgb, var(--page-color) 75%, white);
  }

  .creator-avatar--fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 800;
    color: var(--font-link-color);
  }

  .creator-name {
    min-width: 0;
    font-weight: 700;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Page list: cards in the archive's style, two/three across on wider
     screens. */
  .page-list {
    list-style: none;
    margin: 0;
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 10px;
  }

  .page-card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    height: 100%;
    padding: 10px;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  @media (hover: hover) {
    .page-card:hover {
      border-color: var(--font-link-color);
    }
  }

  .page-card.current {
    border-color: color-mix(in srgb, var(--font-link-color) 70%, transparent);
    background: color-mix(in srgb, var(--font-link-color) 10%, var(--page-color));
  }

  /* Matches ArchiveComicCard's preview: served pre-cropped at exactly
     100x100, shown 1:1 and never resampled. */
  .page-preview {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    overflow: hidden;
    background: color-mix(in srgb, var(--page-color) 70%, black);
    outline: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 75%, white);
  }

  .page-preview :global(svg) {
    opacity: 0.35;
  }

  .page-preview img {
    width: 100px;
    height: 100px;
    object-fit: none;
    image-rendering: pixelated;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .page-preview img.loaded {
    opacity: 1;
  }

  .page-text {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .page-num {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }

  .page-resume {
    padding: 0 6px;
    background: var(--font-link-color);
    color: var(--page-color);
    font-size: 11px;
    line-height: 18px;
  }

  .page-card.current .page-num {
    opacity: 1;
  }

  .page-title {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.25;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .page-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    opacity: 0.7;
  }

  .page-comments {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  @media (max-width: 768px) {
    /* No bar of its own on phones: the button moves up into the empty band
       above the card, level with the floating hamburger menu (fixed at
       12px from the top, 42px tall; the card starts 64px down). */
    .hero-nav {
      position: absolute;
      top: calc(-52px - var(--border-width, 1px));
      left: 12px;
      padding: 0;
    }

    /* Phones swap the text link for the standard tool button (same family
       as the reader toolbar's buttons). */
    .hero-back {
      display: none;
    }

    .hero-nav :global(.hero-back-btn) {
      display: inline-flex;
    }

    .comic-hero {
      border-left: none;
      border-right: none;
      box-shadow: none;
      width: 100vw;
      margin-left: calc(-50vw + 50%);
    }

    .hero-top {
      gap: 12px;
      padding: 14px 12px 10px;
    }

    .hero-preview,
    .hero-preview img {
      width: 72px;
      height: 72px;
    }

    .hero-title {
      margin-top: -3px;
      font-size: 21px;
      /* Clear the floating hamburger menu button. */
      padding-right: 8px;
    }

    .hero-stats-row {
      padding: 10px 12px;
    }

    .hero-stats {
      gap: 8px 20px;
    }

    .comic-hero :global(.rating-block) {
      width: 44px;
      height: 44px;
    }

    .rating-number {
      font-size: 19px;
    }

    .creator-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 8px;
      gap: 6px;
    }

    /* Two across on phones, name under the avatar so it isn't squeezed. */
    .creator {
      flex-direction: column;
      gap: 6px;
      padding: 8px 6px;
    }

    .creator-name {
      max-width: 100%;
      font-size: 13px;
    }

    .page-list {
      grid-template-columns: minmax(0, 1fr);
      padding: 8px;
      gap: 8px;
    }
  }
</style>
