// The shared Soda-Kan stage: where every can in the navbar's presence bar
// stands, decided once on the server so every viewer sees the same scene.
//
// Positions are in "bar units": pixels of the narrowest bar we design for
// (MIN_BAR, a 1280px screen). Each browser maps them onto its own play area
// (the bar, capped at STAGE_MAX), so wider screens only spread cans further
// apart - no screen size can make two members overlap. Can sprites are never
// scaled to fit; only the gaps stretch.
//
// Crowding steps (with a hysteresis margin so the bar doesn't flicker as
// people come and go right at a threshold):
//   0  Everyone 2x, side by side, while all cans fit.
//   1  Members stay 2x in front and never overlap each other; visitors drop
//      to 1x in a dimmer background layer that may overlap.
//   2  Past 20 members, the front row goes 1x (still no overlap).
//   3  Past what even 1x can hold, the newest members fold into "+N".
// In every step but 0, visitors past VISITOR_CAP fold into "+N" too.
//
// Pure functions only - presenceHub.ts owns the state and the clock.

export const MIN_BAR = 330;
export const STAGE_MAX = 640;
export const ROOM: Record<CanScale, number> = { 2: 16, 1: 8 }; // front-row room per can, gap included
export const CHIP_ROOM = 28; // reserved at the right end for the "+N" chip
export const GROW_BACK = 0.85; // only step back up once the bigger mode fits in 85% of the room
export const VISITOR_CAP = 40; // background visitors drawn before the rest fold into "+N"
const HOP: Record<CanScale, number> = { 2: 10, 1: 6 }; // bar units per hop
const BACK_EDGE = 4; // background cans stay this far inside the edges

export type CanScale = 1 | 2;
export type CanLayer = 'front' | 'back' | 'hidden';
export type StageTier = 0 | 1 | 2 | 3;

export interface StageCan {
  id: string;
  isMember: boolean;
  joinedAt: number;
  x: number | null; // center, in bar units; null until first placed
  dir: 1 | -1;
  layer: CanLayer;
  scale: CanScale;
}

export interface Hop {
  id: string;
  x: number;
  dir: 1 | -1;
}

type Rand = () => number;

/** Front-row room a tier needs. Background visitors never count. */
function tierCost(tier: StageTier, members: number, visitors: number): number {
  if (tier === 0) return ROOM[2] * (members + visitors);
  if (tier === 1) return ROOM[2] * members;
  return ROOM[1] * members;
}

/** Front-row room available in a tier: less the "+N" chip once visitors overflow. */
function tierRoom(tier: StageTier, visitors: number): number {
  return tier >= 1 && visitors > VISITOR_CAP ? MIN_BAR - CHIP_ROOM : MIN_BAR;
}

export function pickTier(members: number, visitors: number, prev: StageTier | null): StageTier {
  let needed: StageTier = 3;
  for (const t of [0, 1, 2] as const) {
    if (tierCost(t, members, visitors) <= tierRoom(t, visitors)) {
      needed = t;
      break;
    }
  }
  // Crowding up happens immediately...
  if (prev === null || needed >= prev) return needed;
  // ...but easing back only once the roomier mode fits with margin to spare.
  for (let t = needed; t < prev; t++) {
    if (tierCost(t as StageTier, members, visitors) <= tierRoom(t as StageTier, visitors) * GROW_BACK) return t as StageTier;
  }
  return prev;
}

const byJoin = (a: StageCan, b: StageCan) => a.joinedAt - b.joinedAt;

/** Push overlapping front cans apart as little as possible, keeping their order. */
function relax(front: StageCan[], room: number) {
  const list = front.filter((c) => c.x !== null).sort((a, b) => a.x! - b.x!);
  for (let i = 0; i < list.length; i++) {
    const half = ROOM[list[i].scale] / 2;
    const min = i === 0 ? half : list[i - 1].x! + ROOM[list[i - 1].scale] / 2 + half;
    list[i].x = Math.max(list[i].x!, min);
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const half = ROOM[list[i].scale] / 2;
    const max = i === list.length - 1 ? room - half : list[i + 1].x! - ROOM[list[i + 1].scale] / 2 - half;
    list[i].x = Math.min(list[i].x!, max);
  }
}

