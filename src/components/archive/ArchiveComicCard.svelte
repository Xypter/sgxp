<script lang="ts">
  import * as Popover from '$components/ui/popover';
  import { ArrowRight, Bookmark, BookmarkCheck, ImageOff } from 'lucide-svelte';

  interface Props {
    comicId: number;
    title?: string;
    author?: string;
    category?: string | null;
    pagesMetadata?: number | null;
    pagesFolder?: number | null;
    percentSaved?: number | null;
    rating?: number | null;
    notes?: string | null;
    /** How many readers have bookmarked it - shown to everyone. */
    bookmarkCount?: number;
    href: string;
    /** In the viewer's (private) bookmarks. */
    bookmarked?: boolean;
    bookmarkBusy?: boolean;
    /** Only passed for logged-in viewers - no toggle is shown otherwise. */
    onToggleBookmark?: () => void;
  }

  let {
    comicId,
    title,
    author,
    category,
    pagesMetadata,
    pagesFolder,
    percentSaved,
    rating,
    notes,
    bookmarkCount = 0,
    href,
    bookmarked = false,
    bookmarkBusy = false,
    onToggleBookmark,
  }: Props = $props();

  // Some entries have more pages in the folder than the metadata claimed
  // (e.g. 1.04) - cap the meter at full rather than overflowing it.
  const savedPercent = $derived(
    percentSaved === null || percentSaved === undefined ? null : Math.round(percentSaved * 100)
  );
  const meterWidth = $derived(savedPercent === null ? 0 : Math.min(savedPercent, 100));

  // Matches PREVIEW_SIZE in src/lib/comicPreview.ts - the crop is served at
  // exactly this size, so it's displayed 1:1 with no browser scaling.
  const PREVIEW_SIZE = 100;
  let previewLoaded = $state(false);
  let previewFailed = $state(false);

  const bookmarkCountLabel = $derived(
    `Bookmarked by ${bookmarkCount.toLocaleString()} ${bookmarkCount === 1 ? 'reader' : 'readers'}`
  );

  const ratingLabel = $derived(rating !== null && rating !== undefined ? `Rated ${rating} out of 10` : 'Unrated');
</script>

