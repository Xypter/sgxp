<script>
    // Import from component library
    import { Button, Toaster } from '$lib/components';

    // Import Lucide icons
    import { X, Eye, ArrowLeft } from 'lucide-svelte';

    // Import custom components
    import CommentSection from './comments/CommentSection.svelte';
    import SpriteImageViewer from './sprite/SpriteImageViewer.svelte';
    import SpriteInfo from './sprite/SpriteInfo.svelte';
    import SpriteActions from './sprite/SpriteActions.svelte';

    // OPTIMIZATION: Simple in-memory cache for client-side related data
    // This persists across sprite views within the same session
    const clientCache = new Map();
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    function getFromClientCache(key) {
        const cached = clientCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
        if (cached) {
            clientCache.delete(key); // Expired
        }
        return null;
    }

    function setClientCache(key, data) {
        clientCache.set(key, { data, timestamp: Date.now() });
    }

    // Props - now accepting pre-fetched data from server and modal state
    let {
        spriteId,
        initialSprite = null,
        initialError = null,
        isModal = false,
        onClose = null,
        user: initialUser = null // Rename to avoid conflicts
    } = $props();

    // State management - initialize with server data
    let sprite = $state(initialSprite);
    let loading = $state(!initialSprite && !initialError);
    let error = $state(initialError);
    let user = $state(initialUser);

    // Viewer state
    let viewerOpen = $state(false);
    let imageLoaded = $state(false);

    const API_BASE_URL = `${import.meta.env.PUBLIC_PAYLOAD_URL}/api`;

    // Check user authentication and fetch profile picture
    async function checkUserAuth() {
        try {
            // Include depth=2 to populate profilePicture
            const response = await fetch('/api/users/me?depth=2', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                const userData = data.user || data;
                user = userData;
            } else {
                user = null;
            }
        } catch (err) {
            console.error('[SpriteViewer] Auth check error:', err);
            user = null;
        }
    }

    // OPTIMIZATION: Check if data needs population (is ID vs already populated object)
    function needsPopulation(value) {
        return typeof value === 'number' || typeof value === 'string';
    }

    // OPTIMIZATION: Check if sprite data is already fully populated
    function isFullyPopulated(spriteData) {
        if (!spriteData) return false;

        // Check if key fields are already objects (not IDs)
        // For author, also check if nested profilePicture is populated
        const authorPopulated = !spriteData.author || (
            typeof spriteData.author === 'object' &&
            (!spriteData.author.profilePicture || typeof spriteData.author.profilePicture === 'object')
        );
        const styleGamePopulated = !spriteData.styleGame || typeof spriteData.styleGame === 'object';
        const sourceGamePopulated = !spriteData.sourceGame || typeof spriteData.sourceGame === 'object';
        const sourceSeriesPopulated = !spriteData.sourceSeries || typeof spriteData.sourceSeries === 'object';
        const sectionPopulated = !spriteData.section || typeof spriteData.section === 'object';

        // Check arrays - if first item is object, assume all are populated
        const charactersPopulated = !spriteData.characters?.length || typeof spriteData.characters[0] === 'object';
        const contributorsPopulated = !spriteData.contributors?.length || typeof spriteData.contributors[0] === 'object';

        return authorPopulated && styleGamePopulated && sourceGamePopulated && sourceSeriesPopulated &&
               sectionPopulated && charactersPopulated && contributorsPopulated;
    }

    // OPTIMIZATION: Populate related data using parallel fetches instead of sequential
    async function populateRelatedData(spriteData) {
        if (!spriteData) return spriteData;

        // Skip if already fully populated
        if (isFullyPopulated(spriteData)) {
            return spriteData;
        }

        const populated = { ...spriteData };

        try {
            // OPTIMIZATION: Collect all fetch promises to run in parallel
            const fetchPromises = [];
            const fetchKeys = [];

            // Helper to fetch with client cache
            async function cachedFetch(url, cacheKey) {
                const cached = getFromClientCache(cacheKey);
                if (cached) return cached;

                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        setClientCache(cacheKey, data);
                        return data;
                    }
                } catch (e) {
                    console.error(`[cachedFetch] Error: ${url}`, e);
                }
                return null;
            }

            // Queue author fetch if needed (or if profilePicture needs population)
            if (needsPopulation(populated.author)) {
                const cacheKey = `users:${populated.author}`;
                const cached = getFromClientCache(cacheKey);
                if (cached) {
                    populated.author = cached;
                } else {
                    fetchKeys.push('author');
                    fetchPromises.push(
                        cachedFetch(`${API_BASE_URL}/users/${populated.author}?depth=2`, cacheKey)
                    );
                }
            } else if (populated.author && typeof populated.author === 'object') {
                // Author is an object - check if profilePicture needs population
                const hasProfilePic = populated.author.profilePicture;
                const profilePicNeedsPopulation = hasProfilePic && typeof hasProfilePic === 'object' && !hasProfilePic.url;
                const profilePicIsId = needsPopulation(hasProfilePic);

                if (profilePicIsId || profilePicNeedsPopulation) {
                    // Re-fetch author with full profilePicture
                    const cacheKey = `users:${populated.author.id}`;
                    const cached = getFromClientCache(cacheKey);
                    if (cached) {
                        populated.author = cached;
                    } else {
                        fetchKeys.push('author');
                        fetchPromises.push(
                            cachedFetch(`${API_BASE_URL}/users/${populated.author.id}?depth=2`, cacheKey)
                        );
                    }
                }
            }

            // Queue styleGame fetch if needed
            if (needsPopulation(populated.styleGame)) {
                const cacheKey = `games:${populated.styleGame}`;
                const cached = getFromClientCache(cacheKey);
                if (cached) {
                    populated.styleGame = cached;
                } else {
                    fetchKeys.push('styleGame');
                    fetchPromises.push(
                        cachedFetch(`${API_BASE_URL}/games/${populated.styleGame}`, cacheKey)
                    );
                }
            }

            // Queue sourceGame fetch if needed
            if (needsPopulation(populated.sourceGame)) {
                const cacheKey = `games:${populated.sourceGame}`;
                const cached = getFromClientCache(cacheKey);
                if (cached) {
                    populated.sourceGame = cached;
                } else {
                    fetchKeys.push('sourceGame');
                    fetchPromises.push(
                        cachedFetch(`${API_BASE_URL}/games/${populated.sourceGame}`, cacheKey)
                    );
                }
            }

            // Queue sourceSeries fetch if needed
            if (needsPopulation(populated.sourceSeries)) {
                const cacheKey = `series:${populated.sourceSeries}`;
                const cached = getFromClientCache(cacheKey);
                if (cached) {
                    populated.sourceSeries = cached;
                } else {
                    fetchKeys.push('sourceSeries');
                    fetchPromises.push(
                        cachedFetch(`${API_BASE_URL}/series/${populated.sourceSeries}`, cacheKey)
                    );
                }
            }

            // Queue section fetch if needed
            if (needsPopulation(populated.section)) {
                const cacheKey = `sections:${populated.section}`;
                const cached = getFromClientCache(cacheKey);
                if (cached) {
                    populated.section = cached;
                } else {
                    fetchKeys.push('section');
                    fetchPromises.push(
                        cachedFetch(`${API_BASE_URL}/sections/${populated.section}`, cacheKey)
                    );
                }
            }

            // Queue character fetches if needed (these are already parallel within themselves)
            if (populated.characters?.length && needsPopulation(populated.characters[0])) {
                fetchKeys.push('characters');
                fetchPromises.push(
                    Promise.all(
                        populated.characters.map(char => {
                            if (!needsPopulation(char)) return Promise.resolve(char);
                            const cacheKey = `characters:${char}`;
                            const cached = getFromClientCache(cacheKey);
                            if (cached) return Promise.resolve(cached);
                            return cachedFetch(`${API_BASE_URL}/characters/${char}`, cacheKey)
                                .then(data => data || char);
                        })
                    )
                );
            }

            // Queue contributor fetches if needed (these are already parallel within themselves)
            if (populated.contributors?.length && needsPopulation(populated.contributors[0])) {
                fetchKeys.push('contributors');
                fetchPromises.push(
                    Promise.all(
                        populated.contributors.map(contrib => {
                            if (!needsPopulation(contrib)) return Promise.resolve(contrib);
                            const cacheKey = `users:${contrib}`;
                            const cached = getFromClientCache(cacheKey);
                            if (cached) return Promise.resolve(cached);
                            return cachedFetch(`${API_BASE_URL}/users/${contrib}`, cacheKey)
                                .then(data => data || contrib);
                        })
                    )
                );
            }

            // OPTIMIZATION: Execute all fetches in parallel
            if (fetchPromises.length > 0) {
                const results = await Promise.all(fetchPromises);

                // Map results back to populated object
                results.forEach((result, index) => {
                    if (result !== null) {
                        populated[fetchKeys[index]] = result;
                    }
                });
            }

        } catch (err) {
            console.error('Error populating related data:', err);
        }

        return populated;
    }

    // Only fetch if we don't have initial data
    async function loadSprite() {
        if (initialSprite || initialError) {
            return;
        }

        if (!spriteId) {
            error = 'No sprite ID provided';
            loading = false;
            return;
        }

        loading = true;
        error = null;

        try {
            const response = await fetch(`${API_BASE_URL}/sprites/${spriteId}?depth=3`);

            if (!response.ok) {
                throw new Error(`Sprite not found (${response.status})`);
            }

            const data = await response.json();
            sprite = await populateRelatedData(data);

        } catch (err) {
            console.error('Error fetching sprite:', err);
            error = err.message || 'Failed to load sprite';
        } finally {
            loading = false;
        }
    }

    function preloadImage() {
        if (sprite?.image?.url) {
            const img = new Image();
            img.src = sprite.image.url;
        }
    }

    function openViewer() {
        viewerOpen = true;
    }

    function closeViewer() {
        viewerOpen = false;
    }

    function handleModalClose() {
        if (isModal && onClose) {
            onClose();
        }
    }

    function handleKeydown(event) {
        if (isModal && event.key === 'Escape') {
            handleModalClose();
        }
    }

    $effect(() => {
        async function init() {
            if (!initialSprite && !initialError) {
                await loadSprite();
            } else if (initialSprite) {
                // Populate related data for initial sprite
                sprite = await populateRelatedData(initialSprite);
            }
            checkUserAuth();
        }
        init();
    });

    $effect(() => {
        if (sprite?.image?.url) {
            preloadImage();
        }
    });

    $effect(() => {
        if (isModal) {
            document.addEventListener('keydown', handleKeydown);

            return () => {
                document.removeEventListener('keydown', handleKeydown);
            };
        }
    });
