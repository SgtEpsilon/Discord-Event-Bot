// src/discord/commands/eventinfo.js
const { SlashCommandBuilder } = require('discord.js');
const embedBuilder = require('../embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eventinfo')
    .setDescription('Show detailed event information with timezone conversion')
    .addStringOption(option =>
      option.setName('event_id')
        .setDescription('Event ID')
        .setRequired(true)
    )
    .setDMPermission(false),

  async execute(interaction, context) {
    const { eventManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const eventId = interaction.options.getString('event_id');
      const event = await eventManager.getEvent(eventId);

      if (!event) {
        return interaction.editReply({
          content: '❌ Event not found. Use `/list` to get the event ID.',
          ephemeral: true
        });
      }

      const embed = embedBuilder.createEventInfoEmbed(event);
      await interaction.editReply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error getting event info:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to get event info: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to get event info: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};