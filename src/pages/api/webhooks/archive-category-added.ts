import type { APIRoute } from 'astro';
import { broadcastCategoryAdded } from '../../../lib/archiveEventHub';

/**
 * Webhook endpoint for Payload CMS to call when a new archive category is
 * created. Broadcasts it over SSE to any open archive triage tables (see
 * src/pages/api/archive-entries/stream.ts) so the category dropdown updates
 * everywhere within seconds instead of on the next reload.
 *
 * Configured in Payload CMS (archive-categories collection, afterChange
 * hook): POST to https://your-domain.com/api/webhooks/archive-category-added
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const webhookSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[Webhook] archive-category-added: unauthorized (secret mismatch)');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.json();
    const doc = payload?.doc;

    if (doc?.id && doc?.name) {
      broadcastCategoryAdded({ id: doc.id, name: doc.name });
    } else {
      console.warn('[Webhook] archive-category-added: payload missing doc.id/name', payload);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Error processing archive-category-added webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
