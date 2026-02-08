// @src/discord/interactionHandlers.js
const { ActionRowBuilder } = require('discord.js');
/**
Handles interaction-based event management operations
@module discord/interactionHandlers
*/

/**
Handle user signing up for an event
*/
async function handleSignup(interaction, event, roleName, context) {
  const { eventManager, EmbedBuilder, ButtonBuilder } = context;
  
  // Check if user is already signed up for this role
  const isAlreadySignedUp = event.signups[roleName]?.includes(interaction.user.id);
  
  if (isAlreadySignedUp) {
    return interaction.reply({
      content: `❌ You are already signed up for this event as ${roleName}.`,
      ephemeral: true
    });
  }
  
  // Use the correct API: signupUser (not addUser)
  eventManager.signupUser(event.id, interaction.user.id, roleName);
  
  // Get the updated event after signup
  const updatedEvent = eventManager.getEvent(event.id);
  
  const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
  const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
  
  await interaction.update({
    embeds: [updatedEmbed],
    components: buttons || []
  });
  
  await interaction.followUp({
    content: `✅ You have successfully signed up for the event as ${roleName}!`,
    ephemeral: true
  });
}

/**
Handle user leaving an event
*/
async function handleLeave(interaction, event, context) {
  const { eventManager, EmbedBuilder, ButtonBuilder } = context;
  
  // removeUser returns { removed } but not the updated event
  const { removed } = eventManager.removeUser(event.id, interaction.user.id);
  
  if (!removed) {
    return interaction.reply({
      content: '❌ You were not signed up for this event.',
      ephemeral: true
    });
  }
  
  // Get the updated event after removal (removeUser doesn't return it)
  const updatedEvent = eventManager.getEvent(event.id);
  
  const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
  const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
  
  await interaction.update({
    embeds: [updatedEmbed],
    components: buttons || []
  });
  
  await interaction.followUp({
    content: '✅ You have left the event.',
    ephemeral: true
  });
}

/**
Handle event creation confirmation
*/
async function handleCreateConfirm(interaction, eventData, context) {
  const { eventManager, timeUtils } = context;
  
  try {
    // Use title/duration instead of name/date (canonical properties)
    const event = await eventManager.createEvent({
      ...eventData,
      creatorId: interaction.user.id,
      createdAt: new Date()
    });
    
    await interaction.reply({
      content: `✅ Event created successfully!\n\n**${event.title}**\n${timeUtils.formatDateTime(event.dateTime)}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error creating event:', error);
    await interaction.reply({
      content: '❌ Failed to create event. Please try again.',
      ephemeral: true
    });
  }
}

/**
Handle event deletion confirmation
*/
async function handleDeleteConfirm(interaction, eventId, context) {
  const { eventManager } = context;
  
  try {
    eventManager.deleteEvent(eventId);
    await interaction.update({
      content: '✅ Event has been deleted.',
      embeds: [],
      components: []
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    await interaction.reply({
      content: '❌ Failed to delete event.',
      ephemeral: true
    });
  }
}

/**
Handle canceling an event modification
*/
async function handleCancel(interaction) {
  await interaction.update({
    content: 'Operation canceled.',
    embeds: [],
    components: []
  });
}

module.exports = {
  handleSignup,
  handleLeave,
  handleCreateConfirm,
  handleDeleteConfirm,
  handleCancel
};