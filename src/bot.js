// src/bot.js - FIXED: Bot status sharing + all typos corrected
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config/index'); // FIXED: Added /index

// Event bot services
const CalendarService = require('./services/calendar');
const EventManager = require('./services/eventManager'); // FIXED: Removed space
const PresetManager = require('./services/presetManager');
const EventsConfig = require('./services/eventsConfig');

// Streaming services
const StreamingConfigManager = require('./services/streamingConfig'); // FIXED: Removed space
const TwitchMonitor = require('./services/twitchMonitor');
const YouTubeMonitor = require('./services/youtubeMonitor');

// Discord builders
const EmbedBuilder = require('./discord/embedBuilder'); // FIXED: Removed space
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

// Initialize streaming services - FIXED: Correct file path
const streamingConfig = new StreamingConfigManager(
  config.files.streaming || path.join(__dirname, '../data/streaming-config.json') // FIXED: streaming-config.json
);

let twitchMonitor = null;
let youtubeMonitor = null;

// Initialize Discord client
const client = new Client({
  intents: [ // FIXED: Removed space before colon
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
 * Load all commands dynamically
 */
function loadCommands() {
  const commands = new Map();
  
  // Load event commands
  const eventCommandsPath = path.join(__dirname, 'discord', 'commands');
  if (fs.existsSync(eventCommandsPath)) {
    const commandFiles = fs.readdirSync(eventCommandsPath).filter(file => file.endsWith('.js')); // FIXED: Arrow function spacing
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
    const commandFiles = fs.readdirSync(streamingCommandsPath).filter(file => file.endsWith('.js')); // FIXED: Arrow function spacing
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
    const commandData = Array.from(commands.values()).map(cmd => cmd.data); // FIXED: Arrow function spacing
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
 * Start auto-sync for calendar events
 */
function startAutoSync(channelId, guildId) {
  autoSyncChannelId = channelId;
  autoSyncGuildId = guildId;
  syncFromCalendar(channelId, guildId).catch(console.error);
  autoSyncInterval = setInterval(async () => { // FIXED: Arrow function spacing
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
 * Stop auto-sync
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
 * Sync events from Google Calendar
 */
async function syncFromCalendar(channelId, guildId, calendarFilter = null) {
  const result = await calendarService.syncEvents(168, calendarFilter); // FIXED: Removed space in param name
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
    
    console.log(`[AutoSync] ✅ Posted ${postedCount} new events (filtered from ${result.events.length} calendar events)`);
  }
  
  return result;
}

// ==========================================
// BOT STATUS SHARING FOR WEB UI (CRITICAL FIX)
// ==========================================
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
    status: 'online'
  };
  
  try {
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  } catch (error) {
    console.error('[Status] Failed to write bot status:', error.message);
  }
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
  
  // ✅ CRITICAL: Initialize status file sharing
  updateBotStatusFile();
  setInterval(updateBotStatusFile, 30000); // Update every 30 seconds
  
  // Update guild list for web UI
  updateGuildList();
  client.on('guildCreate', () => {
    updateGuildList();
    updateBotStatusFile(); // Update status on guild join
  });
  client.on('guildDelete', () => {
    updateGuildList();
    updateBotStatusFile(); // Update status on guild leave
  });
});

// ==========================================
// GUILD LIST SHARING FOR WEB UI
// ==========================================
function updateGuildList() {
  if (!client?.guilds) return;
  
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount
  }));
  
  const guildListPath = path.join(__dirname, '../data/guilds.json');
  try {
    // Ensure data directory exists
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

// ... [Rest of bot.js remains unchanged: command handlers, button interactions, etc.] ...

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