<script>
  // Import utility functions
  import { formatBytes, formatDate, getDisplayName, getProfilePicture } from '$lib/spriteUtils';

  // Props
  let { sprite } = $props();
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
        <h3 class="author-name">
          {getDisplayName(sprite.author)}
        </h3>
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
        <h4>Style</h4>
        <p>{sprite.styleGame?.name || 'Unknown'}</p>
      </div>
      <div class="detail-item">
        <h4>Source</h4>
        <p>
          {#if sprite.sourceType === 'game'}
            {sprite.sourceGame?.name || 'Unknown'}
          {:else if sprite.sourceType === 'series'}
            {sprite.sourceSeries?.name || 'Unknown'}
          {:else}
            Unknown
          {/if}
        </p>
      </div>
      <div class="detail-item">
        <h4>Section</h4>
        <p>{sprite.section?.name || 'Unknown'}</p>
      </div>
      {#if sprite.characters && sprite.characters.length > 0}
        <div class="detail-item">
          <h4>Characters</h4>
          <p>{sprite.characters.map(c => c.name).join(', ')}</p>
        </div>
      {/if}
      <div class="detail-item">
        <h4>Views</h4>
        <p>{sprite.views?.toLocaleString() || 0}</p>
      </div>
    </div>

    <!-- Contributors Section -->
    {#if sprite.contributors && sprite.contributors.length > 0}
      <div class="contributors-section">
        <h4>Contributors</h4>
        <div class="contributors-list">
          {#each sprite.contributors as contributor}
            <div class="contributor-item">
              <span>{contributor.displayName || contributor.username || contributor.name || 'Unknown Contributor'}</span>
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
  </div>
</div>
