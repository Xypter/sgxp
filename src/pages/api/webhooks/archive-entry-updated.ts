import type { APIRoute } from 'astro';
import { broadcastArchiveEntryChange } from '../../../lib/archiveEventHub';

/**
 * Webhook endpoint for Payload CMS to call when an archive entry is created
 * or updated. Broadcasts the change over SSE to any open archive triage
 * tables (see src/pages/api/archive-entries/stream.ts) so another
 * archivist's edit shows up within seconds instead of on the next poll.
 *
 * Configure this webhook in Payload CMS (archive-entries collection,
 * afterChange hook): POST to https://your-domain.com/api/webhooks/archive-entry-updated
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
    const doc = payload?.doc;

    if (doc?.id) {
      broadcastArchiveEntryChange({ id: doc.id, updatedAt: doc.updatedAt });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Error processing archive-entry-updated webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
