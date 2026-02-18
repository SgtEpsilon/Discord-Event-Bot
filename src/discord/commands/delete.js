// src/discord/commands/delete.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete an event')
    .addStringOption(option =>
      option.setName('event_id')
        .setDescription('Event ID to delete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { eventManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const eventId = interaction.options.getString('event_id');
      const event = await eventManager.getEvent(eventId);

      if (!event) {
        return interaction.editReply({
          content: '❌ Event not found. Use `/list` to see all event IDs.',
          ephemeral: true
        });
      }

      const eventTitle = event.title;

      // Delete the Discord message if it exists
      if (event.messageId && event.channelId) {
        try {
          const channel = await interaction.client.channels.fetch(event.channelId);
          const message = await channel.messages.fetch(event.messageId);
          await message.delete();
        } catch (error) {
          console.error('Error deleting event message:', error);
        }
      }

      await eventManager.deleteEvent(eventId);

      await interaction.editReply({
        content: `✅ Event "${eventTitle}" has been deleted.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error deleting event:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to delete event: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to delete event: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};