// In-memory SSE fan-out for archive-entry changes. Lives only in this
// process's memory - fine as long as this app runs as a single instance (see
// .claude/CLAUDE.md). If it's ever horizontally scaled, this would need to
// move to a shared pub/sub (e.g. Redis) so a change delivered to one replica
// reaches browsers connected to the others.
const encoder = new TextEncoder();

type Client = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<Client>();

export function addArchiveEventClient(controller: Client) {
  clients.add(controller);
}

export function removeArchiveEventClient(controller: Client) {
  clients.delete(controller);
}

export function broadcastArchiveEntryChange(payload: { id: string | number; updatedAt?: string }) {
  const message = encoder.encode(`event: entry-updated\ndata: ${JSON.stringify(payload)}\n\n`);
  for (const controller of clients) {
    try {
      controller.enqueue(message);
    } catch {
      // Controller is already closed (client disconnected) - it'll be
      // removed via the stream's cancel() callback; skip it here.
    }
  }
}
