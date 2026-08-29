import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as stats from './commands/stats.js';
import * as leaderboard from './commands/leaderboard.js';
import * as archiveleaderboard from './commands/archiveleaderboard.js';

const commands = [stats.data.toJSON(), leaderboard.data.toJSON(), archiveleaderboard.data.toJSON()];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_DEV_GUILD_ID;

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

const data = await rest.put(route, { body: commands });

console.log(`Registered ${data.length} slash command(s)${guildId ? ` to guild ${guildId}` : ' globally'}.`);
