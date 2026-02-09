const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event-channel')
    .setDescription('Show the current event channel configuration')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { guildConfig } = context;

    try {
      const guildId = interaction.guildId;

      if (!guildConfig.hasEventChannel(guildId)) {
        await interaction.reply({
          content: '📢 **Event Channel Status**\n\n❌ No event channel is currently set.\n\nEvents will be posted in the channel where the command is used.\n\nUse `/set-event-channel` to configure a dedicated events channel.',
          ephemeral: true
        });
        return;
      }

      const channelId = guildConfig.getEventChannel(guildId);
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        // Channel was deleted or bot lost access
        await interaction.reply({
          content: `⚠️ **Event Channel Status**\n\nThe configured event channel (<#${channelId}>) no longer exists or I don't have access to it.\n\nUse \`/set-event-channel\` to set a new channel or \`/clear-event-channel\` to clear this setting.`,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `📢 **Event Channel Status**\n\n✅ Event channel is set to: ${channel}\n\nAll events created with \`/create\` and \`/preset\` will be posted there.\n\nUse \`/clear-event-channel\` to remove this setting.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error getting event channel info:', error);
      await interaction.reply({
        content: `❌ Failed to get event channel info: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