</script>

<div class="sprite-viewer-container" class:is-modal={isModal}>
    {#if isModal}
        <div class="modal-scroll-container">
            {#if loading}
                <div class="sprite-content-title">Loading Sprite...</div>
                <div class="sprite-content-box">
                    <div class="loading-state">
                        <p>Loading sprite details...</p>
                    </div>
                </div>
            {:else if error}
                <div class="sprite-content-title">Error</div>
                <div class="sprite-content-box">
                    <div class="error-state">
                        <p>{error}</p>
                    </div>
                </div>
            {:else if sprite}
                <!-- Header with title -->
                <div class="sprite-viewer-header">
                    <div class="sprite-content-title">{sprite.title}</div>
                </div>

                <!-- Sprite Sheet Section -->
                <div class="sprite-sheet-section">
                    {#if sprite.image}
                        <div class="sprite-sheet-container">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <img
                                src={sprite.image.url}
                                alt={sprite.image.alt || sprite.title}
                                class="sprite-sheet-image"
                                class:loaded={imageLoaded}
                                loading="eager"
                                onclick={openViewer}
                                onload={() => imageLoaded = true}
                            />
                            <button class="sprite-sheet-overlay" onclick={openViewer}>
                                <Eye class="overlay-icon" />
                                <span>Click to view fullscreen</span>
                            </button>
                        </div>

                        <!-- Sprite Actions (Like/Favorite) -->
                        <SpriteActions {spriteId} {sprite} {user} />
                    {:else}
                        <div class="sprite-sheet-container no-image">
                            <p>No image available for this sprite.</p>
                        </div>
                    {/if}
                </div>

                <!-- Information Section -->
                <SpriteInfo {sprite} />

                <!-- Comments Section -->
                <CommentSection {spriteId} {user} />
            {:else}
                <div class="sprite-content-title">Not Found</div>
                <div class="sprite-content-box">
                    <div class="not-found-state">
                        <p>Sprite not found.</p>
                    </div>
                </div>
            {/if}
        </div>
    {:else}
        {#if loading}
            <div class="sprite-content-title">Loading Sprite...</div>
            <div class="sprite-content-box">
                <div class="loading-state">
                    <p>Loading sprite details...</p>
                </div>
            </div>
        {:else if error}
            <div class="sprite-content-title">Error</div>
            <div class="sprite-content-box">
                <div class="error-state">
                    <p>{error}</p>
                </div>
            </div>
        {:else if sprite}
            <!-- Header with title -->
            <div class="sprite-viewer-header">
                <div class="sprite-content-title">{sprite.title}</div>
            </div>

            <!-- Sprite Sheet Section -->
            <div class="sprite-sheet-section">
                {#if sprite.image}
                    <div class="sprite-sheet-container">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <img
                            src={sprite.image.url}
                            alt={sprite.image.alt || sprite.title}
                            class="sprite-sheet-image"
                            class:loaded={imageLoaded}
                            loading="eager"
                            onclick={openViewer}
                            onload={() => imageLoaded = true}
                        />
                        <button class="sprite-sheet-overlay" onclick={openViewer}>
                            <Eye class="overlay-icon" />
                            <span>Click to view fullscreen</span>
                        </button>
                    </div>

                    <!-- Sprite Actions (Like/Favorite) -->
                    <SpriteActions {spriteId} {sprite} {user} />
                {:else}
                    <div class="sprite-sheet-container no-image">
                        <p>No image available for this sprite.</p>
                    </div>
                {/if}
            </div>

            <!-- Information Section -->
            <SpriteInfo {sprite} />

            <!-- Comments Section -->
            <CommentSection {spriteId} {user} />
        {:else}
            <div class="sprite-content-title">Not Found</div>
            <div class="sprite-content-box">
                <div class="not-found-state">
                    <p>Sprite not found.</p>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Image Viewer Component -->
<SpriteImageViewer
    image={sprite?.image}
    isOpen={viewerOpen}
    onClose={closeViewer}
    {isModal}
/>

<!-- Back button for non-modal mode - fixed at bottom left -->
{#if !isModal && onClose}
    <Button onclick={onClose} size="sm" class="fixed-back-button">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Browser
    </Button>
{/if}

<!-- Toast notifications for this component tree -->
<Toaster />

<style>
    /* Container - kept local as it defines the component's layout bounds */
    .sprite-viewer-container {
        width: 100%;
        margin: 0 auto;
        padding: 50px 20px;
    }

    .sprite-viewer-container.is-modal {
        width: 70%;
        height: 100%;
        padding: 50px 20px;
    }

    /* Scroll container for modal mode */
    .modal-scroll-container {
        height: 100%;
        overflow-y: auto;
    }

    /* Header Layout */
    .sprite-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
    }

    /* Fixed back button at bottom left - styled like Post Comment button */
    :global(.fixed-back-button) {
        position: fixed;
        bottom: 2rem;
        left: 2rem;
        z-index: 1000;
        display: flex;
        align-items: center;

        /* Match Post Comment button styling */
        font-family: 'saira', monospace !important;
        font-size: 14px !important;
        padding: 8px 16px !important;
        font-weight: 700 !important;
        background: var(--page-color) !important;
        color: var(--font-color) !important;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 60%, white) !important;
        border-radius: 0px !important;
        box-shadow: var(--box-shadow) !important;
        transition: all 0.2s ease !important;
        cursor: url('/img/Sonic_Cursor.png'), pointer !important;
    }

    :global(.fixed-back-button:hover:not(:disabled)) {
        border-color: var(--font-link-color) !important;
        cursor: url('/img/Sonic_Cursor_Spin.gif'), progress !important;
        background: color-mix(in srgb, var(--page-color) 90%, white) !important;
    }

    :global(.sprite-modal-close-btn) {
        flex-shrink: 0;
        background-color: #dc2626 !important;
        border-color: #dc2626 !important;
        color: white !important;
        padding: 8px 12px;
    }

    :global(.sprite-modal-close-btn:hover) {
        background-color: #b91c1c !important;
        border-color: #b91c1c !important;
    }

    /* Sprite Sheet Section - Specific Layouts */
    .sprite-sheet-section {
        background: var(--page-color);
        border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        padding: 30px;
        margin-bottom: var(--gap);
        box-shadow: var(--box-shadow);
        position: relative;
        z-index: 1;
    }

    .sprite-sheet-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
    }

    .sprite-sheet-image {
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        -ms-interpolation-mode: nearest-neighbor;
        opacity: 0;
        transition: opacity 0.3s ease-in;
        cursor: pointer;
        display: block;
    }

    .sprite-sheet-image.loaded {
        opacity: 1;
    }

    .sprite-sheet-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: color-mix(in srgb, var(--bg-color) 80%, transparent);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s ease;
        cursor: pointer;
        border: none;
        color: var(--font-color);
        font-family: 'saira';
        font-weight: 700;
        font-size: 16px;
    }

    .sprite-sheet-container:hover .sprite-sheet-overlay {
        opacity: 1;
    }

    .sprite-sheet-overlay :global(.overlay-icon) {
        width: 48px;
        height: 48px;
    }

    .no-image {
        background-color: color-mix(in srgb, var(--page-color) 90%, white);
        border: 2px dashed color-mix(in srgb, var(--page-color) 70%, white);
        padding: 40px;
        font-style: italic;
        opacity: 0.7;
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
        .sprite-viewer-container {
            width: 95%;
        }
    }

    @media (max-width: 768px) {
        .sprite-viewer-container {
            width: 100%;
            padding: 10px;
        }

        .sprite-viewer-container.is-modal {
            padding: 10px;
        }

        .sprite-sheet-section {
            padding: 15px;
        }
    }
</style>