/** Drop a newcomer into the widest free gap of the front row. */
function insert(can: StageCan, placed: StageCan[], room: number, rand: Rand) {
  const w = ROOM[can.scale];
  const sorted = placed.filter((c) => c !== can && c.x !== null).sort((a, b) => a.x! - b.x!);
  let best: [number, number] | null = null;
  let start = w / 2;
  for (const p of sorted) {
    const end = p.x! - (ROOM[p.scale] + w) / 2;
    if (end >= start && (!best || end - start > best[1] - best[0])) best = [start, end];
    start = Math.max(start, p.x! + (ROOM[p.scale] + w) / 2);
  }
  const end = room - w / 2;
  if (end >= start && (!best || end - start > best[1] - best[0])) best = [start, end];
  // Somewhere in the middle half of the gap, so newcomers don't hug neighbors.
  can.x = best ? best[0] + (best[1] - best[0]) * (0.25 + rand() * 0.5) : room / 2;
}

/**
 * Re-decide every can's layer and size for the current crowd, keeping
 * existing cans where they stand wherever possible. Mutates `cans`.
 */
export function arrange(
  cans: StageCan[],
  prevTier: StageTier | null,
  rand: Rand = Math.random,
): { tier: StageTier; hidden: number; room: number } {
  const members = cans.filter((c) => c.isMember).sort(byJoin);
  const visitors = cans.filter((c) => !c.isMember).sort(byJoin);
  const tier = pickTier(members.length, visitors.length, prevTier);

  let hidden = 0;
  const front: StageCan[] = [];
  // Cans moving between layers keep their x; relax() below resolves any
  // overlap that creates in the front row.
  const set = (c: StageCan, layer: CanLayer, scale: CanScale) => {
    c.layer = layer;
    c.scale = scale;
    if (layer === 'front') front.push(c);
    if (layer === 'hidden') hidden++;
  };

  if (tier === 0) {
    for (const c of [...members, ...visitors]) set(c, 'front', 2);
  } else {
    const memberFit = tier === 3 ? Math.floor((MIN_BAR - CHIP_ROOM) / ROOM[1]) : Infinity;
    members.forEach((c, i) => set(c, i < memberFit ? 'front' : 'hidden', tier === 1 ? 2 : 1));
    visitors.forEach((c, i) => set(c, i < VISITOR_CAP ? 'back' : 'hidden', 1));
  }

  const room = hidden ? MIN_BAR - CHIP_ROOM : MIN_BAR;

  relax(front, room);
  for (const c of front) {
    if (c.x === null) {
      insert(c, front, room, rand);
      relax(front, room);
    }
  }

  // Background and folded cans just need a spot on the floor (folded ones
  // keep one too, so a viewer whose own can is folded can still see it).
  for (const c of cans) {
    if (c.layer === 'front') continue;
    if (c.x === null) c.x = BACK_EDGE + rand() * (room - BACK_EDGE * 2);
    else c.x = Math.min(Math.max(c.x, BACK_EDGE), room - BACK_EDGE);
  }

  return { tier, hidden, room };
}

/**
 * One hop for `can`: forward if there's room, otherwise the other way,
 * otherwise turn around in place. Front cans never land on another front
 * can's spot (others' `x` is already where they're landing, since every hop
 * is committed the moment it starts).
 */
export function planHop(can: StageCan, all: StageCan[], room: number): Hop {
  const w = ROOM[can.scale];
  const lo = can.layer === 'front' ? w / 2 : BACK_EDGE;
  const hi = can.layer === 'front' ? room - w / 2 : room - BACK_EDGE;
  const x = can.x ?? room / 2;
  for (const dir of [can.dir, -can.dir as 1 | -1]) {
    const target = x + dir * HOP[can.scale];
    if (target < lo || target > hi) continue;
    if (
      can.layer === 'front' &&
      all.some(
        (o) => o !== can && o.layer === 'front' && o.x !== null && Math.abs(o.x - target) < (w + ROOM[o.scale]) / 2,
      )
    ) {
      continue;
    }
    return { id: can.id, x: target, dir };
  }
  return { id: can.id, x, dir: -can.dir as 1 | -1 };
}
