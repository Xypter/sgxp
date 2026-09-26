<script lang="ts">
  import { untrack } from 'svelte';
  import { Heart, Image } from 'lucide-svelte';
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
  let favorites = $state<ProfileSprite[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let totalFavorites = $state(0);

  // Cards are shown two full rows deep, however many columns actually fit the
  // measured container width - no pagination, cards just disappear as the
  // viewport narrows and fewer columns fit. Matches the .favorites-container
  // grid's own `repeat(auto-fill, 117px)` + `grid-gap: 20px` sizing so the
  // column count we fetch for is the column count that actually renders.
  // Measured on .profile-favorites-box (always mounted, unlike
  // .favorites-container which only exists once favorites have loaded) -
  // BOX_PADDING is its left+right padding (15px each) that isn't available
  // to the grid itself.
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

  const API_BASE_URL = "https://cms.sgxp.me/api";

  // Fetch user's favorite sprites
  // Only the newest request's result is used, so paging quickly can't
  // leave an older page's cards on screen.
  let latestRequest = 0;

  async function loadFavorites() {
    const request = ++latestRequest;
    loading = true;
    error = null;

    try {
      // Fetch only as many favorites as will actually be shown (two rows at
      // the current column count) - see visibleCount above.
      const response = await fetch(
        `${API_BASE_URL}/favorites?where[user][equals]=${userId}&where[favoritedItem.relationTo][equals]=sprites&depth=3&limit=${visibleCount}&page=${page}&sort=-createdAt`
      );

      if (request !== latestRequest) return;
      if (response.ok) {
        const data = await response.json();
        if (request !== latestRequest) return;
        const favoriteDocs = data.docs || [];

        // Extract sprites from favorites (favoritedItem is polymorphic)
        // Filter for sprite favorites and extract the sprite from favoritedItem.value
        favorites = favoriteDocs
          .filter((fav: any) => fav.favoritedItem?.relationTo === 'sprites')
          .map((fav: any) => fav.favoritedItem?.value)
          .filter((sprite: any) => sprite && typeof sprite === 'object');

        // Use server's totalDocs since we're filtering sprite favorites on the server
        totalFavorites = data.totalDocs || 0;
      } else {
        error = 'Failed to load favorites';
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      error = 'Failed to load favorites';
    } finally {
      if (request === latestRequest) loading = false;
    }
  }

  // Load favorites on mount, and whenever the column count (visibleCount)
  // changes - not on every resize pixel, since visibleCount only changes at
  // column-count thresholds.
  $effect(() => {
    visibleCount;
    page;
    loadFavorites();
  });
</script>

<div class="profile-favorites-section">
  <div class="profile-favorites-header">
    <div class="profile-favorites-title">
      <Heart class="w-5 h-5 inline-block mr-2" />
      {username}'s Favorites
      {#if totalFavorites > 0}
        <span class="favorites-count">({totalFavorites})</span>
      {/if}
    </div>
  </div>

  <div class="profile-favorites-box" bind:clientWidth={boxWidth}>
    <!-- At the top, like the sprites page's pagination. -->
    {#if totalFavorites > visibleCount}
      <div class="profile-pagination">
        <NumberedPagination count={totalFavorites} perPage={visibleCount} bind:page />
      </div>
    {/if}

    <!-- Only the first load shows the loading message; changing pages keeps
         the current cards in place until the next page arrives, so the box
         doesn't collapse and regrow. -->
    {#if loading && favorites.length === 0}
      <div class="favorites-loading">
        <Spinner size={24} label={null} />
        <span>Loading favorites...</span>
      </div>
    {:else if error}
      <div class="favorites-error">
        <p>{error}</p>
      </div>
    {:else if favorites.length === 0}
      <div class="favorites-empty">
        <Heart class="w-12 h-12 opacity-50" />
        <p>No favorites yet</p>
        <span class="favorites-hint">Favorite sprites will appear here</span>
      </div>
    {:else}
      <div class="favorites-container">
        {#each favorites as sprite (sprite.id)}
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

  .profile-favorites-section {
    margin-bottom: var(--gap);
  }

  .profile-favorites-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 15px 3px 10px;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .profile-favorites-title {
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

  .favorites-count {
    font-weight: 800;
    font-size: 18px;
    margin-left: 8px;
  }

  .profile-favorites-box {
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

  /* Favorites Container - using sprite-box cards */
  .favorites-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, 117px);
    grid-gap: 20px;
    justify-content: center;
    align-content: flex-start;
  }

  /* States */
  .favorites-loading,
  .favorites-error,
  .favorites-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
  }

  .favorites-loading {
    color: var(--font-color);
  }

  .favorites-loading span {
    font-family: 'saira';
    font-size: 14px;
    opacity: 0.7;
  }

  .favorites-error {
    color: #ff4444;
  }

  .favorites-error p {
    font-family: 'saira';
    font-size: 14px;
    margin: 0;
  }

  .favorites-empty {
    color: var(--font-color);
  }

  .favorites-empty p {
    font-family: 'saira';
    font-size: 14px;
    opacity: 0.5;
    margin: 0;
  }

  .favorites-hint {
    font-family: 'saira';
    font-size: 12px;
    opacity: 0.4;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .profile-favorites-header {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      padding-left: 1rem !important;
      padding-right: 1rem !important;
      box-shadow: none !important;
    }

    .profile-favorites-box {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }
  }

  /* Spin animation for loader */</style>
