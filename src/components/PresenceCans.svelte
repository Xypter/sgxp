<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { FRAME_SIZE, canSpriteUrl, type SodaCanChoice } from '../lib/sodaCan';
  import { MIN_BAR, STAGE_MAX, type CanLayer, type CanScale } from '../lib/presenceStage';
  import PixelText from './PixelText.svelte';

  // The server (presenceHub.ts / presenceStage.ts) owns the whole scene: where
  // every can stands, which layer and size it's in, and when it hops. This
  // component only maps that onto this screen's play area and animates it, so
  // every viewer sees the same stage.

  interface PresenceEntry {
    id: string;
    isMember: boolean;
    displayName: string | null;
    can: SodaCanChoice | null;
    x: number; // bar units; see presenceStage.ts
    dir: 1 | -1;
    layer: CanLayer;
    scale: CanScale;
  }

  interface PresenceSnapshot {
    total: number;
    hidden: number;
    entries: PresenceEntry[];
  }

  interface CanView extends PresenceEntry {
    phase: 'rest' | 'crouch' | 'leap';
    restX: number; // where it's standing right now (x is where it's headed)
    fromX: number; // leap start
    until: number; // performance.now() when the current phase ends
  }

  const MAX_SPRITE_H = FRAME_SIZE.idle.h * 2; // tallest frame at 2x
  const ARC: Record<CanScale, number> = { 2: 10, 1: 5 }; // leap height per scale
  const CROUCH_MS = 180; // wind-up pose duration, planted in place
  const LEAP_MS = 270; // airborne duration, arcing from the old spot to the new one
  const DRIVER_MS = 50; // how often we check whether any can's phase should advance
  // Headroom for the "you" arrow riding above the can at the top of a leap:
  // 2px gap + 4px arrow + 2px bob. The bar is vertically centered in the
  // navbar, so it grows by twice this and the cans sit this much higher off
  // its bottom - net effect, the cans stay exactly where they were.
  const MARKER_SPACE = 8;
  const MORE_ID = '__more'; // tooltip target id for the "+N" chip

  let barWidth = $state(0);
  let stageW = $derived(Math.min(barWidth, STAGE_MAX));

  let total = $state(0);
  let hidden = $state(0);
  let selfId = $state<string | null>(null);
  // Only Map/Set from 'svelte/reactivity' are reactive; every change below
  // replaces a can's object rather than mutating it, which SvelteMap tracks.
  const cans = new SvelteMap<string, CanView>();
  let reducedMotion = false;

  function applySnapshot(snapshot: PresenceSnapshot) {
    total = snapshot.total;
    hidden = snapshot.hidden;
    const seen = new Set<string>();
    for (const entry of snapshot.entries) {
      seen.add(entry.id);
      const prev = cans.get(entry.id);
      if (prev) {
        // A resting can slides to its (possibly nudged) spot; one mid-hop
        // just lands wherever the server now says.
        cans.set(entry.id, { ...prev, ...entry, restX: prev.phase === 'rest' ? entry.x : prev.restX });
      } else {
        cans.set(entry.id, { ...entry, phase: 'rest', restX: entry.x, fromX: entry.x, until: 0 });
      }
    }
    for (const id of [...cans.keys()]) if (!seen.has(id)) cans.delete(id);
  }

  function applyHops(hops: { id: string; x: number; dir: 1 | -1 }[]) {
    const now = performance.now();
    for (const hop of hops) {
      const c = cans.get(hop.id);
      if (!c) continue;
      if (reducedMotion) {
        cans.set(hop.id, { ...c, x: hop.x, restX: hop.x, dir: hop.dir });
      } else {
        const from = c.phase === 'rest' ? c.restX : c.x;
        cans.set(hop.id, { ...c, x: hop.x, dir: hop.dir, fromX: from, restX: from, phase: 'crouch', until: now + CROUCH_MS });
      }
    }
  }

  function advancePhases() {
    const now = performance.now();
    for (const [id, c] of cans) {
      if (c.phase === 'crouch' && now >= c.until) {
        cans.set(id, { ...c, phase: 'leap', until: now + LEAP_MS });
      } else if (c.phase === 'leap' && now >= c.until) {
        cans.set(id, { ...c, phase: 'rest', restX: c.x });
      }
    }
  }

  onMount(() => {
    // Astro does full page reloads on navigation (no client-side router), so
    // every link tap tears down this connection and opens a fresh one - each
    // one has to pass the server's join-delay bot filter from scratch. That
    // makes a real visitor who navigates quickly (common on mobile) unlikely
    // to ever stay on one page past the delay, so their can never appears.
    // Once we've proven human once by actually receiving presence-self, skip
    // the delay on subsequent connections in this browsing session.
    let trusted = false;
    try {
      trusted = localStorage.getItem('sgxp-presence-trusted') === '1';
    } catch {
      // Storage inaccessible (private mode, blocked) - fall back to always
      // paying the join delay, same as a first-time visitor.
    }

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const source = new EventSource(trusted ? '/api/presence/stream?fast=1' : '/api/presence/stream');

    source.addEventListener('presence-update', (event: MessageEvent) => {
      applySnapshot(JSON.parse(event.data));
    });

    source.addEventListener('presence-hops', (event: MessageEvent) => {
      applyHops(JSON.parse(event.data));
    });

    source.addEventListener('presence-self', (event: MessageEvent) => {
      selfId = JSON.parse(event.data).id;
      try {
        localStorage.setItem('sgxp-presence-trusted', '1');
      } catch {
        // Nothing to fall back to here - just means next page load pays the
        // join delay again, same as this one did.
      }
    });

    const driver = reducedMotion ? null : setInterval(advancePhases, DRIVER_MS);

    return () => {
      source.close();
      if (driver) clearInterval(driver);
    };
  });

  // Everything on stage, background layer first so members draw on top.
  // Folded cans stay off the stage - except your own, which you always see
  // (drawn like a background visitor).
  let visibleCans = $derived(
    [...cans.values()]
      .filter((c) => c.layer !== 'hidden' || c.id === selfId)
      .sort((a, b) => Number(a.layer === 'front') - Number(b.layer === 'front'))
  );

  const toPx = (u: number) => Math.round((u / MIN_BAR) * stageW);

  function canStyle(c: CanView, scale: CanScale): string {
    const frame = c.phase === 'crouch' ? 'hop' : 'idle';
    const half = Math.round((FRAME_SIZE[frame].w * scale) / 2);
    const idleHalf = Math.round((FRAME_SIZE.idle.w * scale) / 2);
    const from = toPx(c.fromX) - idleHalf;
    const to = toPx(c.x) - idleHalf;
    return `
      --leap-from-x: ${from}px;
      --leap-mid-x: ${Math.round((from + to) / 2)}px;
      --leap-to-x: ${to}px;
      --leap-arc-height: ${ARC[scale]}px;
      --leap-duration: ${LEAP_MS}ms;
      --px: ${scale}px;
      transform: translate(${toPx(c.restX) - half}px, 0px);
    `;
  }

  const nameOf = (c: PresenceEntry) => (c.isMember ? (c.displayName ?? 'A member') : 'Visitor');

  // Hover tooltip (styled like the Jeeves activity chart's). The bar clips
  // its overflow, so the tooltip is portaled to <body> as position: fixed and
  // follows the hovered can every frame while it hops.
  const TIP_GAP = 6; // px between the can's feet and the tooltip
  const TIP_EDGE = 8; // px the tooltip keeps from the viewport edges
  let hoveredId = $state<string | null>(null);
  let hoveredEl: HTMLElement | null = null;
  let tipPos = $state<{ x: number; y: number } | null>(null);
  let tipWidth = $state(0);
  let tipFrame = 0;

  function trackTip() {
    if (!hoveredEl) return;
    const r = hoveredEl.getBoundingClientRect();
    tipPos = { x: r.left + r.width / 2, y: r.bottom + TIP_GAP };
    tipFrame = requestAnimationFrame(trackTip);
  }

  function showTip(id: string, el: HTMLElement) {
    cancelAnimationFrame(tipFrame);
    hoveredId = id;
    hoveredEl = el;
    trackTip();
  }

  function hideTip(id?: string) {
    if (id && id !== hoveredId) return;
    cancelAnimationFrame(tipFrame);
    hoveredId = null;
    hoveredEl = null;
    tipPos = null;
  }

  // The hovered can can vanish mid-hover (that person left, or got folded
  // into "+N") - drop its tip.
  $effect(() => {
    if (!hoveredId) return;
    const gone = hoveredId === MORE_ID ? hidden === 0 : !visibleCans.some((c) => c.id === hoveredId);
    if (gone) hideTip();
  });

  let hoveredCan = $derived(hoveredId && hoveredId !== MORE_ID ? (cans.get(hoveredId) ?? null) : null);
  let tipLeft = $derived(
    tipPos
      ? Math.min(Math.max(tipPos.x - tipWidth / 2, TIP_EDGE), window.innerWidth - tipWidth - TIP_EDGE)
      : 0
  );

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }
</script>

