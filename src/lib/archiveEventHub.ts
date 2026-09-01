// In-memory SSE fan-out for archive-entry changes and per-user notices
// (e.g. archivist access granted). Lives only in this process's memory -
// fine as long as this app runs as a single instance (see .claude/CLAUDE.md).
// If it's ever horizontally scaled, this would need to move to a shared
// pub/sub (e.g. Redis) so a change delivered to one replica reaches browsers
// connected to the others.
const encoder = new TextEncoder();

export interface ArchiveEventClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  userId: string | number;
}

const clients = new Set<ArchiveEventClient>();

export function addArchiveEventClient(controller: ReadableStreamDefaultController<Uint8Array>, userId: string | number): ArchiveEventClient {
  const client = { controller, userId };
  clients.add(client);
  console.log(`[archiveEventHub] client connected for user ${userId} (${clients.size} total)`);
  return client;
}

export function removeArchiveEventClient(client: ArchiveEventClient) {
  clients.delete(client);
  console.log(`[archiveEventHub] client disconnected for user ${client.userId} (${clients.size} total)`);
}

function send(client: ArchiveEventClient, event: string, data: unknown) {
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    client.controller.enqueue(message);
  } catch {
    // Controller is already closed (client disconnected) - it'll be
    // removed via the stream's cancel() callback; skip it here.
  }
}

export function broadcastArchiveEntryChange(payload: { id: string | number; updatedAt?: string }) {
  console.log(`[archiveEventHub] broadcasting entry-updated for id=${payload.id} to ${clients.size} client(s)`);
  for (const client of clients) {
    send(client, 'entry-updated', payload);
  }
}

export function broadcastCategoryAdded(payload: { id: string | number; name: string }) {
  console.log(`[archiveEventHub] broadcasting category-added "${payload.name}" to ${clients.size} client(s)`);
  for (const client of clients) {
    send(client, 'category-added', payload);
  }
}

export function notifyUserAccessGranted(userId: string | number) {
  const targets = [...clients].filter((c) => String(c.userId) === String(userId));
  console.log(`[archiveEventHub] notifying access-granted for user ${userId} to ${targets.length} connection(s)`);
  for (const client of targets) {
    send(client, 'access-granted', { userId });
  }
}
