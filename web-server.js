// web-server.js - Complete implementation with bidirectional sync and Calendar Management
const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { config } = require('./src/config/index');
const EventManager = require('./src/services/eventManager');
const PresetManager = require('./src/services/presetManager');
const CalendarService = require('./src/services/calendar');
const EventsConfig = require('./src/services/eventsConfig');
const StreamingConfig = require('./src/services/streamingConfig');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function verifyApiKey() {
  const apiKeyFromEnv = process.env.WEB_API_KEY;
  const apiKeyFromConfig = config.web?.apiKey;
  const validApiKey = apiKeyFromEnv || apiKeyFromConfig;

  return (req, res, next) => {
    if (!validApiKey) return next();
    
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Missing authentication header' });
    }

    const keyBuf = Buffer.from(apiKey);
    const validKeyBuf = Buffer.from(validApiKey);
    if (keyBuf.length !== validKeyBuf.length || !crypto.timingSafeEqual(keyBuf, validKeyBuf)) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    next();
  };
}

// Initialize services
const calendarService = new CalendarService(config.google.credentials, config.google.calendars);
const eventManager = new EventManager(config.files.events, calendarService);
const presetManager = new PresetManager(config.files.presets);
const eventsConfig = new EventsConfig(config.files.eventsConfig || path.join(__dirname, 'data/events-config.json'));
const streamingConfigPath = path.resolve(__dirname, config.files.streaming || 'data/streaming.json');
const streamingConfig = new StreamingConfig(streamingConfigPath);

// Path to store calendar configurations
const calendarConfigPath = path.join(__dirname, 'data', 'calendar-config.json');

