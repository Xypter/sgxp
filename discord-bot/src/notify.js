export function createNotifier(client) {
  async function sendToOwner(content) {
    const ownerId = process.env.DISCORD_OWNER_USER_ID;
    if (!ownerId) return;
    const user = await client.users.fetch(ownerId);
    await user.send(content);
  }

  async function sendToAnnounceChannel(content) {
    const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);
    await channel.send(content);
  }

  return { sendToOwner, sendToAnnounceChannel };
}
