import type { APIRoute } from 'astro';
import { notifyDiscordBot } from '../../../lib/discordBot';

/**
 * Webhook endpoint called by sgxp-cms's Comments collection afterChange hook
 * (see src/collections/Comments.ts) when a new comment is posted on a sprite.
 * Forwards a notification to the Discord bot.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const webhookSecret = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[Webhook] Unauthorized webhook attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await request.json();

    console.log(`[Webhook] Comment created: ID=${payload?.commentId}, Sprite=${payload?.sprite?.id}`);

    await notifyDiscordBot('comment.created', {
      commentId: payload?.commentId,
      text: payload?.text,
      isReply: payload?.isReply,
      author: payload?.author,
      spriteId: payload?.sprite?.id,
      spriteTitle: payload?.sprite?.title,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error processing comment-created webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
