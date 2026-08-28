export function createNotifier(client) {
  async function sendToOwner(content, options = {}) {
    const ownerId = process.env.DISCORD_OWNER_USER_ID;
    if (!ownerId) return;
    const user = await client.users.fetch(ownerId);
    return user.send({ content, ...options });
  }

  async function sendToAnnounceChannel(content) {
    const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);
    await channel.send(content);
  }

  async function sendToChannel(channelId, content) {
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);
    await channel.send(content);
  }

  return { sendToOwner, sendToAnnounceChannel, sendToChannel };
}
