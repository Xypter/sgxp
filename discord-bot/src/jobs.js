import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { getTopSprites } from './payload.js';
import { fetchBirthdayEntries } from './birthdays.js';

export function scheduleJobs(notifier, client) {
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

  scheduleBirthdayCheck(notifier, client);
}

const BIRTHDAY_TIMEZONE = 'America/Los_Angeles';

// Most of the server is US/UK, so the "day" rolls over at Pacific midnight
// rather than UTC midnight — that lands the ping at 8am UK time and 5pm
// Sydney time, and keeps it from firing mid-afternoon US time instead.
// Intl handles PST/PDT DST transitions automatically.
function getDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

// Checks every 30 minutes rather than once at a fixed hour, so a missed
// run (e.g. the container restarting right at midnight) doesn't skip someone's
// birthday for the whole year. announcedToday guards against re-pinging
// the same person more than once on a day it already fired for them.
function scheduleBirthdayCheck(notifier, client) {
  const announcedToday = new Set();
  let lastCheckedDate = null;

  cron.schedule('*/30 * * * *', async () => {
    try {
      const announceChannelId = process.env.BIRTHDAY_ANNOUNCE_CHANNEL_ID;
      if (!announceChannelId) return;

      const { year, month, day } = getDateParts(new Date(), BIRTHDAY_TIMEZONE);
      const dateKey = `${year}-${month}-${day}`;

      if (dateKey !== lastCheckedDate) {
        announcedToday.clear();
        lastCheckedDate = dateKey;
      }

      const entries = await fetchBirthdayEntries(client);
      const todays = entries.filter((entry) => entry.month === month && entry.day === day);

      for (const entry of todays) {
        const key = `${dateKey}-${entry.userId}`;
        if (announcedToday.has(key)) continue;
        announcedToday.add(key);

        await notifier.sendToChannel(announceChannelId, `🎉 Happy birthday, <@${entry.userId}>! 🎂`);
      }
    } catch (err) {
      console.error('[jobs] Birthday check failed:', err);
    }
  });
}