// Helper to load calendar config
function loadCalendarConfig() {
  try {
    if (fs.existsSync(calendarConfigPath)) {
      return JSON.parse(fs.readFileSync(calendarConfigPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading calendar config:', error);
  }
  return { calendars: [] };
}

// Helper to save calendar config
function saveCalendarConfig(configData) {
  const dir = path.dirname(calendarConfigPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(calendarConfigPath, JSON.stringify(configData, null, 2), 'utf8');
}

// Public endpoints
app.post('/api/verify-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ success: false, error: 'API key required' });
  
  const validApiKey = process.env.WEB_API_KEY || config.web?.apiKey;
  if (!validApiKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'API authentication not configured. Set WEB_API_KEY in .env' 
    });
  }
  
  const keyBuf = Buffer.from(apiKey);
  const validKeyBuf = Buffer.from(validApiKey);
  if (keyBuf.length !== validKeyBuf.length || !crypto.timingSafeEqual(keyBuf, validKeyBuf)) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  
  res.json({ success: true, message: 'API key verified' });
});

// Protected endpoints
app.use('/api', verifyApiKey());

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ==================== EVENTS ENDPOINTS ====================
app.get('/api/events', (req, res) => {
  try {
    const events = eventManager.getAllEvents();
    const eventList = Object.values(events).map(event => ({
      ...event,
      signupCount: Object.values(event.signups || {}).reduce((sum, arr) => sum + arr.length, 0)
    }));
    res.json({ success: true, events: eventList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, dateTime, duration, maxParticipants, roles } = req.body;
    if (!title || !dateTime) {
      return res.status(400).json({ success: false, error: 'Title and dateTime are required' });
    }
    
    let parsedDate;
    if (dateTime.includes('T')) parsedDate = new Date(dateTime);
    else parsedDate = new Date(dateTime);
    
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DDTHH:mm (e.g., 2026-02-15T20:00)' 
      });
    }

    const event = await eventManager.createEvent({
      title,
      description: description || '',
      dateTime: parsedDate.toISOString(),
      duration: parseInt(duration) || 60,
      maxParticipants: parseInt(maxParticipants) || 0,
      roles: roles || [],
      createdBy: 'web_interface',
      channelId: null,
      guildId: null
    });

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    
    const { title, description, dateTime, duration, maxParticipants, roles } = req.body;
    const updates = {};
    
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dateTime) {
      let parsedDate;
      if (dateTime.includes('T')) parsedDate = new Date(dateTime);
      else parsedDate = new Date(dateTime);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }
      updates.dateTime = parsedDate.toISOString();
    }
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (maxParticipants !== undefined) updates.maxParticipants = parseInt(maxParticipants);
    if (roles) updates.roles = roles;

    eventManager.updateEvent(req.params.id, updates);
    res.json({ success: true, event: eventManager.getEvent(req.params.id) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    eventManager.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRESETS ENDPOINTS ====================
app.get('/api/presets', (req, res) => {
  try {
    const presets = presetManager.loadPresets();
    res.json({ success: true, presets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/presets', (req, res) => {
  try {
    const { key, name, description, duration, maxParticipants, roles } = req.body;
    if (!key || !name || !duration || !roles) {
      return res.status(400).json({ success: false, error: 'Key, name, duration, and roles are required' });
    }
    if (!/^[a-z0-9-]+$/.test(key)) {
      return res.status(400).json({ success: false, error: 'Key must be lowercase letters, numbers, and hyphens only' });
    }

    const preset = presetManager.createPreset(key, {
      name,
      description: description || '',
      duration: parseInt(duration),
      maxParticipants: parseInt(maxParticipants) || 0,
      roles: roles || []
    });

    res.json({ success: true, preset, key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/presets/:key', (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.key);
    if (!preset) return res.status(404).json({ success: false, error: 'Preset not found' });
    
    const { name, description, duration, maxParticipants, roles } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (maxParticipants !== undefined) updates.maxParticipants = parseInt(maxParticipants);
    if (roles) updates.roles = roles;

    presetManager.updatePreset(req.params.key, updates);
    res.json({ success: true, preset: presetManager.getPreset(req.params.key) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/presets/:key', (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.key);
    if (!preset) return res.status(404).json({ success: false, error: 'Preset not found' });
    presetManager.deletePreset(req.params.key);
    res.json({ success: true, message: 'Preset deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events/from-preset', async (req, res) => {
  try {
    const { presetName, dateTime, description, guildId, channelId } = req.body;
    
    if (!presetName || !dateTime) {
      return res.status(400).json({ success: false, error: 'Preset name and dateTime are required' });
    }
    
    if (guildId && !channelId) {
      return res.status(400).json({ success: false, error: 'channelId required when guildId is provided' });
    }
    
    let parsedDate;
    if (dateTime.includes('T')) parsedDate = new Date(dateTime);
    else {
      const [datePart, timePart] = dateTime.split(' ');
      if (datePart.includes('-') && datePart.split('-')[0].length === 2) {
        const [day, month, year] = datePart.split('-');
        parsedDate = new Date(`${year}-${month}-${day}T${timePart}`);
      } else {
        parsedDate = new Date(dateTime);
      }
    }
    
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DDTHH:mm or DD-MM-YYYY HH:mm' 
      });
    }

    const preset = presetManager.getPreset(presetName);
    if (!preset) return res.status(404).json({ success: false, error: 'Preset not found' });

    const event = await eventManager.createFromPreset(preset, parsedDate.toISOString(), {
      customDescription: description,
      createdBy: 'web_interface',
      channelId: channelId || null,
      guildId: guildId || null
    });

    const willPostToDiscord = !!(guildId && channelId);

    res.json({ 
      success: true, 
      event: eventManager.getEvent(event.id),
      willPostToDiscord,
      message: willPostToDiscord 
        ? 'Event will be posted to Discord within 10 seconds' 
        : 'Event created (web UI only)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATS ENDPOINT (DYNAMIC) ====================
app.get('/api/stats', (req, res) => {
  try {
    const allEvents = eventManager.getAllEvents();
    const eventList = Object.values(allEvents);
    
    // Calculate upcoming events (events in the future)
    const now = new Date();
    const upcomingEvents = eventList.filter(event => new Date(event.dateTime) > now);
    
    // Calculate total signups across all events
    const totalSignups = eventList.reduce((sum, event) => {
      const eventSignups = Object.values(event.signups || {}).reduce((s, arr) => s + arr.length, 0);
      return sum + eventSignups;
    }, 0);
    
    const stats = {
      totalEvents: eventList.length,
      upcomingEvents: upcomingEvents.length,
      totalSignups: totalSignups,
      totalPresets: presetManager.getPresetCount()
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GUILD & CHANNEL ENDPOINTS ====================
app.get('/api/guilds', (req, res) => {
  try {
    const guildListPath = path.join(__dirname, 'data', 'guilds.json');
    if (!fs.existsSync(guildListPath)) {
      return res.json({ 
        success: true, 
        guilds: [],
        warning: 'Bot not started. Start bot first to load servers.'
      });
    }
    
    const guilds = JSON.parse(fs.readFileSync(guildListPath, 'utf8'));
    const filtered = guilds.filter(g => !g.name.includes('(_comm)') && !g.name.includes('(_sche)'));
    res.json({ success: true, guilds: filtered });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/guilds/:guildId/channels', (req, res) => {
  try {
    const channelListPath = path.join(__dirname, 'data', 'channels.json');
    
    if (!fs.existsSync(channelListPath)) {
      return res.json({ 
        success: true, 
        channels: [],
        warning: 'Channel list not available. Bot will generate on next startup.'
      });
    }
    
    const allChannels = JSON.parse(fs.readFileSync(channelListPath, 'utf8'));
    const guildChannels = allChannels[req.params.guildId] || [];
    
    const textChannels = guildChannels.filter(ch => ch.type === 0);
    
    res.json({ success: true, channels: textChannels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EVENT CHANNEL CONFIG ====================
app.get('/api/event-channel/:guildId', (req, res) => {
  try {
    const channelId = eventsConfig.getEventChannel(req.params.guildId);
    res.json({ success: true, guildId: req.params.guildId, channelId, hasChannel: !!channelId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/event-channel/:guildId', (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ success: false, error: 'channelId required' });
    
    eventsConfig.setEventChannel(req.params.guildId, channelId);
    res.json({ success: true, message: 'Event channel set', guildId: req.params.guildId, channelId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/event-channel/:guildId', (req, res) => {
  try {
    eventsConfig.removeEventChannel(req.params.guildId);
    res.json({ success: true, message: 'Event channel cleared', guildId: req.params.guildId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STREAMING CONFIG ====================
app.get('/api/streaming/:guildId', (req, res) => {
  try {
    const config = streamingConfig.getGuildConfig(req.params.guildId);
    res.json({ success: true, guildId: req.params.guildId, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/streaming/:guildId/channel', (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ success: false, error: 'channelId required' });
    
    streamingConfig.setNotificationChannel(req.params.guildId, channelId);
    res.json({ success: true, message: 'Notification channel set', guildId: req.params.guildId, channelId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/streaming/:guildId/twitch', (req, res) => {
  try {
    const { username, customMessage } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'username required' });
    
    streamingConfig.addTwitchStreamer(req.params.guildId, username, customMessage);
    res.json({ success: true, message: `Twitch streamer "${username}" added`, guildId: req.params.guildId, username });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/streaming/:guildId/twitch/:username', (req, res) => {
  try {
    streamingConfig.removeTwitchStreamer(req.params.guildId, req.params.username);
    res.json({ success: true, message: `Twitch streamer "${req.params.username}" removed`, guildId: req.params.guildId, username: req.params.username });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/streaming/:guildId/youtube', (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ success: false, error: 'channelId required' });
    
    streamingConfig.addYouTubeChannel(req.params.guildId, channelId);
    res.json({ success: true, message: 'YouTube channel added', guildId: req.params.guildId, channelId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/streaming/:guildId/youtube/:channelId', (req, res) => {
  try {
    streamingConfig.removeYouTubeChannel(req.params.guildId, req.params.channelId);
    res.json({ success: true, message: 'YouTube channel removed', guildId: req.params.guildId, channelId: req.params.channelId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/streaming/all', (req, res) => {
  try {
    const configs = streamingConfig.getAllGuildConfigs();
    res.json({ success: true, configs, count: Object.keys(configs).length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GOOGLE CALENDAR MANAGEMENT ====================

// Get all calendar integrations
app.get('/api/calendar/integrations', (req, res) => {
  try {
    const calendarConfig = loadCalendarConfig();
    res.json({ success: true, calendars: calendarConfig.calendars || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new calendar integration
app.post('/api/calendar/integrations', (req, res) => {
  try {
    const { name, calendarId, credentials } = req.body;
    
    if (!name || !calendarId) {
      return res.status(400).json({ success: false, error: 'Name and calendarId are required' });
    }
    
    const calendarConfig = loadCalendarConfig();
    
    // Check if calendar ID already exists
    if (calendarConfig.calendars.some(cal => cal.id === calendarId)) {
      return res.status(400).json({ success: false, error: 'Calendar ID already exists' });
    }
    
    // Add new calendar
    const newCalendar = {
      name,
      id: calendarId,
      credentials: credentials || null,
      addedAt: new Date().toISOString()
    };
    
    calendarConfig.calendars.push(newCalendar);
    saveCalendarConfig(calendarConfig);
    
    res.json({ success: true, message: 'Calendar integration added', calendar: newCalendar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update calendar integration
app.put('/api/calendar/integrations/:calendarId', (req, res) => {
  try {
    const { name, credentials } = req.body;
    const calendarConfig = loadCalendarConfig();
    
    const calendarIndex = calendarConfig.calendars.findIndex(cal => cal.id === req.params.calendarId);
    
    if (calendarIndex === -1) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }
    
    if (name) calendarConfig.calendars[calendarIndex].name = name;
    if (credentials !== undefined) calendarConfig.calendars[calendarIndex].credentials = credentials;
    calendarConfig.calendars[calendarIndex].updatedAt = new Date().toISOString();
    
    saveCalendarConfig(calendarConfig);
    
    res.json({ success: true, message: 'Calendar integration updated', calendar: calendarConfig.calendars[calendarIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete calendar integration
app.delete('/api/calendar/integrations/:calendarId', (req, res) => {
  try {
    const calendarConfig = loadCalendarConfig();
    
    const calendarIndex = calendarConfig.calendars.findIndex(cal => cal.id === req.params.calendarId);
    
    if (calendarIndex === -1) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }
    
    const deletedCalendar = calendarConfig.calendars[calendarIndex];
    calendarConfig.calendars.splice(calendarIndex, 1);
    
    saveCalendarConfig(calendarConfig);
    
    res.json({ success: true, message: 'Calendar integration deleted', calendar: deletedCalendar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test calendar connection
app.post('/api/calendar/test/:calendarId', async (req, res) => {
  try {
    const calendarConfig = loadCalendarConfig();
    const calendar = calendarConfig.calendars.find(cal => cal.id === req.params.calendarId);
    
    if (!calendar) {
      return res.status(404).json({ success: false, error: 'Calendar not found' });
    }
    
    // Create a temporary calendar service to test
    const testService = new CalendarService(
      calendar.credentials || config.google.credentials,
      [{ name: calendar.name, id: calendar.id }]
    );
    
    const isConnected = await testService.testConnection();
    
    res.json({ 
      success: true, 
      connected: isConnected,
      message: isConnected ? 'Calendar connection successful' : 'Calendar connection failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, connected: false });
  }
});

// ==================== CALENDAR SYNC ENDPOINTS ====================
app.get('/api/calendar/status', (req, res) => {
  try {
    const enabled = calendarService.isEnabled();
    let status = 'disabled', message = 'Google Calendar not configured';
    
    if (enabled) {
      try {
        calendarService.testConnection();
        status = 'connected';
        message = 'Google Calendar is connected and ready';
      } catch (error) {
        status = 'error';
        message = 'Connection failed: ' + error.message;
      }
    }

    // Read bot status to get autosync info
    let autosyncInfo = { enabled: false, interval: 'Unknown' };
    try {
      const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
      if (fs.existsSync(botStatusPath)) {
        const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
        if (botStatus.autoSync) {
          autosyncInfo = botStatus.autoSync;
        }
      }
    } catch (e) {
      // Ignore errors reading bot status
    }

    res.json({ success: true, status, message, enabled, autosync: autosyncInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/commands/sync', async (req, res) => {
  try {
    const { hoursAhead, filter } = req.body;
    if (!calendarService.isEnabled()) {
      return res.status(400).json({ success: false, error: 'Google Calendar not configured' });
    }

    const hours = parseInt(hoursAhead) || 24;
    const result = await calendarService.syncEvents(hours, filter);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.message });
    }

    res.json({ 
      success: true, 
      message: `Synced ${result.events.length} events from ${result.calendars.join(', ')}`, 
      events: result.events,
      calendars: result.calendars
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger sync from web UI (force immediate sync in bot)
app.post('/api/calendar/trigger-sync', async (req, res) => {
  try {
    if (!calendarService.isEnabled()) {
      return res.status(400).json({ success: false, error: 'Google Calendar not configured' });
    }

    // Read bot status to check if autosync is enabled
    const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
    let autosyncEnabled = false;
    let channelId = null;
    let guildId = null;

    if (fs.existsSync(botStatusPath)) {
      const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
      if (botStatus.autoSync) {
        autosyncEnabled = botStatus.autoSync.enabled;
        channelId = botStatus.autoSync.channelId;
        guildId = botStatus.autoSync.guildId;
      }
    }

    if (!autosyncEnabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'Auto-sync is not enabled. Use /autosync action:on in Discord first.' 
      });
    }

    // Perform manual sync
    const hours = parseInt(req.body.hoursAhead) || 168;
    const filter = req.body.filter || null;
    const result = await calendarService.syncEvents(hours, filter);

    res.json({
      success: true,
      message: `Manual sync triggered. Found ${result.events.length} events.`,
      events: result.events,
      note: 'Events will be posted to Discord by the bot automatically.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/commands/calendars', (req, res) => {
  try {
    if (!calendarService.isEnabled()) {
      return res.status(400).json({ success: false, error: 'Google Calendar not configured' });
    }
    const calendars = calendarService.getCalendars();
    res.json({ success: true, calendars, count: calendars.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/autosync/status', (req, res) => {
  try {
    // Read bot status file to get autosync info
    const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
    
    if (!fs.existsSync(botStatusPath)) {
      // Bot status file doesn't exist - bot might not be running
      return res.json({
        success: true,
        autosync: {
          enabled: false,
          interval: 300000, // 5 minutes in ms
          intervalFormatted: '5 minutes',
          message: 'Bot status unavailable. Make sure Discord bot is running.',
          warning: 'Run /autosync action:on in Discord to enable'
        }
      });
    }
    
    const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
    
    if (botStatus.autoSync) {
      // Auto-sync info available
      res.json({
        success: true,
        autosync: {
          enabled: botStatus.autoSync.enabled || false,
          interval: botStatus.autoSync.interval || 300000,
          intervalFormatted: botStatus.autoSync.intervalFormatted || '5 minutes',
          channelId: botStatus.autoSync.channelId || null,
          guildId: botStatus.autoSync.guildId || null,
          message: botStatus.autoSync.enabled 
            ? `Auto-sync is enabled and checking every ${botStatus.autoSync.intervalFormatted || '5 minutes'}`
            : 'Auto-sync is disabled. Run /autosync action:on in Discord to enable.'
        }
      });
    } else {
      // Bot status exists but no autosync info
      res.json({
        success: true,
        autosync: {
          enabled: false,
          interval: 300000,
          intervalFormatted: '5 minutes',
          message: 'Auto-sync is disabled. Run /autosync action:on in Discord to enable.'
        }
      });
    }
  } catch (error) {
    console.error('[AutoSync Status] Error:', error);
    res.json({
      success: true,
      autosync: {
        enabled: false,
        interval: 300000,
        intervalFormatted: '5 minutes',
        message: 'Error reading auto-sync status. Bot may not be running.',
        error: error.message
      }
    });
  }
});

app.post('/api/autosync/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    res.json({
      success: true,
      message: `Auto-sync ${enabled ? 'enabled' : 'disabled'} (requires bot restart to take effect)`,
      enabled
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BOT CONTROL ====================
app.get('/api/bot/status', (req, res) => {
  try {
    const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
    
    if (!fs.existsSync(botStatusPath)) {
      const uptime = process.uptime();
      return res.json({
        success: true,
        source: 'web_server_fallback',
        status: {
          uptime: uptime,
          uptimeFormatted: formatUptime(uptime),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          pid: process.pid,
          timestamp: new Date().toISOString(),
          warning: 'Bot status unavailable. Ensure bot is running and writing to data/bot-status.json'
        }
      });
    }
    
    const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
    res.json({ success: true, source: 'bot_process', status: botStatus });
  } catch (error) {
    console.error('[Bot Status] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load bot status: ' + error.message });
  }
});

app.post('/api/bot/restart', (req, res) => {
  const pm2Name = process.env.BOT_PM2_NAME || 'discord-event-bot';
  
  exec('pm2 list', (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(400).json({
        success: false,
        error: 'PM2 not available. Bot restart requires PM2 process manager.',
        instructions: 'Start bot with: pm2 start src/bot.js --name discord-event-bot'
      });
    }
    
    exec(`pm2 restart ${pm2Name}`, (error, stdout, stderr) => {
      if (error || stderr) {
        return res.status(500).json({
          success: false,
          error: `PM2 restart failed: ${stderr || error.message}`
        });
      }
      
      res.json({
        success: true,
        message: `✅ Discord bot restart initiated via PM2!`,
        pm2Output: stdout,
        note: 'Web server remains running. Bot will restart in background.'
      });
      
      setTimeout(() => {
        const statusPath = path.join(__dirname, 'data', 'bot-status.json');
        if (fs.existsSync(statusPath)) fs.unlinkSync(statusPath);
      }, 3000);
    });
  });
});

app.get('/api/config', (req, res) => {
  try {
    const sanitized = {
      google: { 
        enabled: !!config.google?.credentials,
        calendars: config.google?.calendars?.map(c => ({ name: c.name, id: c.id }))
      },
      twitch: { enabled: !!config.twitch?.clientId },
      bot: { autoSyncInterval: config.bot?.autoSyncInterval },
      web: { port: config.web?.port }
    };
    res.json({ success: true, config: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/commands/list', (req, res) => {
  try {
    const commands = [
      { name: 'create', description: 'Create custom event', category: 'events', options: [
        { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string', required: false },
        { name: 'datetime', type: 'string', required: true },
        { name: 'duration', type: 'number', required: false },
        { name: 'max-participants', type: 'number', required: false }
      ]},
      { name: 'preset', description: 'Create from preset', category: 'events', options: [
        { name: 'preset-name', type: 'string', required: true },
        { name: 'datetime', type: 'string', required: true },
        { name: 'description', type: 'string', required: false }
      ]},
      { name: 'presets', description: 'List presets', category: 'events', options: [] },
      { name: 'addrole', description: 'Add signup role', category: 'events', options: [
        { name: 'event-id', type: 'string', required: true },
        { name: 'role-name', type: 'string', required: true },
        { name: 'emoji', type: 'string', required: false },
        { name: 'max-slots', type: 'number', required: false }
      ]},
      { name: 'list', description: 'Show all events', category: 'events', options: [] },
      { name: 'delete', description: 'Delete event', category: 'events', options: [
        { name: 'event-id', type: 'string', required: true }
      ]},
      { name: 'eventinfo', description: 'Event details', category: 'events', options: [
        { name: 'event-id', type: 'string', required: true }
      ]},
      { name: 'sync', description: 'Sync Google Calendar', category: 'calendar', options: [
        { name: 'hours-ahead', type: 'number', required: false },
        { name: 'filter', type: 'string', required: false }
      ]},
      { name: 'calendars', description: 'List calendars', category: 'calendar', options: [] },
      { name: 'autosync', description: 'Manage auto-sync', category: 'calendar', options: [
        { name: 'action', type: 'string', required: true, choices: ['toggle', 'status'] }
      ]},
      { name: 'setup-streaming', description: 'Set notification channel', category: 'streaming', options: [
        { name: 'channel', type: 'channel', required: true }
      ]},
      { name: 'add-streamer', description: 'Add Twitch streamer', category: 'streaming', options: [
        { name: 'username', type: 'string', required: true },
        { name: 'custom-message', type: 'string', required: false }
      ]},
      { name: 'add-youtube', description: 'Add YouTube channel', category: 'streaming', options: [
        { name: 'channel-id', type: 'string', required: true }
      ]},
      { name: 'list-streamers', description: 'List Twitch streamers', category: 'streaming', options: [] },
      { name: 'list-youtube', description: 'List YouTube channels', category: 'streaming', options: [] },
      { name: 'help', description: 'Show help', category: 'general', options: [] }
    ];
    res.json({ success: true, commands, count: commands.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const localIP = Object.values(os.networkInterfaces())
    .flat()
    .find(iface => iface.family === 'IPv4' && !iface.internal)?.address || 'localhost';

  console.log(`\n🌐 Web Interface Started Successfully!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Network: http://${localIP}:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const apiKeyConfigured = process.env.WEB_API_KEY || config.web?.apiKey;
  console.log(apiKeyConfigured 
    ? `🔒 API authentication: ENABLED` 
    : `⚠️ API authentication: DISABLED (set WEB_API_KEY in .env)`);
  
  console.log(`\n💡 Features:`);
  console.log(`   ✅ Bidirectional sync: Web ↔ Discord`);
  console.log(`   ✅ Auto-posting: Events post to Discord in 10s`);
  console.log(`   ✅ Channel selection: Per-event Discord targeting`);
  console.log(`   ✅ Google Calendar Management: Add/Edit/Delete integrations\n`);
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`.replace(/0[dh]\s*/g, '').trim() || '0m';
}

module.exports = app;
