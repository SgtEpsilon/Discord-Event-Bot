// src/discord/commands/calendars.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendars')
    .setDescription('List all configured Google Calendar sources')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { calendarService } = context;

    try {
      if (!calendarService.isEnabled()) {
        await interaction.reply({
          content: '❌ Google Calendar is not configured.\n\nConfigure GOOGLE_CREDENTIALS in your .env file to enable calendar integration.',
          ephemeral: true
        });
        return;
      }

      const calendars = calendarService.getCalendars();

      const embed = new EmbedBuilder()
        .setColor(0x4285F4)
        .setTitle('📅 Configured Google Calendars')
        .setDescription(`Found ${calendars.length} calendar${calendars.length !== 1 ? 's' : ''}`)
        .setTimestamp();

      calendars.forEach((cal, index) => {
        embed.addFields({
          name: `${index + 1}. ${cal.name}`,
          value: `**ID:** \`${cal.id}\`\n**Sync command:** \`/sync calendar_filter:${cal.name}\``,
          inline: false
        });
      });

      embed.setFooter({ text: 'Use /sync to import events from these calendars' });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error listing calendars:', error);
      await interaction.reply({
        content: `❌ Failed to list calendars: ${error.message}`,
        ephemeral: true
      });
    }
  }
};