// src/pages/api/archive-entries/stream.ts
//
// Server-Sent Events endpoint for the archive triage table. Payload calls
// /api/webhooks/archive-entry-updated whenever an archive entry changes,
// which broadcasts to every client connected here - lets the triage table
// react to another archivist's edit within seconds instead of waiting on
// the next poll (see ArchiveTriageTable.svelte).
import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/userCache';
import { addArchiveEventClient, removeArchiveEventClient } from '../../../lib/archiveEventHub';

export const prerender = false;

const HEARTBEAT_MS = 25000;

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await resolveUser(cookies);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let heartbeat: ReturnType<typeof setInterval>;
  let thisController: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      thisController = controller;
      addArchiveEventClient(controller);
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
      removeArchiveEventClient(thisController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
