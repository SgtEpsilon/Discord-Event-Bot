// src/discord/commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and how to use them')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { presetManager, calendarService } = context;

    try {
      const presetCount = await presetManager.getPresetCount();
      const calendarCount = calendarService.getCalendars().length;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Discord Event Bot - Command Guide')
        .setDescription('Comprehensive event management with Google Calendar integration')
        .addFields(
          {
            name: '📅 Event Management',
            value: '`/create` - Create a custom event\n' +
                   '`/preset` - Create event from preset template\n' +
                   '`/addrole` - Add signup role to event\n' +
                   '`/list` - View all upcoming events\n' +
                   '`/eventinfo` - Detailed event information\n' +
                   '`/delete` - Delete an event',
            inline: false
          },
          {
            name: '📋 Presets',
            value: '`/presets` - List all preset templates\n' +
                   '`/deletepreset` - Delete a preset',
            inline: false
          },
          {
            name: '🗓️ Google Calendar',
            value: '`/calendars` - List configured calendars\n' +
                   '`/sync` - Import events from Google Calendar\n' +
                   '`/autosync` - Manage automatic sync (every 5 min)',
            inline: false
          },
          {
            name: '⚙️ Server Configuration',
            value: '`/set-event-channel` - Set default event channel\n' +
                   '`/event-channel` - View current event channel\n' +
                   '`/clear-event-channel` - Clear event channel',
            inline: false
          },
          {
            name: '🎮 Streaming',
            value: '`/setup-streaming` - Configure notification channel\n' +
                   '`/add-streamer` - Monitor Twitch streamer\n' +
                   '`/add-youtube` - Monitor YouTube channel\n' +
                   '`/list-streamers` - View monitored Twitch streamers\n' +
                   '`/list-youtube` - View monitored YouTube channels',
            inline: false
          },
          {
            name: '💡 Tips',
            value: '• Events auto-post to Discord with signup buttons\n' +
                   '• Use presets for common event types\n' +
                   '• Auto-sync checks Google Calendar every 5 minutes\n' +
                   '• Set event channel to centralize all events',
            inline: false
          }
        )
        .setFooter({ text: `${presetCount} presets • ${calendarCount} calendar(s) configured` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error showing help:', error);
      await interaction.reply({
        content: `❌ Failed to show help: ${error.message}`,
        ephemeral: true
      });
    }
  }
};