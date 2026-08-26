import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { getTopSprites } from './payload.js';

export function scheduleJobs(notifier) {
  // Daily leaderboard, 9am server time
  cron.schedule('0 9 * * *', async () => {
    try {
      const sprites = await getTopSprites({ limit: 5 });
      if (sprites.length === 0) return;

      const lines = sprites.map(
        (sprite, i) => `**${i + 1}.** ${sprite.title ?? 'Untitled'} — ${sprite.likes ?? 0} likes`
      );

      const embed = new EmbedBuilder()
        .setTitle("Today's Leaderboard")
        .setDescription(lines.join('\n'))
        .setColor(0x5865f2)
        .setTimestamp();

      await notifier.sendToAnnounceChannel({ embeds: [embed] });
    } catch (err) {
      console.error('[jobs] Daily leaderboard failed:', err);
    }
  });
}
