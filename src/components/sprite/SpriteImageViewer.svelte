<script>
    import { Button } from '$lib/components';
    import { ZoomIn, ZoomOut, X, FlipHorizontal, FlipVertical, Grid3x3, RotateCw, Download, Palette } from 'lucide-svelte';
    import { fade } from 'svelte/transition';
    import { getPlainSpriteBackground, setPlainSpriteBackground } from '$lib/spritePreferences';

    // Props
    let {
        image = null,
        isOpen = false,
        onClose = () => {},
        isModal = false,
        // Fractional (0-1) point on the sheet to center on when the viewer opens - where
        // the user clicked on the sheet's preview thumbnail. Defaults to dead center.
        focusPoint = { x: 0.5, y: 0.5 }
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
    let plainBackground = $state(false);

    // Pinch-to-zoom state
    let isPinching = $state(false);
    let initialPinchDistance = $state(0);
    let initialPinchZoom = $state(1);
    let pinchCenter = $state({ x: 0, y: 0 });

    // Reset viewer state when opened
    function resetViewer() {
        zoom = 1;
        flipHorizontal = false;
        flipVertical = false;
        showGrid = false;
        rotation = 0;
        isDragging = false;
        isPinching = false;
        centerOnFocusPoint();
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

    // Pan so the clicked point on the sheet (focusPoint, fractional 0-1) lands in the
    // center of the viewport, instead of always centering the sheet's own middle.
    // The image is centered in .viewer-image-container by default (imagePosition {0,0}
    // puts the sheet's own center at the viewport's center), and translate() is applied
    // in real screen pixels after scale(). This is only ever called right after zoom is
    // reset to 1 (see resetViewer), so the offset needed is just the raw pixel distance -
    // it deliberately does NOT read the reactive `zoom` state here: doing so would make
    // the $effect that calls resetViewer() on open also re-fire on every subsequent zoom
    // change (since $effect tracks reads inside called functions too), snapping zoom back
    // to 1 the instant the user tried to zoom in or out.
    function centerOnFocusPoint() {
        if (!image || !image.width || !image.height) {
            imagePosition = { x: 0, y: 0 };
            return;
        }

        const clickX = focusPoint.x * image.width;
        const clickY = focusPoint.y * image.height;

        imagePosition = {
            x: -(clickX - image.width / 2),
            y: -(clickY - image.height / 2)
        };
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

    function togglePlainBackground() {
        plainBackground = !plainBackground;
        setPlainSpriteBackground(plainBackground);
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

    // Helper function to calculate distance between two touch points
    function getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Helper function to get the center point between two touches
    function getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    // Touch event handlers for mobile support
    function handleTouchStart(event) {
        if (event.touches.length === 2) {
            // Two fingers - start pinch zoom
            event.preventDefault();
            isPinching = true;
            isDragging = false;

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            initialPinchDistance = getTouchDistance(touch1, touch2);
            initialPinchZoom = zoom;

            // Get center point of pinch relative to viewer
            const centerPoint = getTouchCenter(touch1, touch2);
            const viewerRect = event.currentTarget.parentElement.getBoundingClientRect();
            pinchCenter = {
                x: centerPoint.x - viewerRect.left - viewerRect.width / 2,
                y: centerPoint.y - viewerRect.top - viewerRect.height / 2
            };
        } else if (event.touches.length === 1 && !isPinching) {
            // One finger - start dragging
            event.preventDefault();
            isDragging = true;

            const touch = event.touches[0];
            dragStart = {
                x: touch.clientX,
                y: touch.clientY,
                imageX: imagePosition.x,
                imageY: imagePosition.y
            };
        }
    }

    function handleTouchMove(event) {
        if (isPinching && event.touches.length === 2) {
            // Pinch zoom
            event.preventDefault();

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            const currentDistance = getTouchDistance(touch1, touch2);
            const distanceChange = currentDistance - initialPinchDistance;

            // Calculate zoom level based on pinch distance
            // Scale factor determines sensitivity (0.01 = 1% zoom per pixel)
            const scaleFactor = 0.01;
            let newZoom = initialPinchZoom + (distanceChange * scaleFactor);
            // Round to nearest integer for cleaner zoom levels (1x, 2x, 3x, etc.)
            newZoom = Math.round(newZoom);
            newZoom = Math.max(1, Math.min(25, newZoom));

            if (newZoom !== zoom) {
                // Get mouse position relative to current image position
                const relativeX = pinchCenter.x - imagePosition.x;
                const relativeY = pinchCenter.y - imagePosition.y;

                // Apply inverse rotation to get image space coordinates
                const angleRad = -(rotation * Math.PI / 180);
                const cos = Math.cos(angleRad);
                const sin = Math.sin(angleRad);

                const rotatedX = relativeX * cos - relativeY * sin;
                const rotatedY = relativeX * sin + relativeY * cos;

                // Convert to image coordinates at current zoom
                const imagePointX = rotatedX / zoom;
                const imagePointY = rotatedY / zoom;

                // Update zoom
                zoom = newZoom;

                // Rotate the image point back to screen space at new zoom
                const newRotatedX = imagePointX * zoom * cos + imagePointY * zoom * sin;
                const newRotatedY = -imagePointX * zoom * sin + imagePointY * zoom * cos;

                // Calculate new image position to keep the point under the pinch center
                imagePosition = {
                    x: pinchCenter.x - newRotatedX,
                    y: pinchCenter.y - newRotatedY
                };
            }
        } else if (isDragging && event.touches.length === 1 && !isPinching) {
            // Single finger drag
            event.preventDefault();

            const touch = event.touches[0];
            const deltaX = touch.clientX - dragStart.x;
            const deltaY = touch.clientY - dragStart.y;

            imagePosition = {
                x: dragStart.imageX + deltaX,
                y: dragStart.imageY + deltaY
            };
        }
    }

    function handleTouchEnd(event) {
        if (isDragging || isPinching) {
            event.preventDefault();
        }

        // Reset states when all fingers are lifted
        if (event.touches.length === 0) {
            isDragging = false;
            isPinching = false;
        }
    }

    function handleKeydown(event) {
        if (!isOpen) return;

        // Escape intentionally does not close the viewer - the red X button is the
        // only way out, per design.
        if (event.key === '+' || event.key === '=') {
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
            plainBackground = getPlainSpriteBackground();
        }
    });

    // Add event listeners for mouse, touch, and keyboard
    $effect(() => {
        if (isOpen) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('keydown', handleKeydown);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                document.removeEventListener('keydown', handleKeydown);
            };
        }
    });
</script>

{#if isOpen && image}
    <div
        class="viewer-modal"
        transition:fade={{ duration: 200 }}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        <div class="viewer-container" class:plain-background={plainBackground}>
            <div class="viewer-image-container" onwheel={handleWheel}>
                <div class="image-wrapper">
                    <div class="image-with-grid">
                        <!--
                            Pan (translate) lives on its own outer wrapper, separate from
                            rotate/zoom (middle wrapper) and flip (scaleX/scaleY, on the img
                            itself). Combining a continuously-changing translate with a
                            transform that inverts local axes - a scaleX(-1)/scaleY(-1) flip,
                            or a rotate(180deg) (which inverts both axes just like a double
                            flip) - in the same `transform` triggers a Chromium compositor bug:
                            dragging updates use a fast "shift the existing tiles" path that
                            doesn't account for the inverted axes, so stale/unpainted tile
                            content creeps in from one edge as you drag (looks like the image
                            getting covered by something invisible), only fixing itself on a
                            full repaint. Keeping translate on an element that never rotates or
                            flips avoids the bug for both cases.
                        -->
                        <div
                            class="pan-wrapper"
                            style="
                                transform: translate({Math.round(imagePosition.x)}px, {Math.round(imagePosition.y)}px);
                                width: {image.width}px;
                                height: {image.height}px;
                            "
                        >
                            <div
                                class="rotate-zoom-wrapper"
                                style="
                                    transform: rotate({rotation}deg) scale({zoom});
                                    width: {image.width}px;
                                    height: {image.height}px;
                                "
                            >
                                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                                <img
                                    src={image.url}
                                    alt={image.alt || 'Sprite image'}
                                    class="viewer-image"
                                    style="
                                        transform: scaleX({flipHorizontal ? -1 : 1})
                                                  scaleY({flipVertical ? -1 : 1});
                                        width: {image.width}px;
                                        height: {image.height}px;
                                        image-rendering: pixelated;
                                        cursor: grab;
                                    "
                                    onmousedown={handleMouseDown}
                                    ontouchstart={handleTouchStart}
                                    draggable="false"
                                    loading="eager"
                                    aria-label="Sprite viewer - click and drag to pan"
                                />
                            </div>
                        </div>

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

                                    Same translate/rotate/flip split as the image above, for the same reason.
                                -->
                                <div
                                    class="pixel-grid-pan-wrapper"
                                    style="
                                        width: {gridWidth}px;
                                        height: {gridHeight}px;
                                        transform: translate({gridX}px, {gridY}px);
                                    "
                                >
                                <div
                                    class="pixel-grid-wrapper"
                                    style="
                                        transform: rotate({rotation}deg);
                                    "
                                >
                                    <div
                                        class="pixel-grid"
                                        style="
                                            transform: scaleX({flipHorizontal ? -1 : 1})
                                                      scaleY({flipVertical ? -1 : 1});
                                            background-size: {zoom}px {zoom}px;
                                        "
                                    ></div>
                                </div>
                                </div>
                            {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Standard tool buttons. The on/off ones use aria-pressed; their
             line-drawing icons opt out of the filled "on" look. -->
        <div class="viewer-controls">
            <Button variant="tool" size="icon" icon={ZoomOut} onclick={zoomOut} disabled={zoom <= 1} aria-label="Zoom out" />

            <span class="zoom-indicator">{zoom}x</span>

            <Button variant="tool" size="icon" icon={ZoomIn} onclick={zoomIn} disabled={zoom >= 25} aria-label="Zoom in" />

            <div class="control-separator"></div>

            <Button variant="tool" size="icon" icon={RotateCw} onclick={rotateImage} aria-label="Rotate" title="Rotate" />
            <Button variant="tool" size="icon" icon={FlipHorizontal} onclick={toggleFlipHorizontal} aria-pressed={flipHorizontal} data-icon-fill="false" aria-label="Flip horizontally" title="Flip horizontally" />
            <Button variant="tool" size="icon" icon={FlipVertical} onclick={toggleFlipVertical} aria-pressed={flipVertical} data-icon-fill="false" aria-label="Flip vertically" title="Flip vertically" />
            <Button variant="tool" size="icon" icon={Grid3x3} onclick={toggleGrid} aria-pressed={showGrid} disabled={zoom < 2} data-icon-fill="false" aria-label="Pixel grid" title="Pixel grid (zoom to 2x or more)" />
            <Button variant="tool" size="icon" icon={Palette} onclick={togglePlainBackground} aria-pressed={plainBackground} data-icon-fill="false" aria-label="Plain background" title="Toggle plain background" />
            <Button variant="tool" size="icon" icon={Download} onclick={downloadImage} aria-label="Download" title="Download" />

            <div class="control-separator"></div>

            <Button variant="tool" onclick={centerImage}>Center</Button>
            <Button variant="tool" size="icon" icon={X} onclick={handleClose} aria-label="Close viewer" title="Close" />
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
        width: 100vw;
        height: 100vh;
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

    /* "Plain sprite viewer background" preference (Settings page) - swap the animated
       green grid for the current theme's own page color, with no animation. */
    .viewer-container.plain-background {
        background: var(--page-color);
        animation: none;
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

    /* Carries only pan (translate, changes continuously while dragging). Rotate
       and zoom live on the nested .rotate-zoom-wrapper, and the flip lives on
       the img inside that - see the markup comment for why.
       `will-change: transform` promotes this to its own GPU layer so the
       constantly-changing translate during drag never has to be composited
       together with a transform that inverts local axes (the flip, or a
       rotate(180deg)) - keeping those on separate layers is what actually
       avoids the Chromium glitch, more so than the markup split alone. The
       drop-shadow filter also lives here (not on the rotated/flipped
       elements) for the same reason: a filter combined with such a transform
       on the same layer is the other half of the bug trigger. */
    .pan-wrapper {
        position: relative;
        transform-origin: center center;
        will-change: transform;
        filter: drop-shadow(10px 10px 2px rgba(0, 0, 0, .7));
    }

    .rotate-zoom-wrapper {
        position: relative;
        transform-origin: center center;
        will-change: transform;
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
        will-change: transform;
    }

    .viewer-image:active {
        cursor: grabbing;
    }

    /*
     * CSS gradient-based pixel grid overlay
     * Renders at screen resolution with fixed 1px lines
     */
    .pixel-grid-pan-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        transform-origin: center center;
        will-change: transform;
    }

    .pixel-grid-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        transform-origin: center center;
        will-change: transform;
    }

    .pixel-grid {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
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
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: color-mix(in srgb, var(--page-color) 95%, transparent);
        backdrop-filter: blur(8px);
        /* Right and bottom padding leave room for the buttons' block shadows. */
        padding: 10px 17px 17px 10px;
        border-radius: 0;
        border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
        box-shadow: var(--box-shadow);
    }

    .control-separator {
        width: 1px;
        height: 24px;
        background-color: color-mix(in srgb, var(--page-color) 60%, white);
        margin: 0 4px;
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
        /* Make viewer full width and height on mobile */
        .viewer-modal {
            width: 100vw;
            height: 100vh;
            padding: 0;
            margin: 0;
        }

        .viewer-container {
            width: 100vw !important;
            height: 100vh !important;
            margin: 0;
            border: none !important;
        }

        .viewer-image-container {
            width: 100%;
            height: 100%;
            touch-action: none; /* Prevent default touch behaviors */
        }

        /* Controls at bottom with full width and no margin */
        .viewer-controls {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100vw;
            max-width: 100vw;
            margin: 0;
            border-radius: 0;
            border-left: none;
            border-right: none;
            border-bottom: none;
            transform: none;
            flex-wrap: wrap;
            justify-content: center;
            padding: 12px 15px 19px 8px;
            gap: 10px;
        }

        .zoom-indicator {
            min-width: 50px;
            font-size: 16px;
            padding: 0 8px;
        }

        /* Hide control separators on mobile to save space */
        .control-separator {
            display: none;
        }
    }
</style>