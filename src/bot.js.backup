// src/bot.js - Enhanced with database-aware automatic calendar sync
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config/index');

// Database initialization
const { testConnection, initializeDatabase } = require('./config/database');

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

// Initialize managers (calendar service will be created dynamically)
const eventManager = new EventManager();
const presetManager = new PresetManager();
const eventsConfig = new EventsConfig(
  config.files.eventsConfig || path.join(__dirname, '../data/events-config.json')
);

// Initialize web event poster
const webEventPoster = new WebEventPoster(null, eventManager);

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

// Auto-sync state
let autoSyncInterval = null;
let autoSyncChannelId = null;
let autoSyncGuildId = null;
const CALENDAR_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Background calendar sync
let backgroundSyncInterval = null;

/**
 * 🆕 Get calendars from database
 */
async function getCalendarsFromDatabase() {
  try {
    const { CalendarConfig } = require('./models');
    const dbCalendars = await CalendarConfig.findAll();
    
    return dbCalendars.map(cal => ({
      name: cal.name,
      id: cal.calendarId
    }));
  } catch (error) {
    console.error('[Calendar] Error loading calendars from database:', error.message);
    return [];
  }
}

/**
 * 🆕 Create calendar service with database calendars
 */
async function createCalendarService() {
  const calendars = await getCalendarsFromDatabase();
  
  if (calendars.length === 0) {
    console.log('[Calendar] No calendars found in database');
    return null;
  }
  
  return new CalendarService(config.google.credentials, calendars);
}

/**
 * 🆕 Background sync - imports calendar events to database only
 */
