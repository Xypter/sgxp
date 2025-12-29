<script>
  import { Eye, Download, Heart, MessageSquare, Share2, Flag, ChevronLeft, ChevronRight, Maximize2, Star, User, Calendar, Image, FileType, Layers, Gamepad2 } from 'lucide-svelte';

  // Mock data for demonstration
  let sprite = $state({
    title: "Super Sonic - Full Sheet",
    image: { url: "/img/mock-sprite.png", width: 1920, height: 1080, filesize: 245000 },
    author: { displayName: "PixelMaster", username: "pixelmaster" },
    createdAt: "2024-03-15",
    views: 12847,
    likes: 342,
    comments: 28,
    styleGame: { name: "Sonic 3 & Knuckles" },
    sourceGame: { name: "Sonic Adventure 2" },
    section: { name: "Playable Characters" },
    characters: [{ name: "Super Sonic" }, { name: "Sonic" }],
    description: "Complete sprite sheet featuring all Super Sonic animations from SA2, recreated in S3&K style. Includes running, jumping, flying, and transformation sequences."
  });

  let imageLoaded = $state(true);
  let isLiked = $state(false);
  let activeTab = $state('info'); // 'info' | 'comments' | 'related'
</script>

<!--
  MOCKUP: Video Game HUD-Style Sprite Viewer
  Design Philosophy:
  - RPG menu/inventory aesthetic
  - Clean panels with pixel-perfect borders
  - Stats displayed like game items
  - Minimal but impactful animations
-->

