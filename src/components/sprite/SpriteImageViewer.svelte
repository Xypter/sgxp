<script>
    import { Button } from '$lib/components';
    import { ZoomIn, ZoomOut, X, FlipHorizontal, FlipVertical, Grid3x3, RotateCw, Download } from 'lucide-svelte';
    import { fade } from 'svelte/transition';

    // Props
    let {
        image = null,
        isOpen = false,
        onClose = () => {},
        isModal = false
    } = $props();

    // Viewer state
    let zoom = $state(1);
    let imagePosition = $state({ x: 0, y: 0 });
    let isDragging = $state(false);
    let dragStart = $state({ x: 0, y: 0 });
    let flipHorizontal = $state(false);
    let flipVertical = $state(false);
    let showGrid = $state(false);
    let rotation = $state(0);

    // Reset viewer state when opened
    function resetViewer() {
        zoom = 1;
        imagePosition = { x: 0, y: 0 };
        flipHorizontal = false;
        flipVertical = false;
        showGrid = false;
        rotation = 0;
        centerImage();
        // Prevent scrolling on both body and the sprite viewer container
        document.body.style.overflow = 'hidden';
        if (isModal) {
            const container = document.querySelector('.sprite-viewer-container');
            if (container) {
                container.style.overflow = 'hidden';
            }
        }
    }

    function handleClose() {
        // Restore scrolling
        document.body.style.overflow = '';
        if (isModal) {
            const container = document.querySelector('.sprite-viewer-container');
            if (container) {
                container.style.overflow = '';
            }
        }
        onClose();
    }

    function centerImage() {
        if (!image) return;
        imagePosition = { x: 0, y: 0 };
    }

    function zoomIn() {
        const oldZoom = zoom;
        zoom = Math.min(25, zoom + 1);

        if (zoom !== oldZoom) {
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function zoomOut() {
        const oldZoom = zoom;
        zoom = Math.max(1, zoom - 1);

        if (zoom !== oldZoom) {
            const zoomRatio = zoom / oldZoom;
            imagePosition = {
                x: imagePosition.x * zoomRatio,
                y: imagePosition.y * zoomRatio
            };
        }
    }

    function rotateImage() {
        // Rotate the image position around the viewer center (0, 0)
        const deltaRotation = 90; // Rotating by 90 degrees
        const angleRad = (deltaRotation * Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // Rotate the position vector around the origin
        const newX = imagePosition.x * cos - imagePosition.y * sin;
        const newY = imagePosition.x * sin + imagePosition.y * cos;

        imagePosition = { x: newX, y: newY };
        rotation = (rotation + 90) % 360;
    }

    function toggleFlipHorizontal() {
        flipHorizontal = !flipHorizontal;
        // Flip the horizontal position around the viewer center
        imagePosition = { x: -imagePosition.x, y: imagePosition.y };
    }

    function toggleFlipVertical() {
        flipVertical = !flipVertical;
        // Flip the vertical position around the viewer center
        imagePosition = { x: imagePosition.x, y: -imagePosition.y };
    }

    function toggleGrid() {
        showGrid = !showGrid;
    }


    async function downloadImage() {
        if (!image) return;

        try {
            // Check if File System Access API is available (Chrome/Edge)
            if ('showSaveFilePicker' in window) {
                // Determine file extension from URL or filename
                const filename = image.filename || 'sprite-image.png';
                const extension = filename.split('.').pop().toLowerCase();

                // Map extension to MIME type
                const mimeTypes = {
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'bmp': 'image/bmp'
                };

                const mimeType = mimeTypes[extension] || 'image/png';
                const accept = {};
                accept[mimeType] = ['.' + extension];

                // Show save file picker
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Image Files',
                        accept: accept
                    }]
                });

                // Fetch the image and save it
                const response = await fetch(image.url);
                const blob = await response.blob();
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                // Fallback for browsers without File System Access API
                // This will download to the default downloads folder
                const response = await fetch(image.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = image.filename || 'sprite-image.png';

                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 100);
            }
        } catch (error) {
            // Handle user cancellation or other errors
            if (error.name === 'AbortError') {
                // User cancelled the save dialog
                return;
            }

            console.error('Failed to download image:', error);
            // Final fallback
            const a = document.createElement('a');
            a.href = image.url;
            a.download = image.filename || 'sprite-image.png';
            a.click();
        }
    }

    function handleWheel(event) {
        if (!isOpen) return;

        event.preventDefault();

        const delta = event.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(1, Math.min(25, zoom + delta));

        if (newZoom !== zoom) {
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = event.clientX - rect.left - rect.width / 2;
            const mouseY = event.clientY - rect.top - rect.height / 2;

            // Get mouse position relative to current image position
            const relativeX = mouseX - imagePosition.x;
            const relativeY = mouseY - imagePosition.y;

            // Apply inverse rotation to get image space coordinates
            const angleRad = -(rotation * Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);

            const rotatedMouseX = relativeX * cos - relativeY * sin;
            const rotatedMouseY = relativeX * sin + relativeY * cos;

            // Convert to image coordinates at current zoom
            const imagePointX = rotatedMouseX / zoom;
            const imagePointY = rotatedMouseY / zoom;

            // Update zoom
            zoom = newZoom;

            // Rotate the image point back to screen space at new zoom
            const newRotatedX = imagePointX * zoom * cos + imagePointY * zoom * sin;
            const newRotatedY = -imagePointX * zoom * sin + imagePointY * zoom * cos;

            // Calculate new image position to keep the point under the mouse
            imagePosition = {
                x: mouseX - newRotatedX,
                y: mouseY - newRotatedY
            };
        }
    }

    function handleMouseDown(event) {
        if (event.button === 0) {
            event.preventDefault();
            isDragging = true;

            dragStart = {
                x: event.clientX,
                y: event.clientY,
                imageX: imagePosition.x,
                imageY: imagePosition.y
            };
        }
    }

    function handleMouseMove(event) {
        if (isDragging) {
            event.preventDefault();

            const deltaX = event.clientX - dragStart.x;
            const deltaY = event.clientY - dragStart.y;

            imagePosition = {
                x: dragStart.imageX + deltaX,
                y: dragStart.imageY + deltaY
            };
        }
    }

    function handleMouseUp(event) {
        if (isDragging) {
            event.preventDefault();
        }
        isDragging = false;
    }

    function handleKeydown(event) {
        if (!isOpen) return;

        if (event.key === 'Escape') {
            handleClose();
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoomIn();
        } else if (event.key === '-') {
            event.preventDefault();
            zoomOut();
        }
    }

    // Reset viewer state when opened
    $effect(() => {
        if (isOpen) {
            resetViewer();
        }
    });

    // Add event listeners for mouse and keyboard
    $effect(() => {
        if (isOpen) {
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

{#if isOpen && image}
    <div class="viewer-modal" transition:fade={{ duration: 200 }} onclick={(e) => e.target === e.currentTarget && handleClose()}>
        <div class="viewer-container">
            <div class="viewer-image-container" onwheel={handleWheel}>
                <div class="image-wrapper">
                    <div class="image-with-grid">
                        <img
                            src={image.url}
                            alt={image.alt || 'Sprite image'}
                            class="viewer-image"
                            style="
                                transform: translate3d({Math.round(imagePosition.x)}px, {Math.round(imagePosition.y)}px, 0)
                                          rotate({rotation}deg)
                                          scale({zoom})
                                          scaleX({flipHorizontal ? -1 : 1})
                                          scaleY({flipVertical ? -1 : 1});
                                width: {image.width}px;
                                height: {image.height}px;
                                image-rendering: pixelated;
                            "
                            onmousedown={handleMouseDown}
                            draggable="false"
                            loading="eager"
                        />

                            {#if showGrid && zoom >= 2}
                                {@const gridWidth = image.width * zoom}
                                {@const gridHeight = image.height * zoom}
                                {@const gridX = Math.round(imagePosition.x - (image.width * (zoom - 1) / 2))}
                                {@const gridY = Math.round(imagePosition.y - (image.height * (zoom - 1) / 2))}
                                <!--
                                    CSS gradient-based pixel grid overlay.

                                    Grid is rendered at screen resolution (width * zoom) with fixed 1px lines.
                                    Position adjusted because image's transform-origin is based on base size,
                                    but grid is already at zoomed size.
                                -->
                                <div
                                    class="pixel-grid"
                                    style="
                                        width: {gridWidth}px;
                                        height: {gridHeight}px;
                                        transform: translate({gridX}px, {gridY}px)
                                                  rotate({rotation}deg)
                                                  scaleX({flipHorizontal ? -1 : 1})
                                                  scaleY({flipVertical ? -1 : 1});
                                        background-size: {zoom}px {zoom}px;
                                    "
                                ></div>
                            {/if}
                    </div>
                </div>
            </div>
        </div>

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
                onclick={handleClose}
            >
                <X class="h-4 w-4" />
            </Button>
        </div>
    </div>
{/if}

<style>
    /* Fullscreen Viewer Modal */
    .viewer-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }

    .viewer-container {
        width: 90%;
        height: 90vh;
        position: relative;
        background:
            linear-gradient(to right, white 5px, transparent 5px),
            linear-gradient(to bottom, white 5px, transparent 5px),
            linear-gradient(0deg, #002705 0%, #12a740 100%);
        background-size: 50px 50px, 50px 50px, 100% 100%;
        background-position: 0 0, 0 0, 0 0;
        background-blend-mode: overlay, overlay, normal;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        overflow: hidden;
        animation: gridPan 2s linear infinite;
    }

    @keyframes gridPan {
        0% { background-position: 0 0, 0 0, 0 0; }
        100% { background-position: 50px 0, 0 0, 0 0; }
    }

    .viewer-image-container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        cursor: grab;
        position: relative;
    }

    .viewer-image-container:active {
        cursor: grabbing;
    }

    .image-wrapper, .image-with-grid {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .viewer-image {
        image-rendering: pixelated;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: -webkit-crisp-edges;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        -ms-interpolation-mode: nearest-neighbor;
        transform-origin: center center;
        user-select: none;
        pointer-events: auto;
        cursor: grab;
        max-width: none;
        filter: drop-shadow(10px 10px 2px rgba(0, 0, 0, .7));
    }

    .viewer-image:active {
        cursor: grabbing;
    }

    /*
     * CSS gradient-based pixel grid overlay
     * Renders at screen resolution with fixed 1px lines
     */
    .pixel-grid {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        transform-origin: center center;
        /* 1px dark grey lines, repeating at background-size interval */
        background:
            linear-gradient(to right, rgb(50 50 50) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(50 50 50) 1px, transparent 1px);
        /* Border around the entire grid */
        outline: 1px solid rgb(50 50 50);
        outline-offset: -1px;
        /* Opacity for the entire grid */
        filter: opacity(0.6);
        /* Prevent interaction */
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
    }

    .viewer-controls {
        position: absolute;
        bottom: 70px;
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

    .viewer-controls .close-btn {
        background-color: #dc2626 !important;
        border-color: #dc2626 !important;
        color: white !important;
    }

    .viewer-controls .close-btn:hover {
        background-color: #b91c1c !important;
        border-color: #b91c1c !important;
    }

    .zoom-indicator {
        font-family: 'saira', monospace;
        font-weight: 600;
        color: var(--font-color);
        min-width: 30px;
        text-align: center;
        font-size: 14px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .viewer-controls {
            flex-wrap: wrap;
            max-width: 90%;
            justify-content: center;
        }
    }
</style>