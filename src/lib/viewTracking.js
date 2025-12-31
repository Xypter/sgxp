/**
 * View Tracking Utility
 * Handles sprite view counting with localStorage throttling and best practices
 */

const VIEW_STORAGE_KEY = 'sgxp_viewed_sprites';
const VIEW_COUNT_STORAGE_KEY = 'sgxp_sprite_view_counts'; // Store actual view counts
const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const VIEW_DELAY_MS = 2000; // 2 seconds to ensure genuine view

/**
 * Check if a sprite view should be tracked based on localStorage cooldown
 * @param {string|number} spriteId - The sprite ID to check
 * @returns {boolean} - Whether the view should be tracked
 */
export function shouldTrackView(spriteId) {
  try {
    const viewedData = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) || '{}');
    const lastViewedAt = viewedData[spriteId];

    if (!lastViewedAt) return true;

    const timeSinceView = Date.now() - lastViewedAt;
    return timeSinceView > VIEW_COOLDOWN_MS;
  } catch {
    return true; // If localStorage fails, track the view
  }
}

/**
 * Mark a sprite as viewed in localStorage
 * @param {string|number} spriteId - The sprite ID to mark as viewed
 */
export function markAsViewed(spriteId) {
  try {
    const viewedData = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) || '{}');
    viewedData[spriteId] = Date.now();
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(viewedData));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get cached view count from localStorage
 * @param {string|number} spriteId - The sprite ID to get view count for
 * @returns {number|null} - The cached view count, or null if not found
 */
export function getCachedViewCount(spriteId) {
  try {
    const viewCounts = JSON.parse(localStorage.getItem(VIEW_COUNT_STORAGE_KEY) || '{}');
    return viewCounts[spriteId] ?? null;
  } catch {
    return null;
  }
}

/**
 * Store view count in localStorage
 * @param {string|number} spriteId - The sprite ID
 * @param {number} viewCount - The view count to store
 */
export function cacheViewCount(spriteId, viewCount) {
  try {
    const viewCounts = JSON.parse(localStorage.getItem(VIEW_COUNT_STORAGE_KEY) || '{}');
    viewCounts[spriteId] = viewCount;
    localStorage.setItem(VIEW_COUNT_STORAGE_KEY, JSON.stringify(viewCounts));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Track a sprite view with throttling, visibility check, and delay
 * @param {string|number} spriteId - The sprite ID to track
 * @returns {Promise<number|undefined>} - The current view count from server
 */
export async function trackSpriteView(spriteId) {
  // Check localStorage throttling
  const isThrottled = !shouldTrackView(spriteId);

  if (isThrottled) {
    // Still fetch current count to show latest views from other users
    try {
      const response = await fetch(`/api/proxy/sprites/${spriteId}`);

      if (response.ok) {
        const data = await response.json();
        const currentCount = data.doc?.views ?? data.views;

        // Update cache with latest count
        if (currentCount !== undefined) {
          cacheViewCount(spriteId, currentCount);
          return currentCount;
        }
      }
    } catch (error) {
      console.error('[View Tracking] Failed to fetch current view count:', error);
    }

    // Return cached count as fallback
    return getCachedViewCount(spriteId) ?? undefined;
  }

  // Don't track if tab is hidden
  if (document.hidden) {
    return;
  }

  // Wait 2 seconds to ensure user is actually viewing
  await new Promise(resolve => setTimeout(resolve, VIEW_DELAY_MS));

  // Check again if tab is still visible after delay
  if (document.hidden) {
    return;
  }

  try {
    // Use proxy endpoint to avoid CORS issues
    const response = await fetch(`/api/proxy/sprites/${spriteId}/view`, {
      method: 'POST',
    });

    if (response.ok) {
      markAsViewed(spriteId);
      const data = await response.json();
      const newCount = data.views;

      // Cache the view count for future reference
      cacheViewCount(spriteId, newCount);

      return newCount;
    }
  } catch (error) {
    console.error('[View Tracking] Failed to track view:', error);
  }
}
