import type { APIRoute } from 'astro';
import { notifyUserAccessGranted } from '../../../lib/archiveEventHub';

/**
 * Webhook endpoint for Payload CMS to call when a user's isArchivist/role
 * actually grants them archive-triage access (see the afterChange hook in
 * sgxp-cms's Users.ts). Pushes an access-granted SSE event targeted at just
 * that user, so their triage page's badge updates live instead of waiting
 * on the 5-minute user-cache TTL to expire on their next page load.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const webhookSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.json();
    const userId = payload?.userId;

    if (userId) {
      notifyUserAccessGranted(userId);
    } else {
      console.warn('[Webhook] user-access-granted: payload missing userId', payload);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Error processing user-access-granted webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
