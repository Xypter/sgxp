/**
 * Forwards site events to the Discord bot's internal /events endpoint.
 * Fails silently (logged only) so a down/misconfigured bot never breaks
 * the webhook handler that triggered it.
 */
export async function notifyDiscordBot(type: string, data: Record<string, unknown>) {
  const botUrl = import.meta.env.DISCORD_BOT_URL || process.env.DISCORD_BOT_URL;
  const secret = import.meta.env.BOT_WEBHOOK_SECRET || process.env.BOT_WEBHOOK_SECRET;

  if (!botUrl) return;

  try {
    await fetch(`${botUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (error) {
    console.error(`[discordBot] Failed to forward "${type}" event:`, error);
  }
}
