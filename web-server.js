// web-server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto'); // For timing-safe comparisons
const { config } = require('./src/config');
const EventManager = require('./src/services/eventManager');
const PresetManager = require('./src/services/presetManager');
const CalendarService = require('./src/services/calendar');
const EventsConfig = require('./src/services/eventsConfig');
const StreamingConfigManager = require('./src/services/streamingConfig'); // Fixed path

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// INITIALIZE SHARED SERVICES
// ==========================================
const calendarService = new CalendarService(
  config.google.credentials,
  config.google.calendars
);
const eventManager = new EventManager(config.files.events, calendarService);
const presetManager = new PresetManager(config.files.presets);
const eventsConfig = new EventsConfig(
  config.files.eventsConfig || path.join(__dirname, 'data/events-config.json')
);
const streamingConfig = new StreamingConfigManager(
  config.files.streaming || path.join(__dirname, 'data/streaming-config.json')
);

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
function verifyApiKey() {
  const validApiKey = process.env.WEB_API_KEY || config.web?.apiKey;
  
  return (req, res, next) => {
    if (!validApiKey) {
      console.warn('[Auth] No API key configured - allowing unauthenticated access');
      return next();
    }
    
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'Missing authentication. Please provide X-API-Key header' 
      });
    }
    
    // Timing-safe comparison using crypto.timingSafeEqual
    const validBuf = Buffer.from(validApiKey);
    const inputBuf = Buffer.from(apiKey);
    
    // Always compare buffers of equal length to prevent timing leaks
    let result;
    if (inputBuf.length !== validBuf.length) {
      const dummy = Buffer.alloc(validBuf.length);
      result = crypto.timingSafeEqual(validBuf, dummy);
    } else {
      result = crypto.timingSafeEqual(validBuf, inputBuf);
    }
    
    if (!result) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }
    
    next();
  };
}

// ==========================================
// PUBLIC ROUTES
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    authRequired: !!(process.env.WEB_API_KEY || config.web?.apiKey)
  });
});

// ==========================================
// PROTECTED ROUTES
// ==========================================
app.use('/api', verifyApiKey());

// Get all guilds with streaming config (uses shared instance)
app.get('/api/guilds', (req, res) => {
  try {
    const guildConfigs = streamingConfig.getAllConfigs();
    
    const guilds = Object.entries(guildConfigs).map(([guildId, config]) => ({
      id: guildId,
      name: config.guildName || 'Unknown Guild',
      enabled: config.enabled || false,
      channels: config.channels || [],
      activeStreams: config.activeStreams || []
    }));
    
    res.json({
      success: true,
      guilds
    });
  } catch (error) {
    console.error('[API] Error fetching guilds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guilds'
    });
  }
});

// Get bot statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalEvents: eventManager.getEventCount(),
      upcomingEvents: eventManager.getUpcomingEvents().length,
      totalSignups: eventManager.getTotalSignups(),
      totalPresets: presetManager.getPresetCount()
    };
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all events (no guildId filter)
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

// Get single event
app.get('/api/events/:eventId', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new event
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, dateTime, duration, maxParticipants, roles } = req.body;
    
    if (!title || !dateTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and dateTime are required' 
      });
    }
    
    // Validate dateTime
    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid dateTime format: "${dateTime}"` 
      });
    }
    
    const event = await eventManager.createEvent({
      title,
      description: description || '',
      dateTime: parsedDate.toISOString(),
      duration: parseInt(duration) || 60,
      maxParticipants: parseInt(maxParticipants) || 0,
      roles: roles || [],
      createdBy: 'web_interface'
    });
    
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete event
app.delete('/api/events/:eventId', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    eventManager.deleteEvent(req.params.eventId);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all presets (no guildId filter)
app.get('/api/presets', (req, res) => {
  try {
    const presets = presetManager.loadPresets();
    res.json({ success: true, presets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new preset
app.post('/api/presets', (req, res) => {
  try {
    const { key, name, description, duration, maxParticipants, roles } = req.body;
    
    if (!key || !name) {
      return res.status(400).json({
        success: false,
        error: 'Key and name are required'
      });
    }
    
    // Validate key format
    if (!/^[a-z0-9-]+$/.test(key)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Key must be lowercase letters, numbers, and hyphens only' 
      });
    }
    
    const preset = presetManager.createPreset(key, {
      name,
      description: description || '',
      duration: parseInt(duration) || 60,
      maxParticipants: parseInt(maxParticipants) || 0,
      roles: roles || []
    });
    
    res.json({ success: true, preset, key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete preset
app.delete('/api/presets/:presetKey', (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.presetKey);
    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }
    presetManager.deletePreset(req.params.presetKey);
    res.json({ success: true, message: 'Preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create event from preset
app.post('/api/events/from-preset', async (req, res) => {
  try {
    const { presetName, dateTime, description } = req.body;
    
    if (!presetName || !dateTime) {
      return res.status(400).json({
        success: false,
        error: 'Preset name and dateTime are required'
      });
    }
    
    // Validate dateTime
    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid dateTime format: "${dateTime}"` 
      });
    }
    
    const preset = presetManager.getPreset(presetName);
    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }
    
    const event = await eventManager.createFromPreset(
      preset,
      parsedDate.toISOString(),
      description
    );
    
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get event channel configuration for a guild
app.get('/api/event-channel/:guildId', (req, res) => {
  try {
    const guildId = req.params.guildId;
    const channelId = eventsConfig.getEventChannel(guildId);
    const hasChannel = eventsConfig.hasEventChannel(guildId);
    
    res.json({
      success: true,
      guildId,
      channelId,
      hasChannel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set event channel for a guild
app.post('/api/event-channel/:guildId', (req, res) => {
  try {
    const guildId = req.params.guildId;
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'channelId is required'
      });
    }
    
    const config = eventsConfig.setEventChannel(guildId, channelId);
    
    res.json({ 
      success: true, 
      message: 'Event channel set successfully',
      config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear event channel for a guild
app.delete('/api/event-channel/:guildId', (req, res) => {
  try {
    const guildId = req.params.guildId;
    const config = eventsConfig.removeEventChannel(guildId);
    
    res.json({
      success: true,
      message: 'Event channel cleared successfully',
      config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CATCH-ALL FOR API (MUST BE LAST!)
// ==========================================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.url}`
  });
});

// Global error handler for API
app.use('/api', (err, req, res, next) => {
  console.error('[API] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Serve web UI
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.status(404).send('Not found');
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const localIP = Object.values(os.networkInterfaces())
    .flat()
    .find(iface => iface.family === 'IPv4' && !iface.internal)?.address || 'localhost';
  
  console.log(`\n🌐 Web Interface Started Successfully!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Network: http://${localIP}:${PORT}`);
  console.log(`✅ API Endpoints:`);
  console.log(`• /api/health (public)`);
  console.log(`• /api/stats (protected)`);
  console.log(`• /api/guilds (protected)`);
  console.log(`• /api/events, /api/presets (protected)`);
  console.log(`• /api/events/from-preset (protected)`);
  console.log(`• /api/event-channel/:guildId (protected)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const apiKeyConfigured = process.env.WEB_API_KEY || config.web?.apiKey;
  if (apiKeyConfigured) {
    console.log(`🔒 API authentication: ENABLED`);
  } else {
    console.log(`⚠️ API authentication: DISABLED (set WEB_API_KEY in .env)`);
  }
  
  console.log(`\n💡 Access web UI at: http://${localIP}:${PORT}\n`);
});

module.exports = app;