<div class="game-viewer">
  <!-- Top Navigation Bar - Like a game menu bar -->
  <nav class="game-nav">
    <button class="nav-btn back-btn">
      <ChevronLeft size={16} />
      <span>SPRITES</span>
    </button>

    <div class="nav-breadcrumb">
      <span class="crumb">Characters</span>
      <ChevronRight size={12} />
      <span class="crumb">Sonic</span>
      <ChevronRight size={12} />
      <span class="crumb active">Super Sonic</span>
    </div>

    <div class="nav-actions">
      <button class="action-btn" title="Share">
        <Share2 size={16} />
      </button>
      <button class="action-btn" title="Report">
        <Flag size={16} />
      </button>
    </div>
  </nav>

  <!-- Main Content Area - Split Panel Layout -->
  <div class="game-content">

    <!-- LEFT PANEL: Image Viewport -->
    <section class="viewport-panel">
      <div class="panel-frame">
        <!-- Panel Header -->
        <header class="panel-header">
          <div class="header-decorL"></div>
          <h2 class="panel-title">SPRITE PREVIEW</h2>
          <div class="header-decorR"></div>
        </header>

        <!-- Image Container -->
        <div class="viewport-container">
          <div class="viewport-inner">
            <!-- Scanline Overlay -->
            <div class="scanlines"></div>

            <!-- The Sprite Image -->
            <div class="sprite-display">
              <img
                src="/img/mock-sprite.png"
                alt={sprite.title}
                class="sprite-image"
                class:loaded={imageLoaded}
              />

              <!-- Fullscreen Button -->
              <button class="fullscreen-btn">
                <Maximize2 size={20} />
              </button>
            </div>
          </div>

          <!-- Image Stats Bar (like game HUD) -->
          <div class="viewport-stats">
            <div class="stat-chip">
              <Image size={12} />
              <span>{sprite.image.width} × {sprite.image.height}</span>
            </div>
            <div class="stat-chip">
              <FileType size={12} />
              <span>PNG</span>
            </div>
            <div class="stat-chip">
              <Layers size={12} />
              <span>245 KB</span>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="action-bar">
          <button class="primary-action">
            <Download size={18} />
            <span>DOWNLOAD</span>
          </button>
          <button class="secondary-action" class:active={isLiked} onclick={() => isLiked = !isLiked}>
            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            <span>{sprite.likes + (isLiked ? 1 : 0)}</span>
          </button>
          <button class="secondary-action">
            <Eye size={18} />
            <span>{sprite.views.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- RIGHT PANEL: Info Panel -->
    <aside class="info-panel">
      <div class="panel-frame">
        <!-- Panel Header -->
        <header class="panel-header">
          <div class="header-decorL"></div>
          <h2 class="panel-title">SPRITE DATA</h2>
          <div class="header-decorR"></div>
        </header>

        <!-- Title Section -->
        <div class="title-section">
          <h1 class="sprite-title">{sprite.title}</h1>
          <div class="title-underline"></div>
        </div>

        <!-- Author Card -->
        <div class="author-card">
          <div class="author-avatar">
            <User size={24} />
          </div>
          <div class="author-info">
            <span class="author-label">UPLOADED BY</span>
            <span class="author-name">{sprite.author.displayName}</span>
          </div>
          <div class="upload-date">
            <Calendar size={14} />
            <span>Mar 15, 2024</span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-nav">
          <button
            class="tab-btn"
            class:active={activeTab === 'info'}
            onclick={() => activeTab = 'info'}
          >
            INFO
          </button>
          <button
            class="tab-btn"
            class:active={activeTab === 'comments'}
            onclick={() => activeTab = 'comments'}
          >
            COMMENTS
            <span class="tab-count">{sprite.comments}</span>
          </button>
          <button
            class="tab-btn"
            class:active={activeTab === 'related'}
            onclick={() => activeTab = 'related'}
          >
            RELATED
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          {#if activeTab === 'info'}
            <!-- Stats Grid - Like RPG Item Stats -->
            <div class="stats-grid">
              <div class="stat-row">
                <span class="stat-label">
                  <Gamepad2 size={14} />
                  STYLE
                </span>
                <span class="stat-value">{sprite.styleGame.name}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">
                  <Star size={14} />
                  SOURCE
                </span>
                <span class="stat-value">{sprite.sourceGame.name}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">
                  <Layers size={14} />
                  SECTION
                </span>
                <span class="stat-value">{sprite.section.name}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">
                  <User size={14} />
                  CHARACTERS
                </span>
                <span class="stat-value">{sprite.characters.map(c => c.name).join(', ')}</span>
              </div>
            </div>

            <!-- Description Box -->
            <div class="description-box">
              <div class="desc-header">DESCRIPTION</div>
              <p class="desc-text">{sprite.description}</p>
            </div>

            <!-- Tags -->
            <div class="tags-section">
              <span class="tag">sonic</span>
              <span class="tag">super-sonic</span>
              <span class="tag">s3k-style</span>
              <span class="tag">full-sheet</span>
            </div>

          {:else if activeTab === 'comments'}
            <div class="comments-placeholder">
              <MessageSquare size={32} />
              <p>Comments section would appear here</p>
            </div>

          {:else if activeTab === 'related'}
            <div class="related-grid">
              {#each [1, 2, 3, 4] as i}
                <div class="related-item">
                  <div class="related-thumb"></div>
                  <span class="related-name">Related Sprite {i}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </aside>
  </div>

  <!-- Bottom Status Bar - Like a game status bar -->
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-item">ID: #48291</span>
      <span class="status-divider">|</span>
      <span class="status-item">Updated: 2 days ago</span>
    </div>
    <div class="status-center">
      <span class="nav-hint">
        <kbd>←</kbd> <kbd>→</kbd> Navigate Sprites
      </span>
    </div>
    <div class="status-right">
      <span class="status-item online-dot">12 viewing</span>
    </div>
  </footer>
</div>

<style>
  /* ================================================
     GAME VIEWER - Video Game HUD Design System
     ================================================ */

  .game-viewer {
    --panel-bg: color-mix(in srgb, var(--page-color) 95%, black);
    --panel-border: color-mix(in srgb, var(--page-color) 70%, white);
    --panel-header-bg: color-mix(in srgb, var(--page-color) 50%, black);
    --highlight: var(--font-link-color);
    --text-dim: color-mix(in srgb, var(--font-color) 60%, transparent);

    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-color);
    font-family: 'saira', sans-serif;
    color: var(--font-color);
  }

  /* ================================================
     TOP NAVIGATION BAR
     ================================================ */
  .game-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: var(--panel-header-bg);
    border-bottom: 2px solid var(--panel-border);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--panel-border);
    color: var(--font-color);
    font-family: 'nav', monospace;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .nav-btn:hover {
    background: var(--highlight);
    color: var(--bg-color);
    border-color: var(--highlight);
  }

  .nav-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'nav', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }

  .crumb.active {
    color: var(--highlight);
    font-weight: 700;
  }

  .nav-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    color: var(--highlight);
    border-color: var(--panel-border);
  }

  /* ================================================
     MAIN CONTENT LAYOUT
     ================================================ */
  .game-content {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;
    padding: 24px;
    flex: 1;
  }

  /* ================================================
     PANEL FRAME - Shared Panel Styling
     ================================================ */
  .panel-frame {
    background: var(--panel-bg);
    border: 2px solid var(--panel-border);
    box-shadow:
      8px 8px 0 rgba(0, 0, 0, 0.5),
      inset 0 0 0 1px color-mix(in srgb, var(--panel-border) 30%, transparent);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    background: var(--panel-header-bg);
    border-bottom: 2px solid var(--panel-border);
    padding: 0;
  }

  .header-decorL,
  .header-decorR {
    width: 16px;
    height: 32px;
    background: var(--highlight);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 100%);
  }

  .header-decorR {
    clip-path: polygon(0 0, 100% 0, 50% 100%, 0 100%);
  }

  .panel-title {
    flex: 1;
    text-align: center;
    font-family: 'nav', monospace;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 3px;
    color: var(--font-color);
    margin: 0;
    padding: 10px 0;
    text-shadow:
      1px 0 0 var(--bg-color),
      1px 1px 0 var(--bg-color),
      0 1px 0 var(--bg-color);
  }

  /* ================================================
     VIEWPORT PANEL (Left - Image Display)
     ================================================ */
  .viewport-panel {
    display: flex;
    flex-direction: column;
  }

  .viewport-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      color-mix(in srgb, var(--bg-color) 20%, transparent) 2px,
      color-mix(in srgb, var(--bg-color) 20%, transparent) 4px
    );
  }

  .viewport-inner {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(45deg,
        color-mix(in srgb, var(--page-color) 80%, black) 25%,
        transparent 25%),
      linear-gradient(-45deg,
        color-mix(in srgb, var(--page-color) 80%, black) 25%,
        transparent 25%),
      linear-gradient(45deg,
        transparent 75%,
        color-mix(in srgb, var(--page-color) 80%, black) 75%),
      linear-gradient(-45deg,
        transparent 75%,
        color-mix(in srgb, var(--page-color) 80%, black) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    border: 1px solid var(--panel-border);
    min-height: 400px;
  }

  .scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, 0.03) 1px,
      rgba(0, 0, 0, 0.03) 2px
    );
    pointer-events: none;
    z-index: 2;
  }

  .sprite-display {
    position: relative;
    max-width: 100%;
    max-height: 100%;
  }

  .sprite-image {
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .sprite-image.loaded {
    opacity: 1;
  }

  .fullscreen-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 8px;
    background: color-mix(in srgb, var(--bg-color) 90%, transparent);
    border: 1px solid var(--panel-border);
    color: var(--font-color);
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
  }

  .viewport-inner:hover .fullscreen-btn {
    opacity: 1;
  }

  .fullscreen-btn:hover {
    background: var(--highlight);
    color: var(--bg-color);
  }

  .viewport-stats {
    display: flex;
    gap: 12px;
    padding: 12px 0 0 0;
    justify-content: center;
  }

  .stat-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--panel-header-bg);
    border: 1px solid var(--panel-border);
    font-size: 11px;
    font-family: 'nav', monospace;
    color: var(--text-dim);
  }

  /* ================================================
     ACTION BAR
     ================================================ */
  .action-bar {
    display: flex;
    gap: 8px;
    padding: 16px;
    background: var(--panel-header-bg);
    border-top: 2px solid var(--panel-border);
  }

  .primary-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 24px;
    background: var(--highlight);
    border: none;
    color: var(--bg-color);
    font-family: 'nav', monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .primary-action:hover {
    filter: brightness(1.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 0 color-mix(in srgb, var(--highlight) 50%, black);
  }

  .secondary-action {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    background: transparent;
    border: 2px solid var(--panel-border);
    color: var(--font-color);
    font-family: 'nav', monospace;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .secondary-action:hover {
    border-color: var(--highlight);
    color: var(--highlight);
  }

  .secondary-action.active {
    color: #ff6b6b;
    border-color: #ff6b6b;
  }

  /* ================================================
     INFO PANEL (Right Side)
     ================================================ */
  .info-panel .panel-frame {
    overflow: hidden;
  }

  .title-section {
    padding: 20px 20px 0 20px;
  }

  .sprite-title {
    font-family: 'saira', sans-serif;
    font-size: 24px;
    font-weight: 800;
    margin: 0;
    line-height: 1.2;
    text-shadow:
      2px 0 0 var(--bg-color),
      2px 2px 0 var(--bg-color),
      0 2px 0 var(--bg-color);
  }

  .title-underline {
    width: 60px;
    height: 4px;
    background: var(--highlight);
    margin-top: 12px;
  }

  /* ================================================
     AUTHOR CARD
     ================================================ */
  .author-card {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px;
    padding: 16px;
    background: var(--panel-header-bg);
    border: 1px solid var(--panel-border);
  }

  .author-avatar {
    width: 48px;
    height: 48px;
    background: color-mix(in srgb, var(--highlight) 20%, var(--bg-color));
    border: 2px solid var(--highlight);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--highlight);
  }

  .author-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .author-label {
    font-size: 10px;
    font-family: 'nav', monospace;
    color: var(--text-dim);
    letter-spacing: 1px;
  }

  .author-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--highlight);
  }

  .upload-date {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-dim);
  }

  /* ================================================
     TAB NAVIGATION
     ================================================ */
  .tab-nav {
    display: flex;
    border-bottom: 2px solid var(--panel-border);
    background: var(--panel-header-bg);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--text-dim);
    font-family: 'nav', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: var(--font-color);
    background: color-mix(in srgb, var(--highlight) 10%, transparent);
  }

  .tab-btn.active {
    color: var(--highlight);
    border-bottom-color: var(--highlight);
    background: color-mix(in srgb, var(--highlight) 5%, transparent);
  }

  .tab-count {
    padding: 2px 6px;
    background: var(--panel-border);
    font-size: 10px;
    border-radius: 2px;
  }

  .tab-btn.active .tab-count {
    background: var(--highlight);
    color: var(--bg-color);
  }

  /* ================================================
     TAB CONTENT
     ================================================ */
  .tab-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  /* Stats Grid - RPG Item Stats Style */
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 20px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--panel-header-bg);
    border-left: 3px solid transparent;
    transition: all 0.15s ease;
  }

  .stat-row:hover {
    border-left-color: var(--highlight);
    background: color-mix(in srgb, var(--highlight) 5%, var(--panel-header-bg));
  }

  .stat-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-family: 'nav', monospace;
    color: var(--text-dim);
    letter-spacing: 1px;
  }

  .stat-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--font-color);
    text-align: right;
  }

  /* Description Box */
  .description-box {
    margin-bottom: 20px;
    background: var(--panel-header-bg);
    border: 1px solid var(--panel-border);
  }

  .desc-header {
    padding: 8px 12px;
    font-size: 10px;
    font-family: 'nav', monospace;
    letter-spacing: 1px;
    color: var(--highlight);
    border-bottom: 1px solid var(--panel-border);
  }

  .desc-text {
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--font-color);
    margin: 0;
  }

  /* Tags */
  .tags-section {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    padding: 4px 10px;
    background: transparent;
    border: 1px solid var(--panel-border);
    font-size: 11px;
    font-family: 'nav', monospace;
    color: var(--text-dim);
    transition: all 0.15s ease;
  }

  .tag:hover {
    border-color: var(--highlight);
    color: var(--highlight);
  }

  /* Comments Placeholder */
  .comments-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: var(--text-dim);
    text-align: center;
  }

  /* Related Grid */
  .related-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .related-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
  }

  .related-thumb {
    aspect-ratio: 4/3;
    background: var(--panel-header-bg);
    border: 1px solid var(--panel-border);
    transition: all 0.15s ease;
  }

  .related-item:hover .related-thumb {
    border-color: var(--highlight);
  }

  .related-name {
    font-size: 11px;
    color: var(--text-dim);
  }

  .related-item:hover .related-name {
    color: var(--highlight);
  }

  /* ================================================
     STATUS BAR (Footer)
     ================================================ */
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 24px;
    background: var(--panel-header-bg);
    border-top: 2px solid var(--panel-border);
    font-size: 11px;
    font-family: 'nav', monospace;
    color: var(--text-dim);
  }

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-divider {
    opacity: 0.3;
  }

  .nav-hint {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  kbd {
    padding: 2px 6px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    font-size: 10px;
  }

  .online-dot::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #22c55e;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* ================================================
     RESPONSIVE DESIGN
     ================================================ */
  @media (max-width: 1024px) {
    .game-content {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .info-panel {
      order: -1;
    }

    .viewport-inner {
      min-height: 300px;
    }
  }

  @media (max-width: 640px) {
    .game-nav {
      padding: 8px 16px;
    }

    .nav-breadcrumb {
      display: none;
    }

    .game-content {
      padding: 16px;
    }

    .action-bar {
      flex-wrap: wrap;
    }

    .primary-action {
      width: 100%;
    }

    .secondary-action {
      flex: 1;
    }

    .status-center {
      display: none;
    }
  }
</style>
