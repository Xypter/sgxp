import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { grantArchivistAccess } from './payload.js';

const CUSTOM_ID_PREFIX = 'archivist-grant:';

export function buildArchivistRequestComponents(userId) {
  const button = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIX}${userId}`)
    .setLabel('Grant Archivist Access')
    .setStyle(ButtonStyle.Success);

  return [new ActionRowBuilder().addComponents(button)];
}

export function isArchivistGrantButton(interaction) {
  return interaction.isButton() && interaction.customId.startsWith(CUSTOM_ID_PREFIX);
}

/**
 * Handles a click on the "Grant Archivist Access" button attached to an
 * archivist.requested DM (see server.js). Only the bot owner can ever see
 * this button (it's only ever sent in their own DMs), but the ID check is
 * cheap insurance against a forwarded/copied interaction.
 */
export async function handleArchivistGrantButton(interaction) {
  if (interaction.user.id !== process.env.DISCORD_OWNER_USER_ID) {
    await interaction.reply({ content: "This isn't your request to act on.", ephemeral: true });
    return;
  }

  const userId = interaction.customId.slice(CUSTOM_ID_PREFIX.length);

  // The Payload PATCH below can occasionally take longer than Discord's
  // 3-second interaction response window - defer first so a slow request
  // doesn't surface as a failed interaction.
  await interaction.deferUpdate();

  try {
    await grantArchivistAccess(userId);
    await interaction.editReply({
      content: `${interaction.message.content}\n\n✅ **Granted archivist access.**`,
      components: [],
    });
  } catch (err) {
    console.error(`[archivistActions] Failed to grant archivist access to ${userId}:`, err);
    await interaction.followUp({
      content: `Failed to grant access: ${err.message}`,
      ephemeral: true,
    });
  }
}
