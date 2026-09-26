<script lang="ts">
  import Spinner from '../Spinner.svelte';
  import { ZoomIn, ZoomOut, Shrink } from 'lucide-svelte';
  import { Button } from '$lib/components';

  interface Props {
    comicId: number;
    n: number;
    // Known extension from the comic's meta.json - when present this skips
    // the guessing chain entirely (one request instead of up to five).
    ext?: string;
    /** Tells Quick Sort how zoomed this image is (for its phone controls). */
    onScaleChange?: (scale: number) => void;
  }

  let { comicId, n, ext, onScaleChange }: Props = $props();

  // Fallback for entries uploaded before meta.json existed (or whose
  // meta.json failed to load) - uploaded files keep whatever extension the
  // source file actually had (jpg/png/gif mixed across the archive), so
  // without a known extension we just try them in likelihood order and
  // fall back to a "no preview" placeholder once every extension has 404'd.
  const GUESS_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  let extIndex = $state(0);
  let failed = $state(false);
  let loaded = $state(false);

  const src = $derived(
    `https://cdn.sgxp.me/archive-triage/${comicId}/${n}.${ext || GUESS_EXTENSIONS[extIndex]}`
  );

  // Reset load/error state only when the actual image URL changes - not on
  // every prop change. meta.json often resolves *after* the guessing
  // fallback has already loaded the image successfully; if `ext` then
  // arrives with the same extension the guess already found, `src` stays
  // identical, so the <img> never re-fires a load event. Resetting
  // `loaded` in that case left the spinner stuck forever (only cleared by
  // a full remount, e.g. navigating away and back). Comparing against the
  // resolved src instead means we only reset when there's an actual new
  // image to wait for.
  let lastSrc = src;
  $effect(() => {
    if (src !== lastSrc) {
      lastSrc = src;
      failed = false;
      loaded = false;
    }
  });

  function handleError() {
    loaded = false;
    if (ext) {
      failed = true;
    } else if (extIndex < GUESS_EXTENSIONS.length - 1) {
      extIndex++;
    } else {
      failed = true;
    }
  }

  function handleLoad() {
    loaded = true;
  }

  // ---------- Zoom and pan ----------
  // Pinch (touch), wheel (mouse/trackpad) or the corner buttons zoom; a
  // drag moves a zoomed image; a double tap/click toggles 2.5x at that
  // spot. The image is transformed inside its slot (which clips it), and
  // always kept covering the slot (or centred/top-aligned where it's
  // smaller) so it can't be flung out of view. While zoomed, or after a
  // pinch, touch gestures stay here instead of reaching Quick Sort's
  // swipe-between-images handler.
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const STEP = 1.5;
  const TAP_ZOOM = 2.5;

  let slotEl = $state<HTMLDivElement>();
  let imgEl = $state<HTMLImageElement>();
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  // Eased only for button/double-tap zooms; gestures follow the finger.
  let animate = $state(false);
  let dragging = $state(false);
  // Pixel art stays crisp once it's shown at (or above) its real size.
  let pixelated = $state(false);
  const zoomed = $derived(scale > 1.001);
  const canZoomIn = $derived(scale < MAX_SCALE);

  $effect(() => {
    onScaleChange?.(scale);
  });

  // Driven by this image's own corner buttons on desktop, and by Quick
  // Sort's single fixed set of buttons on phones (via bind:this).
  export function zoomIn() {
    zoomAtCentre(scale * STEP);
  }

  export function zoomOut() {
    zoomAtCentre(scale / STEP);
  }

  export function fit() {
    reset();
  }

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  function geometry() {
    return {
      W: slotEl!.clientWidth,
      H: slotEl!.clientHeight,
      ox: imgEl!.offsetLeft,
      oy: imgEl!.offsetTop,
      w: imgEl!.offsetWidth,
      h: imgEl!.offsetHeight,
    };
  }

  /** Keeps the scaled image covering the slot: centred across when it's
   *  narrower than the slot, top-aligned when it's shorter. */
  function bounded(s: number, x: number, y: number): [number, number] {
    const { W, H, ox, oy, w, h } = geometry();
    const bx = w * s <= W ? (W - w * s) / 2 - ox : Math.min(-ox, Math.max(W - w * s - ox, x));
    const by = h * s <= H ? -oy : Math.min(-oy, Math.max(H - h * s - oy, y));
    return [bx, by];
  }

  /** A client point, relative to the unscaled image's top-left corner. */
  function local(clientX: number, clientY: number) {
    const r = slotEl!.getBoundingClientRect();
    const { ox, oy } = geometry();
    return { x: clientX - r.left - slotEl!.clientLeft - ox, y: clientY - r.top - slotEl!.clientTop - oy };
  }

  function apply(s: number, x: number, y: number) {
    [tx, ty] = bounded(s, x, y);
    scale = s;
    pixelated = !!imgEl && imgEl.offsetWidth * s >= imgEl.naturalWidth - 0.5;
  }

  /** Zooms to `next`, keeping the image point under (clientX, clientY) there. */
  function zoomAt(next: number, clientX: number, clientY: number) {
    if (!slotEl || !imgEl) return;
    const s = clampScale(next);
    const p = local(clientX, clientY);
    apply(s, p.x - ((p.x - tx) * s) / scale, p.y - ((p.y - ty) * s) / scale);
  }

  function zoomAtCentre(next: number) {
    if (!slotEl) return;
    const r = slotEl.getBoundingClientRect();
    animate = true;
    zoomAt(next, r.left + r.width / 2, r.top + r.height / 2);
  }

  function reset() {
    animate = true;
    scale = 1;
    tx = 0;
    ty = 0;
    pixelated = false;
  }

  // Pointer gestures: one pointer drags (when zoomed), two pinch.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; scale: number; qx: number; qy: number } | null = null;
  let drag: { x: number; y: number; tx: number; ty: number } | null = null;
  let multiTouch = false;
  let moved = false;
  let downAt = { x: 0, y: 0 };
  let lastTap: { t: number; x: number; y: number } | null = null;

  function pinchState() {
    const [a, b] = [...pointers.values()];
    const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid };
  }

  function startDrag(x: number, y: number) {
    drag = zoomed ? { x, y, tx, ty } : null;
  }

  function onPointerDown(e: PointerEvent) {
    if (!loaded || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('.qs-zoom-controls')) return;
    slotEl!.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    animate = false;
    if (pointers.size === 1) {
      multiTouch = false;
      moved = false;
      downAt = { x: e.clientX, y: e.clientY };
      startDrag(e.clientX, e.clientY);
    } else if (pointers.size === 2) {
      multiTouch = true;
      drag = null;
      const { dist, mid } = pinchState();
      pinch = { dist, scale, qx: (mid.x - tx) / scale, qy: (mid.y - ty) / scale };
    }
    dragging = !!drag;
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) moved = true;
    if (pinch && pointers.size >= 2) {
      const { dist, mid } = pinchState();
      const s = clampScale((pinch.scale * dist) / pinch.dist);
      apply(s, mid.x - pinch.qx * s, mid.y - pinch.qy * s);
    } else if (drag) {
      apply(scale, drag.tx + e.clientX - drag.x, drag.ty + e.clientY - drag.y);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      // One finger lifted mid-pinch: carry on panning with the other.
      const [p] = [...pointers.values()];
      startDrag(p.x, p.y);
    } else if (pointers.size === 0) {
      drag = null;
      if (scale < 1.02) reset();
      if (e.type === 'pointerup' && !multiTouch && !moved) handleTap(e);
    }
    dragging = !!drag;
  }

  function handleTap(e: PointerEvent) {
    const now = e.timeStamp;
    if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      lastTap = null;
      if (zoomed) {
        reset();
      } else {
        animate = true;
        zoomAt(TAP_ZOOM, e.clientX, e.clientY);
      }
    } else {
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  }

  // Keeps a pinch or a zoomed drag from also flipping to the next image
  // (Quick Sort's own touch handlers sit on an ancestor).
  function onTouchEnd(e: TouchEvent) {
    if (zoomed || multiTouch) e.stopPropagation();
  }

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  $effect(() => {
    const el = slotEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!loaded || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      animate = false;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(scale * Math.exp(-delta * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
</script>

<div
  class="qs-image-slot"
  class:zoomed
  class:dragging
  bind:this={slotEl}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  ontouchend={onTouchEnd}
  role="presentation"
>
  {#if !failed}
    {#if !loaded}
      <div class="qs-image-loading">
        <Spinner size={24} />
      </div>
    {/if}
    <img
      bind:this={imgEl}
      {src}
      onerror={handleError}
      onload={handleLoad}
      alt="Page {n}"
      loading="eager"
      draggable="false"
      class:qs-image-hidden={!loaded}
      class:animate
      class:pixelated
      style:transform="translate({tx}px, {ty}px) scale({scale})"
      ontransitionend={() => (animate = false)}
    />
    {#if loaded}
      <!-- Desktop only - phones get one fixed set in Quick Sort instead, so
           the buttons don't slide along with the images. Fit comes first so
           it can appear without moving the other two. -->
      <div class="qs-zoom-controls">
        {#if zoomed}
          <Button variant="tool" size="icon-mini" icon={Shrink} onclick={fit} aria-label="Fit image" title="Fit image" />
        {/if}
        <Button variant="tool" size="icon-mini" icon={ZoomOut} disabled={!zoomed} onclick={zoomOut} aria-label="Zoom out" title="Zoom out" />
        <Button variant="tool" size="icon-mini" icon={ZoomIn} disabled={!canZoomIn} onclick={zoomIn} aria-label="Zoom in" title="Zoom in" />
      </div>
    {/if}
  {:else}
    <div class="qs-no-preview">No preview</div>
  {/if}
</div>

<style>
  .qs-image-slot {
    position: relative;
    /* Zoomed images are clipped to the slot. */
    overflow: hidden;
    /* Every touch gesture on the image is handled here (pinch, pan,
       double tap); single-finger swipes still reach Quick Sort's own
       swipe-between-images handler as touch events. */
    touch-action: none;
    user-select: none;
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  /* Mobile: the box runs edge to edge (the modal's own side padding is
     removed for this row), so a left/right border would just draw a
     stray line flush against the screen edge instead of framing anything -
     drop those, and the top border too (see below) - only the bottom
     border remains. Width is fixed to the full viewport regardless of the
     loaded image's own size or aspect ratio. */
  @media (max-width: 640px) {
    .qs-image-slot {
      /* An explicit viewport-based width (rather than the base rule's
         flex:1 1 0 / width:100%, which depend on the ancestor chain's
         flex-grow having already resolved) is what stops this box
         rendering thin for a frame before settling to full width while
         its content (spinner, or the not-yet-visible <img>) is still
         loading in - the modal locks body scroll and is a fixed
         full-viewport overlay while open, so 100vw reliably matches. */
      flex: 0 0 100vw;
      width: 100vw;
      border-left: none;
      border-right: none;
      /* The box now sits flush against the title bar (no gap between
         them), so its own top border would stack directly on top of the
         title bar's border-bottom, reading as one extra-thick line - drop
         it and let the title bar's border be the only separator there. */
      border-top: none;
    }
  }

  .qs-image-slot img {
    max-width: 100%;
    /* Bounded by the slot's own (properly flex-shrunk) height rather than
       a flat viewport fraction - a fixed vh value ignored how much room
       was actually left once the top bar, dots, and nav/action buttons
       below took their share, which is what let the image overflow and
       push those controls out of view. */
    max-height: 100%;
    object-fit: contain;
    display: block;
    opacity: 1;
    transition: opacity 150ms ease-in-out;
  }

  .qs-image-slot img {
    transform-origin: 0 0;
  }

  .qs-image-slot img.animate {
    transition: opacity 150ms ease-in-out, transform 180ms ease-out;
  }

  .qs-image-slot img.pixelated {
    image-rendering: pixelated;
  }

  .qs-image-slot.zoomed {
    cursor: grab;
  }

  .qs-image-slot.dragging {
    cursor: grabbing;
  }

  /* Bottom-right corner, clear of the slot's edge for the block shadows. */
  .qs-zoom-controls {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    gap: 8px;
    z-index: 1;
  }

  @media (max-width: 640px) {
    .qs-zoom-controls {
      display: none;
    }
  }

  .qs-image-slot img.qs-image-hidden {
    opacity: 0;
    position: absolute;
  }

  .qs-image-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: color-mix(in srgb, var(--font-color) 50%, transparent);
  }

  .qs-no-preview {
    color: color-mix(in srgb, var(--font-color) 50%, transparent);
    font-family: 'saira', monospace;
    font-size: 13px;
    padding: 2rem 1rem;
    text-align: center;
  }
</style>
