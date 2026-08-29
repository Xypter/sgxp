import { SlashCommandBuilder } from 'discord.js';
import { buildArchiveLeaderboardEmbed } from '../archiveLeaderboardEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('archiveleaderboard')
  .setDescription('Show the archive triage leaderboard and overall stats');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const embed = await buildArchiveLeaderboardEmbed();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[archiveleaderboard] Failed to build embed:', err);
    await interaction.editReply('Could not load the archive leaderboard right now.');
  }
}
