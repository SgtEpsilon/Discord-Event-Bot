// web-server.js - Web interface for Discord Event Bot
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { testConnection, initializeDatabase } = require('./src/config/database');
const { AutoSyncConfig } = require('./src/models');

// Import classes
const EventManager = require('./src/services/eventManager');
const PresetManager = require('./src/services/presetManager');
const EventsConfigService = require('./src/services/eventsConfig');
const StreamingConfigManager = require('./src/services/streamingConfig');
const {
  GoogleCalendarService,
  getAllCalendarConfigs,
  getCalendarConfig,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig
} = require('./src/services/googleCalendar');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Initialize services
const eventManager = new EventManager();
const presetManager = new PresetManager();
const eventsConfig = new EventsConfigService();
const streamingConfig = new StreamingConfigManager();
const googleCalendar = new GoogleCalendarService();

// Session storage (in-memory for simplicity)
const sessions = new Map();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database on startup
(async () => {
  console.log('🔌 Testing database connection...');
  const connected = await testConnection();
  if (connected) {
    console.log('🗄️  Initializing database...');
    await initializeDatabase();
    console.log('✅ Database ready');
  } else {
    console.error('❌ Database connection failed - continuing anyway');
  }
})();

// ==================== AUTHENTICATION ====================

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function verifySession(req, res, next) {
  const token = req.headers['x-auth-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // Extend session
  session.expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  next();
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const validUsername = process.env.WEB_USERNAME || 'admin';
  const validPassword = process.env.WEB_PASSWORD || 'admin';
  
  if (username === validUsername && password === validPassword) {
    const token = generateToken();
    sessions.set(token, {
      username,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
    
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/check', verifySession, (req, res) => {
  res.json({ authenticated: true });
});

// ==================== EVENTS ROUTES ====================

app.get('/api/events', verifySession, async (req, res) => {
  try {
    const events = await eventManager.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/events/:id', verifySession, async (req, res) => {
  try {
    const event = await eventManager.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

app.post('/api/events', verifySession, async (req, res) => {
  try {
    const { title, description, dateTime, duration, maxParticipants, roles, guildId, addToCalendar, calendarId } = req.body;
    
    if (!title || !dateTime) {
      return res.status(400).json({ error: 'Title and dateTime are required' });
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event = await eventManager.createEvent({
      id: eventId,
      title,
      description: description || '',
      dateTime,
      duration: duration || 60,
      maxParticipants: maxParticipants || 0,
      roles: roles || [],
      createdBy: 'web',
      guildId: guildId || null,
      addToCalendar,
      calendarId
    });
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', verifySession, async (req, res) => {
  try {
    const { title, description, dateTime, duration, maxParticipants, roles } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dateTime !== undefined) updates.dateTime = dateTime;
    if (duration !== undefined) updates.duration = duration;
    if (maxParticipants !== undefined) updates.maxParticipants = maxParticipants;
    if (roles !== undefined) updates.roles = roles;
    
    const event = await eventManager.updateEvent(req.params.id, updates);
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', verifySession, async (req, res) => {
  try {
    await eventManager.deleteEvent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ==================== PRESETS ROUTES ====================

app.get('/api/presets', verifySession, async (req, res) => {
  try {
    const presets = await presetManager.loadPresets();
    // Convert object to array format for frontend
    const presetsArray = Object.entries(presets).map(([key, preset]) => ({
      key,
      ...preset
    }));
    res.json(presetsArray);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.post('/api/presets', verifySession, async (req, res) => {
  try {
    const { key, name, description, duration, maxParticipants, roles } = req.body;
    
    if (!key || !name || !duration) {
      return res.status(400).json({ error: 'Key, name, and duration are required' });
    }
    
    const preset = await presetManager.createPreset(key, {
      name,
      description: description || '',
      duration,
      maxParticipants: maxParticipants || 0,
      roles: roles || []
    });
    
    res.json({ success: true, preset });
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/presets/:key', verifySession, async (req, res) => {
  try {
    const { name, description, duration, maxParticipants, roles } = req.body;
    
    const preset = await presetManager.updatePreset(req.params.key, {
      name,
      description,
      duration,
      maxParticipants,
      roles
    });
    
    res.json({ success: true, preset });
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/presets/:key', verifySession, async (req, res) => {
  try {
    await presetManager.deletePreset(req.params.key);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/from-preset', verifySession, async (req, res) => {
  try {
    const { presetKey, title, dateTime, guildId, addToCalendar, calendarId } = req.body;
    
    if (!presetKey || !dateTime) {
      return res.status(400).json({ error: 'Preset key and dateTime are required' });
    }
    
    const preset = await presetManager.getPreset(presetKey);
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event = await eventManager.createEvent({
      id: eventId,
      title: title || preset.name,
      description: preset.description,
      dateTime,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles,
      createdBy: 'web',
      guildId: guildId || null,
      addToCalendar,
      calendarId
    });
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error creating event from preset:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONFIGURATION ROUTES ====================

app.get('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    const channelId = await eventsConfig.getEventChannel(req.params.guildId);
    res.json({ channelId });
  } catch (error) {
    console.error('Error fetching event channel:', error);
    res.status(500).json({ error: 'Failed to fetch event channel' });
  }
});

app.post('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    const { channelId } = req.body;
    await eventsConfig.setEventChannel(req.params.guildId, channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting event channel:', error);
    res.status(500).json({ error: 'Failed to set event channel' });
  }
});

app.delete('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    await eventsConfig.removeEventChannel(req.params.guildId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing event channel:', error);
    res.status(500).json({ error: 'Failed to remove event channel' });
  }
});

app.get('/api/streaming/:guildId', verifySession, async (req, res) => {
  try {
    const config = await streamingConfig.getGuildConfig(req.params.guildId);
    res.json(config || {});
  } catch (error) {
    console.error('Error fetching streaming config:', error);
    res.status(500).json({ error: 'Failed to fetch streaming config' });
  }
});

app.post('/api/streaming/:guildId/channel', verifySession, async (req, res) => {
  try {
    const { channelId } = req.body;
    await streamingConfig.setNotificationChannel(req.params.guildId, channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting notification channel:', error);
    res.status(500).json({ error: 'Failed to set notification channel' });
  }
});

// ==================== GOOGLE CALENDAR ROUTES ====================

app.get('/api/calendars', verifySession, async (req, res) => {
  try {
    const calendars = await getAllCalendarConfigs();
    res.json(calendars);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

app.get('/api/calendars/available', verifySession, async (req, res) => {
  try {
    const isConfigured = await googleCalendar.isConfigured();
    if (!isConfigured) {
      return res.status(400).json({ error: 'Google Calendar not configured. Please add credentials file.' });
    }

    const calendars = await googleCalendar.listCalendars();
    res.json(calendars);
  } catch (error) {
    console.error('Error fetching available calendars:', error);
    res.status(500).json({ error: 'Failed to fetch available calendars: ' + error.message });
  }
});

app.post('/api/calendars', verifySession, async (req, res) => {
  try {
    const { name, calendarId } = req.body;

    if (!name || !calendarId) {
      return res.status(400).json({ error: 'Name and calendar ID are required' });
    }

    const calendar = await createCalendarConfig(name, calendarId);
    res.json({ success: true, calendar });
  } catch (error) {
    console.error('Error creating calendar config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/calendars/:id', verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, calendarId } = req.body;

    if (!name || !calendarId) {
      return res.status(400).json({ error: 'Name and calendar ID are required' });
    }

    const calendar = await updateCalendarConfig(parseInt(id), name, calendarId);
    res.json({ success: true, calendar });
  } catch (error) {
    console.error('Error updating calendar config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/calendars/:id', verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCalendarConfig(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendars/status', verifySession, async (req, res) => {
  try {
    const isConfigured = await googleCalendar.isConfigured();
    res.json({ configured: isConfigured });
  } catch (error) {
    res.json({ configured: false, error: error.message });
  }
});

// ==================== STATS & STATUS ROUTES ====================

app.get('/api/stats', verifySession, async (req, res) => {
  try {
    const events = await eventManager.getAllEvents();
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.dateTime) > now);
    
    const totalSignups = events.reduce((sum, event) => {
      return sum + Object.keys(event.signups || {}).length;
    }, 0);
    
    const presets = await presetManager.loadPresets();
    const presetsCount = Object.keys(presets).length;
    
    res.json({
      totalEvents: events.length,
      upcomingEvents: upcoming.length,
      totalSignups,
      totalPresets: presetsCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/autosync/status', verifySession, async (req, res) => {
  try {
    const config = await AutoSyncConfig.findOne();
    if (config) {
      res.json({
        enabled: config.enabled,
        channelId: config.channelId,
        guildId: config.guildId,
        lastSync: config.lastSync
      });
    } else {
      res.json({ enabled: false });
    }
  } catch (error) {
    console.error('Error fetching autosync status:', error);
    res.status(500).json({ error: 'Failed to fetch autosync status' });
  }
});

app.get('/api/guilds', verifySession, (req, res) => {
  try {
    const fs = require('fs');
    const guildsPath = path.join(__dirname, 'data', 'guilds.json');
    if (fs.existsSync(guildsPath)) {
      delete require.cache[require.resolve(guildsPath)];
      const guilds = require(guildsPath);
      res.json(guilds);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.json([]);
  }
});

app.get('/api/channels', verifySession, (req, res) => {
  try {
    const fs = require('fs');
    const channelsPath = path.join(__dirname, 'data', 'channels.json');
    if (fs.existsSync(channelsPath)) {
      delete require.cache[require.resolve(channelsPath)];
      const channels = require(channelsPath);
      res.json(channels);
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.json({});
  }
});

// ==================== BOT CONTROL ROUTES ====================

app.get('/api/bot/status', verifySession, (req, res) => {
  try {
    const fs = require('fs');
    const statusPath = path.join(__dirname, 'data', 'bot-status.json');
    if (fs.existsSync(statusPath)) {
      delete require.cache[require.resolve(statusPath)];
      const status = require(statusPath);
      res.json(status);
    } else {
      res.json({ status: 'unknown' });
    }
  } catch (error) {
    console.error('Error fetching bot status:', error);
    res.status(500).json({ error: 'Failed to fetch bot status' });
  }
});

app.post('/api/bot/reload-commands', verifySession, (req, res) => {
  res.json({ success: true, message: 'Command reload requested (requires bot implementation)' });
});

app.post('/api/bot/restart', verifySession, (req, res) => {
  res.json({ success: true, message: 'Bot restart requested (requires bot implementation)' });
});

app.get('/api/commands', verifySession, (req, res) => {
  const commands = [
    { name: '/create', description: 'Create a new event', category: 'Events' },
    { name: '/preset', description: 'Create event from preset', category: 'Events' },
    { name: '/list', description: 'List all upcoming events', category: 'Events' },
    { name: '/eventinfo', description: 'Show detailed information about an event', category: 'Events' },
    { name: '/delete', description: 'Delete an event', category: 'Events' },
    { name: '/addrole', description: 'Add a role to an existing event', category: 'Events' },
    { name: '/presets', description: 'List all available event presets', category: 'Presets' },
    { name: '/deletepreset', description: 'Delete an event preset', category: 'Presets' },
    { name: '/sync', description: 'Sync events from Google Calendar', category: 'Calendar' },
    { name: '/calendars', description: 'List configured Google Calendars', category: 'Calendar' },
    { name: '/autosync', description: 'Enable/disable automatic calendar syncing', category: 'Calendar' },
    { name: '/set-event-channel', description: 'Set the channel for event postings', category: 'Configuration' },
    { name: '/event-channel', description: 'View current event channel', category: 'Configuration' },
    { name: '/clear-event-channel', description: 'Clear event channel setting', category: 'Configuration' },
    { name: '/setup-streaming', description: 'Set streaming notification channel', category: 'Streaming' },
    { name: '/add-streamer', description: 'Add Twitch streamer to monitor', category: 'Streaming' },
    { name: '/add-youtube', description: 'Add YouTube channel to monitor', category: 'Streaming' },
    { name: '/list-streamers', description: 'List monitored Twitch streamers', category: 'Streaming' },
    { name: '/list-youtube', description: 'List monitored YouTube channels', category: 'Streaming' },
    { name: '/help', description: 'Show help information', category: 'General' }
  ];
  
  res.json(commands);
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Web server running at http://localhost:${PORT}`);
  console.log(`📝 Default credentials: admin / admin (change in .env file)`);
  console.log(`📅 Calendar configuration: Manage via web UI (Settings → Google Calendar)`);
});

module.exports = app;