{#if total > 0}
  <div
    class="presence-bar"
    bind:clientWidth={barWidth}
    style="height: {MAX_SPRITE_H + ARC[2] + 4 + MARKER_SPACE * 2}px; --can-bottom: {3 + MARKER_SPACE}px;"
    aria-label="{total} browsing SGXP right now"
  >
    <div class="presence-stage" style="width: {stageW}px;">
      <div class="presence-floor"></div>

      {#each visibleCans as c (c.id)}
        {@const scale = c.layer === 'hidden' ? 1 : c.scale}
        {@const frame = c.phase === 'crouch' ? 'hop' : 'idle'}
        <span
          class="presence-can"
          class:presence-can--member={c.isMember}
          class:presence-can--back={c.layer !== 'front'}
          class:presence-can--rest={c.phase === 'rest'}
          class:presence-can--leap={c.phase === 'leap'}
          style={canStyle(c, scale)}
          role="img"
          aria-label={c.id === selfId ? 'You' : nameOf(c)}
          onpointerenter={(e) => showTip(c.id, e.currentTarget)}
          onpointerleave={() => hideTip(c.id)}
        >
          <img
            class="presence-can-img"
            class:presence-can-img--flip={c.dir === -1}
            src={canSpriteUrl(frame, c.can)}
            width={FRAME_SIZE[frame].w * scale}
            height={FRAME_SIZE[frame].h * scale}
            alt=""
          />
          {#if c.id === selfId}
            <!-- 3x2 sprite-pixel arrow, drawn at the can's own scale -->
            <svg class="presence-you-marker" width={3 * scale} height={2 * scale} viewBox="0 0 3 2" shape-rendering="crispEdges" aria-hidden="true">
              <path d="M0 0h3v1h-1v1h-1v-1h-1z" />
            </svg>
          {/if}
        </span>
      {/each}

      {#if hidden > 0}
        <span
          class="presence-more"
          role="img"
          aria-label="{hidden} more browsing"
          onpointerenter={(e) => showTip(MORE_ID, e.currentTarget)}
          onpointerleave={() => hideTip(MORE_ID)}
        >
          <PixelText text={`+${hidden}`} />
        </span>
      {/if}
    </div>
  </div>
{/if}

{#if hoveredId && tipPos && (hoveredCan || hoveredId === MORE_ID)}
  <div
    class="presence-tooltip"
    use:portal
    bind:offsetWidth={tipWidth}
    style="left: {tipLeft}px; top: {tipPos.y}px;"
    role="tooltip"
  >
    {#if hoveredCan}
      <div class="presence-tooltip-name">{nameOf(hoveredCan)}</div>
      {#if hoveredCan.id === selfId}
        <div class="presence-tooltip-note">That's you!</div>
      {/if}
    {:else}
      <div class="presence-tooltip-name">{hidden} more browsing</div>
    {/if}
    <div class="presence-tooltip-note">{total} browsing now</div>
  </div>
{/if}

<style>
  .presence-bar {
    position: relative;
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: visible;
  }

  /* The shared play area: capped at STAGE_MAX and centered in the bar. */
  .presence-stage {
    position: relative;
    height: 100%;
    max-width: 100%;
    margin: 0 auto;
  }

  /* The floor the cans stand on: the same outline every content box uses. */
  .presence-floor {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(var(--can-bottom, 3px) - var(--border-width, 1px));
    height: var(--border-width, 1px);
    background: color-mix(in srgb, var(--page-color, #393e43) 80%, white);
  }

  .presence-can {
    position: absolute;
    left: 0;
    bottom: var(--can-bottom, 3px);
    z-index: 2;
    cursor: default;
    /* Visitors in the front row: the slight gray-out they've always had. */
    filter: grayscale(0.35) brightness(0.9);
  }

  .presence-can--member {
    filter: none;
  }

  /* Background visitors are scenery: deeper gray, behind every member. */
  .presence-can--back {
    z-index: 1;
    filter: grayscale(0.6) brightness(0.62);
  }

  /* Resting cans slide when the server nudges them (someone joined or left).
     Only while resting: crouch/leap switch frames and positions instantly. */
  .presence-can--rest {
    transition: transform 300ms ease;
  }

  .presence-can--leap {
    /* Explicit up-then-down arch from the old spot to the new one, decoupled
       from the crouch's transition entirely so the peak height is a fixed,
       tunable constant (ARC) rather than an incidental overshoot. */
    animation: presence-leap-arc var(--leap-duration, 270ms) ease-out forwards;
  }

  @keyframes presence-leap-arc {
    0% {
      transform: translate(var(--leap-from-x), 0px);
    }
    50% {
      transform: translate(var(--leap-mid-x), calc(-1 * var(--leap-arc-height)));
    }
    100% {
      transform: translate(var(--leap-to-x), 0px);
    }
  }

  /* "+N": everyone folded away once the stage is full. */
  .presence-more {
    position: absolute;
    right: 0;
    bottom: var(--can-bottom, 3px);
    z-index: 3;
    display: flex;
    align-items: center;
    padding: 0 4px;
    color: var(--font-color);
    background: color-mix(in srgb, var(--page-color, #222) 70%, black);
    border: 1px solid color-mix(in srgb, var(--page-color, #222) 70%, white);
    cursor: default;
  }

  /* "You" arrow. A child of the can, so it follows every hop and leap and
     re-centers itself over the wider crouch frame. The bob moves in whole
     sprite pixels (steps) to stay on the pixel-art grid. It animates
     `transform`, not the `translate` property: Chrome kept ticking the
     `translate` version on the main thread every frame, dragging the theme
     backdrop and the rest of the page through a main-thread frame with it. */
  .presence-you-marker {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 2px);
    transform: translateX(-50%);
    fill: var(--font-color, #fcfcfc);
    animation: presence-you-bob 1.2s steps(1, end) infinite;
  }

  @keyframes presence-you-bob {
    0% {
      transform: translate(-50%, 0);
    }
    50% {
      transform: translate(-50%, calc(-1 * var(--px, 2px)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .presence-you-marker {
      animation: none;
    }

    .presence-can--rest {
      transition: none;
    }
  }

  /* Mirrors .activity-tooltip in JeevesActivityChart.svelte, a size smaller,
     with the site's stacked black box shadow like every content box. */
  .presence-tooltip {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    padding: 5px 8px;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    border: var(--border-width, 2px) var(--border-style, solid) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
    color: var(--font-color);
    font-family: 'saira', sans-serif;
    white-space: nowrap;
  }

  .presence-tooltip-name {
    font-size: 13px;
    font-weight: 700;
  }

  .presence-tooltip-note {
    font-size: 11px;
    opacity: 0.75;
  }

  /* Turning around is an instant flip, like a sprite swapping facing - no
     squash transition, which also kept the main thread busy each time a can
     changed direction. */
  .presence-can-img {
    display: block;
    image-rendering: pixelated;
  }

  .presence-can-img--flip {
    transform: scaleX(-1);
  }
</style>
