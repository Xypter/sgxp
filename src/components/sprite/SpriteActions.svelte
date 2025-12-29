<script>
  // Import Svelte utilities
  import { untrack } from 'svelte';

  // Import Lucide icons
  import { Heart, Bookmark } from 'lucide-svelte';

  // Import toast notifications
  import { toast } from 'svelte-sonner';

  // Props
  let {
    spriteId,
    sprite = null,
    user = null
  } = $props();

  // State
  let isLiked = $state(false);
  let isFavorited = $state(false);
  // Initialize counts from sprite prop to prevent layout shift
  let likeCount = $state(sprite?.likeCount ?? 0);
  let favoriteCount = $state(sprite?.favoriteCount ?? 0);

  const API_BASE_URL = "/api";

  // Track previous user to detect when user becomes available
  let previousUser = $state(user);

  // Fetch sprite counts (always fetch, regardless of user login status)
  async function fetchSpriteCounts() {
    if (!spriteId) return;

    try {
      const spriteResponse = await fetch(`${API_BASE_URL}/sprites/${spriteId}?depth=0`);

      if (spriteResponse.ok) {
        const spriteData = await spriteResponse.json();
        likeCount = spriteData.likeCount || 0;
        favoriteCount = spriteData.favoriteCount || 0;
      }
    } catch (err) {
      console.error('Failed to fetch sprite counts:', err);
    }
  }

  // Check if user has liked/favorited this sprite (only for logged-in users)
  async function checkUserActions() {
    if (!user || !spriteId) {
      // Reset user-specific state if no user
      isLiked = false;
      isFavorited = false;
      return;
    }

    try {
      // Fetch user likes and favorites
      const [likesResponse, favoritesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/likes?where[user][equals]=${user.id}&limit=1000&depth=0`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/favorites?where[user][equals]=${user.id}&limit=1000&depth=0`, {
          credentials: 'include'
        })
      ]);

      if (likesResponse.ok) {
        const likesData = await likesResponse.json();
        const spriteLike = likesData.docs.find(like => {
          if (like.likedItem?.relationTo !== 'sprites') return false;
          const likedSpriteId = typeof like.likedItem.value === 'object'
            ? like.likedItem.value.id
            : like.likedItem.value;
          return likedSpriteId === parseInt(spriteId, 10);
        });
        isLiked = !!spriteLike;
      }

      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        const spriteFavorite = favoritesData.docs.find(fav => {
          if (fav.favoritedItem?.relationTo !== 'sprites') return false;
          const favoritedSpriteId = typeof fav.favoritedItem.value === 'object'
            ? fav.favoritedItem.value.id
            : fav.favoritedItem.value;
          return favoritedSpriteId === parseInt(spriteId, 10);
        });
        isFavorited = !!spriteFavorite;
      }
    } catch (err) {
      console.error('Failed to check user actions:', err);
    }
  }


  // Like/Unlike sprite
  async function toggleLike() {
    if (!user) {
      toast.error('Please log in to like sprites');
      return;
    }

    // Store previous state for potential rollback
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // OPTIMISTIC UPDATE
    isLiked = !isLiked;
    likeCount = Math.max(0, likeCount + (isLiked ? 1 : -1));

    try {
      // Check current server status
      const checkResponse = await fetch(
        `${API_BASE_URL}/likes?where[user][equals]=${user.id}&limit=1000&depth=0`,
        { credentials: 'include' }
      );

      if (!checkResponse.ok) {
        throw new Error('Failed to check like status');
      }

      const checkData = await checkResponse.json();
      const existingLike = checkData.docs.find(like => {
        if (like.likedItem?.relationTo !== 'sprites') return false;
        const likedSpriteId = typeof like.likedItem.value === 'object'
          ? like.likedItem.value.id
          : like.likedItem.value;
        return likedSpriteId === parseInt(spriteId, 10);
      });

      const isLikedOnServer = !!existingLike;

      // Perform the action that matches our optimistic update
      if (isLiked && !isLikedOnServer) {
        // We want to like it and it's not liked on server - POST
        const response = await fetch(`${API_BASE_URL}/likes`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user.id,
            likedItem: {
              relationTo: 'sprites',
              value: parseInt(spriteId, 10)
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to like sprite');
        }
      } else if (!isLiked && isLikedOnServer) {
        // We want to unlike it and it's liked on server - DELETE
        const response = await fetch(`${API_BASE_URL}/likes/${existingLike.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to unlike sprite');
        }
      }
    } catch (err) {
      // ROLLBACK: Revert to previous state on error
      isLiked = previousLiked;
      likeCount = previousCount;

      console.error('Error toggling like:', err);
      toast.error(`Failed to ${isLiked ? 'unlike' : 'like'} sprite`, {
        description: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Favorite/Unfavorite sprite
  async function toggleFavorite() {
    if (!user) {
      toast.error('Please log in to favorite sprites');
      return;
    }

    // Store previous state for potential rollback
    const previousFavorited = isFavorited;
    const previousCount = favoriteCount;

    // OPTIMISTIC UPDATE
    isFavorited = !isFavorited;
    favoriteCount = Math.max(0, favoriteCount + (isFavorited ? 1 : -1));

    try {
      // Check current server status
      const checkResponse = await fetch(
        `${API_BASE_URL}/favorites?where[user][equals]=${user.id}&limit=1000&depth=0`,
        { credentials: 'include' }
      );

      if (!checkResponse.ok) {
        throw new Error('Failed to check favorite status');
      }

      const checkData = await checkResponse.json();
      const existingFavorite = checkData.docs.find(fav => {
        if (fav.favoritedItem?.relationTo !== 'sprites') return false;
        const favoritedSpriteId = typeof fav.favoritedItem.value === 'object'
          ? fav.favoritedItem.value.id
          : fav.favoritedItem.value;
        return favoritedSpriteId === parseInt(spriteId, 10);
      });

      const isFavoritedOnServer = !!existingFavorite;

      // Perform the action that matches our optimistic update
      if (isFavorited && !isFavoritedOnServer) {
        // We want to favorite it and it's not favorited on server - POST
        const response = await fetch(`${API_BASE_URL}/favorites`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user.id,
            favoritedItem: {
              relationTo: 'sprites',
              value: parseInt(spriteId, 10)
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to favorite sprite');
        }
      } else if (!isFavorited && isFavoritedOnServer) {
        // We want to unfavorite it and it's favorited on server - DELETE
        const response = await fetch(`${API_BASE_URL}/favorites/${existingFavorite.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to unfavorite sprite');
        }
      }
    } catch (err) {
      // ROLLBACK: Revert to previous state on error
      isFavorited = previousFavorited;
      favoriteCount = previousCount;

      console.error('Error toggling favorite:', err);
      toast.error(`Failed to ${isFavorited ? 'unfavorite' : 'favorite'} sprite`, {
        description: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Track previous sprite ID to detect when it changes
  let previousSpriteId = $state(spriteId);

  // Re-check counts and user actions when sprite or user changes
  $effect(() => {
    // Track both spriteId and user dependencies
    const currentSpriteId = spriteId;
    const currentUser = user;

    // Reset state if sprite changed
    if (currentSpriteId !== previousSpriteId) {
      isLiked = false;
      isFavorited = false;
      // Use sprite's initial counts to prevent layout shift
      likeCount = sprite?.likeCount ?? 0;
      favoriteCount = sprite?.favoriteCount ?? 0;

      previousSpriteId = currentSpriteId;
    }

    // Always fetch counts when sprite changes (works for all users, logged in or not)
    if (currentSpriteId) {
      fetchSpriteCounts();
    }

    // Check user's like/favorite status (only for logged-in users)
    if (currentSpriteId && currentUser) {
      checkUserActions();
    } else if (currentSpriteId && !currentUser) {
      // Not logged in - reset user-specific state
      isLiked = false;
      isFavorited = false;
    }
  });
</script>

<div class="sprite-actions">
  <button
    class="sprite-action-btn {isLiked ? 'liked' : ''}"
    onclick={toggleLike}
    title={isLiked ? 'Unlike' : 'Like'}
  >
    <Heart class="h-6 w-6" fill={isLiked ? 'currentColor' : 'none'} />
    <span class="action-count">{likeCount}</span>
  </button>

  <button
    class="sprite-action-btn {isFavorited ? 'favorited' : ''}"
    onclick={toggleFavorite}
    title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
  >
    <Bookmark class="h-6 w-6" fill={isFavorited ? 'currentColor' : 'none'} />
    <span class="action-count">{favoriteCount}</span>
  </button>
</div>

<style>
  .sprite-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
  }

  .sprite-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    border: none;
    font-family: 'saira', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
  }

  .sprite-action-btn:hover {
    background: color-mix(in srgb, var(--page-color) 85%, white);
  }

  .sprite-action-btn.liked,
  .sprite-action-btn.favorited {
    color: var(--font-link-color);
  }

  .action-count {
    font-size: 14px;
    font-weight: 600;
    font-family: 'saira', monospace;
  }
</style>
