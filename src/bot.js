// src/bot.js - Full bidirectional sync with FAST calendar polling (5 minutes) + AUTO-SYNC PERSISTENCE + RESTART PROTECTION
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config/index');

// Event bot services
const CalendarService = require('./services/calendar');
const EventManager = require('./services/eventManager');
const PresetManager = require('./services/presetManager');
const EventsConfig = require('./services/eventsConfig');
const WebEventPoster = require('./services/webEventPoster');

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

// Initialize web event poster
const webEventPoster = new WebEventPoster(null, eventManager); // Client set in ready event

// Initialize streaming services
const streamingConfigPath = path.resolve(__dirname, config.files.streaming || 'data/streaming.json');
const streamingConfig = new StreamingConfigManager(streamingConfigPath);

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

// Set client for web event poster
webEventPoster.client = client;

// Auto-sync state - NOW WITH 5 MINUTE INTERVAL + PERSISTENCE!
let autoSyncInterval = null;
let autoSyncChannelId = null;
let autoSyncGuildId = null;
const CALENDAR_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes (instead of 1 hour)

// Auto-sync persistence file path
const AUTOSYNC_CONFIG_PATH = path.join(__dirname, '../data/autosync-config.json');

/**
 * Load auto-sync configuration from file
 */
function loadAutoSyncConfig() {
  try {
    if (fs.existsSync(AUTOSYNC_CONFIG_PATH)) {
      const data = fs.readFileSync(AUTOSYNC_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[AutoSync] Error loading config:', error.message);
  }
  return { enabled: false, channelId: null, guildId: null, lastSync: null };
}

/**
 * Save auto-sync configuration to file
 */
function saveAutoSyncConfig(config) {
  try {
    const dir = path.dirname(AUTOSYNC_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUTOSYNC_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('[AutoSync] Configuration saved');
  } catch (error) {
    console.error('[AutoSync] Error saving config:', error.message);
  }
}

/**
 * Load all commands dynamically
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
 * Register slash commands
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
 * Start auto-sync for calendar events - NOW EVERY 5 MINUTES WITH PERSISTENCE!
 */
function startAutoSync(channelId, guildId) {
  autoSyncChannelId = channelId;
  autoSyncGuildId = guildId;
  
  // Save to persistence file
  saveAutoSyncConfig({
    enabled: true,
    channelId: channelId,
    guildId: guildId,
    lastSync: new Date().toISOString()
  });
  
  // Initial sync
  syncFromCalendar(channelId, guildId).catch(console.error);
  
  // Set up 5-minute interval
  autoSyncInterval = setInterval(async () => {
    console.log('[AutoSync] Running scheduled sync (5-minute interval)...');
    try {
      await syncFromCalendar(channelId, guildId);
      // Update last sync time
      saveAutoSyncConfig({
        enabled: true,
        channelId: channelId,
        guildId: guildId,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AutoSync] ❌ Error during scheduled sync:', error);
    }
  }, CALENDAR_SYNC_INTERVAL);
  
  console.log('[AutoSync] ✅ Auto-sync enabled (checking every 5 minutes)');
}

/**
 * Stop auto-sync
 */
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    autoSyncChannelId = null;
    autoSyncGuildId = null;
    
    // Save disabled state to persistence file
    saveAutoSyncConfig({
      enabled: false,
      channelId: null,
      guildId: null,
      lastSync: new Date().toISOString()
    });
    
    console.log('[AutoSync] ❌ Auto-sync disabled');
  }
}

/**
 * Sync events from Google Calendar
 */
async function syncFromCalendar(channelId, guildId, calendarFilter = null) {
  const result = await calendarService.syncEvents(168, calendarFilter);
  let postedCount = 0;
  
  if (result.success && result.events.length > 0) {
    const channel = await client.channels.fetch(channelId);
    for (const eventData of result.events) {
      const event = eventManager.importCalendarEvent(eventData, channelId, guildId);
      
      if (event) {
        const eventEmbed = EmbedBuilder.createEventEmbed(event);
        const buttons = ButtonBuilder.createSignupButtons(event);
        
        const sentMessage = await channel.send({ 
          embeds: [eventEmbed],
          components: buttons || []
        });
        
        eventManager.updateEvent(event.id, { messageId: sentMessage.id });
        postedCount++;
      }
    }
    
    if (postedCount > 0) {
      console.log(`[AutoSync] ✅ Posted ${postedCount} new events (filtered from ${result.events.length} calendar events)`);
    } else {
      console.log(`[AutoSync] ℹ️ No new events to post (checked ${result.events.length} calendar events)`);
    }
  }
  
  return result;
}

/**
 * Restore auto-sync from saved configuration on bot startup
 */
async function restoreAutoSync() {
  const config = loadAutoSyncConfig();
  
  if (config.enabled && config.channelId && config.guildId) {
    console.log('[AutoSync] 🔄 Restoring auto-sync from saved configuration...');
    console.log(`[AutoSync] Channel: ${config.channelId}, Guild: ${config.guildId}`);
    
    try {
      // Verify channel exists and is accessible
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      
      if (!channel) {
        console.error('[AutoSync] ⚠️  Saved channel no longer exists or is inaccessible');
        console.log('[AutoSync] Auto-sync will remain disabled. Use /autosync to reconfigure.');
        saveAutoSyncConfig({ enabled: false, channelId: null, guildId: null, lastSync: null });
        return;
      }
      
      if (channel.guildId !== config.guildId) {
        console.error('[AutoSync] ⚠️  Channel guild mismatch');
        saveAutoSyncConfig({ enabled: false, channelId: null, guildId: null, lastSync: null });
        return;
      }
      
      // Restore auto-sync
      startAutoSync(config.channelId, config.guildId);
      console.log('[AutoSync] ✅ Auto-sync restored successfully!');
      
    } catch (error) {
      console.error('[AutoSync] ❌ Error restoring auto-sync:', error.message);
      console.log('[AutoSync] Auto-sync will remain disabled. Use /autosync to reconfigure.');
    }
  } else {
    console.log('[AutoSync] ℹ️  Auto-sync was not previously enabled');
  }
}

/**
 * Check for missed events during downtime (RESTART PROTECTION)
 */
async function checkMissedEvents() {
  console.log('[RestartProtection] 🔍 Checking for events that should have been posted during downtime...');
  
  try {
    const allEvents = eventManager.getAllEvents();
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    
    let missedCount = 0;
    
    for (const event of Object.values(allEvents)) {
      // Check if event:
      // 1. Has a channel and guild ID (should be posted to Discord)
      // 2. Does NOT have a message ID (hasn't been posted yet)
      // 3. Is within a reasonable timeframe (not too far in the past)
      if (event.channelId && event.guildId && !event.messageId) {
        const eventDate = new Date(event.dateTime);
        
        // Post if event is upcoming OR recently passed (within 2 hours)
        if (eventDate > twoHoursAgo) {
          try {
            const channel = await client.channels.fetch(event.channelId).catch(() => null);
            
            if (channel) {
              const eventEmbed = EmbedBuilder.createEventEmbed(event);
              const buttons = ButtonBuilder.createSignupButtons(event);
              
              const sentMessage = await channel.send({ 
                embeds: [eventEmbed],
                components: buttons || []
              });
              
              eventManager.updateEvent(event.id, { messageId: sentMessage.id });
              missedCount++;
              
              console.log(`[RestartProtection] ✅ Posted missed event: ${event.title}`);
            } else {
              console.log(`[RestartProtection] ⚠️  Channel ${event.channelId} not accessible for event: ${event.title}`);
            }
          } catch (error) {
            console.error(`[RestartProtection] ❌ Error posting event ${event.id}:`, error.message);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (missedCount > 0) {
      console.log(`[RestartProtection] ✅ Posted ${missedCount} missed event(s)`);
    } else {
      console.log('[RestartProtection] ℹ️  No missed events found');
    }
    
  } catch (error) {
    console.error('[RestartProtection] ❌ Error checking missed events:', error.message);
  }
}

/**
 * Update bot status file for web UI
 */
function updateBotStatusFile() {
  if (!client?.user) return;
  
  const statusPath = path.join(__dirname, '../data/bot-status.json');
  const statusData = {
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime()),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    pid: process.pid,
    botName: client.user.tag,
    guildCount: client.guilds.cache.size,
    timestamp: new Date().toISOString(),
    status: 'online',
    autoSync: {
      enabled: !!autoSyncInterval,
      interval: CALENDAR_SYNC_INTERVAL,
      intervalFormatted: `${CALENDAR_SYNC_INTERVAL / 1000 / 60} minutes`,
      channelId: autoSyncChannelId,
      guildId: autoSyncGuildId
    }
  };
  
  try {
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  } catch (error) {
    console.error('[Status] Failed to write bot status:', error.message);
  }
}

/**
 * Update guild list for web UI
 */
function updateGuildList() {
  if (!client?.guilds) return;
  
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount
  }));
  
  const guildListPath = path.join(__dirname, '../data/guilds.json');
  try {
    const dataDir = path.dirname(guildListPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(guildListPath, JSON.stringify(guilds, null, 2));
    console.log(`[Guild Sync] Updated guild list (${guilds.length} servers)`);
  } catch (error) {
    console.error('[Guild Sync] Error writing guild list:', error);
  }
}

/**
 * Update channel list for web UI
 */
function updateChannelList() {
  if (!client?.guilds) return;
  
  const allChannels = {};
  
  client.guilds.cache.forEach(guild => {
    const channels = guild.channels.cache
      .filter(ch => ch.type === 0) // Text channels only
      .map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parentId,
        position: ch.position
      }))
      .sort((a, b) => a.position - b.position);
    
    allChannels[guild.id] = channels;
  });
  
  const channelListPath = path.join(__dirname, '../data/channels.json');
  try {
    const dataDir = path.dirname(channelListPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(channelListPath, JSON.stringify(allChannels, null, 2));
    console.log(`[Channel Sync] Updated channel list (${Object.keys(allChannels).length} servers)`);
  } catch (error) {
    console.error('[Channel Sync] Error writing channel list:', error);
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║ 🤖 ${client.user.tag} is online!`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 📅 Events System: Ready`);
  console.log(`║ 🔗 Google Calendar: ${calendarService.isEnabled() ? 'Connected' : 'Not configured'}`);
  console.log(`║ ⚡ Calendar Sync: Every ${CALENDAR_SYNC_INTERVAL / 1000 / 60} minutes`);
  console.log(`║ 📋 Presets: ${presetManager.getPresetCount()} loaded`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 🎮 Twitch Monitor: ${config.twitch?.enabled ? 'Enabled' : 'Disabled (no credentials)'}`);
  console.log(`║ 📺 YouTube Monitor: Enabled (RSS-based)`);
  console.log(`║ 🌐 Web Event Poster: Starting...`);
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
  
  // Start web event poster
  webEventPoster.start();
  
  // Initialize status file sharing
  updateBotStatusFile();
  setInterval(updateBotStatusFile, 30000); // Update every 30 seconds
  
  // Update guild and channel lists for web UI
  updateGuildList();
  updateChannelList();
  
  client.on('guildCreate', () => {
    updateGuildList();
    updateChannelList();
    updateBotStatusFile();
  });
  
  client.on('guildDelete', () => {
    updateGuildList();
    updateChannelList();
    updateBotStatusFile();
  });
  
  client.on('channelCreate', () => updateChannelList());
  client.on('channelDelete', () => updateChannelList());
  client.on('channelUpdate', () => updateChannelList());
  
  // ✅ NEW: RESTART PROTECTION - Check for missed events
  setTimeout(async () => {
    await checkMissedEvents();
  }, 5000); // Wait 5 seconds after bot is ready
  
  // ✅ NEW: AUTO-SYNC PERSISTENCE - Restore auto-sync if it was enabled before restart
  setTimeout(async () => {
    await restoreAutoSync();
  }, 10000); // Wait 10 seconds after bot is ready (after missed events check)
});

// Command handler
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    
    try {
      const context = {
        eventManager,
        presetManager,
        calendarService,
        eventsConfig,
        streamingConfig,
        twitchMonitor,
        youtubeMonitor,
        parseDateTime,
        startAutoSync,
        stopAutoSync,
        syncFromCalendar,
        autoSyncInterval,
        CALENDAR_SYNC_INTERVAL
      };
      
      await command.execute(interaction, context);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  } else if (interaction.isButton()) {
    // Handle button interactions
    const customId = interaction.customId;
    let action, eventId, roleName;
    
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
      return;
    }
    
    const event = eventManager.getEvent(eventId);
    if (!event) {
      return interaction.reply({ content: '❌ Event not found.', ephemeral: true });
    }
    
    if (action === 'signup') {
      const role = event.roles.find(r => r.name === roleName);
      if (!role) {
        return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
      }
      
      if (event.signups[roleName]?.includes(interaction.user.id)) {
        return interaction.reply({ content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
      }
      
      if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
        return interaction.reply({ content: `❌ ${role.emoji} ${roleName} is full!`, ephemeral: true });
      }
      
      eventManager.removeUser(event.id, interaction.user.id);
      eventManager.signupUser(event.id, interaction.user.id, roleName);
      
      const updatedEvent = eventManager.getEvent(event.id);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
    } else if (action === 'leave') {
      const { removed } = eventManager.removeUser(event.id, interaction.user.id);
      
      if (!removed) {
        return interaction.reply({ content: '❌ You were not signed up for this event.', ephemeral: true });
      }
      
      const updatedEvent = eventManager.getEvent(event.id);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ content: '✅ You have left the event.', ephemeral: true });
    }
  } else if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
      const focusedValue = interaction.options.getFocused();
      const presets = presetManager.loadPresets();
      const choices = Object.keys(presets).filter(choice =>
        choice.toLowerCase().includes(focusedValue.toLowerCase())
      );
      
      await interaction.respond(
        choices.slice(0, 25).map(choice => ({ name: choice, value: choice }))
      );
    }
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
  webEventPoster,
  get twitchMonitor() {
    return twitchMonitor;
  },
  get youtubeMonitor() {
    return youtubeMonitor;
  }
};

// Helper function
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`.replace(/0[dh]\s*/g, '').trim() || '0m';
}