<script>
    import { Button } from '../components/ui/button/index.ts';
    import { ZoomIn, ZoomOut, X, FlipHorizontal, FlipVertical, Grid3x3, RotateCw, Download } from 'lucide-svelte';
    
    // Props - expecting spriteId from the Astro page
    let { spriteId } = $props();
    
    // Simple state management
    let sprite = $state(null);
    let loading = $state(true);
    let error = $state(null);
    
    // Viewer state
    let viewerOpen = $state(false);
    let zoom = $state(1);
    let imagePosition = $state({ x: 0, y: 0 });
    let isDragging = $state(false);
    let dragStart = $state({ x: 0, y: 0 });
    let flipHorizontal = $state(false);
    let flipVertical = $state(false);
    let showGrid = $state(false);
    let rotation = $state(0);
    
    const API_BASE_URL = "https://cms.sgxp.me/api/sprites";

    // Simple fetch function for single sprite
    async function loadSprite() {
        if (!spriteId) {
            error = 'No sprite ID provided';
            loading = false;
            return;
        }

        loading = true;
        error = null;
        
        try {
            const response = await fetch(`${API_BASE_URL}/${spriteId}?depth=3`);
            
            if (!response.ok) {
                throw new Error(`Sprite not found (${response.status})`);
            }
            
            sprite = await response.json();
            
        } catch (err) {
            console.error('Error fetching sprite:', err);
            error = err.message || 'Failed to load sprite';
        } finally {
            loading = false;
        }
    }

    // Viewer functions
    function openViewer() {
        viewerOpen = true;
        zoom = 1; // Start at 1x (original size)
        flipHorizontal = false;
        flipVertical = false;
        showGrid = false;
        rotation = 0;
        centerImage();
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    function closeViewer() {
        viewerOpen = false;
        // Restore body scroll
        document.body.style.overflow = '';
    }

    function centerImage() {
        if (!sprite?.image) return;
        // Center the image in the viewer at its current zoom level
        imagePosition = { x: 0, y: 0 };
    }

    function zoomIn() {
        const oldZoom = zoom;
        zoom = Math.min(25, zoom + 1); // Integer increments, max 25x
        
        if (zoom !== oldZoom) {
            // Zoom from viewer center - adjust position to keep viewer center fixed
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function zoomOut() {
        const oldZoom = zoom;
        zoom = Math.max(1, zoom - 1); // Integer increments, min 1x
        
        if (zoom !== oldZoom) {
            // Zoom from viewer center - adjust position to keep viewer center fixed
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function rotateImage() {
        rotation = (rotation + 90) % 360;
    }

    function toggleFlipHorizontal() {
        flipHorizontal = !flipHorizontal;
    }

    function toggleFlipVertical() {
        flipVertical = !flipVertical;
    }

    function toggleGrid() {
        showGrid = !showGrid;
    }

    async function downloadImage() {
        if (!sprite?.image) return;
        
        try {
            // Fetch the image as a blob
            const response = await fetch(sprite.image.url);
            const blob = await response.blob();
            
            // Create a temporary URL for the blob
            const blobUrl = URL.createObjectURL(blob);
            
            // Create a temporary link element to trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = sprite.image.filename || `sprite_${sprite.id}.png`;
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download image:', error);
            // Fallback to direct link if fetch fails
            const link = document.createElement('a');
            link.href = sprite.image.url;
            link.download = sprite.image.filename || `sprite_${sprite.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    function handleWheel(event) {
        if (!viewerOpen) return;
        
        event.preventDefault();
        
        // Determine zoom direction and new zoom level
        const delta = event.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(1, Math.min(25, zoom + delta));
        
        if (newZoom !== zoom) {
            // Get the mouse position relative to the viewer container center
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left - rect.width / 2;
            const mouseY = event.clientY - rect.top - rect.height / 2;
            
            // Calculate the point on the image that's under the mouse
            const imagePointX = (mouseX - imagePosition.x) / zoom;
            const imagePointY = (mouseY - imagePosition.y) / zoom;
            
            // Update zoom
            zoom = newZoom;
            
            // Adjust position to keep the mouse point stationary
            imagePosition = {
                x: mouseX - imagePointX * zoom,
                y: mouseY - imagePointY * zoom
            };
        }
    }

    function handleMouseDown(event) {
        if (event.button === 0) { // Left mouse button
            event.preventDefault();
            isDragging = true;
            dragStart = {
                x: event.clientX - imagePosition.x,
                y: event.clientY - imagePosition.y
            };
        }
    }

    function handleMouseMove(event) {
        if (isDragging) {
            event.preventDefault();
            imagePosition = {
                x: event.clientX - dragStart.x,
                y: event.clientY - dragStart.y
            };
        }
    }

    function handleMouseUp(event) {
        if (isDragging) {
            event.preventDefault();
        }
        isDragging = false;
    }

    // Handle keyboard shortcuts
    function handleKeydown(event) {
        if (!viewerOpen) return;
        
        if (event.key === 'Escape') {
            closeViewer();
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoomIn();
        } else if (event.key === '-') {
            event.preventDefault();
            zoomOut();
        }
    }

    // Load sprite when component mounts
    $effect(() => {
        loadSprite();
    });

    // Add event listeners for dragging and keyboard
    $effect(() => {
        if (viewerOpen) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('keydown', handleKeydown);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('keydown', handleKeydown);
            };
        }
    });
</script>

<!-- Use your existing CSS classes and structure -->
<div class="container ignore-main">
    {#if loading}
        <div class="main-content-title">Loading Sprite...</div>
        <div class="main-content-box">
            <div class="loading-content">
                Loading sprite details...
            </div>
        </div>
    {:else if error}
        <div class="main-content-title">Error</div>
        <div class="main-content-box">
            <div class="error-content">
                {error}
            </div>
        </div>
    {:else if sprite}
        <!-- Sprite title using your existing title styling -->
        <div class="main-content-title">{sprite.title}</div>
        
        <!-- Sprite content using your existing content box styling -->
        <div class="main-content-box">
            <div class="sprite-display">
                {#if sprite.image}
                    <img 
                        src={sprite.image.url} 
                        alt={sprite.image.alt || sprite.title}
                        class="sprite-main-image clickable"
                        onclick={openViewer}
                    />
                    
                    <!-- Optional: Basic sprite info -->
                    <div class="sprite-info">
                        <p><strong>Author:</strong> {sprite.author?.displayName || sprite.author?.username || 'Unknown'}</p>
                        <p><strong>Dimensions:</strong> {sprite.image.width} × {sprite.image.height} px</p>
                        <p><strong>Game:</strong> {sprite.typeOfSheet?.[0]?.game?.name || 'Unknown'}</p>
                        <p><strong>Type:</strong> {sprite.typeOfSheet?.[0]?.blockType || 'Unknown'}</p>
                        <p><strong>Posted:</strong> {new Date(sprite.createdAt).toLocaleDateString()}</p>
                    </div>
                {:else}
                    <div class="no-image">
                        No image available for this sprite.
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <div class="main-content-title">Not Found</div>
        <div class="main-content-box">
            <div class="not-found-content">
                Sprite not found.
            </div>
        </div>
    {/if}
</div>

<!-- Modal Viewer -->
{#if viewerOpen && sprite?.image}
    <div class="viewer-modal" onclick={(e) => e.target === e.currentTarget && closeViewer()}>
        <div class="viewer-container">
            <!-- Image container -->
            <div class="viewer-image-container" onwheel={handleWheel}>
                <div class="image-wrapper">
                    <!-- Container that rotates around viewport center -->
                    <div class="rotation-container"
                         style="transform: rotate({rotation}deg);">
                        <img
                            src={sprite.image.url}
                            alt={sprite.image.alt || sprite.title}
                            class="viewer-image"
                            style="
                                transform: translate({imagePosition.x}px, {imagePosition.y}px) 
                                          scale({zoom}) 
                                          scaleX({flipHorizontal ? -1 : 1}) 
                                          scaleY({flipVertical ? -1 : 1});
                                width: {sprite.image.width}px;
                                height: {sprite.image.height}px;
                            "
                            onmousedown={handleMouseDown}
                            draggable="false"
                        />
                        
                        <!-- Pixel Grid - now inside rotation container so it rotates with image -->
                        {#if showGrid && zoom >= 2}
                            <div
                                class="pixel-grid"
                                style="
                                    transform: translate({imagePosition.x}px, {imagePosition.y}px) 
                                              scale({zoom}) 
                                              scaleX({flipHorizontal ? -1 : 1}) 
                                              scaleY({flipVertical ? -1 : 1});
                                    width: {sprite.image.width}px;
                                    height: {sprite.image.height}px;
                                    background-image: 
                                        linear-gradient(to right, rgba(0,0,0,0.5) {1/zoom}px, transparent {1/zoom}px),
                                        linear-gradient(to bottom, rgba(0,0,0,0.5) {1/zoom}px, transparent {1/zoom}px);
                                    background-size: 1px 1px;
                                "
                            ></div>
                        {/if}
                    </div>
                </div>
            </div>
            
            <!-- Zoom controls -->
            <div class="viewer-controls">
                <Button variant="outline" size="sm" onclick={zoomOut} disabled={zoom <= 1}>
                    <ZoomOut class="h-4 w-4" />
                </Button>
                
                <span class="zoom-indicator">{zoom}x</span>
                
                <Button variant="outline" size="sm" onclick={zoomIn} disabled={zoom >= 25}>
                    <ZoomIn class="h-4 w-4" />
                </Button>
                
                <div class="control-separator"></div>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={rotateImage}
                >
                    <RotateCw class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleFlipHorizontal}
                    class={flipHorizontal ? 'active' : ''}
                >
                    <FlipHorizontal class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleFlipVertical}
                    class={flipVertical ? 'active' : ''}
                >
                    <FlipVertical class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={toggleGrid}
                    class={showGrid ? 'active' : ''}
                    disabled={zoom < 2}
                >
                    <Grid3x3 class="h-4 w-4" />
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    onclick={downloadImage}
                >
                    <Download class="h-4 w-4" />
                </Button>
                
                <div class="control-separator"></div>
                
                <Button variant="outline" size="sm" onclick={centerImage}>
                    Center
                </Button>
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    class="close-btn"
                    onclick={closeViewer}
                >
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Use your existing CSS custom properties and classes */
    .sprite-display {
        text-align: center;
    }

    .sprite-main-image {
        max-width: 100%;
        height: auto;
        /* Pixel-perfect rendering for sprite sheets */
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        /* Add some spacing */
        margin-bottom: 20px;
    }

    .sprite-info {
        text-align: left;
        line-height: 1.6;
        margin-top: 20px;
    }

    .sprite-info p {
        margin-bottom: 8px;
    }

    .sprite-info strong {
        color: var(--font-link-color);
    }

    .clickable {
        cursor: pointer;
        transition: opacity 0.2s ease;
    }

    .clickable:hover {
        opacity: 0.8;
    }

    /* Modal Viewer Styles */
    .viewer-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden; /* Prevent scrollbars */
    }

    .viewer-container {
        width: 80%;
        height: 100vh;
        position: relative;
        /* Custom grid background with gradient overlay */
        background: 
            /* Grid lines using linear gradients */
            linear-gradient(to right, white 5px, transparent 5px),
            linear-gradient(to bottom, white 5px, transparent 5px),
            /* Color gradient */
            linear-gradient(0deg, #002705 0%, #12a740 100%);
        background-size: 50px 50px, 50px 50px, 100% 100%;
        background-position: 0 0, 0 0, 0 0;
        background-blend-mode: overlay, overlay, normal;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        overflow: hidden; /* Prevent scrollbars */
        animation: gridPan 2s linear infinite;
    }

    @keyframes gridPan {
        0% {
            background-position: 0 0, 0 0, 0 0;
        }
        100% {
            background-position: 50px 0, 0 0, 0 0;
        }
    }

    .viewer-controls .close-btn {
        background-color: #dc2626;
        border-color: #dc2626;
        color: white;
    }

    .viewer-controls .close-btn:hover {
        background-color: #b91c1c;
        border-color: #b91c1c;
        color: white;
    }

    .viewer-image-container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden; /* Hide image overflow */
        cursor: grab;
        position: relative;
    }

    .viewer-image-container:active {
        cursor: grabbing;
    }

    .image-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    /* New rotation container that rotates around the viewport center */
    .rotation-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        transform-origin: center center;
    }

    .viewer-image {
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        transform-origin: center center;
        user-select: none;
        pointer-events: auto; /* Allow mouse events for dragging */
        cursor: grab;
        max-width: none; /* Prevent stretching */
        filter:drop-shadow(10px 10px 2px rgba(0, 0, 0,.7));
    }

    .viewer-image:active {
        cursor: grabbing;
    }

    .pixel-grid {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        transform-origin: center center;
    }

    .viewer-controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: color-mix(in srgb, var(--page-color) 95%, transparent);
        backdrop-filter: blur(8px);
        padding: 10px;
        border-radius: 8px;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
    }

    .control-separator {
        width: 1px;
        height: 24px;
        background-color: color-mix(in srgb, var(--page-color) 60%, white);
        margin: 0 4px;
    }

    .viewer-controls .active {
        background-color: color-mix(in srgb, var(--page-color) 70%, white);
        color: var(--font-color);
    }

    .zoom-indicator {
        font-family: 'saira', monospace;
        font-weight: 600;
        color: var(--font-color);
        min-width: 30px;
        text-align: center;
        font-size: 14px;
    }

    .loading-content, 
    .error-content, 
    .not-found-content,
    .no-image {
        text-align: center;
        padding: 40px 20px;
    }

    .error-content {
        color: #ff4444;
    }

    .no-image {
        background-color: color-mix(in srgb, var(--page-color) 90%, white);
        border: 2px dashed color-mix(in srgb, var(--page-color) 70%, white);
        font-style: italic;
        opacity: 0.7;
    }
</style>