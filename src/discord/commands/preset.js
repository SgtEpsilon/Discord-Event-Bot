const { SlashCommandBuilder } = require('discord.js');
const embedBuilder = require('../embedBuilder');
const buttonBuilder = require('../buttonBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('preset')
    .setDescription('Create an event from a preset template')
    .addStringOption(option =>
      option.setName('preset_name')
        .setDescription('Name of the preset to use')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('datetime')
        .setDescription('Event date and time (format: DD-MM-YYYY HH:MM)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('custom_title')
        .setDescription('Custom title (overrides preset title)')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName('custom_description')
        .setDescription('Custom description (overrides preset description)')
        .setRequired(false)
        .setMaxLength(1000)
    ),

  async execute(interaction, context) {
    const { eventManager, presetManager, eventsConfig } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      // Get command options
      const presetName = interaction.options.getString('preset_name');
      const dateTime = interaction.options.getString('datetime');
      const customTitle = interaction.options.getString('custom_title');
      const customDescription = interaction.options.getString('custom_description');

      // Get the preset
      const preset = presetManager.getPreset(presetName);
      if (!preset) {
        await interaction.editReply({
          content: `❌ Preset "${presetName}" not found. Use \`/presets\` to see available presets.`,
          ephemeral: true
        });
        return;
      }

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

      // Create event data from preset
      const eventData = {
        ...preset,
        dateTime,
        guildId: interaction.guildId,
        channelId: targetChannelId,
        createdBy: interaction.user.id
      };

      // Apply custom overrides if provided
      if (customTitle) {
        eventData.title = customTitle;
      }
      if (customDescription) {
        eventData.description = customDescription;
      }

      // Create the event from preset
      const event = await eventManager.createFromPreset(preset, dateTime, {
        guildId: interaction.guildId,
        channelId: targetChannelId,
        createdBy: interaction.user.id,
        customTitle,
        customDescription
      });

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
        content: `✅ Event "${event.title}" created from preset "${preset.name}" ${channelMention}!`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error creating event from preset:', error);
      
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