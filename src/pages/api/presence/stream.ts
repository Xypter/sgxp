import type { APIRoute } from 'astro';
import { resolveUser } from '../../../lib/userCache';
import {
  addPresenceStreamClient,
  removePresenceStreamClient,
  joinPresence,
  leavePresence,
  getPresenceSnapshot,
} from '../../../lib/presenceHub';

export const prerender = false;

const HEARTBEAT_MS = 25000;
const ANON_COOKIE = 'sgxp-anon-id';
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await resolveUser(cookies);

  let identityId: string;
  let isMember: boolean;
  let displayName: string | null;

  if (user) {
    identityId = `user:${user.id}`;
    isMember = true;
    displayName = user.username ?? user.name ?? null;
  } else {
    let anonId = cookies.get(ANON_COOKIE)?.value;
    if (!anonId) {
      anonId = crypto.randomUUID();
      cookies.set(ANON_COOKIE, anonId, {
        httpOnly: false,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        path: '/',
        maxAge: ANON_COOKIE_MAX_AGE,
      });
    }
    identityId = `anon:${anonId}`;
    isMember = false;
    displayName = null;
  }

  let heartbeat: ReturnType<typeof setInterval>;
  let hasJoined = false;
  let streamClient: ReturnType<typeof addPresenceStreamClient>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamClient = addPresenceStreamClient(controller);
      joinPresence(identityId, isMember, displayName);
      hasJoined = true;

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));
      controller.enqueue(
        encoder.encode(`event: presence-update\ndata: ${JSON.stringify(getPresenceSnapshot())}\n\n`)
      );
      controller.enqueue(encoder.encode(`event: presence-self\ndata: ${JSON.stringify({ id: identityId })}\n\n`));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      removePresenceStreamClient(streamClient);
      if (hasJoined) leavePresence(identityId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
