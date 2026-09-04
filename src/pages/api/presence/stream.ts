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

// Dwell time before a connection actually joins presence - filters out bots
// that render a page's JS just long enough to fetch it and then bail
// (uptime monitors, some SEO/scraper crawlers) without needing to guess at
// their user-agent. A real visitor never notices a few-second delay before
// their own can appears.
const JOIN_DELAY_MS = 3000;

// First-pass filter for bots that identify themselves honestly. Doesn't
// catch everything (a bot can always spoof a normal browser UA), which is
// what JOIN_DELAY_MS above is for as a backstop.
const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|site24x7|newrelic|datadog|curl|wget|python-requests|go-http-client|okhttp|scrapy|facebookexternalhit|discordbot|telegrambot|whatsapp|linkedinbot|twitterbot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot/i;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) {
    // No cookie, no stream, no presence entry - just decline politely.
    return new Response(null, { status: 204 });
  }

  // Astro does full page reloads on navigation, so a real visitor's
  // connection gets torn down and reopened on every link click - paying
  // JOIN_DELAY_MS again each time makes them unlikely to ever stay connected
  // long enough on any one page (especially navigating quickly on mobile).
  // The client only sends this once it has actually received presence-self
  // from a prior connection, i.e. once it already survived the delay once
  // this session - a bot doing a single hit-and-run scrape never gets here.
  const skipJoinDelay = url.searchParams.get('fast') === '1';

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
  let joinTimer: ReturnType<typeof setTimeout>;
  let hasJoined = false;
  let streamClient: ReturnType<typeof addPresenceStreamClient>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      streamClient = addPresenceStreamClient(controller);
      controller.enqueue(encoder.encode(': connected\n\n'));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      const doJoin = () => {
        joinPresence(identityId, isMember, displayName);
        hasJoined = true;
        try {
          controller.enqueue(
            encoder.encode(`event: presence-update\ndata: ${JSON.stringify(getPresenceSnapshot())}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`event: presence-self\ndata: ${JSON.stringify({ id: identityId })}\n\n`)
          );
        } catch {
          // Controller already closed between the timer firing and now -
          // cancel() will have already run leavePresence via hasJoined below.
        }
      };

      if (skipJoinDelay) {
        doJoin();
      } else {
        joinTimer = setTimeout(doJoin, JOIN_DELAY_MS);
      }
    },
    cancel() {
      clearInterval(heartbeat);
      clearTimeout(joinTimer);
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
