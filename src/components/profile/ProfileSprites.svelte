<script lang="ts">
  import { untrack } from 'svelte';
  import { Image } from 'lucide-svelte';
  import Spinner from '../Spinner.svelte';
  import { NumberedPagination } from '$lib/components';
  import { spriteCardText } from '../../lib/spriteCardText';
  import { getCardColorUrls } from '../../lib/cardColors';
  import { ensureGradientOverridesLoaded, getGradientOverrides } from '../../lib/cardColorGradients.svelte';

  // Props
  let {
    userId,
    username
  }: {
    userId: number;
    username: string;
  } = $props();

  ensureGradientOverridesLoaded();

  // Mirrors SpriteCard.svelte's cardStyle computation - this file renders its own card markup
  // instead of reusing that component, so the frame/strip/gradient CSS vars need to be set here too.
  function cardStyleFor(sprite: any): string {
    const cardColors = getCardColorUrls(sprite.cardColor, sprite.stripColor, getGradientOverrides());
    return (
      `--sprite-frame-url: url("${cardColors.frameUrl}");` +
      (cardColors.stripUrl ? `--sprite-strip-url: url("${cardColors.stripUrl}");` : '') +
      `--sprite-frame-height-percent: ${cardColors.frameHeightPercent}%;` +
      `--sprite-strip-height-percent: ${cardColors.stripHeightPercent}%;` +
      `--sprite-gradient-top: ${cardColors.gradientTop};` +
      `--sprite-gradient-bottom: ${cardColors.gradientBottom};`
    );
  }

  interface ProfileSprite {
    id: number;
    title: string;
    author: any;
    iconImage?: any;
    image?: any;
    section?: any;
    typeOfSheet?: any[];
    createdAt: string;
  }

  // State
  let sprites = $state<ProfileSprite[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let totalSprites = $state(0);

  // Cards are shown two full rows deep, however many columns actually fit the
  // measured container width - no pagination, cards just disappear as the
  // viewport narrows and fewer columns fit. Matches the .sprites-container
  // grid's own `repeat(auto-fill, 117px)` + `grid-gap: 20px` sizing so the
  // column count we fetch for is the column count that actually renders.
  // Measured on .profile-sprites-box (always mounted, unlike .sprites-container
  // which only exists once sprites have loaded) - BOX_PADDING is its left+right
  // padding (15px each) that isn't available to the grid itself.
  const CARD_WIDTH = 117;
  const CARD_GAP = 20;
  const BOX_PADDING = 30;
  const ROWS_SHOWN = 2;
  let boxWidth = $state(0);
  const columns = $derived(Math.max(1, Math.floor((boxWidth - BOX_PADDING + CARD_GAP) / (CARD_WIDTH + CARD_GAP))));
  const visibleCount = $derived(columns * ROWS_SHOWN);

  // Two rows per page. A column-count change (resize, rotating a phone)
  // moves every page boundary, so stay on whichever page now holds the first
  // card that was showing rather than jumping back to page 1.
  let page = $state(1);
  let lastVisibleCount = 0;
  $effect.pre(() => {
    if (visibleCount === lastVisibleCount) return;
    if (lastVisibleCount) page = Math.floor(((untrack(() => page) - 1) * lastVisibleCount) / visibleCount) + 1;
    lastVisibleCount = visibleCount;
  });

  const API_BASE_URL = "https://cms.sgxp.me/api/sprites";

  // Fetch user's sprites
  // Only the newest request's result is used, so paging quickly can't
  // leave an older page's cards on screen.
  let latestRequest = 0;

  async function loadSprites() {
    const request = ++latestRequest;
    loading = true;
    error = null;

    try {
      // Fetch only as many sprites as will actually be shown (two rows at the
      // current column count) - see visibleCount above.
      const response = await fetch(
        `${API_BASE_URL}?where[author][equals]=${userId}&depth=1&limit=${visibleCount}&page=${page}&sort=-createdAt`
      );

      if (request !== latestRequest) return;
      if (response.ok) {
        const data = await response.json();
        if (request !== latestRequest) return;
        sprites = data.docs || [];
        totalSprites = data.totalDocs || 0;
      } else {
        error = 'Failed to load sprites';
      }
    } catch (err) {
      console.error('Error fetching sprites:', err);
      error = 'Failed to load sprites';
    } finally {
      if (request === latestRequest) loading = false;
    }
  }

  // Load sprites on mount, and whenever the column count (visibleCount)
  // changes - not on every resize pixel, since visibleCount only changes at
  // column-count thresholds.
  $effect(() => {
    visibleCount;
    page;
    loadSprites();
  });
</script>

<div class="profile-sprites-section">
  <div class="profile-sprites-header">
    <div class="profile-sprites-title">
      <Image class="w-5 h-5 inline-block mr-2" />
      {username}'s Sprites
      {#if totalSprites > 0}
        <span class="sprite-count">({totalSprites})</span>
      {/if}
    </div>
  </div>

  <div class="profile-sprites-box" bind:clientWidth={boxWidth}>
    <!-- At the top, like the sprites page's pagination. -->
    {#if totalSprites > visibleCount}
      <div class="profile-pagination">
        <NumberedPagination count={totalSprites} perPage={visibleCount} bind:page />
      </div>
    {/if}

    <!-- Only the first load shows the loading message; changing pages keeps
         the current cards in place until the next page arrives, so the box
         doesn't collapse and regrow. -->
    {#if loading && sprites.length === 0}
      <div class="sprites-loading">
        <Spinner size={24} label={null} />
        <span>Loading sprites...</span>
      </div>
    {:else if error}
      <div class="sprites-error">
        <p>{error}</p>
      </div>
    {:else if sprites.length === 0}
      <div class="sprites-empty">
        <Image class="w-12 h-12 opacity-50" />
        <p>No sprites uploaded yet</p>
      </div>
    {:else}
      <div class="sprites-container">
        {#each sprites as sprite (sprite.id)}
          {@const text = spriteCardText(sprite)}
          <a
            href={`/sprites/${sprite.id}`}
            class="sprite-box sprite-glow"
            style={cardStyleFor(sprite)}
          >
            <!-- Star rating -->
            <div class="sprite-star-container">
              {#each Array.from({ length: 4 }) as _, index}
                <div class="sprite-star"></div>
              {/each}
            </div>

            <!-- Sprite number -->
            <div class="sprite-number">{@html text.number}</div>

            <!-- Sprite title -->
            <div class="sprite-title">
              <div id="author" class="sprite-text">{@html text.title}</div>
            </div>

            <!-- Sprite image -->
            <div class="sprite-image">
              <img
                src={sprite.iconImage?.url || sprite.image?.url || 'https://via.placeholder.com/150'}
                alt={sprite.iconImage?.alt || `Sprite icon for ${sprite.title}`}
                loading="lazy"
              />
            </div>

            <!-- Author -->
            <div class="sprite-author">
              <div class="sprite-text">{@html text.author}</div>
            </div>

            <!-- Game name -->
            <div class="sprite-stats">
              <div class="sprite-text">{@html text.gameName}</div>
            </div>

            <!-- Block type -->
            <div class="sprite-stats">
              <div class="sprite-text">{@html text.dimensions}</div>
            </div>

            <!-- Date -->
            <div class="sprite-stats">
              <div class="sprite-text">{@html text.createdDate}</div>
            </div>

            <!-- File size -->
            <div class="sprite-stats">
              <div class="sprite-text">{@html text.fileSize}</div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Bottom padding leaves room for the buttons' block shadows. */
  .profile-pagination {
    display: flex;
    justify-content: center;
    padding: 0 0 20px;
  }

  .profile-sprites-section {
    margin-bottom: var(--gap);
  }

  .profile-sprites-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 15px 3px 10px;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .profile-sprites-title {
    display: flex;
    align-items: center;
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .sprite-count {
    font-weight: 800;
    font-size: 18px;
    margin-left: 8px;
  }

  .profile-sprites-box {
    background: var(--page-color);
    padding: 15px 15px 30px 15px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    color: var(--font-color);
    min-height: 220px;
    position: relative;
    z-index: 1;
  }

  /* Sprites Container - using sprite-box cards */
  .sprites-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, 117px);
    grid-gap: 20px;
    justify-content: center;
    align-content: flex-start;
  }

  /* States */
  .sprites-loading,
  .sprites-error,
  .sprites-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
  }

  .sprites-loading {
    color: var(--font-color);
  }

  .sprites-loading span {
    font-family: 'saira';
    font-size: 14px;
    opacity: 0.7;
  }

  .sprites-error {
    color: #ff4444;
  }

  .sprites-error p {
    font-family: 'saira';
    font-size: 14px;
    margin: 0;
  }

  .sprites-empty {
    color: var(--font-color);
  }

  .sprites-empty p {
    font-family: 'saira';
    font-size: 14px;
    opacity: 0.5;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .profile-sprites-header {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      padding-left: 1rem !important;
      padding-right: 1rem !important;
      box-shadow: none !important;
    }

    .profile-sprites-box {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }
  }

  /* Spin animation for loader */</style>
