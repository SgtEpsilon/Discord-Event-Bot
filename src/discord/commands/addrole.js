// src/discord/commands/addrole.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embedBuilder = require('../embedBuilder');
const buttonBuilder = require('../buttonBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Add a signup role to an event')
    .addStringOption(option =>
      option.setName('event_id')
        .setDescription('Event ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('Role emoji')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('role_name')
        .setDescription('Role name')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('max_slots')
        .setDescription('Maximum slots for this role (0 for unlimited)')
        .setRequired(false)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { eventManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const eventId = interaction.options.getString('event_id');
      const emoji = interaction.options.getString('emoji');
      const roleName = interaction.options.getString('role_name');
      const maxSlots = interaction.options.getInteger('max_slots') || null;

      const event = await eventManager.getEvent(eventId);
      if (!event) {
        return interaction.editReply({
          content: '❌ Event not found. Use `/list` to see all event IDs.',
          ephemeral: true
        });
      }

      await eventManager.addRole(eventId, {
        name: roleName,
        emoji: emoji,
        maxSlots: maxSlots
      });

      const updatedEvent = await eventManager.getEvent(eventId);

      if (event.messageId && event.channelId) {
        try {
          const channel = await interaction.client.channels.fetch(event.channelId);
          const message = await channel.messages.fetch(event.messageId);
          
          const updatedEmbed = embedBuilder.createEventEmbed(updatedEvent);
          const buttons = buttonBuilder.createSignupButtons(updatedEvent);
          
          await message.edit({
            embeds: [updatedEmbed],
            components: buttons || []
          });
        } catch (error) {
          console.error('Error updating event message:', error);
        }
      }

      await interaction.editReply({
        content: `✅ Role "${emoji} ${roleName}" added to event!\n\n${maxSlots ? `Max slots: ${maxSlots}` : 'Unlimited slots'}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error adding role:', error);
      
      const errorMessage = error.message.includes('Event not found')
        ? '❌ Event not found.'
        : `❌ Failed to add role: ${error.message}`;

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