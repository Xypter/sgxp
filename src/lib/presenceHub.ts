// In-memory presence registry, mirroring archiveEventHub.ts's design.
// Single-process only — needs Redis pub/sub if this ever runs horizontally scaled.

const encoder = new TextEncoder();

export const MAX_VISIBLE_PRESENCE = 50;

export interface PresenceEntry {
  id: string; // `user:<id>` for members, `anon:<anonId>` for anonymous visitors
  isMember: boolean;
  displayName: string | null;
  joinedAt: number;
}

interface PresenceRegistration extends PresenceEntry {
  connectionCount: number;
}

interface PresenceStreamClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
}

const registry = new Map<string, PresenceRegistration>();
const streamClients = new Set<PresenceStreamClient>();

function send(client: PresenceStreamClient, event: string, data: unknown) {
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    client.controller.enqueue(message);
  } catch {
    // Controller already closed - it'll be removed via the stream's cancel().
  }
}

// Members are prioritized ahead of anonymous visitors, each group ordered by
// join time, then capped to MAX_VISIBLE_PRESENCE.
export function getPresenceSnapshot(): PresenceEntry[] {
  const entries = [...registry.values()];
  const members = entries.filter((e) => e.isMember).sort((a, b) => a.joinedAt - b.joinedAt);
  const anon = entries.filter((e) => !e.isMember).sort((a, b) => a.joinedAt - b.joinedAt);
  return [...members, ...anon].slice(0, MAX_VISIBLE_PRESENCE).map(({ id, isMember, displayName, joinedAt }) => ({
    id,
    isMember,
    displayName,
    joinedAt,
  }));
}

function broadcastSnapshot() {
  const snapshot = getPresenceSnapshot();
  for (const client of streamClients) {
    send(client, 'presence-update', snapshot);
  }
}

// Multiple tabs/connections from the same identity collapse into one presence
// entry - only the first connection triggers a join broadcast, only the last
// disconnect triggers a leave broadcast.
export function joinPresence(id: string, isMember: boolean, displayName: string | null): void {
  const existing = registry.get(id);
  if (existing) {
    existing.connectionCount += 1;
    return;
  }
  registry.set(id, { id, isMember, displayName, joinedAt: Date.now(), connectionCount: 1 });
  broadcastSnapshot();
}

export function leavePresence(id: string): void {
  const existing = registry.get(id);
  if (!existing) return;
  existing.connectionCount -= 1;
  if (existing.connectionCount <= 0) {
    registry.delete(id);
    broadcastSnapshot();
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
