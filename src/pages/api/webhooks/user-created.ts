import type { APIRoute } from 'astro';
import { notifyDiscordBot } from '../../../lib/discordBot';

/**
 * Webhook endpoint called by sgxp-cms's Users collection afterChange hook
 * (see src/collections/Users.ts) when a new user signs up. Forwards a
 * notification to the Discord bot.
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

    console.log(`[Webhook] User created: ID=${payload?.userId}, Username=${payload?.username}`);

    await notifyDiscordBot('user.created', {
      userId: payload?.userId,
      username: payload?.username,
      displayName: payload?.displayName,
      email: payload?.email,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error processing user-created webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
