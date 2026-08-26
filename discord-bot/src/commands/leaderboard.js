import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTopSprites } from '../payload.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the top sprites by likes');

export async function execute(interaction) {
  await interaction.deferReply();

  const sprites = await getTopSprites({ limit: 10 });

  if (sprites.length === 0) {
    await interaction.editReply('No sprites found yet.');
    return;
  }

  const lines = sprites.map((sprite, i) => `**${i + 1}.** ${sprite.title ?? 'Untitled'} — ${sprite.likes ?? 0} likes`);

  const embed = new EmbedBuilder()
    .setTitle('SGXP Leaderboard')
    .setDescription(lines.join('\n'))
    .setColor(0x5865f2)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
