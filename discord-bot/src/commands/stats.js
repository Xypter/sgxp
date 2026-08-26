import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getSiteStats } from '../payload.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show current SGXP site stats');

export async function execute(interaction) {
  await interaction.deferReply();

  const stats = await getSiteStats();

  const embed = new EmbedBuilder()
    .setTitle('SGXP Stats')
    .addFields(
      { name: 'Total Sprites', value: String(stats.totalSprites), inline: true },
      { name: 'Total Users', value: String(stats.totalUsers), inline: true }
    )
    .setColor(0x5865f2)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
