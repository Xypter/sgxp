<script>
  // Import utility functions
  import { formatBytes, formatDate, getDisplayName, getUsername, getProfilePicture } from '$lib/spriteUtils';
  import { trackSpriteView, getCachedViewCount } from '$lib/viewTracking';

  // Import components
  import { Badge, Checkbox } from '$lib/components';

  // Props
  let { sprite } = $props();

  // Local view count state - prefer cached value over stale sprite.views
  let viewCount = $state(getCachedViewCount(sprite?.id) ?? sprite.views ?? 0);

  // Track the current sprite ID to detect when we switch to a different sprite
  let currentSpriteId = $state(sprite?.id);

  // Track view on mount with best practices and cleanup
  $effect(() => {
    // Only reset view count if we're viewing a DIFFERENT sprite (not just a re-render of the same one)
    if (sprite?.id !== currentSpriteId) {
      currentSpriteId = sprite.id;
      // Prefer cached value over stale sprite.views
      viewCount = getCachedViewCount(sprite.id) ?? sprite.views ?? 0;
    }

    // Flag to cancel previous tracking if sprite changes
    let cancelled = false;

    if (sprite?.id) {
      trackSpriteView(sprite.id).then((newCount) => {
        // Only update if this tracking wasn't cancelled by sprite change
        if (!cancelled && newCount !== undefined) {
          viewCount = newCount; // Update with server count
        }
      });
    }

    // Cleanup: cancel tracking if sprite changes before completion
    return () => {
      cancelled = true;
    };
  });
</script>

