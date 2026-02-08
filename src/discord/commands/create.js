const { SlashCommandBuilder } = require('discord.js');
const embedBuilder = require('../embedBuilder');
const buttonBuilder = require('../buttonBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a custom event')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Event title')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName('datetime')
        .setDescription('Event date and time (format: DD-MM-YYYY HH:MM)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Event description')
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1440)
    )
    .addIntegerOption(option =>
      option.setName('max_participants')
        .setDescription('Maximum number of participants')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction, context) {
    const { eventManager, eventsConfig } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      // Get command options
      const title = interaction.options.getString('title');
      const dateTime = interaction.options.getString('datetime');
      const description = interaction.options.getString('description') || 'No description provided';
      const duration = interaction.options.getInteger('duration') || 60;
      const maxParticipants = interaction.options.getInteger('max_participants') || 10;

      // Determine which channel to post to
      const configuredChannelId = eventsConfig.getEventChannel(interaction.guildId);
      const targetChannelId = configuredChannelId || interaction.channelId;
      
      // Fetch the target channel
      let targetChannel;
      if (configuredChannelId) {
        targetChannel = await interaction.guild.channels.fetch(configuredChannelId).catch(() => null);
        
        if (!targetChannel) {
          await interaction.editReply({
            content: '❌ The configured event channel no longer exists or I don\'t have access to it.\n\nPlease use `/set-event-channel` to set a new channel or `/clear-event-channel` to remove this setting.',
            ephemeral: true
          });
          return;
        }
      } else {
        targetChannel = interaction.channel;
      }

      // Create event data
      const eventData = {
        title,
        description,
        dateTime,
        duration,
        maxParticipants,
        roles: [], // Custom events start with no roles, use /addrole to add them
        guildId: interaction.guildId,
        channelId: targetChannelId,
        createdBy: interaction.user.id
      };

      // Create the event
      const event = await eventManager.createEvent(eventData);

      // Create the embed and buttons
      const embed = embedBuilder.createEventEmbed(event);
      const buttons = buttonBuilder.createSignupButtons(event);

      // Send the event message to the target channel
      const message = await targetChannel.send({
        embeds: [embed],
        components: buttons
      });

      // Update event with message ID
      await eventManager.updateEvent(event.id, { messageId: message.id });

      // Send success confirmation
      const channelMention = configuredChannelId ? `in ${targetChannel}` : 'in this channel';
      await interaction.editReply({
        content: `✅ Event "${title}" created successfully ${channelMention}!\n\n💡 **Tip:** Use \`/addrole\` to add signup roles to this event.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error creating event:', error);
      
      const errorMessage = error.message.includes('Invalid date format')
        ? '❌ Invalid date format. Please use DD-MM-YYYY HH:MM (e.g., 15-02-2026 20:00)'
        : `❌ Failed to create event: ${error.message}`;

      if (interaction.deferred) {
        await interaction.editReply({
          content: errorMessage,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  }
};