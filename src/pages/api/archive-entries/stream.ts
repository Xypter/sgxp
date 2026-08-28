// src/pages/api/archive-entries/stream.ts
//
// Server-Sent Events endpoint for the archive triage table. Two things feed
// into it: Payload's archive-entry-updated webhook (broadcasts to every
// connected client, so the triage table reacts to another archivist's edit
// without waiting on the next poll) and its user-access-granted webhook
// (targeted at just the affected user, so their "Request Pending" badge
// flips to "Archivist Access" the moment they're granted it - see
// ArchiveTriageTable.svelte).
import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/userCache';
import { addArchiveEventClient, removeArchiveEventClient, type ArchiveEventClient } from '../../../lib/archiveEventHub';

export const prerender = false;

const HEARTBEAT_MS = 25000;

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await resolveUser(cookies);
  if (!user) {
    console.warn('[archive-entries/stream] rejected connection: no authenticated user');
    return new Response('Unauthorized', { status: 401 });
  }

  let heartbeat: ReturnType<typeof setInterval>;
  let thisClient: ArchiveEventClient;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      thisClient = addArchiveEventClient(controller, user.id);
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));

      // Keeps proxies (Traefik) from timing out an idle-looking connection.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      removeArchiveEventClient(thisClient);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Some reverse proxies (nginx-based ones especially) buffer proxied
      // responses by default, which silently kills SSE - this is a no-op if
      // whatever's in front doesn't look at it.
      'X-Accel-Buffering': 'no',
    },
  });
};
