import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import * as stats from './commands/stats.js';
import * as leaderboard from './commands/leaderboard.js';
import { createNotifier } from './notify.js';
import { startEventServer } from './server.js';
import { scheduleJobs } from './jobs.js';
import { isArchivistGrantButton, handleArchivistGrantButton } from './archivistActions.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();
for (const cmd of [stats, leaderboard]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  const notifier = createNotifier(client);
  startEventServer(notifier);
  scheduleJobs(notifier, client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (isArchivistGrantButton(interaction)) {
    await handleArchivistGrantButton(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const reply = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
