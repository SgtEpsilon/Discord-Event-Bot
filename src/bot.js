// src/bot.js - Integrated Event + Streaming Bot
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config');
// Event bot services
const CalendarService = require('./services/calendar');
const EventManager = require('./services/eventManager');
const PresetManager = require('./services/presetManager');
const EventsConfig = require('./services/eventsConfig');
// Streaming services
const StreamingConfigManager = require('./services/streamingConfig');
const TwitchMonitor = require('./services/twitchMonitor');
const YouTubeMonitor = require('./services/youtubeMonitor');
// Discord builders
const EmbedBuilder = require('./discord/embedBuilder');
const ButtonBuilder = require('./discord/buttonBuilder');
// Utilities
const { parseDateTime } = require('./utils/datetime');
// Validate configuration
validateConfig();
// Initialize event services
const calendarService = new CalendarService(
  config.google.credentials,
  config.google.calendars
);
const eventManager = new EventManager(config.files.events, calendarService);
const presetManager = new PresetManager(config.files.presets);
const eventsConfig = new EventsConfig(
  config.files.eventsConfig || path.join(__dirname, '../data/events-config.json')
);
// Initialize streaming services
const streamingConfig = new StreamingConfigManager(
  config.files.streaming || path.join(__dirname, '../data/streaming-config.json')
);
let twitchMonitor = null;
let youtubeMonitor = null;
// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});
// Auto-sync state
let autoSyncInterval = null;
let autoSyncChannelId = null;
let autoSyncGuildId = null;
/**
Load all commands dynamically
*/
function loadCommands() {
  const commands = new Map();
  // Load event commands
  const eventCommandsPath = path.join(__dirname, 'discord', 'commands');
  if (fs.existsSync(eventCommandsPath)) {
    const commandFiles = fs.readdirSync(eventCommandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(eventCommandsPath, file));
        if (command.data && command.execute) {
          commands.set(command.data.name, command);
          console.log(`✓ Loaded event command: ${command.data.name}`);
        }
      } catch (error) {
        console.error(`✗ Failed to load ${file}:`, error.message);
      }
    }
  }
  // Load streaming commands
  const streamingCommandsPath = path.join(__dirname, 'discord', 'streamingCommands');
  if (fs.existsSync(streamingCommandsPath)) {
    const commandFiles = fs.readdirSync(streamingCommandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(streamingCommandsPath, file));
        if (command.data && command.execute) {
          commands.set(command.data.name, command);
          console.log(`✓ Loaded streaming command: ${command.data.name}`);
        }
      } catch (error) {
        console.error(`✗ Failed to load ${file}:`, error.message);
      }
    }
  }
  return commands;
}
const commands = loadCommands();
/**
Register slash commands
*/
async function registerCommands(clientId) {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    console.log('🔄 Registering slash commands...');
    const commandData = Array.from(commands.values()).map(cmd => cmd.data);
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandData },
    );
    console.log(`✅ Registered ${commandData.length} slash commands!`);
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}
/**
Start auto-sync for calendar events
*/
function startAutoSync(channelId, guildId) {
  autoSyncChannelId = channelId;
  autoSyncGuildId = guildId;
  syncFromCalendar(channelId, guildId).catch(console.error);
  autoSyncInterval = setInterval(async () => {
    console.log('[AutoSync] Running scheduled sync...');
    try {
      await syncFromCalendar(channelId, guildId);
    } catch (error) {
      console.error('[AutoSync] ❌ Error during scheduled sync:', error);
    }
  }, config.bot.autoSyncInterval);
  console.log('[AutoSync] ✅ Auto-sync enabled');
}
/**
Stop auto-sync
*/
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    autoSyncChannelId = null;
    autoSyncGuildId = null;
    console.log('[AutoSync] ❌ Auto-sync disabled');
  }
}
/**
Sync events from Google Calendar
*/
async function syncFromCalendar(channelId, guildId, calendarFilter = null) {
  const result = await calendarService.syncEvents(168, calendarFilter);
  let postedCount = 0; // Track ONLY successfully posted events

  if (result.success && result.events.length > 0) {
    const channel = await client.channels.fetch(channelId);
    
    for (const eventData of result.events) {
      // importCalendarEvent returns null for duplicates/skipped events
      const event = eventManager.importCalendarEvent(eventData, channelId, guildId);
      
      if (event) {
        const eventEmbed = EmbedBuilder.createEventEmbed(event);
        const buttons = ButtonBuilder.createSignupButtons(event);
        
        const sentMessage = await channel.send({ 
          embeds: [eventEmbed],
          components: buttons || []
        });
        
        // Only count after successful message send AND persistence
        eventManager.updateEvent(event.id, { messageId: sentMessage.id });
        postedCount++; // Increment AFTER all critical operations succeed
      }
    }
    
    // Log actual posted count instead of raw calendar results
    console.log(`[AutoSync] ✅ Posted ${postedCount} new events (filtered from ${result.events.length} calendar events)`);
  }
  
  return result;
}
// Bot ready event
client.once('ready', async () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║ 🤖 ${client.user.tag} is online!`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 📅 Events System: Ready`);
  console.log(`║ 🔗 Google Calendar: ${calendarService.isEnabled() ? 'Connected' : 'Not configured'}`);
  console.log(`║ 📋 Presets: ${presetManager.getPresetCount()} loaded`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 🎮 Twitch Monitor: ${config.twitch?.enabled ? 'Enabled' : 'Disabled (no credentials)'}`);
  console.log(`║ 📺 YouTube Monitor: Enabled (RSS-based)`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  config.discord.clientId = client.user.id;

  // Register commands
  await registerCommands(client.user.id);

  // Test calendar connection
  if (calendarService.isEnabled()) {
    await calendarService.testConnection();
  }

  // Initialize and start streaming monitors
  if (config.twitch?.enabled) {
    twitchMonitor = new TwitchMonitor(client, config, streamingConfig);
    twitchMonitor.start();
  }

  youtubeMonitor = new YouTubeMonitor(client, config, streamingConfig);
  youtubeMonitor.start();
});
// Handle autocomplete
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
    const focusedValue = interaction.options.getFocused();
    const presets = presetManager.searchPresets(focusedValue);
    
    await interaction.respond(
      presets.slice(0, 25).map(preset => ({ 
        name: preset.name, 
        value: preset.key 
      }))
    );
  }
});
// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName}`);
    return;
  }

  try {
    // Create context object with all services
    const context = {
      // Event services
      eventManager,
      presetManager,
      calendarService,
      eventsConfig,
      parseDateTime,
      startAutoSync,
      stopAutoSync,
      syncFromCalendar,
      autoSyncInterval,
      EmbedBuilder,
      ButtonBuilder,
      
      // Streaming services
      streamingConfig,
      twitchMonitor,
      youtubeMonitor
    };
    
    await command.execute(interaction, context);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    const reply = { content: `❌ Error: ${error.message}`, ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});
