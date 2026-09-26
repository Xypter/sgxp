// In-memory presence registry, mirroring archiveEventHub.ts's design.
// Single-process only — needs Redis pub/sub if this ever runs horizontally scaled.
//
// Also owns the shared Soda-Kan stage (see presenceStage.ts): every can's
// position, layer and size live here, and a hop clock decides who hops where,
// so every viewer sees the same scene instead of each browser inventing its own.

import type { SodaCanChoice } from './sodaCan';
import { arrange, planHop, type CanLayer, type CanScale, type StageCan, type StageTier, type Hop } from './presenceStage';

const encoder = new TextEncoder();

const HOP_TICK_MS = 250; // how often the hop clock checks who's due
const MIN_REST_MS = 1000; // shortest wait between a can's hops
const MAX_REST_MS = 5000; // longest wait between a can's hops

export interface PresenceEntry {
  id: string; // `user:<id>` for members, `anon:<anonId>` for anonymous visitors
  isMember: boolean;
  displayName: string | null;
  can: SodaCanChoice | null; // member's Soda-Kan colors; null = default look
  x: number; // stage position, in bar units (presenceStage.ts)
  dir: 1 | -1;
  layer: CanLayer;
  scale: CanScale;
}

export interface PresenceSnapshot {
  total: number; // everyone online, folded or not
  hidden: number; // how many are folded into the "+N" chip
  entries: PresenceEntry[]; // folded ones included, so a viewer can still find their own can
}

interface PresenceRegistration extends StageCan {
  displayName: string | null;
  can: SodaCanChoice | null;
  connectionCount: number;
  nextHopAt: number;
}

interface PresenceStreamClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
}

const registry = new Map<string, PresenceRegistration>();
const streamClients = new Set<PresenceStreamClient>();
let stage: { tier: StageTier | null; hidden: number; room: number } = { tier: null, hidden: 0, room: 0 };
let hopClock: ReturnType<typeof setInterval> | null = null;

function send(client: PresenceStreamClient, event: string, data: unknown) {
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    client.controller.enqueue(message);
  } catch {
    // Controller already closed - it'll be removed via the stream's cancel().
  }
}

function broadcast(event: string, data: unknown) {
  for (const client of streamClients) send(client, event, data);
}

const round = (x: number) => Math.round(x * 10) / 10;
const restMs = () => MIN_REST_MS + Math.random() * (MAX_REST_MS - MIN_REST_MS);

export function getPresenceSnapshot(): PresenceSnapshot {
  return {
    total: registry.size,
    hidden: stage.hidden,
    entries: [...registry.values()].map((r) => ({
      id: r.id,
      isMember: r.isMember,
      displayName: r.displayName,
      can: r.can,
      x: round(r.x ?? 0),
      dir: r.dir,
      layer: r.layer,
      scale: r.scale,
    })),
  };
}

// Re-decide layers/sizes/positions for the current crowd, then tell everyone.
function restage() {
  const result = arrange([...registry.values()], stage.tier);
  stage = result;
  broadcast('presence-update', getPresenceSnapshot());
  syncHopClock();
}

function tickHops() {
  const now = Date.now();
  const all = [...registry.values()];
  const hops: Hop[] = [];
  for (const can of all) {
    if (can.layer === 'hidden' || now < can.nextHopAt) continue;
    const hop = planHop(can, all, stage.room);
    // Committed immediately, so later cans this tick plan around the landing spot.
    can.x = hop.x;
    can.dir = hop.dir;
    can.nextHopAt = now + restMs();
    hops.push({ ...hop, x: round(hop.x) });
  }
  if (hops.length) broadcast('presence-hops', hops);
}

// The clock only runs while someone is online.
function syncHopClock() {
  if (registry.size && !hopClock) hopClock = setInterval(tickHops, HOP_TICK_MS);
  if (!registry.size && hopClock) {
    clearInterval(hopClock);
    hopClock = null;
    stage = { tier: null, hidden: 0, room: 0 };
  }
}

function sameCan(a: SodaCanChoice | null, b: SodaCanChoice | null): boolean {
  return (a?.body ?? null) === (b?.body ?? null) && (a?.eyes ?? null) === (b?.eyes ?? null);
}

// Multiple tabs/connections from the same identity collapse into one presence
// entry - only the first connection triggers a join broadcast, only the last
// disconnect triggers a leave broadcast. A later connection still refreshes
// the entry's name/colors, in case they changed since the first one joined.
export function joinPresence(
  id: string,
  isMember: boolean,
  displayName: string | null,
  can: SodaCanChoice | null = null,
): void {
  const existing = registry.get(id);
  if (existing) {
    existing.connectionCount += 1;
    if (existing.displayName !== displayName || !sameCan(existing.can, can)) {
      existing.displayName = displayName;
      existing.can = can;
      broadcast('presence-update', getPresenceSnapshot());
    }
    return;
  }
  registry.set(id, {
    id,
    isMember,
    displayName,
    can,
    joinedAt: Date.now(),
    connectionCount: 1,
    x: null,
    dir: Math.random() < 0.5 ? 1 : -1,
    layer: 'front',
    scale: 2,
    nextHopAt: Date.now() + restMs(),
  });
  restage();
}

// Live recolor after a user saves new Soda-Kan colors (called from the
// profile update API, which runs in this same process). No-op if they
// aren't currently in the bar.
export function updatePresenceCan(id: string, can: SodaCanChoice | null): void {
  const existing = registry.get(id);
  if (!existing || sameCan(existing.can, can)) return;
  existing.can = can;
  broadcast('presence-update', getPresenceSnapshot());
}

export function leavePresence(id: string): void {
  const existing = registry.get(id);
  if (!existing) return;
  existing.connectionCount -= 1;
  if (existing.connectionCount <= 0) {
    registry.delete(id);
    restage();
  }
}

export function addPresenceStreamClient(controller: ReadableStreamDefaultController<Uint8Array>): PresenceStreamClient {
  const client: PresenceStreamClient = { controller };
  streamClients.add(client);
  return client;
}

export function removePresenceStreamClient(client: PresenceStreamClient): void {
  streamClients.delete(client);
}