async function backgroundCalendarSync() {
  console.log('[BackgroundSync] Starting background calendar sync...');
  
  try {
    // Create calendar service with current database calendars
    const calendarService = await createCalendarService();
    
    if (!calendarService || !calendarService.isEnabled()) {
      console.log('[BackgroundSync] Calendar service not available, skipping');
      return;
    }
    
    const result = await calendarService.syncEvents(744); // Next 31 days
    
    if (!result.success) {
      console.log(`[BackgroundSync] Sync failed: ${result.message}`);
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const { Event } = require('./models');

    for (const eventData of result.events) {
      try {
        // Check if event already exists by calendarSourceId
        const exists = await Event.findOne({
          where: { calendarSourceId: eventData.calendarSourceId }
        });

        if (!exists) {
          const eventId = `gcal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await Event.create({
            id: eventId,
            title: eventData.calendarEvent.summary || 'Untitled Event',
            description: eventData.calendarEvent.description || '',
            dateTime: new Date(eventData.calendarEvent.start.dateTime),
            duration: eventData.duration,
            maxParticipants: 0,
            roles: [],
            signups: {},
            createdBy: 'calendar_background_sync',
            calendarLink: eventData.calendarEvent.htmlLink,
            calendarEventId: eventData.calendarEvent.id,
            calendarSource: eventData.calendarSource,
            calendarSourceId: eventData.calendarSourceId,
            // No channelId or guildId - these are web-only events
            channelId: null,
            guildId: null,
            messageId: null
          });
          
          importedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`[BackgroundSync] Error importing event:`, error.message);
      }
    }

    console.log(`[BackgroundSync] ✅ Complete - Imported: ${importedCount}, Skipped: ${skippedCount}, Total: ${result.events.length}`);

    // Update last sync time
    try {
      const { AutoSyncConfig } = require('./models');
      await AutoSyncConfig.upsert({
        id: 1,
        enabled: false, // This is for background sync tracking only
        lastSync: new Date()
      });
    } catch (error) {
      console.error('[BackgroundSync] Error updating last sync time:', error.message);
    }

  } catch (error) {
    console.error('[BackgroundSync] ❌ Error during sync:', error.message);
  }
}

/**
 * 🆕 Start background calendar sync (web UI only)
 */
async function startBackgroundSync() {
  const calendars = await getCalendarsFromDatabase();
  
  if (calendars.length === 0) {
    console.log('[BackgroundSync] No calendars configured in database, skipping automatic sync');
    console.log('[BackgroundSync] Add calendars via the web UI to enable automatic sync');
    return;
  }

  console.log(`[BackgroundSync] Starting automatic calendar sync for ${calendars.length} calendar(s)`);
  console.log(`[BackgroundSync] Calendars: ${calendars.map(c => c.name).join(', ')}`);
  
  // Initial sync after 10 seconds
  setTimeout(() => {
    backgroundCalendarSync();
  }, 10000);
  
  // Set up 5-minute interval
  backgroundSyncInterval = setInterval(async () => {
    await backgroundCalendarSync();
  }, CALENDAR_SYNC_INTERVAL);
}

/**
 * Stop background calendar sync
 */
function stopBackgroundSync() {
  if (backgroundSyncInterval) {
    clearInterval(backgroundSyncInterval);
    backgroundSyncInterval = null;
    console.log('[BackgroundSync] ❌ Stopped');
  }
}

/**
 * Start auto-sync for calendar events - Posts to Discord
 */
async function startAutoSync(channelId, guildId) {
  autoSyncChannelId = channelId;
  autoSyncGuildId = guildId;
  
  // Save to database
  try {
    const { AutoSyncConfig } = require('./models');
    
    // Disable any existing configs
    await AutoSyncConfig.update(
      { enabled: false },
      { where: { enabled: true } }
    );
    
    // Create or update config
    const [config, created] = await AutoSyncConfig.findOrCreate({
      where: { id: 2 }, // ID 2 for Discord auto-sync (ID 1 is for background sync tracking)
      defaults: {
        enabled: true,
        channelId,
        guildId,
        lastSync: new Date()
      }
    });
    
    if (!created) {
      await config.update({
        enabled: true,
        channelId,
        guildId,
        lastSync: new Date()
      });
    }
    
    console.log('[AutoSync] ✅ Configuration saved to database');
  } catch (error) {
    console.error('[AutoSync] Error saving config:', error.message);
  }
  
  // Initial sync
  syncFromCalendar(channelId, guildId).catch(console.error);
  
  // Set up 5-minute interval
  autoSyncInterval = setInterval(async () => {
    console.log('[AutoSync] Running scheduled sync (5-minute interval)...');
    try {
      await syncFromCalendar(channelId, guildId);
      
      // Update last sync time
      const { AutoSyncConfig } = require('./models');
      await AutoSyncConfig.update(
        { lastSync: new Date() },
        { where: { id: 2, enabled: true } }
      );
    } catch (error) {
      console.error('[AutoSync] ❌ Error during scheduled sync:', error);
    }
  }, CALENDAR_SYNC_INTERVAL);
  
  console.log('[AutoSync] ✅ Auto-sync enabled (checking every 5 minutes)');
}

/**
 * Stop auto-sync
 */
async function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    autoSyncChannelId = null;
    autoSyncGuildId = null;
    
    // Save to database
    try {
      const { AutoSyncConfig } = require('./models');
      await AutoSyncConfig.update(
        { enabled: false, lastSync: new Date() },
        { where: { id: 2 } }
      );
      console.log('[AutoSync] ✅ Configuration saved to database');
    } catch (error) {
      console.error('[AutoSync] Error saving config:', error.message);
    }
    
    console.log('[AutoSync] ❌ Auto-sync disabled');
  }
}

/**
 * Sync events from Google Calendar and post to Discord channel
 */
async function syncFromCalendar(channelId, guildId, calendarFilter = null) {
  // Create calendar service with current database calendars
  const calendarService = await createCalendarService();
  
  if (!calendarService) {
    console.log('[AutoSync] No calendars configured');
    return { success: false, message: 'No calendars configured', events: [] };
  }
  
  const result = await calendarService.syncEvents(168, calendarFilter);
  let postedCount = 0;
  
  if (result.success && result.events.length > 0) {
    const channel = await client.channels.fetch(channelId);
    const { Event } = require('./models');
    
    for (const eventData of result.events) {
      try {
        // Check if already exists
        const exists = await Event.findOne({
          where: { calendarSourceId: eventData.calendarSourceId }
        });
        
        if (exists && exists.messageId && exists.channelId === channelId) {
          // Already posted to this channel
          continue;
        }
        
        const eventId = exists?.id || `gcal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create or update event
        const [event] = await Event.upsert({
          id: eventId,
          title: eventData.calendarEvent.summary || 'Untitled Event',
          description: eventData.calendarEvent.description || '',
          dateTime: new Date(eventData.calendarEvent.start.dateTime),
          duration: eventData.duration,
          maxParticipants: 0,
          roles: [],
          signups: exists?.signups || {},
          createdBy: 'calendar_autosync',
          calendarLink: eventData.calendarEvent.htmlLink,
          calendarEventId: eventData.calendarEvent.id,
          calendarSource: eventData.calendarSource,
          calendarSourceId: eventData.calendarSourceId,
          channelId: channelId,
          guildId: guildId,
          messageId: null // Will be set after posting
        });
        
        // Post to Discord
        const eventEmbed = EmbedBuilder.createEventEmbed(event.toJSON());
        const buttons = ButtonBuilder.createSignupButtons(event.toJSON());
        
        const sentMessage = await channel.send({ 
          embeds: [eventEmbed],
          components: buttons || []
        });
        
        await event.update({ messageId: sentMessage.id });
        postedCount++;
        
      } catch (error) {
        console.error('[AutoSync] Error processing event:', error.message);
      }
    }
    
    if (postedCount > 0) {
      console.log(`[AutoSync] ✅ Posted ${postedCount} new events (filtered from ${result.events.length} calendar events)`);
    } else {
      console.log(`[AutoSync] ℹ️  No new events to post (checked ${result.events.length} calendar events)`);
    }
  }
  
  return result;
}

/**
 * Restore auto-sync from database on bot startup
 */
async function restoreAutoSync() {
  try {
    const { AutoSyncConfig } = require('./models');
    const config = await AutoSyncConfig.findOne({
      where: { id: 2, enabled: true }
    });
    
    if (config && config.channelId && config.guildId) {
      console.log('[AutoSync] 🔄 Restoring auto-sync from database...');
      console.log(`[AutoSync] Channel: ${config.channelId}, Guild: ${config.guildId}`);
      
      try {
        const channel = await client.channels.fetch(config.channelId).catch(() => null);
        
        if (!channel) {
          console.error('[AutoSync] ⚠️  Saved channel no longer exists or is inaccessible');
          console.log('[AutoSync] Auto-sync will remain disabled. Use /autosync to reconfigure.');
          await config.update({ enabled: false });
          return;
        }
        
        if (channel.guildId !== config.guildId) {
          console.error('[AutoSync] ⚠️  Channel guild mismatch');
          await config.update({ enabled: false });
          return;
        }
        
        // Restore auto-sync
        await startAutoSync(config.channelId, config.guildId);
        console.log('[AutoSync] ✅ Auto-sync restored successfully!');
        
      } catch (error) {
        console.error('[AutoSync] ❌ Error restoring auto-sync:', error.message);
        console.log('[AutoSync] Auto-sync will remain disabled. Use /autosync to reconfigure.');
      }
    } else {
      console.log('[AutoSync] ℹ️  Discord auto-sync was not previously enabled');
    }
  } catch (error) {
    console.error('[AutoSync] Error loading config:', error.message);
  }
}

/**
 * Check for missed events during downtime
 */
async function checkMissedEvents() {
  console.log('[RestartProtection] 🔍 Checking for events that should have been posted during downtime...');
  
  try {
    const { Event } = require('./models');
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
    
    const missedEvents = await Event.findAll({
      where: {
        channelId: { [require('sequelize').Op.not]: null },
        guildId: { [require('sequelize').Op.not]: null },
        messageId: null,
        dateTime: { [require('sequelize').Op.gt]: twoHoursAgo }
      }
    });
    
    let missedCount = 0;
    
    for (const event of missedEvents) {
      try {
        const channel = await client.channels.fetch(event.channelId).catch(() => null);
        
        if (channel) {
          const eventEmbed = EmbedBuilder.createEventEmbed(event.toJSON());
          const buttons = ButtonBuilder.createSignupButtons(event.toJSON());
          
          const sentMessage = await channel.send({ 
            embeds: [eventEmbed],
            components: buttons || []
          });
          
          await event.update({ messageId: sentMessage.id });
          missedCount++;
          
          console.log(`[RestartProtection] ✅ Posted missed event: ${event.title}`);
        } else {
          console.log(`[RestartProtection] ⚠️  Channel ${event.channelId} not accessible for event: ${event.title}`);
        }
      } catch (error) {
        console.error(`[RestartProtection] ❌ Error posting event ${event.id}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    },
    backgroundSync: {
      enabled: !!backgroundSyncInterval,
      interval: CALENDAR_SYNC_INTERVAL,
      intervalFormatted: `${CALENDAR_SYNC_INTERVAL / 1000 / 60} minutes`
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
      .filter(ch => ch.type === 0)
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

// Bot ready event
client.once('clientReady', async () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║ 🤖 ${client.user.tag} is online!`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  
  // Initialize database
  console.log('║ 💾 Initializing database...');
  const dbConnected = await testConnection();
  if (dbConnected) {
    await initializeDatabase();
    console.log('║ ✅ Database ready');
  } else {
    console.log('║ ❌ Database connection failed - bot will exit');
    process.exit(1);
  }
  
  // Check calendar configuration
  const calendars = await getCalendarsFromDatabase();
  
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 📅 Events System: Ready`);
  console.log(`║ 🔗 Google Calendar: ${calendars.length > 0 ? `${calendars.length} calendar(s) configured` : 'No calendars configured'}`);
  console.log(`║ ⚡ Calendar Sync: Every ${CALENDAR_SYNC_INTERVAL / 1000 / 60} minutes`);
  console.log(`║ 🆕 Background Sync: ${calendars.length > 0 ? 'Will start' : 'Disabled (no calendars)'}`);
  console.log(`║ 📋 Presets: Loading from database...`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ 🎮 Twitch Monitor: ${config.twitch?.enabled ? 'Enabled' : 'Disabled (no credentials)'}`);
  console.log(`║ 📺 YouTube Monitor: Enabled (RSS-based)`);
  console.log(`║ 🌐 Web Event Poster: Starting...`);
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  config.discord.clientId = client.user.id;
  
  // Register commands
  await registerCommands(client.user.id);
  
  // Initialize and start streaming monitors
  if (config.twitch?.enabled) {
    twitchMonitor = new TwitchMonitor(client, config, streamingConfig);
    twitchMonitor.start();
  }
  
  youtubeMonitor = new YouTubeMonitor(client, config, streamingConfig);
  youtubeMonitor.start();
  
  // Start web event poster
  webEventPoster.start();
  
  // START BACKGROUND CALENDAR SYNC (for web UI)
  await startBackgroundSync();
  
  // Initialize status file sharing
  updateBotStatusFile();
  setInterval(updateBotStatusFile, 30000);
  
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
  
  // RESTART PROTECTION - Check for missed events
  setTimeout(async () => {
    await checkMissedEvents();
  }, 5000);
  
  // AUTO-SYNC PERSISTENCE - Restore auto-sync if enabled
  setTimeout(async () => {
    await restoreAutoSync();
  }, 10000);
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
        calendarService: null, // Will be created on-demand
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
    
    const event = await eventManager.getEvent(eventId);
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
      
      await eventManager.removeUser(event.id, interaction.user.id);
      await eventManager.signupUser(event.id, interaction.user.id, roleName);
      
      const updatedEvent = await eventManager.getEvent(event.id);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
    } else if (action === 'leave') {
      const { removed } = await eventManager.removeUser(event.id, interaction.user.id);
      
      if (!removed) {
        return interaction.reply({ content: '❌ You were not signed up for this event.', ephemeral: true });
      }
      
      const updatedEvent = await eventManager.getEvent(event.id);
      const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
      const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
      
      await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
      await interaction.followUp({ content: '✅ You have left the event.', ephemeral: true });
    }
  } else if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
      const focusedValue = interaction.options.getFocused();
      const presets = await presetManager.loadPresets();
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
  streamingConfig,
  webEventPoster,
  backgroundCalendarSync,
  startBackgroundSync,
  stopBackgroundSync,
  getCalendarsFromDatabase,
  createCalendarService,
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
