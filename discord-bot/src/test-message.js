import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const channelId = process.argv[2];
const message = process.argv[3] ?? 'Test message from the SGXP bot 🎮';

if (!channelId) {
  console.error('Usage: node src/test-message.js <channelId> ["message"]');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  try {
    const channel = await readyClient.channels.fetch(channelId);
    await channel.send(message);
    console.log(`Sent to #${channel.name ?? channelId}`);
  } catch (err) {
    console.error('Failed to send message:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
