// @src/discord/interactionHandlers.js
const { ActionRowBuilder } = require('discord.js');
/**
Handles interaction-based event management operations
@module discord/interactionHandlers
*/
/**
Handle user signing up for an event
*/
async function handleSignup(interaction, event, context) {
const { eventManager, EmbedBuilder, ButtonBuilder } = context;
const { added, event: updatedEvent } = eventManager.addUser(event.id, interaction.user.id);
if (!added) {
return interaction.reply({
content: '❌ You are already signed up for this event.',
ephemeral: true
});
}
const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
await interaction.update({
embeds: [updatedEmbed],
components: buttons || []
});
await interaction.followUp({
content: '✅ You have successfully signed up for the event!',
ephemeral: true
});
}
/**
Handle user leaving an event
*/
async function handleLeave(interaction, event, context) {
const { eventManager, EmbedBuilder, ButtonBuilder } = context;
// ✅ FIXED: Properly destructure removeUser return value ({ event, removed })
const { removed, event: updatedEvent } = eventManager.removeUser(event.id, interaction.user.id);
if (!removed) {
return interaction.reply({
content: '❌ You were not signed up for this event.',
ephemeral: true
});
}
// Use updatedEvent returned directly from removeUser (avoids redundant lookup)
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
const event = await eventManager.createEvent({  // ✅ AWAIT added
...eventData,
creatorId: interaction.user.id,
createdAt: new Date()
});
await interaction.reply({
content: `✅ Event created successfully!\n\n**${event.name}**\n${timeUtils.formatDateTime(event.date)}`,
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
content: 'CloseOperation canceled.',
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