const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const DATE_PATTERN = /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?/i;
const MENTION_PATTERN = /<@!?(\d+)>/;

/**
 * Parses lines like "<@123456789> - August 27" into {userId, month, day}.
 * One mention + one date per line; lines that don't match either are ignored,
 * so headers/blank lines/extra notes in the message are safe to leave in.
 */
export function parseBirthdayEntries(content) {
  const entries = [];

  for (const line of content.split('\n')) {
    const mentionMatch = line.match(MENTION_PATTERN);
    if (!mentionMatch) continue;

    const dateMatch = line.match(DATE_PATTERN);
    if (!dateMatch) continue;

    const month = MONTHS[dateMatch[1].toLowerCase()];
    if (!month) continue;

    const day = Number(dateMatch[2]);
    if (day < 1 || day > 31) continue;

    entries.push({ userId: mentionMatch[1], month, day });
  }

  return entries;
}

export async function fetchBirthdayEntries(client) {
  const channelId = process.env.BIRTHDAY_LIST_CHANNEL_ID;
  const messageId = process.env.BIRTHDAY_LIST_MESSAGE_ID;

  if (!channelId || !messageId) return [];

  const channel = await client.channels.fetch(channelId);
  const message = await channel.messages.fetch(messageId);

  return parseBirthdayEntries(message.content);
}
