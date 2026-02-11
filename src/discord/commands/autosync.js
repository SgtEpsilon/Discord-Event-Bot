// src/discord/commands/autosync.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autosync')
    .setDescription('Manage automatic Google Calendar syncing')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices(
          { name: 'Enable Auto-Sync', value: 'on' },
          { name: 'Disable Auto-Sync', value: 'off' },
          { name: 'Check Status', value: 'status' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { calendarService, startAutoSync, stopAutoSync, autoSyncInterval, CALENDAR_SYNC_INTERVAL } = context;

    try {
      const action = interaction.options.getString('action');

      // Check if calendar is configured
      if (!calendarService.isEnabled()) {
        await interaction.reply({
          content: '❌ Google Calendar is not configured. Auto-sync cannot be enabled.\n\nConfigure GOOGLE_CREDENTIALS in your .env file.',
          ephemeral: true
        });
        return;
      }

      if (action === 'on') {
        if (autoSyncInterval) {
          await interaction.reply({
            content: 'ℹ️ Auto-sync is already enabled.\n\nEvents are being synced from Google Calendar automatically.',
            ephemeral: true
          });
          return;
        }

        // Enable auto-sync
        startAutoSync(interaction.channel.id, interaction.guild.id);

        const intervalMinutes = Math.floor((CALENDAR_SYNC_INTERVAL || 300000) / 60000);

        await interaction.reply({
          content: `✅ **Auto-sync enabled!**\n\n📅 Events will be synced from Google Calendar every **${intervalMinutes} minutes**.\n\n💡 New events will automatically appear in this channel.`,
          ephemeral: false
        });

      } else if (action === 'off') {
        if (!autoSyncInterval) {
          await interaction.reply({
            content: 'ℹ️ Auto-sync is already disabled.\n\nUse `/autosync action:on` to enable it.',
            ephemeral: true
          });
          return;
        }

        // Disable auto-sync
        stopAutoSync();

        await interaction.reply({
          content: '✅ **Auto-sync disabled.**\n\nAutomatic calendar syncing has been stopped.\n\n💡 You can still manually sync with `/sync`',
          ephemeral: false
        });

      } else if (action === 'status') {
        const intervalMinutes = Math.floor((CALENDAR_SYNC_INTERVAL || 300000) / 60000);
        
        if (autoSyncInterval) {
          await interaction.reply({
            content: `📊 **Auto-Sync Status**\n\n✅ **Enabled**\n📅 Interval: Every **${intervalMinutes} minutes**\n📢 Channel: ${interaction.channel}\n🔄 Next sync: Within ${intervalMinutes} minutes`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `📊 **Auto-Sync Status**\n\n❌ **Disabled**\n\n💡 Use \`/autosync action:on\` to enable automatic calendar syncing (checks every ${intervalMinutes} minutes).`,
            ephemeral: true
          });
        }
      }

    } catch (error) {
      console.error('[AutoSync Command] Error:', error);
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: `❌ Error: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Error: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};
