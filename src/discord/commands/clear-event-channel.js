const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear-event-channel')
    .setDescription('Clear the designated event channel (events will post in the command channel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { guildConfig } = context;

    try {
      const guildId = interaction.guildId;

      // Check if an event channel is currently set
      if (!guildConfig.hasEventChannel(guildId)) {
        await interaction.reply({
          content: '❌ No event channel is currently set. Use `/set-event-channel` to configure one.',
          ephemeral: true
        });
        return;
      }

      // Get the current channel before removing it
      const currentChannelId = guildConfig.getEventChannel(guildId);
      const currentChannel = interaction.guild.channels.cache.get(currentChannelId);
      const channelMention = currentChannel ? currentChannel.toString() : `<#${currentChannelId}>`;

      // Remove the event channel setting using unified config
      guildConfig.removeEventChannel(guildId);

      await interaction.reply({
        content: `✅ Event channel cleared!\n\nPrevious channel: ${channelMention}\n\nEvents will now be posted in the channel where the command is used.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error clearing event channel:', error);
      await interaction.reply({
        content: `❌ Failed to clear event channel: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
