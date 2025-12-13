<script lang="ts">
  import { Image, ChevronRight, Loader2 } from 'lucide-svelte';
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
  let sprites = $state<any[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let totalSprites = $state(0);
  let showAll = $state(false);

  const INITIAL_DISPLAY_COUNT = 7;
  const API_BASE_URL = "https://cms.sgxp.me/api/sprites";

  // Fetch user's sprites
  async function loadSprites() {
    loading = true;
    error = null;

    try {
      // Fetch sprites where the user is a contributor
      const response = await fetch(
        `${API_BASE_URL}?where[contributors][in]=${userId}&depth=1&limit=50&sort=-createdAt`
      );

      if (response.ok) {
        const data = await response.json();
        sprites = data.docs || [];
        totalSprites = data.totalDocs || sprites.length;
      } else {
        error = 'Failed to load sprites';
      }
    } catch (err) {
      console.error('Error fetching sprites:', err);
      error = 'Failed to load sprites';
    } finally {
      loading = false;
    }
  }

  // Displayed sprites (limited or all)
  const displayedSprites = $derived(
    showAll ? sprites : sprites.slice(0, INITIAL_DISPLAY_COUNT)
  );

  // Get sprite icon URL
  function getSpriteIconUrl(sprite: any): string | null {
    if (sprite?.iconImage?.url) {
      return sprite.iconImage.url;
    }
    if (sprite?.image?.url) {
      return sprite.image.url;
    }
    return null;
  }

  // Get game name
  function getGameName(sprite: any): string {
    if (sprite?.styleGame?.name) return sprite.styleGame.name;
    if (sprite?.sourceGame?.name) return sprite.sourceGame.name;
    return 'Unknown';
  }

  // Get author name
  function getAuthorName(sprite: any): string {
    if (sprite?.author?.displayName) return sprite.author.displayName;
    if (sprite?.author?.username) return sprite.author.username;
    return 'Unknown';
  }

  // Format date short
  function formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  }

  // Navigate to sprite page
  function viewSprite(spriteId: number, event: MouseEvent) {
    event.preventDefault();
    window.location.href = `/sprites?view=${spriteId}`;
  }

  // View all sprites
  function viewAllSprites() {
    window.location.href = `/sprites?contributor=${userId}`;
  }

  $effect(() => {
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
    {#if totalSprites > INITIAL_DISPLAY_COUNT}
      <button class="view-all-btn" onclick={viewAllSprites}>
        View All
        <ChevronRight class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <div class="profile-sprites-box">
    {#if loading}
      <div class="sprites-loading">
        <Loader2 class="w-6 h-6 animate-spin" />
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
        {#each displayedSprites as sprite (sprite.id)}
          <a
            href={`/sprites/${sprite.id}`}
            class="sprite-box sprite-glow"
            onclick={(e) => viewSprite(sprite.id, e)}
          >
            <!-- Star rating -->
            <div class="sprite-star-container">
              {#each Array.from({ length: 4 }) as _, index}
                <div class="sprite-star"></div>
              {/each}
            </div>

            <!-- Sprite number -->
            <div class="sprite-number">
              #{sprite.id}
            </div>

            <!-- Sprite title -->
            <div class="sprite-title">
              <div class="sprite-text">
                {sprite.title}
              </div>
            </div>

            <!-- Sprite image -->
            <div class="sprite-image">
              {#if getSpriteIconUrl(sprite)}
                <img
                  src={getSpriteIconUrl(sprite)}
                  alt={sprite.title}
                  loading="lazy"
                />
              {:else}
                <div class="sprite-no-image">
                  <Image class="w-8 h-8" />
                </div>
              {/if}
            </div>

            <!-- Author -->
            <div class="sprite-author">
              <div class="sprite-text">
                {getAuthorName(sprite)}
              </div>
            </div>

            <!-- Game name -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {getGameName(sprite)}
              </div>
            </div>

            <!-- Date -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {formatDateShort(sprite.createdAt)}
              </div>
            </div>
          </a>
        {/each}
      </div>

      {#if sprites.length > INITIAL_DISPLAY_COUNT && !showAll}
        <div class="sprites-more">
          <Button
            themed
            onclick={() => showAll = true}
          >
            Show {sprites.length - INITIAL_DISPLAY_COUNT} More
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
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

  /* Sprite Box Card - matches SpriteBrowser style */
  .sprite-box {
    --multiplication-factor: 1;
    width: calc(117px * var(--multiplication-factor));
    height: calc(192px * var(--multiplication-factor));
    background-image: url("/img/spriteicon/icon_image.png");
    user-select: none;
    transition: transform ease-in-out .2s;
    text-decoration: none;
    border-radius: 4px;
    box-shadow: var(--box-shadow);
    animation: fadein-top .5s;
    transform: translateY(calc(-.1px * var(--multiplication-factor)));
    position: relative;
    display: block;
  }

  .sprite-box::before {
    content: "";
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border-radius: 4px;
    box-shadow:
      1px 0px 0 #22ff80,
      1px 1px 0 #22ff80,
      0px 1px 0 #22ff80,
      -1px 0px 0 #22ff80,
      -1px -1px 0 #22ff80,
      0px -1px 0 #22ff80,
      1px -1px 0 #22ff80,
      -1px 1px 0 #22ff80;
    opacity: 0;
    transition: opacity .1s ease-in-out;
    pointer-events: none;
    z-index: -1;
  }

  .sprite-box:hover::before {
    opacity: 1;
  }

  .sprite-box:hover {
    transform: translateY(-3px);
  }

  /* Star container */
  .sprite-star-container {
    display: flex;
    margin-left: calc(6px * var(--multiplication-factor));
    margin-top: calc(3px * var(--multiplication-factor));
    margin-bottom: calc(-9px * var(--multiplication-factor));
    width: calc(70px * var(--multiplication-factor));
  }

  .sprite-star {
    background-image: url("/img/spriteicon/star.svg");
    height: calc(6px * var(--multiplication-factor));
    width: calc(7px * var(--multiplication-factor));
  }

  .sprite-star:nth-child(n + 2) {
    margin-left: calc(-1px * var(--multiplication-factor));
  }

  /* Sprite number */
  .sprite-number {
    font-family: 'saira';
    font-weight: 700;
    font-style: normal;
    font-size: calc(9px * var(--multiplication-factor));
    user-select: none;
    display: flex;
    justify-content: right;
    line-height: 1;
    margin-right: calc(5px * var(--multiplication-factor));
    margin-top: calc(3px * var(--multiplication-factor));
    color: white;
    text-shadow: 1px 0px #002806, 0px 1px #002806, 1px 1px #002806;
  }

  /* Sprite text */
  .sprite-text {
    font-family: 'saira';
    font-weight: 500;
    font-style: normal;
    user-select: none;
    font-size: calc(10px * var(--multiplication-factor));
    line-height: calc(8px * var(--multiplication-factor));
    text-align: center;
    color: white;
    text-shadow: 1px 0px #4b4b54, 0px 1px #4b4b54, 1px 1px #4b4b54;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Sprite title */
  .sprite-title {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: calc(4px * var(--multiplication-factor));
    margin-left: calc(5px * var(--multiplication-factor));
    margin-right: calc(10px * var(--multiplication-factor));
    height: calc(15px * var(--multiplication-factor));
    width: calc(109px * var(--multiplication-factor));
    overflow: hidden;
  }

  /* Sprite image */
  .sprite-image {
    display: flex;
    justify-content: center;
    align-items: center;
    image-rendering: pixelated;
    margin-top: calc(7px * var(--multiplication-factor));
    margin-left: calc(7px * var(--multiplication-factor));
    margin-right: calc(7px * var(--multiplication-factor));
    object-fit: cover;
    overflow: hidden;
    width: calc(103px * var(--multiplication-factor));
    height: calc(85px * var(--multiplication-factor));
    background: url("/img/spriteicon/white-bg.png"),
                linear-gradient(0deg,#002705 0%, #12a740 100%);
    background-blend-mode: overlay;
    background-position: left 0px bottom 0px;
  }

  .sprite-box:hover .sprite-image {
    animation: 200s grid-para infinite linear;
  }

  @keyframes grid-para {
    100% {
      background-position: left -3000px bottom 0px;
    }
  }

  .sprite-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(10px 10px 0px rgba(0,0,0,0.7));
    image-rendering: pixelated;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  .sprite-no-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: white;
    opacity: 0.5;
  }

  /* Sprite author */
  .sprite-author {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: calc(0px * var(--multiplication-factor));
    margin-left: calc(13px * var(--multiplication-factor));
    margin-right: calc(12px * var(--multiplication-factor));
    margin-bottom: calc(0px * var(--multiplication-factor));
    height: calc(18px * var(--multiplication-factor));
    width: calc(93px * var(--multiplication-factor));
    overflow: hidden;
  }

  /* Sprite stats */
  .sprite-stats {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    margin-top: calc(5px * var(--multiplication-factor));
    margin-left: calc(24px * var(--multiplication-factor));
    margin-right: calc(3px * var(--multiplication-factor));
    width: calc(90px * var(--multiplication-factor));
    height: calc(10px * var(--multiplication-factor));
    overflow: hidden;
  }

  @keyframes fadein-top {
    0% { opacity: 0; transform: translateY(-20px);}
    50% { opacity: 0; transform: translateY(-20px);}
    100% { opacity: 1; transform: translateY(0); }
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

  /* More Button */
  .sprites-more {
    display: flex;
    justify-content: center;
    padding-top: 15px;
    margin-top: 15px;
    border-top: 1px solid color-mix(in srgb, var(--page-color) 70%, white);
  }

  /* Responsive */
  @media (max-width: 600px) {
    .sprites-container {
      grid-template-columns: repeat(2, 117px);
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
