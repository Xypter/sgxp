<script lang="ts">
  import { Image, Loader2 } from 'lucide-svelte';
  import { Pagination } from '$lib/components';
  import { charMap, altNumberMap } from '../../lib/charMap.js';

  // Props
  let {
    userId,
    username
  }: {
    userId: number;
    username: string;
  } = $props();

  // Extended interface with memoized sprite text conversions
  interface SpriteWithMemoized {
    id: number;
    title: string;
    author: any;
    iconImage?: any;
    image?: any;
    section?: any;
    typeOfSheet?: any[];
    createdAt: string;
    _memoized?: {
      spriteNumber: any[];
      title: any[];
      author: any[];
      gameName: any[];
      blockType: any[];
      createdDate: any[];
      fileSize: any[];
    };
  }

  // State
  let sprites = $state<SpriteWithMemoized[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let totalSprites = $state(0);
  let currentPage = $state(1);

  const SPRITES_PER_PAGE = 8;
  const API_BASE_URL = "https://cms.sgxp.me/api/sprites";

  // Helper function to create individual character sprite
  function createCharacterSprite(char: string, characterMap: any, isAltNumberMap: boolean, index: number) {
    if (characterMap[char]) {
      const charData = characterMap[char];
      const width = charData.width;
      const height = charData.height;
      const offsetX = charData.offsetX || 0;
      const offsetY = charData.offsetY || 0;
      const marginRight = isAltNumberMap ? '0px' : '1px';

      return {
        key: `${char}-${index}`,
        style: `display: inline-block; width: ${width}px; height: ${height}px; background-image: url('https://i.imgur.com/DFC6vib.png'); background-size: 400px 14px; background-position: ${charData.x}px ${charData.y}px; margin-left: ${offsetX}px; margin-right: ${marginRight}; margin-top: ${offsetY}px;`
      };
    }
    return null;
  }

  // Helper function to generate sprite for a string of text
  function textToSprite(text: string | null | undefined) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    const characters = text.toUpperCase().split('');
    return characters
      .map((char, index) => createCharacterSprite(char, charMap, false, index))
      .filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
  }

  // Helper function for formatting sprite count
  function count(number: number) {
    if (number <= 9) {
      return '0000' + number;
    } else if (number > 9 && number <= 99) {
      return '000' + number;
    } else if (number > 99 && number <= 999) {
      return '00' + number;
    } else if (number > 999 && number <= 9999) {
      return '0' + number;
    } else {
      return number.toString();
    }
  }

  // Helper function to generate sprite for a formatted number string
  function formattedNumberToAltSprite(numString: string | null | undefined) {
    if (!numString || typeof numString !== 'string') {
      return [];
    }
    const digits = numString.split('');
    return digits
      .map((digit, index) => createCharacterSprite(digit, altNumberMap, true, index))
      .filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
  }

  // Format bytes for display
  function formatBytes(bytes: number, decimals: number = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // Enhanced text to sprite with word wrapping and truncation
  function textToSpriteWithWrapping(text: string | null | undefined, characterMap: any, maxWidth: number | null = null, maxLines: number | null = null) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    const input = text.toString().toUpperCase();
    const isAltNumberMap = characterMap === altNumberMap;

    if (!maxWidth) {
      const characters = input.split('');
      return characters
        .map((char, index) => createCharacterSprite(char, characterMap, isAltNumberMap, index))
        .filter((item): item is NonNullable<ReturnType<typeof createCharacterSprite>> => item !== null);
    }

    const words = input.split(' ');
    const result: any[] = [];
    let currentLineWidth = 0;
    let currentLine = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordChars = word.split('');
      let wordWidth = 0;

      for (const char of wordChars) {
        const charData = characterMap[char];
        if (charData) {
          wordWidth += charData.width + (isAltNumberMap ? 0 : 1);
        }
      }

      const spaceWidth = characterMap[' ']?.width || 3;
      const needsSpace = i > 0 && currentLineWidth > 0;
      const totalWidth = wordWidth + (needsSpace ? spaceWidth : 0);

      if (currentLineWidth + totalWidth > maxWidth && currentLineWidth > 0) {
        if (maxLines && currentLine >= maxLines - 1) {
          break;
        }
        result.push({ isNewline: true, key: `newline-${currentLine}` });
        currentLine++;
        currentLineWidth = 0;
      } else if (needsSpace) {
        const spaceSprite = createCharacterSprite(' ', characterMap, isAltNumberMap, result.length);
        if (spaceSprite) {
          result.push(spaceSprite);
          currentLineWidth += spaceWidth;
        }
      }

      for (let j = 0; j < wordChars.length; j++) {
        const char = wordChars[j];
        const sprite = createCharacterSprite(char, characterMap, isAltNumberMap, result.length);
        if (sprite) {
          result.push(sprite);
          const charData = characterMap[char];
          if (charData) {
            currentLineWidth += charData.width + (isAltNumberMap ? 0 : 1);
          }
        }
      }
    }

    return result;
  }

  // Memoize text-to-sprite conversions for performance
  function memoizeSpriteText(sprite: SpriteWithMemoized): void {
    if (sprite._memoized) return;

    sprite._memoized = {
      spriteNumber: formattedNumberToAltSprite(count(sprite.id)),
      title: textToSpriteWithWrapping(sprite.title || '', charMap, 100, 2),
      author: textToSprite(sprite.author?.displayName || sprite.author?.username || ''),
      gameName: textToSpriteWithWrapping(sprite.section?.name || '', charMap, 150, 1),
      blockType: textToSprite(sprite.image?.width && sprite.image?.height ? `${sprite.image.width} X ${sprite.image.height}` : ''),
      createdDate: textToSprite(sprite.createdAt ? new Date(sprite.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }) : ''),
      fileSize: textToSprite(sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes')
    };
  }

  // Fetch user's sprites
  async function loadSprites() {
    loading = true;
    error = null;

    try {
      // Fetch sprites where the user is the author with pagination
      const response = await fetch(
        `${API_BASE_URL}?where[author][equals]=${userId}&depth=1&limit=${SPRITES_PER_PAGE}&page=${currentPage}&sort=-createdAt`
      );

      if (response.ok) {
        const data = await response.json();
        sprites = data.docs || [];
        totalSprites = data.totalDocs || 0;

        // Memoize sprites for charMap rendering
        sprites.forEach(sprite => memoizeSpriteText(sprite));
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

  // Derived values
  const pageCount = $derived(Math.ceil(totalSprites / SPRITES_PER_PAGE));

  // Load sprites when component mounts or page changes
  $effect(() => {
    // Re-run when currentPage changes
    currentPage;
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
        {#each sprites as sprite (sprite.id)}
          <a
            href={`/sprites/${sprite.id}`}
            class="sprite-box sprite-glow"
          >
            <!-- Star rating -->
            <div class="sprite-star-container">
              {#each Array.from({ length: 4 }) as _, index}
                <div class="sprite-star"></div>
              {/each}
            </div>

            <!-- Sprite number -->
            <div class="sprite-number">
              {#each sprite._memoized?.spriteNumber || [] as item (item.key)}
                <span style={item.style}></span>
              {/each}
            </div>

            <!-- Sprite title -->
            <div class="sprite-title">
              <div id="author" class="sprite-text">
                {#each sprite._memoized?.title || [] as item (item.key)}
                  {#if item.isNewline}
                    <div class="sprite-newline" style="display: block; width: 100%;"></div>
                  {:else}
                    <span style={item.style}></span>
                  {/if}
                {/each}
              </div>
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
              <div class="sprite-text">
                {#each sprite._memoized?.author || [] as item (item.key)}
                  <span style={item.style}></span>
                {/each}
              </div>
            </div>

            <!-- Game name -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {#each sprite._memoized?.gameName || [] as item (item.key)}
                  {#if item.isNewline}
                    <div class="sprite-newline" style="display: block; width: 100%;"></div>
                  {:else}
                    <span style={item.style}></span>
                  {/if}
                {/each}
              </div>
            </div>

            <!-- Block type -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {#each sprite._memoized?.blockType || [] as item (item.key)}
                  <span style={item.style}></span>
                {/each}
              </div>
            </div>

            <!-- Date -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {#each sprite._memoized?.createdDate || [] as item (item.key)}
                  <span style={item.style}></span>
                {/each}
              </div>
            </div>

            <!-- File size -->
            <div class="sprite-stats">
              <div class="sprite-text">
                {#each sprite._memoized?.fileSize || [] as item (item.key)}
                  <span style={item.style}></span>
                {/each}
              </div>
            </div>
          </a>
        {/each}
      </div>

      {#if pageCount > 1}
        <div class="sprites-pagination">
          <Pagination.Root bind:page={currentPage} count={totalSprites} perPage={SPRITES_PER_PAGE} siblingCount={1}>
            {#snippet children({ pages })}
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.PrevButton disabled={loading || currentPage === 1} />
                </Pagination.Item>
                {#each pages as page (page.key)}
                  {#if page.type === 'ellipsis'}
                    <Pagination.Item>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  {:else}
                    <Pagination.Item>
                      <Pagination.Link {page} isActive={page.value === currentPage} disabled={loading} />
                    </Pagination.Item>
                  {/if}
                {/each}
                <Pagination.Item>
                  <Pagination.NextButton disabled={loading || currentPage === pageCount} />
                </Pagination.Item>
              </Pagination.Content>
            {/snippet}
          </Pagination.Root>
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

  /* Pagination */
  .sprites-pagination {
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