<article class="comic-card">
  <div class="comic-card-top">
    <!-- 100x100 crop of the comic's 3rd page, served pre-cropped at 1:1 by
         /api/smackjeeves-preview (see src/lib/comicPreview.ts). Decorative
         duplicate of the title link, so hidden from assistive tech. -->
    <div class="comic-card-media">
      <a {href} class="comic-card-preview no-theme-styles" tabindex="-1" aria-hidden="true">
        {#if previewFailed}
          <ImageOff size={22} />
        {:else}
          <img
            src="/api/smackjeeves-preview/{comicId}"
            alt=""
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            loading="lazy"
            decoding="async"
            class:loaded={previewLoaded}
            onload={() => (previewLoaded = true)}
            onerror={() => (previewFailed = true)}
          />
        {/if}
      </a>
    </div>

    <div class="comic-card-heading">
      <a {href} class="comic-card-title no-theme-styles">{title || '(untitled)'}</a>
      <div class="comic-card-byline">
        by <span class="comic-card-author">{author || 'Unknown'}</span>
        <span class="comic-card-dot">·</span>
        <span class="comic-card-id">#{comicId}</span>
      </div>
      {#if category}
        <span class="category-chip">{category}</span>
      {/if}
    </div>

    {#snippet ratingContent()}
      <span class="rating-number">{rating ?? '–'}</span>
      <span class="rating-scale">/10</span>
    {/snippet}

    <!-- With notes, the rating square itself is the button that reveals them
         (a Popover, not a Tooltip - bits-ui tooltips only open on mouse
         hover/focus, never on touch). The folded corner marks which ones. -->
    {#if notes}
      <Popover.Root>
        <Popover.Trigger class="rating-block rating-block--notes" aria-label="{ratingLabel}. Show Xypter's notes">
          {@render ratingContent()}
        </Popover.Trigger>
        <Popover.Content side="bottom" align="end" sideOffset={6} class="theme-card-notes-popover">
          <span class="notes-popover-label">Xypter's Notes</span>
          <p class="notes-popover-text">{notes}</p>
        </Popover.Content>
      </Popover.Root>
    {:else}
      <div class="rating-block" aria-label={ratingLabel}>
        {@render ratingContent()}
      </div>
    {/if}
  </div>

  <div class="comic-card-stats">
    {#if pagesFolder !== null && pagesFolder !== undefined}
      <span class="stat-text">{pagesFolder.toLocaleString()} {pagesFolder === 1 ? 'page' : 'pages'}</span>
    {/if}
    {#if savedPercent !== null}
      <span
        class="saved-meter"
        title="{pagesFolder ?? '?'} of {pagesMetadata ?? '?'} original pages saved"
      >
        <span class="saved-meter-track"><span class="saved-meter-fill" style="width: {meterWidth}%"></span></span>
        <span class="stat-text">{savedPercent}% saved</span>
      </span>
    {/if}
    {#if onToggleBookmark}
      <!-- Quiet until used: a faint outline icon at the end of the stats row,
           filled in the link color once bookmarked, with how many readers
           have bookmarked it beside it. -->
      <button
        type="button"
        class="comic-card-bookmark"
        class:active={bookmarked}
        onclick={onToggleBookmark}
        disabled={bookmarkBusy}
        aria-pressed={bookmarked}
        title="{bookmarkCountLabel}. {bookmarked ? 'Remove your bookmark' : 'Bookmark it (only you can see your bookmarks)'}"
        aria-label="{bookmarked ? `Remove bookmark for ${title || 'this comic'}` : `Bookmark ${title || 'this comic'}`} ({bookmarkCountLabel})"
      >
        {#if bookmarked}<BookmarkCheck size={17} />{:else}<Bookmark size={17} />{/if}
        {#if bookmarkCount > 0}<span class="bookmark-count">{bookmarkCount.toLocaleString()}</span>{/if}
      </button>
    {:else if bookmarkCount > 0}
      <span class="comic-card-bookmark comic-card-bookmark--static" title={bookmarkCountLabel}>
        <Bookmark size={17} aria-hidden="true" />
        <span class="bookmark-count" aria-label={bookmarkCountLabel}>{bookmarkCount.toLocaleString()}</span>
      </span>
    {/if}
  </div>

  <!-- The empty touchstart listener is what makes iOS Safari apply :active
       on tap at all (it skips it for elements with no touch listener). -->
  <a {href} class="comic-card-cta no-theme-styles" ontouchstart={() => {}}>
    Read comic <ArrowRight size={16} />
  </a>
</article>

<style>
  .comic-card {
    display: flex;
    flex-direction: column;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    font-family: 'saira', sans-serif;
    color: var(--font-color);
    min-width: 0;
  }

  .comic-card-top {
    display: flex;
    gap: 14px;
    padding: 14px 14px 10px;
  }

  .comic-card-media {
    flex-shrink: 0;
    align-self: flex-start;
  }

  .comic-card-preview {
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

  .comic-card-preview :global(svg) {
    opacity: 0.35;
  }

  .comic-card-preview img {
    width: 100px;
    height: 100px;
    /* Never resample: the crop is already exactly 100x100 (or smaller for a
       tiny page, which then sits centered instead of stretching), and on
       high-DPI screens the browser's own 2x/3x upscale stays hard-edged. */
    object-fit: none;
    image-rendering: pixelated;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .comic-card-preview img.loaded {
    opacity: 1;
  }

  /* Top-right corner of the card, opposite the preview. :global because
     with notes it's rendered by Popover.Trigger (a <button> in another
     component), which this component's scoped styles can't reach. */
  .comic-card :global(.rating-block) {
    position: relative;
    flex-shrink: 0;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    background: var(--font-link-color);
    /* Same as the themed buttons' text (.theme-button), e.g. Start reading. */
    color: var(--page-color);
    font-family: inherit;
    line-height: 1;
  }

  /* Folded corner marks the ratings that open a note. */
  .comic-card :global(.rating-block--notes) {
    cursor: pointer;
  }

  .comic-card :global(.rating-block--notes)::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    border-style: solid;
    border-width: 0 10px 10px 0;
    border-color: transparent var(--page-color) color-mix(in srgb, var(--font-link-color) 60%, black) transparent;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .comic-card :global(.rating-block--notes:hover) {
      background: color-mix(in srgb, var(--font-link-color) 85%, white);
    }
  }

  .comic-card :global(.rating-block--notes[data-state="open"]) {
    background: color-mix(in srgb, var(--font-link-color) 85%, white);
  }

  .rating-number {
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .rating-scale {
    font-size: 10px;
    font-weight: 700;
    opacity: 0.8;
    margin-top: 1px;
  }

  .comic-card-heading {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .comic-card-title {
    font-size: 17px;
    font-weight: 800;
    line-height: 1.25;
    color: var(--font-color);
    text-decoration: none;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (hover: hover) {
    .comic-card-title:hover {
      color: var(--font-link-color);
    }
  }

  .comic-card-byline {
    font-size: 13px;
    opacity: 0.75;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comic-card-author {
    font-weight: 600;
  }

  .comic-card-dot {
    margin: 0 4px;
    opacity: 0.6;
  }

  .comic-card-id {
    font-variant-numeric: tabular-nums;
  }

  .comic-card-stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    padding: 0 14px 12px;
    font-size: 13px;
  }

  .category-chip {
    align-self: flex-start;
    margin-top: 6px;
    padding: 2px 8px;
    border: 1px solid color-mix(in srgb, var(--font-link-color) 60%, transparent);
    background: color-mix(in srgb, var(--font-link-color) 15%, transparent);
    font-size: 12px;
    font-weight: 700;
  }

  .stat-text {
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Fills whatever's left of the stats row, so the bar always runs to the
     card's right edge - and wraps onto its own full-width line when the
     row is too cramped for a useful bar (the 140px basis). */
  .saved-meter {
    flex: 1 1 140px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
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

  /* Same look as the table's notes tooltip (NotesTooltipCell) and the
     faceted filter popovers. */
  :global(.theme-card-notes-popover) {
    width: min(320px, calc(100vw - 32px)) !important;
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white) !important;
    border-radius: 0px !important;
    color: var(--font-color) !important;
    font-family: 'saira', sans-serif !important;
    padding: 10px 12px !important;
    box-shadow: var(--box-shadow, 20px 20px 20px rgba(0, 0, 0, 0.7)) !important;
    z-index: 1000 !important;
  }

  :global(.notes-popover-label) {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.65;
    margin-bottom: 4px;
  }

  :global(.notes-popover-text) {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  /* Pushed to the bottom so cards in the same grid row line up their
     footers even when their titles or stats wrap differently. Styled to
     match the archive toolbar's Filter & Sort button (.filter-trigger in
     SmackJeevesArchiveTable.svelte). */
  .comic-card-cta {
    margin: auto 14px 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 42px;
    padding: 0 16px;
    background: var(--font-link-color);
    color: var(--page-color);
    font-family: 'saira', sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    text-shadow: none;
    white-space: nowrap;
    box-shadow: var(--box-shadow);
  }

  @media (hover: hover) {
    .comic-card-cta:hover {
      background: color-mix(in srgb, var(--font-link-color) 85%, white);
    }
  }

  /* Pressed state - the only feedback a tap gets on touchscreens, where the
     hover above never applies. Replaces the browser's own tap highlight. */
  .comic-card-cta {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .comic-card-cta:active {
    background: color-mix(in srgb, var(--font-link-color) 80%, black);
    box-shadow: none;
    transform: translateY(1px);
  }

  /* Sits at the end of the stats row (margin-left: auto), after the saved
     meter. A 32px hit area around a 17px icon; the negative margin keeps it
     from making the row any taller. */
  .comic-card-bookmark {
    flex-shrink: 0;
    margin: -7px -7px -7px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 32px;
    height: 32px;
    padding: 0 7px;
    background: transparent;
    border: none;
    color: var(--font-color);
    cursor: pointer;
  }

  /* The icon stays faint until used; the count reads like the other stats. */
  .comic-card-bookmark :global(svg) {
    opacity: 0.45;
    transition: opacity 0.15s ease, color 0.15s ease;
  }

  .bookmark-count {
    font-family: 'saira', sans-serif;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }

  .comic-card-bookmark.active :global(svg) {
    color: var(--font-link-color);
    opacity: 1;
  }

  .comic-card-bookmark:disabled {
    cursor: default;
  }

  /* Logged out: just the count, nothing to click. */
  .comic-card-bookmark--static {
    cursor: default;
  }

  @media (hover: hover) {
    .comic-card-bookmark:hover:not(:disabled):not(.comic-card-bookmark--static) :global(svg) {
      color: var(--font-link-color);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .comic-card-cta {
      height: 46px;
    }

  }
</style>
