// src/discord/commands/list.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDateTime } = require('../../utils/datetime');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all upcoming events in this server')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { eventManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const guildEvents = await eventManager.getGuildEvents(interaction.guildId);
      const upcomingEvents = guildEvents.filter(event => new Date(event.dateTime) > new Date());

      if (upcomingEvents.length === 0) {
        return interaction.editReply({
          content: '📭 No upcoming events found.\n\nCreate one with `/create` or `/preset`',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📅 Upcoming Events')
        .setDescription(`Found ${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? 's' : ''}`)
        .setTimestamp();

      upcomingEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

      upcomingEvents.forEach((event, index) => {
        const totalSignups = Object.values(event.signups || {}).reduce((sum, arr) => sum + arr.length, 0);
        const maxPart = event.maxParticipants > 0 ? `/${event.maxParticipants}` : '';
        
        embed.addFields({
          name: `${index + 1}. ${event.title}`,
          value: `**ID:** \`${event.id}\`\n` +
                 `**Date:** ${formatDateTime(event.dateTime)}\n` +
                 `**Signups:** ${totalSignups}${maxPart} player${totalSignups !== 1 ? 's' : ''}\n` +
                 `**Duration:** ${event.duration} min`,
          inline: true
        });
      });

      embed.setFooter({ text: 'Use /eventinfo <id> for detailed information' });

      await interaction.editReply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error listing events:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to list events: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to list events: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};