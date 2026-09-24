<script lang="ts">
  import { onMount, tick, untrack, type Snippet } from 'svelte';
  import { ImageOff, LoaderCircle, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-svelte';

  // One comic page, shown pixel-perfect and pannable - the reader's take on
  // SpriteImageViewer. Pages are never scaled by a fractional amount (that's
  // what turns sprite pixels into uneven "mixels" on phones): each comic pixel
  // always covers a whole number of *device* pixels, and anything bigger than
  // the stage is panned instead of shrunk - native scrolling for touch (with
  // momentum, and chaining to the page at the edges), click-drag for mice.

  interface Props {
    src: string | null;
    alt: string;
    /** Fills the whole screen, like the sprite viewer. */
    immersive?: boolean;
    /** Square nav buttons: hang off the stage's left edge on wide screens,
        lead the toolbar otherwise. */
    lead?: Snippet;
    /** Left side of the toolbar (page info). */
    info?: Snippet;
    /** Page navigation, rendered inside the stage only while immersive. */
    footer?: Snippet;
  }

  let { src, alt, immersive = $bindable(false), lead, info, footer }: Props = $props();

  let stageEl = $state<HTMLDivElement>();
  let canvasEl = $state<HTMLDivElement>();
  let imgEl = $state<HTMLImageElement>();
  let natural = $state<{ w: number; h: number } | null>(null);
  let loading = $state(true);
  let failed = $state(false);

  // Zoom is picked (and labelled) in device pixels per comic pixel: "1x" is
  // the image's true size on the physical screen. The default is the
  // screen's own ratio rounded (1x on most desktops), capped at 2x - on 3x
  // phones that fits noticeably more of the page than normal CSS size while
  // staying readable. Every level is crisp, even on in-between ratios like
  // 2.625.
  let dpr = $state(1);
  let chosenDevicePx = $state<number | null>(null);
  const screenDevicePx = $derived(Math.max(1, Math.round(dpr)));
  const defaultDevicePx = $derived(Math.min(2, screenDevicePx));
  const devicePx = $derived(chosenDevicePx ?? defaultDevicePx);
  const maxDevicePx = $derived(screenDevicePx * 4);
  const cssScale = $derived(devicePx / dpr);
  const dispW = $derived(natural ? natural.w * cssScale : 0);
  const dispH = $derived(natural ? natural.h * cssScale : 0);
  const zoomLabel = $derived(`${devicePx}x`);

  let viewW = $state(0);
  let viewH = $state(0);
  let scrollX = $state(0);
  let scrollY = $state(0);
  const overflowX = $derived(dispW > viewW + 1);
  const overflowY = $derived(dispH > viewH + 1);
  const overflowing = $derived(!!natural && (overflowX || overflowY));

  onMount(() => {
    const updateDpr = () => (dpr = window.devicePixelRatio || 1);
    updateDpr();
    // Browser zoom and moving between monitors both change the ratio.
    window.addEventListener('resize', updateDpr);
    return () => window.removeEventListener('resize', updateDpr);
  });

  // New page: start reading from the top-left. The previous page's size is
  // kept until the new one loads, so same-sized pages don't jump around.
  $effect(() => {
    src;
    untrack(() => {
      failed = false;
      loading = true;
      stageEl?.scrollTo(0, 0);
    });
  });

  // A cached image can finish loading before the load handler is attached.
  $effect(() => {
    if (imgEl?.complete && imgEl.naturalWidth) untrack(handleLoad);
  });

  function handleLoad() {
    if (!imgEl) return;
    natural = { w: imgEl.naturalWidth, h: imgEl.naturalHeight };
    loading = false;
  }

  function handleError() {
    failed = true;
    loading = false;
  }

  function onScroll() {
    if (!stageEl) return;
    scrollX = stageEl.scrollLeft;
    scrollY = stageEl.scrollTop;
  }

  // Zooms around a point (client coords; the stage's center by default) so
  // whatever is under it stays put.
  async function setZoom(next: number, anchor?: { x: number; y: number }) {
    next = Math.min(maxDevicePx, Math.max(1, next));
    if (next === devicePx) return;
    if (!stageEl || !canvasEl || !natural) {
      chosenDevicePx = next;
      return;
    }
    const stageRect = stageEl.getBoundingClientRect();
    const canvasRect = canvasEl.getBoundingClientRect();
    const ax = anchor ? anchor.x - stageRect.left : stageEl.clientWidth / 2;
    const ay = anchor ? anchor.y - stageRect.top : stageEl.clientHeight / 2;
    const fx = (stageRect.left + ax - canvasRect.left) / canvasRect.width;
    const fy = (stageRect.top + ay - canvasRect.top) / canvasRect.height;

    chosenDevicePx = next === defaultDevicePx ? null : next;
    await tick();
    stageEl.scrollLeft = canvasEl.offsetLeft + fx * dispW - ax;
    stageEl.scrollTop = canvasEl.offsetTop + fy * dispH - ay;
  }

  // Mouse: drag to pan. (Clicking never turns the page - it misfired
  // constantly while exploring big pages; the nav bar and arrow keys do that.)
  let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null;
  let dragging = $state(false);

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !stageEl) return;
    event.preventDefault();
    drag = { x: event.clientX, y: event.clientY, left: stageEl.scrollLeft, top: stageEl.scrollTop, moved: false };
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || !stageEl) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (!overflowing || Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      dragging = true;
      stageEl.setPointerCapture(event.pointerId);
    }
    stageEl.scrollLeft = drag.left - dx;
    stageEl.scrollTop = drag.top - dy;
  }

  function onPointerUp() {
    drag = null;
    dragging = false;
  }

  // Pinch steps through whole zoom levels. `touch-action: pan-x pan-y` on the
  // stage keeps the browser from zooming the whole page instead.
  $effect(() => {
    const el = stageEl;
    if (!el) return;
    let pinch: { distance: number; devicePx: number } | null = null;
    const distance = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { distance: distance(e.touches), devicePx };
    };
    const move = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const next = Math.round(pinch.devicePx * (distance(e.touches) / pinch.distance));
      setZoom(next, {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      });
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  });

  // Minimap: where the stage is looking, and tap/drag on it to jump there.
  const MINIMAP_SIZE = 84;
  const minimapScale = $derived(natural ? Math.min(MINIMAP_SIZE / natural.w, MINIMAP_SIZE / natural.h) : 0);
  const miniW = $derived(natural ? natural.w * minimapScale : 0);
  const miniH = $derived(natural ? natural.h * minimapScale : 0);
  const viewRect = $derived({
    left: overflowX ? (scrollX / dispW) * miniW : 0,
    top: overflowY ? (scrollY / dispH) * miniH : 0,
    width: overflowX ? (viewW / dispW) * miniW : miniW,
    height: overflowY ? (viewH / dispH) * miniH : miniH,
  });
  let miniDragging = false;

  function jumpFromMinimap(event: PointerEvent) {
    if (!stageEl) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fx = (event.clientX - rect.left) / rect.width;
    const fy = (event.clientY - rect.top) / rect.height;
    stageEl.scrollLeft = fx * dispW - viewW / 2;
    stageEl.scrollTop = fy * dispH - viewH / 2;
  }

  // Immersive: lock the page behind it, Escape leaves.
  $effect(() => {
    if (!immersive) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') immersive = false;
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="stage-frame" class:immersive>
  <div class="stage-toolbar">
    {#if lead}<div class="stage-lead">{@render lead()}</div>{/if}
    <div class="stage-info">{@render info?.()}</div>
    <div class="stage-tools">
      <button
        type="button"
        class="tool-btn"
        onclick={() => setZoom(devicePx - 1)}
        disabled={devicePx <= 1}
        aria-label="Zoom out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        type="button"
        class="tool-btn zoom-label"
        onclick={() => setZoom(defaultDevicePx)}
        title="Screen pixels per comic pixel - click to reset"
        aria-label="Zoom {zoomLabel}, reset"
      >
        {zoomLabel}
      </button>
      <button
        type="button"
        class="tool-btn"
        onclick={() => setZoom(devicePx + 1)}
        disabled={devicePx >= maxDevicePx}
        aria-label="Zoom in"
      >
        <ZoomIn size={18} />
      </button>
      <button
        type="button"
        class="tool-btn"
        onclick={() => (immersive = !immersive)}
        aria-label={immersive ? 'Exit fullscreen' : 'Fullscreen'}
        title={immersive ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
      >
        {#if immersive}<Minimize2 size={18} />{:else}<Maximize2 size={18} />{/if}
      </button>
    </div>
  </div>

  <div class="stage-area">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="stage"
      class:overflowing
      class:dragging
      class:loading={!natural}
      bind:this={stageEl}
      bind:clientWidth={viewW}
      bind:clientHeight={viewH}
      style:--content-h="{dispH}px"
      onscroll={onScroll}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      {#if src && !failed}
        <div class="stage-canvas-wrap">
          <div class="stage-canvas" bind:this={canvasEl} style:width="{dispW}px" style:height="{dispH}px">
            {#key src}
              <img
                bind:this={imgEl}
                {src}
                {alt}
                draggable="false"
                decoding="async"
                style:width="{dispW}px"
                style:height="{dispH}px"
                onload={handleLoad}
                onerror={handleError}
              />
            {/key}
          </div>
        </div>
      {:else}
        <div class="stage-missing">
          <ImageOff size={28} />
          <span>Image missing from archive</span>
        </div>
      {/if}
    </div>

    {#if loading && src && !failed}
      <div class="stage-spinner" aria-hidden="true"><LoaderCircle size={28} /></div>
    {/if}

    {#if overflowing && src && !failed}
      <div
        class="minimap"
        style:width="{miniW}px"
        style:height="{miniH}px"
        role="presentation"
        onpointerdown={(e) => {
          miniDragging = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          jumpFromMinimap(e);
        }}
        onpointermove={(e) => miniDragging && jumpFromMinimap(e)}
        onpointerup={() => (miniDragging = false)}
        onpointercancel={() => (miniDragging = false)}
      >
        <img {src} alt="" draggable="false" />
        <div
          class="minimap-view"
          style:left="{viewRect.left}px"
          style:top="{viewRect.top}px"
          style:width="{viewRect.width}px"
          style:height="{viewRect.height}px"
        ></div>
      </div>
    {/if}
  </div>

  {#if immersive && footer}
    <div class="stage-footer">{@render footer()}</div>
  {/if}
</div>

<style>
  .stage-frame {
    --stage-bg: color-mix(in srgb, var(--page-color) 55%, black);
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--page-color);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .stage-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 6px;
    border-bottom: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 75%, white);
    font-family: 'saira', sans-serif;
    color: var(--font-color);
  }

  .stage-lead {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .stage-info {
    min-width: 0;
    flex: 1;
    padding-left: 6px;
  }

  .stage-tools {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
    padding: 0 6px;
    background: color-mix(in srgb, var(--page-color) 80%, black);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 65%, white);
    color: var(--font-color);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  /* Hover only where there's a real hover pointer - on touchscreens a tap
     leaves it stuck "hovered" until something else is tapped. */
  @media (hover: hover) {
    .tool-btn:hover:not(:disabled) {
      border-color: var(--font-link-color);
      color: var(--font-link-color);
    }
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-label {
    min-width: 48px;
    font-family: 'saira', sans-serif;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .stage-area {
    position: relative;
    background: var(--stage-bg);
  }

  .stage {
    position: relative;
    overflow: auto;
    /* Drag + minimap replace scrollbars (which would also eat into the
       stage's height and force a second axis of scrolling). */
    scrollbar-width: none;
    height: min(var(--content-h), var(--stage-max-h, 100000px));
    min-height: 200px;
    touch-action: pan-x pan-y;
    user-select: none;
    -webkit-user-select: none;
  }

  .stage::-webkit-scrollbar {
    display: none;
  }

  .stage.overflowing {
    cursor: grab;
  }

  .stage.dragging {
    cursor: grabbing;
  }

  .stage.loading {
    height: 60vh;
  }

  /* Centers pages smaller than the stage without clipping the left/top of
     bigger ones (which plain flex centering in a scroller would). */
  .stage-canvas-wrap {
    display: grid;
    place-items: center;
    width: max-content;
    height: max-content;
    min-width: 100%;
    min-height: 100%;
  }

  .stage-canvas img {
    display: block;
    max-width: none;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -webkit-user-drag: none;
  }

  .stage-missing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    min-height: 200px;
    font-family: 'saira', sans-serif;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--font-color);
    opacity: 0.5;
    cursor: default;
  }

  .stage-spinner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: var(--font-color);
    opacity: 0.6;
  }

  .stage-spinner :global(svg) {
    animation: stage-spin 0.9s linear infinite;
  }

  @keyframes stage-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .minimap {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background: var(--stage-bg);
    outline: 2px solid color-mix(in srgb, var(--page-color) 75%, white);
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
    opacity: 0.9;
    touch-action: none;
    cursor: pointer;
  }

  .minimap img {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0.7;
    pointer-events: none;
  }

  .minimap-view {
    position: absolute;
    border: 2px solid var(--font-link-color);
    background: color-mix(in srgb, var(--font-link-color) 20%, transparent);
    pointer-events: none;
  }

  /* Fullscreen, sprite-viewer style: toolbar on top, page nav at the bottom,
     the page fills everything between. */
  .stage-frame.immersive {
    position: fixed;
    inset: 0;
    z-index: 10000;
    border: none;
    box-shadow: none;
  }

  .stage-frame.immersive .stage-area {
    flex: 1;
    min-height: 0;
  }

  .stage-frame.immersive .stage {
    height: 100%;
  }

  .stage-footer {
    border-top: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 75%, white);
    padding-bottom: env(safe-area-inset-bottom);
  }

  @media (max-width: 768px) {
    /* Full-bleed on phones, and short enough that the page nav bar below
       and a sliver of what follows stay on screen. */
    .stage-frame:not(.immersive) {
      border-left: none;
      border-right: none;
      box-shadow: none;
      width: 100vw;
      margin-left: calc(-50vw + 50%);
    }

    .stage {
      --stage-max-h: calc(100svh - 170px);
    }

    .stage-toolbar {
      gap: 6px;
    }
  }

  /* Phones: six buttons would squeeze the title to a few letters, so the
     title gets its own full-width row with the buttons beneath. */
  @media (max-width: 560px) {
    .stage-toolbar {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-areas:
        'info info'
        'lead tools';
      row-gap: 6px;
    }

    .stage-info {
      grid-area: info;
      /* Clear the floating hamburger menu button (top-right, 42px wide). */
      padding: 0 52px 0 4px;
    }

    .stage-lead {
      grid-area: lead;
    }

    .stage-tools {
      grid-area: tools;
      justify-self: end;
    }

    .stage {
      --stage-max-h: calc(100svh - 215px);
    }
  }
</style>