<!-- Information Section -->
<div class="sprite-info-section">
  <div class="sprite-info-title">Information</div>
  <div class="sprite-info-content">
    <!-- Author Info -->
    <div class="author-section">
      <div class="author-avatar">
        {#if getProfilePicture(sprite.author)}
          <img
            src={getProfilePicture(sprite.author)}
            alt={getDisplayName(sprite.author)}
          />
        {:else}
          <div class="avatar-placeholder">
            {getDisplayName(sprite.author)[0].toUpperCase()}
          </div>
        {/if}
      </div>
      <div class="author-details">
        <div class="author-name-row">
          <h3 class="author-name">
            <a href="/profile?id={sprite.author?.id}" class="author-link">
              {getDisplayName(sprite.author)}
            </a>
          </h3>
          <div class="author-badges">
            {#if sprite.author?.role && sprite.author.role !== 'user'}
              <!-- Show role badge only if role is NOT 'user' -->
              <Badge
                themed
                color={sprite.author.roleColor || '#888888'}
                class="author-role-badge"
              >
                {sprite.author.role}
              </Badge>
            {:else if sprite.author?.prestigeRole}
              <!-- Show prestige badge only if role IS 'user' -->
              <Badge
                themed
                color={sprite.author.prestigeColor || '#888888'}
                class="author-prestige-badge"
              >
                {sprite.author.prestigeRole}
              </Badge>
            {/if}
          </div>
        </div>
        {#if getUsername(sprite.author)}
          <p class="author-username">{getUsername(sprite.author)}</p>
        {/if}
        <p class="author-meta">
          Uploaded {formatDate(sprite.createdAt)}
        </p>
      </div>
    </div>

    <!-- Image Details Grid -->
    <div class="details-grid">
      <div class="detail-item">
        <h4>Dimensions</h4>
        <p>{sprite.image?.width || 0} × {sprite.image?.height || 0} px</p>
      </div>
      <div class="detail-item">
        <h4>File Size</h4>
        <p>{sprite.image?.filesize ? formatBytes(sprite.image.filesize) : '0 Bytes'}</p>
      </div>
      <div class="detail-item">
        <h4>Source Type</h4>
        <p>
          {#if sprite.styleSourceType === 'team'}
            Project Team
          {:else if sprite.styleSourceType === 'officialGame'}
            Official Game
          {:else if sprite.styleSourceType === 'fanGame'}
            Fan Game
          {:else if sprite.styleSourceType === 'series'}
            Series
          {:else if sprite.styleSourceType === 'custom'}
            Custom
          {:else}
            Unknown
          {/if}
        </p>
      </div>
      {#if sprite.styleSourceType && sprite.styleSourceType !== 'custom'}
        <div class="detail-item">
          <h4>
            {#if sprite.styleSourceType === 'team'}
              Project Team
            {:else if sprite.styleSourceType === 'officialGame'}
              Official Game
            {:else if sprite.styleSourceType === 'fanGame'}
              Fan Game
            {:else if sprite.styleSourceType === 'series'}
              Series
            {/if}
          </h4>
          <p>
            {#if sprite.styleSourceType === 'team'}
              {sprite.styleTeam?.name || 'Unknown Team'}
            {:else if sprite.styleSourceType === 'officialGame'}
              {sprite.styleOfficialGame?.name || 'Unknown Official Game'}
            {:else if sprite.styleSourceType === 'fanGame'}
              {sprite.styleFanGame?.name || 'Unknown Fan Game'}
            {:else if sprite.styleSourceType === 'series'}
              {sprite.styleSeries?.name || 'Unknown Series'}
            {/if}
          </p>
        </div>
      {/if}
      <div class="detail-item">
        <h4>Section</h4>
        <p>{sprite.section?.name || 'Unknown'}</p>
      </div>
      <div class="detail-item">
        <h4>Views</h4>
        <p>{viewCount.toLocaleString()}</p>
      </div>
    </div>

    <!-- Characters Section -->
    {#if sprite.characters && sprite.characters.length > 0}
      <div class="contributors-section">
        <h4>Characters</h4>
        <div class="contributors-list">
          {#each sprite.characters as character}
            <div class="contributor-item">
              <span>{character.name}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Contributors Section -->
    {#if sprite.contributors && sprite.contributors.length > 0}
      <div class="contributors-section">
        <h4>Contributors</h4>
        <div class="contributors-list">
          {#each sprite.contributors as contributor}
            <div class="contributor-item">
              {#if contributor.user}
                <a href="/profile?id={contributor.user.id}" class="contributor-link">
                  {contributor.name}
                </a>
              {:else}
                <span>{contributor.name}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Additional Credits Section -->
    {#if sprite.additionalCredits && sprite.additionalCredits.length > 0}
      <div class="contributors-section">
        <h4>Additional Credits</h4>
        <div class="contributors-list">
          {#each sprite.additionalCredits as credit}
            <div class="contributor-item">
              {#if credit.user}
                <a href="/profile?id={credit.user.id}" class="contributor-link">
                  {credit.name}
                </a>
              {:else}
                <span>{credit.name}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Description Section -->
    {#if sprite.description}
      <div class="description-section">
        <h4>Description</h4>
        <p class="description-text">{sprite.description}</p>
      </div>
    {/if}

    <!-- Terms of Use Section -->
    {#if sprite.termsOfUse && (sprite.termsOfUse.contactForPermissions || sprite.termsOfUse.informWhenUsed || sprite.termsOfUse.creditWhereUsed)}
      <div class="terms-section">
        <h4>Terms of Use</h4>
        <div class="terms-list">
          <div class="terms-item">
            <Checkbox themed checked={sprite.termsOfUse.contactForPermissions || false} disabled={true} />
            <div class="terms-label">
              <span class="terms-title">Contact for Permissions</span>
              <span class="terms-description">Users must contact the author before using this sprite</span>
            </div>
          </div>
          <div class="terms-item">
            <Checkbox themed checked={sprite.termsOfUse.informWhenUsed || false} disabled={true} />
            <div class="terms-label">
              <span class="terms-title">Inform When Used</span>
              <span class="terms-description">Users should inform the author when they use this sprite</span>
            </div>
          </div>
          <div class="terms-item">
            <Checkbox themed checked={sprite.termsOfUse.creditWhereUsed || false} disabled={true} />
            <div class="terms-label">
              <span class="terms-title">Credit Where Used</span>
              <span class="terms-description">Users must credit the author when using this sprite</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
