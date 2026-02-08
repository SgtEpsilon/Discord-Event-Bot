// src/discord/interactionHandlers.js
/**
Handle button interactions for event signups
*/
async function handleButtonInteraction(interaction, context) {
  const { eventManager, EmbedBuilder, ButtonBuilder } = context;
  const customId = interaction.customId;
  console.log(`[Button Click] CustomId: "${customId}"`);
  let action, eventId, roleName;
  // Parse button custom ID
  if (customId.startsWith('leave_')) {
    action = 'leave';
    eventId = customId.substring(6);
    roleName = null;
  } else if (customId.startsWith('signup_')) {
    action = 'signup';
    const withoutAction = customId.substring(7);
    const lastUnderscore = withoutAction.lastIndexOf('_');
    eventId = withoutAction.substring(0, lastUnderscore);
    roleName = withoutAction.substring(lastUnderscore + 1);
  } else {
    console.error(`[ERROR] Unknown action in customId: ${customId}`);
    return interaction.reply({
      content: '❌ Invalid button action.',
      ephemeral: true
    });
  }
  console.log(`[Parse] Action: "${action}" | EventId: "${eventId}" | RoleName: "${roleName}"`);
  const event = eventManager.getEvent(eventId);
  if (!event) {
    console.error(`[ERROR] Event "${eventId}" not found`);
    return interaction.reply({
      content: '❌ Event not found. The event may have been deleted.',
      ephemeral: true
    });
  }
  console.log(`[Found] Event "${event.title}" (ID: ${eventId})`);
  if (action === 'signup') {
    return handleSignup(interaction, event, roleName, { eventManager, EmbedBuilder, ButtonBuilder });
  } else if (action === 'leave') {
    return handleLeave(interaction, event, { eventManager, EmbedBuilder, ButtonBuilder });
  }
}

/**
Handle user signup for a role
*/
async function handleSignup(interaction, event, roleName, context) {
  const { eventManager, EmbedBuilder, ButtonBuilder } = context;
  const role = event.roles.find(r => r.name === roleName);
  if (!role) {
    return interaction.reply({
      content: '❌ Role not found.',
      ephemeral: true
    });
  }
  // Already signed up
  if (event.signups[roleName]?.includes(interaction.user.id)) {
    return interaction.reply({
      content: `✅ You're already signed up as ${role.emoji} ${roleName}!`,
      ephemeral: true
    });
  }
  // Role full
  if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
    return interaction.reply({
      content: `❌ ${role.emoji} ${roleName} is full!`,
      ephemeral: true
    });
  }
  // Remove user from all other roles
  eventManager.removeUser(event.id, interaction.user.id);
  // ✅ FIXED ARGUMENT ORDER
  eventManager.signupUser(
    event.id,
    interaction.user.id, // userId
    roleName              // roleName
  );
  // Update message
  const updatedEvent = eventManager.getEvent(event.id);
  const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
  const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
  await interaction.update({
    embeds: [updatedEmbed],
    components: buttons || []
  });
  await interaction.followUp({
    content: `✅ Signed up as ${role.emoji} ${roleName}!`,
    ephemeral: true
  });
}

/**
Handle user leaving an event
*/
async function handleLeave(interaction, event, context) {
  const { eventManager, EmbedBuilder, ButtonBuilder } = context;
  // ✅ FIXED: Properly destructure removeUser return value ({ removed, event })
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
Handle autocomplete interactions
*/
async function handleAutocomplete(interaction, context) {
  const { presetManager } = context;
  if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
    const focusedValue = interaction.options.getFocused();
    const presets = presetManager.loadPresets();
    const choices = Object.keys(presets).filter(choice =>
      choice.toLowerCase().includes(focusedValue.toLowerCase())
    );

    await interaction.respond(
      choices.slice(0, 25).map(choice => ({
        name: choice,
        value: choice
      }))
    );
  }
}

module.exports = {
  handleButtonInteraction,
  handleAutocomplete
};