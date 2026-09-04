<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';

  interface PresenceEntry {
    id: string;
    isMember: boolean;
    displayName: string | null;
    joinedAt: number;
  }

  // Native sprite frame sizes - idle is the resting pose, hop is the
  // wind-up/thrust pose (wider + squashed down).
  const SCALE = 2;
  const IDLE_SIZE = { w: 5 * SCALE, h: 8 * SCALE };
  const HOP_SIZE = { w: 7 * SCALE, h: 6 * SCALE };
  const FRAME_BOX = {
    w: Math.max(IDLE_SIZE.w, HOP_SIZE.w),
    h: Math.max(IDLE_SIZE.h, HOP_SIZE.h),
  };

  // One shared stage, sized to whatever space it's actually given in the
  // navbar (measured via bind:clientWidth below) rather than a hardcoded
  // width - it never grows with the number of cans present, only with the
  // available layout space.
  let stageWidth = $state(200); // fallback until the real width is measured
  let travelRange = $derived(Math.max(20, stageWidth - FRAME_BOX.w));

  const DRIVER_MS = 50; // how often we check whether any can's phase should advance
  const CROUCH_MS = 180; // wind-up pose duration, planted in place
  const LEAP_MS = 270; // airborne duration, arcing from the old spot to the new one
  const HOP_STEP = 14; // px advanced per landed hop
  const ARC_HEIGHT = 10; // px peak height of the leap above resting position
  const MIN_REST_MS = 1000; // shortest wait between a can's hops
  const MAX_REST_MS = 5000; // longest wait between a can's hops

  type Phase = 'crouch' | 'leap' | 'rest';

  interface CanState {
    phase: Phase;
    x: number; // authoritative resting position
    fromX: number; // leap start (only meaningful mid-leap)
    toX: number; // leap target (only meaningful mid-leap)
    dir: 1 | -1;
    until: number; // performance.now() timestamp when the current phase should end
  }

  let presences = $state<PresenceEntry[]>([]);
  let selfId = $state<string | null>(null);
  // Plain `$state(new Map())` does NOT get Svelte's reactive instrumentation
  // - only Map/Set imported from 'svelte/reactivity' do. Random per-hop wait
  // times mean each can's schedule is now genuinely stateful (not derivable
  // from a shared clock tick the way the old fixed-cadence version was), so
  // this needs to actually be reactive for the UI to see new/removed cans.
  const canStates = new SvelteMap<string, CanState>();

  function randomRestMs(): number {
    return MIN_REST_MS + Math.random() * (MAX_REST_MS - MIN_REST_MS);
  }

  function createCanState(): CanState {
    const x = Math.random() * travelRange;
    return {
      phase: 'rest',
      x,
      fromX: x,
      toX: x,
      dir: Math.random() < 0.5 ? 1 : -1,
      until: performance.now() + randomRestMs(),
    };
  }

  function syncCanStates(ids: string[]) {
    const idSet = new Set(ids);
    for (const id of idSet) {
      if (!canStates.has(id)) canStates.set(id, createCanState());
    }
    for (const id of [...canStates.keys()]) {
      if (!idSet.has(id)) canStates.delete(id);
    }
  }

  // `$state(...)` is only valid as a variable-declaration initializer or a
  // class field, so it can't be returned from createCanState() to make each
  // stored value independently reactive. Instead every transition below
  // writes a brand-new object back via canStates.set() - SvelteMap tracks a
  // key's value being *replaced*, just not a stored object being mutated in
  // place, so we replace rather than mutate.
  function advanceCanStates() {
    const now = performance.now();

    for (const [id, state] of canStates) {
      if (state.phase === 'rest' && now >= state.until) {
        canStates.set(id, { ...state, phase: 'crouch', until: now + CROUCH_MS });
      } else if (state.phase === 'crouch' && now >= state.until) {
        let toX = state.x + state.dir * HOP_STEP;
        let dir = state.dir;
        if (toX >= travelRange) {
          toX = travelRange;
          dir = -1;
        } else if (toX <= 0) {
          toX = 0;
          dir = 1;
        }
        canStates.set(id, { ...state, fromX: state.x, toX, dir, phase: 'leap', until: now + LEAP_MS });
      } else if (state.phase === 'leap' && now >= state.until) {
        canStates.set(id, { ...state, x: state.toX, phase: 'rest', until: now + randomRestMs() });
      }
    }
  }

  onMount(() => {
    const source = new EventSource('/api/presence/stream');

    source.addEventListener('presence-update', (event: MessageEvent) => {
      presences = JSON.parse(event.data);
    });

    source.addEventListener('presence-self', (event: MessageEvent) => {
      selfId = JSON.parse(event.data).id;
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const driver = prefersReducedMotion ? null : setInterval(advanceCanStates, DRIVER_MS);

    return () => {
      source?.close();
      if (driver) clearInterval(driver);
    };
  });

  $effect(() => {
    syncCanStates(presences.map((p) => p.id));
  });

  // bind:clientWidth only reports the real measured width *after* the first
  // render (it starts at the 200px fallback), but cans can already exist by
  // then - their starting x was randomized against that stale, much-smaller
  // range, and hopping only nudges a can 14px at a time, so they'd take
  // minutes to visibly reach the real width on their own. Rescale everyone
  // proportionally whenever the measured range actually changes (first
  // real measurement, or a later navbar resize) so they redistribute
  // immediately instead of crawling there hop by hop.
  let lastTravelRange = travelRange;
  $effect(() => {
    const tr = travelRange;
    if (tr !== lastTravelRange && lastTravelRange > 0) {
      const ratio = tr / lastTravelRange;
      for (const [id, state] of canStates) {
        canStates.set(id, {
          ...state,
          x: Math.min(tr, state.x * ratio),
          fromX: Math.min(tr, state.fromX * ratio),
          toX: Math.min(tr, state.toX * ratio),
        });
      }
    }
    lastTravelRange = tr;
  });

  // Pairs each presence with its can state, skipping the one-tick window
  // between a presence appearing and its state being created by the
  // syncCanStates effect below.
  let visibleCans = $derived(
    presences
      .map((presence) => ({ presence, state: canStates.get(presence.id) }))
      .filter((entry): entry is { presence: PresenceEntry; state: CanState } => !!entry.state)
  );
</script>

{#if presences.length > 0}
  <div
    class="presence-bar"
    bind:clientWidth={stageWidth}
    style="height: {FRAME_BOX.h + ARC_HEIGHT + 4}px;"
    title="{presences.length} browsing SGXP right now"
  >
    {#each visibleCans as { presence, state } (presence.id)}
      {#if state}
        <span
          class="presence-can"
          class:presence-can--member={presence.isMember}
          class:presence-can--self={presence.id === selfId}
          class:presence-can--crouch={state.phase === 'crouch'}
          class:presence-can--leap={state.phase === 'leap'}
          style="
            --leap-from-x: {state.fromX}px;
            --leap-mid-x: {(state.fromX + state.toX) / 2}px;
            --leap-to-x: {state.toX}px;
            --leap-arc-height: {ARC_HEIGHT}px;
            --leap-duration: {LEAP_MS}ms;
            transform: translate({state.x}px, 0px);
          "
          title={presence.id === selfId
            ? 'You'
            : presence.isMember
              ? (presence.displayName ?? 'A member')
              : 'A visitor'}
        >
          <img
            class="presence-can-img"
            class:presence-can-img--flip={state.dir === -1}
            src={state.phase === 'crouch' ? '/sprites/presence/hop-1.png' : '/sprites/presence/idle-1.png'}
            width={state.phase === 'crouch' ? HOP_SIZE.w : IDLE_SIZE.w}
            height={state.phase === 'crouch' ? HOP_SIZE.h : IDLE_SIZE.h}
            alt=""
          />
        </span>
      {/if}
    {/each}
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

  .presence-can {
    position: absolute;
    left: 0;
    bottom: 3px;
    filter: grayscale(0.35) brightness(0.9);
    /* No transition here on purpose - entering/leaving the crouch changes
       only which sprite frame is shown (idle <-> hop-1), never the
       transform, so there's nothing to animate outside of the leap. */
  }

  .presence-can--leap {
    /* Explicit up-then-down arch from the old spot to the new one, decoupled
       from the crouch's transition entirely so the peak height is a fixed,
       tunable constant (ARC_HEIGHT) rather than an incidental overshoot. */
    animation: presence-leap-arc var(--leap-duration, 270ms) ease-out forwards;
  }

  .presence-can--member {
    filter: none;
  }

  .presence-can--self {
    filter: drop-shadow(0 0 3px var(--accent-color, gold));
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

  .presence-can-img {
    display: block;
    image-rendering: pixelated;
    transform: scaleX(1);
    transition: transform 150ms ease;
  }

  .presence-can-img--flip {
    transform: scaleX(-1);
  }
</style>
