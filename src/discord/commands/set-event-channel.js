const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-event-channel')
    .setDescription('Set the channel where all events will be posted')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to post events in')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { eventsConfig } = context;

    try {
      const channel = interaction.options.getChannel('channel');
      const guildId = interaction.guildId;

      // Verify the bot has permission to send messages in the channel
      const permissions = channel.permissionsFor(interaction.guild.members.me);
      if (!permissions.has(PermissionFlagsBits.SendMessages)) {
        await interaction.reply({
          content: `❌ I don't have permission to send messages in ${channel}. Please grant me the "Send Messages" permission in that channel.`,
          ephemeral: true
        });
        return;
      }

      if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
        await interaction.reply({
          content: `❌ I don't have permission to embed links in ${channel}. Please grant me the "Embed Links" permission in that channel.`,
          ephemeral: true
        });
        return;
      }

      // Set the event channel
      eventsConfig.setEventChannel(guildId, channel.id);

      await interaction.reply({
        content: `✅ Event channel set to ${channel}!\n\nAll events created with \`/create\` and \`/preset\` will now be posted there.`,
        ephemeral: true
      });

      // Send a test message to the channel
      try {
        await channel.send({
          content: '✅ This channel has been set as the events channel. All future events will be posted here.',
        });
      } catch (error) {
        console.error('Error sending confirmation message to event channel:', error);
        // Don't fail the command if we can't send the confirmation
      }

    } catch (error) {
      console.error('Error setting event channel:', error);
      await interaction.reply({
        content: `❌ Failed to set event channel: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
