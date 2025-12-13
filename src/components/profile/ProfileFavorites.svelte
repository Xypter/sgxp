<script lang="ts">
  import { Heart, ChevronRight, Loader2, Image } from 'lucide-svelte';
  import { Button } from '$lib/components';

  // Props
  let {
    userId,
    username
  }: {
    userId: number;
    username: string;
  } = $props();

  // State
  let favorites = $state<any[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let totalFavorites = $state(0);
  let showAll = $state(false);

  const INITIAL_DISPLAY_COUNT = 6;
  const API_BASE_URL = "https://cms.sgxp.me/api";

  // Fetch user's favorite sprites
  async function loadFavorites() {
    loading = true;
    error = null;

    try {
      // TODO: Update this endpoint when favorites API is available
      // For now, return empty array
      favorites = [];
      totalFavorites = 0;

      // Future implementation:
      // const response = await fetch(
      //   `${API_BASE_URL}/favorites?where[user][equals]=${userId}&depth=2&limit=50&sort=-createdAt`
      // );
      // if (response.ok) {
      //   const data = await response.json();
      //   favorites = data.docs || [];
      //   totalFavorites = data.totalDocs || favorites.length;
      // }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      error = 'Failed to load favorites';
    } finally {
      loading = false;
    }
  }

  // Displayed favorites (limited or all)
  const displayedFavorites = $derived(
    showAll ? favorites : favorites.slice(0, INITIAL_DISPLAY_COUNT)
  );

  // Get sprite thumbnail URL
  function getSpriteUrl(sprite: any): string | null {
    if (sprite?.image?.thumbnailURL) {
      return sprite.image.thumbnailURL;
    }
    if (sprite?.image?.url) {
      return sprite.image.url;
    }
    return null;
  }

  // Navigate to sprite page
  function viewSprite(spriteId: number) {
    window.location.href = `/sprites?view=${spriteId}`;
  }

  $effect(() => {
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
    {#if totalFavorites > INITIAL_DISPLAY_COUNT}
      <button class="view-all-btn" onclick={() => showAll = !showAll}>
        {showAll ? 'Show Less' : 'View All'}
        <ChevronRight class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <div class="profile-favorites-box">
    {#if loading}
      <div class="favorites-loading">
        <Loader2 class="w-6 h-6 animate-spin" />
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
      <div class="favorites-grid">
        {#each displayedFavorites as favorite}
          <button
            class="favorite-card"
            onclick={() => viewSprite(favorite.sprite?.id || favorite.id)}
          >
            <div class="favorite-thumbnail">
              {#if getSpriteUrl(favorite.sprite || favorite)}
                <img
                  src={getSpriteUrl(favorite.sprite || favorite)}
                  alt={favorite.sprite?.title || favorite.title}
                  loading="lazy"
                />
              {:else}
                <div class="favorite-no-image">
                  <Image class="w-8 h-8" />
                </div>
              {/if}
            </div>
            <div class="favorite-info">
              <span class="favorite-title">{favorite.sprite?.title || favorite.title}</span>
            </div>
          </button>
        {/each}
      </div>

      {#if favorites.length > INITIAL_DISPLAY_COUNT && !showAll}
        <div class="favorites-more">
          <Button themed onclick={() => showAll = true}>
            Show {favorites.length - INITIAL_DISPLAY_COUNT} More
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
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
    font-weight: 600;
    font-size: 14px;
    opacity: 0.7;
    margin-left: 8px;
  }

  .view-all-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    font-family: 'saira';
    font-weight: 700;
    font-size: 12px;
    color: var(--font-link-color);
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .view-all-btn:hover {
    opacity: 0.8;
  }

  .profile-favorites-box {
    background: var(--page-color);
    padding: 15px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    color: var(--font-color);
    min-height: 120px;
    position: relative;
    z-index: 1;
  }

  /* Favorites Grid */
  .favorites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }

  .favorite-card {
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    padding: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .favorite-card:hover {
    border-color: var(--font-link-color);
    transform: translateY(-2px);
  }

  .favorite-thumbnail {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .favorite-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  .favorite-no-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--font-color);
    opacity: 0.3;
  }

  .favorite-info {
    padding: 10px;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
  }

  .favorite-title {
    font-family: 'saira';
    font-weight: 700;
    font-size: 13px;
    color: var(--font-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
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

  /* More Button */
  .favorites-more {
    display: flex;
    justify-content: center;
    padding-top: 15px;
    margin-top: 15px;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
  }

  /* Responsive */
  @media (max-width: 600px) {
    .favorites-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Spin animation for loader */
  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
