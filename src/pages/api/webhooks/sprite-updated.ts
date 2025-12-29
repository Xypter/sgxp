import type { APIRoute } from 'astro';
import { invalidateSpriteCache } from '../../../lib/redis';

/**
 * Webhook endpoint for Payload CMS to call when a sprite is created or updated
 * This invalidates the Redis cache so approved sprites show up immediately
 *
 * Configure this webhook in Payload CMS:
 * Collection: sprites
 * Events: afterChange
 * URL: https://your-domain.com/api/webhooks/sprite-updated
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify webhook secret to prevent abuse
    const webhookSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[Webhook] Unauthorized webhook attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the webhook payload
    const payload = await request.json();

    // Extract sprite data from payload
    // Payload CMS sends: { doc: { id, status, ... }, operation: 'create' | 'update' }
    const spriteId = payload?.doc?.id;
    const status = payload?.doc?.status;
    const operation = payload?.operation;

    console.log(`[Webhook] Sprite ${operation}: ID=${spriteId}, Status=${status}`);

    // Invalidate sprite cache
    // This clears all sprite list caches so the updated sprite appears immediately
    await invalidateSpriteCache(spriteId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache invalidated',
        spriteId,
        operation
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error processing sprite update webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
