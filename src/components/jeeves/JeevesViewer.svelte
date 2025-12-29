<script lang="ts">
  import { onMount } from 'svelte';
  import { Book, Users, Calendar, Home, ChevronLeft, ChevronRight, ArrowUp, MessageSquare, User } from 'lucide-svelte';
  import { Select } from '$lib/components';

  // State
  let metadata = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let currentPage = $state(0);
  let pageHtml = $state<string[]>([]);
  let comicImageError = $state(false);
  let chapterImageErrors = $state(new Set<number>());

  // Get comic ID from URL
  function getComicId(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('comic_id');
  }

  // Get current page from hash
  function getCurrentPageNum(): number {
    const page = window.location.hash.substr(1);
    if (page === "" || typeof page === 'undefined') {
      return 0;
    }
    return parseInt(page);
  }

  // Format comment time
  function formatCommentTime(isoString: string): string {
    const date = new Date(isoString);
    const pad = (num: number) => num.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${month}-${day}-${year}, ${hours}:${minutes}${ampm}`;
  }

  // Set page
  function setPage(pgNum: number) {
    if (!metadata || pgNum < 0 || pgNum > metadata.chapters.length) {
      return;
    }
    currentPage = pgNum;
    comicImageError = false; // Reset image error state when changing pages
    window.location.hash = String(pgNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle keyboard navigation
  function handleKeyup(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      setPage(currentPage - 1);
    } else if (event.key === 'ArrowRight') {
      setPage(currentPage + 1);
    }
  }

  // Handle image click navigation
  function handleImageClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const imageWidth = target.offsetWidth;
    const clickX = event.offsetX;

    if (clickX < imageWidth / 2) {
      setPage(currentPage - 1);
    } else {
      setPage(currentPage + 1);
    }
  }

  // Handle image error - set fallback image
  function handleImageError(event: Event, fallbackType: 'avatar' | 'comic' = 'avatar') {
    const img = event.target as HTMLImageElement;
    img.onerror = null; // Prevent infinite loop
    if (fallbackType === 'avatar') {
      img.src = 'https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif3.gif';
    } else {
      img.src = 'https://cdn.sgxp.me/smackjeeves_archive/comic/KansDefaultgif2.gif';
    }
  }

  // Load metadata
  async function loadMetadata() {
    const comicId = getComicId();
    if (!comicId) {
      error = 'No comic ID found. Please add ?comic_id=XXX to the URL.';
      loading = false;
      return;
    }

    try {
      const metadataUrl = `https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-${comicId}/${comicId}/metadata.js`;

      // Fetch the metadata file as text and evaluate it
      // The file uses "let metadata = {...}" format, so we need to extract and parse it
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch comic metadata');
      }

      const scriptText = await response.text();

      // The file contains "let metadata = {...}" - we need to extract the object
      // Replace "let metadata = " with nothing to get just the object, then parse
      const jsonMatch = scriptText.match(/let\s+metadata\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
      if (!jsonMatch) {
        throw new Error('Could not parse metadata format');
      }

      // Evaluate the object literal (it's valid JS object syntax)
      // Using Function constructor to safely evaluate the object
      const loadedMetadata = new Function(`return ${jsonMatch[1]}`)();

      if (loadedMetadata) {
        metadata = loadedMetadata;

        // Process metadata
        metadata.descriptionHTML = metadata.description?.replace(/(\r\n|\n|\r)/g, "<br />") || '';
        metadata.numChapters = metadata.chapters?.length || 0;
        metadata.firstPosted = metadata.chapters?.[0]?.distributedDate?.split("T")[0] || 'Unknown';

        // Process chapters
        metadata.chapters.forEach((chapter: any, index: number) => {
          chapter.chapterNumber = index + 1;
          if (chapter.authorComment) {
            chapter.authorCommentHTML = chapter.authorComment.replace(/(\r\n|\n|\r)/g, "<br />");
          }

          // Sort and process comments
          if (chapter.comments) {
            chapter.comments.sort((a: any, b: any) =>
              new Date(a.time).getTime() - new Date(b.time).getTime()
            );
            chapter.comments.forEach((comment: any) => {
              comment.commentHTML = comment.commentText?.replace(/(\r\n|\n|\r)/g, "<br />") || '';
              comment.formattedTime = formatCommentTime(comment.time);
            });
          }
        });

        currentPage = getCurrentPageNum();
        loading = false;
      } else {
        throw new Error('Metadata not found');
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
      error = 'Failed to load comic data. Please check the comic ID.';
      loading = false;
    }
  }

  // Chapter select options
  let chapterOptions = $derived.by(() => {
    if (!metadata) return [];
    const options = [{ value: '0', label: `Home - ${metadata.title}` }];
    metadata.chapters?.forEach((chapter: any) => {
      options.push({
        value: String(chapter.chapterNumber),
        label: `${chapter.chapterNumber} - ${chapter.articleTitle}`
      });
    });
    return options;
  });

  let selectedChapter = $state('0');

  // Update selected chapter when currentPage changes
  $effect(() => {
    selectedChapter = String(currentPage);
  });

  function handleChapterChange(value: string) {
    setPage(parseInt(value));
  }

  // Get comic ID for image URLs
  let comicId = $derived(getComicId());

  onMount(() => {
    loadMetadata();

    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('popstate', () => {
      currentPage = getCurrentPageNum();
    });

    return () => {
      window.removeEventListener('keyup', handleKeyup);
    };
  });
</script>

<div class="jeeves-viewer">
  {#if loading}
    <div class="jeeves-content-title">
      <Book class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
      Loading Archive...
    </div>
    <div class="jeeves-content-box">
      <div class="loading-state">
        <p>Loading comic data...</p>
      </div>
    </div>
  {:else if error}
    <div class="jeeves-content-title">
      <Book class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
      Error
    </div>
    <div class="jeeves-content-box">
      <div class="error-state">
        <p>{error}</p>
      </div>
    </div>
  {:else if metadata}
    <!-- Comic Title Header -->
    <div class="jeeves-header">
      <button class="comic-title-link" onclick={() => setPage(0)}>
        {metadata.title}
      </button>
    </div>

    {#if currentPage === 0}
      <!-- Home Page -->
      <div class="jeeves-home">
        <!-- Comic Info Section -->
        <div class="jeeves-content-title">
          <Book class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
          Comic Information
        </div>
        <div class="jeeves-content-box">
          <!-- Authors -->
          <div class="authors-section">
            <h4 class="section-label">
              <Users class="w-4 h-4" />
              Creators
            </h4>
            <div class="authors-list">
              {#each metadata.authors as author}
                <div class="author-item">
                  {#if author.imgPath}
                    <img
                      src="https://cdn.sgxp.me/smackjeeves_archive/{author.imgPath}"
                      alt={author.name}
                      class="author-avatar"
                      onerror={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const fallback = img.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div class="author-avatar-fallback" style="display: none;">
                      {author.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  {:else}
                    <div class="author-avatar-fallback">
                      {author.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  {/if}
                  <span class="author-name">{author.name}</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Details Grid -->
          <div class="details-grid">
            <div class="detail-item">
              <h4>
                <Calendar class="w-4 h-4" />
                Date Created
              </h4>
              <p>{metadata.firstPosted}</p>
            </div>
            <div class="detail-item">
              <h4>
                <Book class="w-4 h-4" />
                Chapters
              </h4>
              <p>{metadata.numChapters}</p>
            </div>
          </div>

          <!-- Description -->
          <div class="description-section">
            <h4 class="section-label">Description</h4>
            <div class="description-text">
              {@html metadata.descriptionHTML}
            </div>
          </div>
        </div>

        <!-- Chapter List Section -->
        <div class="jeeves-content-title">
          <Book class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
          Chapter List
        </div>
        <div class="jeeves-content-box">
          <div class="chapter-grid">
            {#each metadata.chapters as chapter}
              <button class="chapter-card" onclick={() => setPage(chapter.chapterNumber)}>
                <div class="chapter-cover">
                  {#if chapter.pagesPath && !chapterImageErrors.has(chapter.chapterNumber)}
                    <img
                      src="https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-{comicId}/{comicId}/{chapter.pagesPath}"
                      alt="Chapter {chapter.chapterNumber}"
                      onerror={() => {
                        chapterImageErrors.add(chapter.chapterNumber);
                        chapterImageErrors = chapterImageErrors; // Trigger reactivity
                      }}
                    />
                  {:else}
                    <div class="chapter-cover-placeholder">
                      <span class="chapter-placeholder-text">No Image</span>
                    </div>
                  {/if}
                </div>
                <span class="chapter-label">{chapter.chapterNumber} - {chapter.articleTitle}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- Chapter Page -->
      {@const chapter = metadata.chapters[currentPage - 1]}
      <div class="jeeves-chapter">
        <!-- Comic Image -->
        <div class="jeeves-content-title">
          <Book class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
          Page
        </div>
        <div class="jeeves-content-box comic-display">
          <!-- Chapter Header (inside box) -->
          <div class="chapter-header">
            <span class="chapter-number">Chapter {chapter.chapterNumber}</span>
            <h2 class="chapter-title">{chapter.articleTitle}</h2>
          </div>

          <div class="comic-image-container">
            {#if chapter.pagesPath && !comicImageError}
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <img
                src="https://cdn.sgxp.me/smackjeeves_archive/smackjeeves-{comicId}/{comicId}/{chapter.pagesPath}"
                alt="Chapter {chapter.chapterNumber}"
                class="comic-image {currentPage < metadata.chapters.length ? 'clickable' : ''}"
                onclick={currentPage < metadata.chapters.length ? handleImageClick : undefined}
                onerror={() => { comicImageError = true; }}
              />
            {:else}
              <div class="comic-placeholder">
                <span class="comic-placeholder-text">Image missing from archive</span>
              </div>
            {/if}
          </div>

          <!-- Chapter Navigation -->
          <div class="chapter-nav-wrapper">
            <button
              class="chapter-nav-btn"
              onclick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 0}
              title="Previous page (Left Arrow)"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
            <Select
              bind:value={selectedChapter}
              options={chapterOptions}
              themed
              onValueChange={handleChapterChange}
            />
            <button
              class="chapter-nav-btn"
              onclick={() => setPage(currentPage + 1)}
              disabled={currentPage >= metadata.chapters.length}
              title="Next page (Right Arrow)"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Author Comment -->
        <div class="jeeves-content-title">
          <MessageSquare class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
          Author's Comment
        </div>
        <div class="jeeves-content-box">
          {#if chapter.authorComment}
            <div class="author-comment-text">
              {@html chapter.authorCommentHTML}
            </div>
          {:else}
            <p class="missing-notice">No comment</p>
          {/if}
        </div>

        <!-- Comments Section -->
        <div class="jeeves-content-title">
          <MessageSquare class="w-5 h-5" style="display: inline-block; vertical-align: middle; margin-right: 8px;" />
          User Comments ({chapter.comments?.length || 0})
        </div>
        <div class="jeeves-content-box">
          {#if chapter.comments && chapter.comments.length > 0}
            <div class="archive-comments-list">
              {#each chapter.comments as comment}
                <div class="archive-comment">
                  <div class="archive-comment-header">
                    {#if comment.imgPath}
                      <img
                        src="https://cdn.sgxp.me/smackjeeves_archive/{comment.imgPath}"
                        alt={comment.nickname}
                        class="archive-comment-avatar"
                        onerror={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div class="archive-comment-avatar-fallback" style="display: none;">
                        {comment.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                    {:else}
                      <div class="archive-comment-avatar-fallback">
                        {comment.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                    {/if}
                    <div class="archive-comment-meta">
                      <span class="archive-comment-author">{comment.nickname}</span>
                      <span class="archive-comment-date">{comment.formattedTime}</span>
                    </div>
                  </div>
                  <div class="archive-comment-body">
                    {@html comment.commentHTML}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="missing-notice">No comments</p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Back to Top Button -->
    <button class="back-to-top" onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <ArrowUp class="w-4 h-4" />
      Back to Top
    </button>
  {/if}
</div>

<style>
  .jeeves-viewer {
    width: 100%;
    max-width: 100%;
  }

  /* Loading/Error States */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 40px 20px;
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
  }

  .error-state {
    color: #ff4444;
  }


  /* Header */
  .jeeves-header {
    margin-bottom: var(--gap);
  }

  .comic-title-link {
    display: flex;
    align-items: center;
    gap: 10px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 10px 15px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 28px;
    color: var(--font-link-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .comic-title-link:hover {
    border-color: var(--font-link-color);
    color: color-mix(in srgb, var(--font-link-color) 70%, white);
  }

  /* Content Boxes */
  .jeeves-content-title {
    display: flex;
    align-items: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 0px 3px 10px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    position: relative;
  }

  .jeeves-content-box {
    background: var(--page-color);
    padding: 20px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap);
    color: var(--font-color);
    position: relative;
    z-index: 1;
  }

  /* Authors Section */
  .authors-section {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 14px;
    text-transform: uppercase;
    color: var(--font-link-color);
    margin-bottom: 12px;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .authors-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }

  .author-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 8px 0px;
  }

  .author-avatar {
    width: 127px;
    height: 127px;
    object-fit: none;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .author-avatar-fallback {
    width: 127px;
    height: 127px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    font-family: 'saira';
    font-weight: 800;
    font-size: 48px;
    color: var(--font-link-color);
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .author-name {
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
  }

  /* Details Grid */
  .details-grid {
    display: flex;
    gap: 50px;
    margin-bottom: 20px;
  }

  .detail-item h4 {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--font-link-color);
    margin-bottom: 4px;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .detail-item p {
    font-family: 'saira';
    font-size: 16px;
    color: var(--font-color);
    font-weight: 600;
    margin: 0;
  }

  /* Description */
  .description-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .description-text {
    font-family: 'saira';
    font-size: 14px;
    line-height: 1.6;
    color: var(--font-color);
  }

  /* Chapter Grid */
  .chapter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }

  .chapter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .chapter-card:hover {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 90%, black);
  }

  .chapter-cover {
    width: 130px;
    height: 130px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
  }

  .chapter-cover img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    image-rendering: auto;
  }

  .chapter-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border: 1px dashed color-mix(in srgb, var(--page-color) 70%, white);
  }

  .chapter-placeholder-text {
    font-family: 'saira';
    font-size: 10px;
    font-weight: 600;
    color: var(--font-color);
    opacity: 0.4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .chapter-label {
    font-family: 'saira';
    font-size: 12px;
    font-weight: 600;
    color: var(--font-link-color);
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Chapter Page */
  .chapter-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .chapter-number {
    display: block;
    font-family: 'saira';
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }

  .chapter-title {
    font-family: 'saira';
    font-weight: 800;
    font-size: 24px;
    color: var(--font-link-color);
    margin: 0;
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
  }

  /* Chapter Navigation */
  .chapter-nav-wrapper {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 0;
    margin-top: 15px;
  }

  .chapter-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 65%, white);
    color: var(--font-color);
    cursor: pointer;
    transition: all 0.2s ease;
    margin: 0px 10px;
  }

  .chapter-nav-btn:hover:not(:disabled) {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 70%, black);
    color: var(--font-link-color);
  }

  .chapter-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Comic Display */
  .comic-display {
    text-align: center;
  }

  .comic-image-container {
    margin-bottom: 20px;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comic-image {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  .comic-image.clickable {
    cursor: pointer;
  }

  .comic-image.clickable:hover {
    border-color: var(--font-link-color);
  }

  .comic-placeholder {
    width: 100%;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 50%, black);
    border: 2px dashed color-mix(in srgb, var(--page-color) 70%, white);
  }

  .comic-placeholder-text {
    font-family: 'saira';
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
    opacity: 0.4;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Author Comment */
  .author-comment-text {
    font-family: 'saira';
    font-size: 14px;
    line-height: 1.6;
    color: var(--font-color);
  }

  .missing-notice {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.5;
    font-style: italic;
    margin: 0;
  }

  /* Archive Comments */
  .archive-comments-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .archive-comment {
    background: color-mix(in srgb, var(--page-color) 95%, white);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    padding: 15px;
    box-shadow: var(--box-shadow);
  }

  .archive-comment-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .archive-comment-avatar {
    width: 127px;
    height: 127px;
    object-fit: none;
    flex-shrink: 0;
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .archive-comment-avatar-fallback {
    width: 127px;
    height: 127px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: calc(3px * var(--multiply-factor)) calc(3px * var(--multiply-factor)) 0 var(--bg-color);
    font-family: 'saira';
    font-weight: 800;
    font-size: 48px;
    color: var(--font-link-color);
    text-shadow:
      calc(2px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(2px * var(--multiply-factor)) calc(2px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .archive-comment-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .archive-comment-author {
    font-family: 'saira';
    font-weight: 800;
    font-size: 14px;
    color: var(--font-link-color);
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .archive-comment-date {
    font-family: 'saira';
    font-size: 12px;
    color: var(--font-color);
    opacity: 0.7;
  }

  .archive-comment-body {
    font-family: 'saira';
    font-size: 14px;
    line-height: 1.6;
    color: var(--font-color);
  }

  /* Back to Top */
  .back-to-top {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
    color: var(--font-link-color);
    font-family: 'saira';
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 100;
    box-shadow: var(--box-shadow);
  }

  .back-to-top:hover {
    border-color: var(--font-link-color);
    background: color-mix(in srgb, var(--page-color) 90%, black);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .comic-title-link {
      font-size: 20px;
      padding: 8px 12px;
    }

    .jeeves-content-title {
      font-size: 16px;
      padding: 3px 0px 3px 10px;
    }

    .jeeves-content-box {
      padding: 15px;
    }

    .chapter-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    .chapter-cover {
      width: 100px;
      height: 100px;
    }

    .chapter-label {
      font-size: 11px;
      max-width: 100px;
    }

    .chapter-placeholder-text {
      font-size: 9px;
    }

    .chapter-title {
      font-size: 20px;
    }

    .author-item {
      padding: 6px 10px;
    }

    .author-avatar {
      width: 40px;
      height: 40px;
    }

    .author-avatar-fallback {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .archive-comment-avatar {
      width: 40px;
      height: 40px;
    }

    .archive-comment-avatar-fallback {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .chapter-nav-btn {
      padding: 0 8px;
    }

    .comic-placeholder {
      min-height: 200px;
    }

    .comic-placeholder-text {
      font-size: 12px;
    }

    .back-to-top {
      bottom: 10px;
      right: 10px;
      padding: 8px 12px;
      font-size: 11px;
    }
  }

  @media (max-width: 480px) {
    .chapter-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .authors-list {
      flex-direction: column;
    }
  }
</style>
