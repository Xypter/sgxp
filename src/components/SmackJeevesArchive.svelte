<script lang="ts">
  import { onMount } from 'svelte';
  import { Select, Combobox, Input, Button, Badge } from '$lib/components';

  // Comic data interface
  interface Comic {
    id: string;
    author: string;
    title: string;
    category: string;
    pagesMetadata: string;
    pagesFolder: string;
    percentSaved: string;
    quality: string;
    rating: string;
    notes: string;
    link: string;
  }

  // State
  let comics = $state<Comic[]>([]);
  let filteredComics = $state<Comic[]>([]);
  let currentPage = $state(1);
  let searchTerm = $state('');
  let categoryFilter = $state('');
  let authorFilter = $state('');
  let sortBy = $state('title-asc');
  let loading = $state(true);

  const itemsPerPage = 20;

  // Computed values
  let totalResults = $derived(filteredComics.length);
  let pageCount = $derived(Math.ceil(totalResults / itemsPerPage));
  let paginatedComics = $derived.by(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredComics.slice(start, end);
  });

  // Sort options
  const sortOptions = [
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
    { value: 'rating-desc', label: 'Highest Rating' },
    { value: 'rating-asc', label: 'Lowest Rating' },
    { value: 'id-asc', label: 'Comic # (Asc)' },
    { value: 'id-desc', label: 'Comic # (Desc)' }
  ];

  // Filter options (will be populated from data)
  let categoryOptions = $state<Array<{ value: string; label: string }>>([]);
  let authorOptions = $state<Array<{ value: string; label: string }>>([]);

  // Load data from the global dataSet variable
  async function loadComics() {
    loading = true;
    try {
      // Access the global dataSet variable from datatable.js
      const dataSet = (window as any).dataSet;

      if (!dataSet) {
        throw new Error('Comic data not found');
      }

      // Parse the dataset
      comics = dataSet.map((item: any[]) => ({
        id: item[0],
        author: item[1],
        title: item[2],
        category: item[3],
        pagesMetadata: item[4],
        pagesFolder: item[5],
        percentSaved: item[6],
        quality: item[7],
        rating: item[8],
        notes: item[9],
        link: item[10]
      }));

      // Extract unique filter options
      const categories = new Set(comics.map(c => c.category));
      categoryOptions = Array.from(categories)
        .map(cat => ({ value: cat, label: cat }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const authors = new Set(comics.map(c => c.author));
      authorOptions = Array.from(authors)
        .map(author => ({ value: author, label: author }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // Initial filter
      applyFilters();
    } catch (error) {
      console.error('Error loading comics:', error);
    } finally {
      loading = false;
    }
  }

  // Apply filters and sorting
  function applyFilters() {
    let filtered = comics;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(comic =>
        comic.title.toLowerCase().includes(search) ||
        comic.author.toLowerCase().includes(search) ||
        comic.notes.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(comic => comic.category === categoryFilter);
    }

    // Author filter
    if (authorFilter) {
      filtered = filtered.filter(comic => comic.author === authorFilter);
    }

    // Sorting
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'rating-desc':
          return parseInt(b.rating) - parseInt(a.rating);
        case 'rating-asc':
          return parseInt(a.rating) - parseInt(b.rating);
        case 'id-asc':
          return parseInt(a.id) - parseInt(b.id);
        case 'id-desc':
          return parseInt(b.id) - parseInt(a.id);
        default:
          return 0;
      }
    });

    filteredComics = filtered;
    currentPage = 1; // Reset to first page when filters change
  }

  // Reset all filters
  function resetFilters() {
    searchTerm = '';
    categoryFilter = '';
    authorFilter = '';
    sortBy = 'title-asc';
    applyFilters();
  }

  // Watch for filter changes
  $effect(() => {
    // Trigger filter whenever these change
    searchTerm;
    categoryFilter;
    authorFilter;
    sortBy;

    if (!loading) {
      applyFilters();
    }
  });

  onMount(() => {
    loadComics();
  });
</script>

<div class="archive-container">
  {#if loading}
    <div class="loading-state">
      <p>Loading archive...</p>
    </div>
  {:else}
    <!-- Filters Section -->
    <div class="filters-section">
      <div class="results-count">
        {totalResults} Results
      </div>

      <div class="search-bar">
        <Input
          bind:value={searchTerm}
          placeholder="Search by title, author, or notes..."
          themed
          class="search-input"
        />
        <Button onclick={resetFilters} themed>
          Reset Filters
        </Button>
      </div>

      <div class="filter-grid">
        <div class="filter-item">
          <label>Sort by</label>
          <Select
            bind:value={sortBy}
            options={sortOptions}
            themed
          />
        </div>

        <div class="filter-item">
          <label>Author</label>
          <Combobox
            bind:value={authorFilter}
            options={authorOptions}
            placeholder="All Authors"
            searchPlaceholder="Search authors..."
            themed
          />
        </div>

        <div class="filter-item">
          <label>Category</label>
          <Combobox
            bind:value={categoryFilter}
            options={categoryOptions}
            placeholder="All Categories"
            searchPlaceholder="Search categories..."
            themed
          />
        </div>
      </div>
    </div>

    <!-- Pagination Top -->
    {#if pageCount > 1}
      <div class="pagination-container">
        <div class="pagination-simple">
          <button
            class="pagination-nav-btn"
            onclick={() => currentPage = Math.max(1, currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span class="page-indicator">Page {currentPage} of {pageCount}</span>
          <button
            class="pagination-nav-btn"
            onclick={() => currentPage = Math.min(pageCount, currentPage + 1)}
            disabled={currentPage === pageCount}
          >
            Next
          </button>
        </div>
      </div>
    {/if}

    <!-- Comics Grid -->
    <div class="comics-grid">
      {#each paginatedComics as comic (comic.id)}
        <div class="comic-card">
          <div class="comic-header">
            <h3 class="comic-title">{comic.title}</h3>
            <div class="comic-badges">
              <Badge themed class="category-badge">
                {comic.category}
              </Badge>
            </div>
          </div>

          <div class="comic-meta">
            <div class="meta-item">
              <span class="meta-label">Author:</span>
              <span class="meta-value">{comic.author}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Quality:</span>
              <span class="meta-value">{comic.quality}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Rating:</span>
              <span class="meta-value rating-value">{comic.rating}/10</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Pages:</span>
              <span class="meta-value">{comic.pagesFolder} ({(parseFloat(comic.percentSaved) * 100).toFixed(0)}% saved)</span>
            </div>
          </div>

          {#if comic.notes}
            <div class="comic-notes">
              <span class="notes-label">Notes:</span>
              <p>{comic.notes}</p>
            </div>
          {/if}

          <a href={comic.link} class="view-comic-btn">
            View Comic
          </a>
        </div>
      {/each}
    </div>

    <!-- No Results -->
    {#if paginatedComics.length === 0}
      <div class="no-results">
        <p>No comics found matching your filters.</p>
        <Button onclick={resetFilters} themed>
          Reset Filters
        </Button>
      </div>
    {/if}

    <!-- Pagination Bottom -->
    {#if pageCount > 1}
      <div class="pagination-container">
        <div class="pagination-simple">
          <button
            class="pagination-nav-btn"
            onclick={() => currentPage = Math.max(1, currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span class="page-indicator">Page {currentPage} of {pageCount}</span>
          <button
            class="pagination-nav-btn"
            onclick={() => currentPage = Math.min(pageCount, currentPage + 1)}
            disabled={currentPage === pageCount}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .archive-container {
    width: 100%;
    padding: 20px 1rem;
    border-top: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .loading-state,
  .no-results {
    text-align: center;
    padding: 40px 20px;
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
  }

  /* Filters Section */
  .filters-section {
    margin-bottom: var(--gap);
  }

  .search-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .search-bar :global(.search-input) {
    flex: 1;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .filter-item {
    width: 100%;
  }

  .filter-item label {
    display: block;
    font-family: 'saira';
    font-weight: 700;
    font-size: 12px;
    color: var(--font-color);
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .filter-item :global(button),
  .filter-item :global([role="combobox"]) {
    width: 100% !important;
  }

  .results-count {
    font-family: 'saira';
    font-size: 14px;
    color: var(--font-color);
    opacity: 0.8;
    text-align: left;
    margin-bottom: 16px;
  }

  /* Pagination */
  .pagination-container {
    background-color: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    padding: 15px;
    box-shadow: var(--box-shadow);
    margin-bottom: var(--gap);
  }

  .pagination-simple {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .pagination-nav-btn {
    padding: 8px 16px;
    background: var(--font-link-color);
    color: white;
    border: none;
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pagination-nav-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
  }

  .pagination-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-indicator {
    font-family: 'saira';
    font-size: 14px;
    font-weight: 600;
    color: var(--font-color);
    white-space: nowrap;
  }

  /* Comics Grid */
  .comics-grid {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: var(--gap);
  }

  .comic-card {
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    padding: 15px;
    box-shadow: var(--box-shadow);
  }

  .comic-header {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 70%, white);
  }

  .comic-title {
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    color: var(--font-link-color);
    margin: 0 0 8px 0;
    word-wrap: break-word;
    text-shadow:
      calc(1px * var(--multiply-factor)) calc(0px * var(--multiply-factor)) 0 var(--bg-color),
      calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
      calc(0px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color);
  }

  .comic-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .comic-badges :global(.category-badge) {
    background-color: var(--font-link-color) !important;
    color: white !important;
  }

  .comic-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .meta-item {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    display: flex;
    gap: 6px;
  }

  .meta-label {
    font-weight: 700;
    opacity: 0.8;
  }

  .meta-value {
    font-weight: 400;
  }

  .rating-value {
    color: var(--font-link-color);
    font-weight: 700;
  }

  .comic-notes {
    background: color-mix(in srgb, var(--page-color) 80%, black);
    padding: 10px;
    margin-bottom: 12px;
    border-left: 3px solid var(--font-link-color);
  }

  .notes-label {
    font-family: 'saira';
    font-size: 12px;
    font-weight: 700;
    color: var(--font-link-color);
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }

  .comic-notes p {
    font-family: 'saira';
    font-size: 13px;
    color: var(--font-color);
    margin: 0;
    line-height: 1.4;
  }

  .view-comic-btn {
    display: block;
    width: 100%;
    padding: 10px 16px;
    background: var(--font-link-color);
    color: var(--page-color);
    border: none;
    font-family: 'saira';
    font-weight: 700;
    font-size: 14px;
    text-align: center;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
    text-shadow: none !important;
  }

  .view-comic-btn:hover {
    background: color-mix(in srgb, var(--font-link-color) 80%, white);
  }

  @media (max-width: 768px) {
    .archive-container {
      padding: 20px 0;
    }

    .filters-section,
    .pagination-container,
    .comic-card {
      border-left: none !important;
      border-right: none !important;
      width: 100vw !important;
      margin-left: calc(-50vw + 50%) !important;
      margin-right: calc(-50vw + 50%) !important;
      box-shadow: none !important;
    }

    .filters-section {
      padding: 0 1rem;
    }

    .search-bar {
      flex-direction: column;
    }

    /* Mobile pagination adjustments */
    .pagination-nav-btn {
      padding: 6px 12px;
      font-size: 12px;
      color: var(--page-color);
    }

    .page-indicator {
      font-size: 12px;
    }
  }
</style>