// Handle button interactions (for event signups)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  try {
    const { action, eventId, roleName } = ButtonBuilder.parseButtonId(interaction.customId);
    const event = eventManager.getEvent(eventId);
    
    if (!event) {
      return interaction.reply({ 
        content: '❌ Event not found. The event may have been deleted.', 
        ephemeral: true
      });
    }
    
    if (action === 'signup') {
      const role = event.roles.find(r => r.name === roleName);
      if (!role) {
        return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
      }
      
      if (event.signups[roleName]?.includes(interaction.user.id)) {
        return interaction.reply({ 
          content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, 
          ephemeral: true 
        });
      }
      
      eventManager.signupUser(eventId, interaction.user.id, roleName);
      
      const updatedEvent = eventManager.getEvent(eventId);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ 
        content: `✅ Signed up as ${role.emoji} ${roleName}!`, 
        ephemeral: true 
      });
    }
    
    if (action === 'leave') {
      const { removed } = eventManager.removeUser(eventId, interaction.user.id);
      
      if (!removed) {
        return interaction.reply({ 
          content: '❌ You were not signed up for this event.', 
          ephemeral: true 
        });
      }
      
      const updatedEvent = eventManager.getEvent(eventId);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ 
        content: '✅ You have left the event.', 
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
  }
});
// Handle guild removal
client.on('guildDelete', async (guild) => {
  // Clean up configs using service methods only (no external require)
  try {
    // Clean up events config
    eventsConfig.deleteGuildConfig(guild.id);
    
    // Clean up streaming config
    streamingConfig.deleteGuildConfig(guild.id);
    
    console.log(`✅ Bot removed from guild ${guild.name} (${guild.id}) - configs cleaned up`);
  } catch (error) {
    console.error(`❌ Error cleaning up configs for guild ${guild.id}:`, error);
  }
});
// Login
client.login(config.discord.token).catch(error => {
  console.error('Failed to login:', error.message);
  console.log('\n⚠️  Please set your Discord bot token in the .env file');
  process.exit(1);
});
// Export for testing
module.exports = {
  client,
  eventManager,
  presetManager,
  calendarService,
  streamingConfig,
  // Use getters to return current runtime values instead of initial nulls
  get twitchMonitor() {
    return twitchMonitor;
  },
  get youtubeMonitor() {
    return youtubeMonitor;
  }
};