// src/discord/commands/sync.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync events from Google Calendar')
    .addStringOption(option =>
      option.setName('calendar_filter')
        .setDescription('Filter by calendar name (optional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { calendarService, syncFromCalendar } = context;

    try {
      if (!calendarService.isEnabled()) {
        return interaction.reply({
          content: '❌ Google Calendar is not configured.\n\nConfigure GOOGLE_CREDENTIALS in your .env file to enable sync.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const calendarFilter = interaction.options.getString('calendar_filter');

      const result = await syncFromCalendar(
        interaction.channelId,
        interaction.guildId,
        calendarFilter
      );

      if (!result.success) {
        return interaction.editReply(`❌ ${result.message}`);
      }

      if (result.events.length === 0) {
        const calendarsChecked = calendarFilter
          ? `calendar "${calendarFilter}"`
          : `${calendarService.getCalendars().length} calendar(s)`;
        return interaction.editReply(
          `✅ No new events to import from ${calendarsChecked}.\n\nAll events are already synced!`
        );
      }

      let response = `✅ ${result.message}\n`;
      if (result.calendars && result.calendars.length > 0) {
        response += `\n📅 **Calendars:** ${result.calendars.join(', ')}\n`;
      }
      response += `\nEvents have been posted to this channel.`;

      await interaction.editReply(response);

    } catch (error) {
      console.error('Error syncing calendar:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to sync calendar: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to sync calendar: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};