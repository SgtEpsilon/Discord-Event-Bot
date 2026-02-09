// web-server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto'); // ADDED: For timing-safe comparisons
const { config } = require('./src/config');
const EventManager = require('./src/services/eventManager');
const PresetManager = require('./src/services/presetManager');
const CalendarService = require('./src/services/calendar');
const EventsConfig = require('./src/services/eventsConfig');
// CRITICAL: Add StreamingConfig for /api/guilds endpoint
const StreamingConfigManager = require('./src/services/streamingConfig');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// This line MUST exist in web-server.js
app.use(express.static(path.join(__dirname, 'public')));

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
      // Create dummy buffer of same length as validBuf
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
// API ROUTES
// ==========================================

// Get all guilds with streaming config
app.get('/api/guilds', verifyApiKey(), async (req, res) => {
  try {
    const streamingConfig = new StreamingConfigManager();
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

// Get events for a specific guild
app.get('/api/events/:guildId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId } = req.params;
    const eventsConfig = new EventsConfig();
    const guildConfig = eventsConfig.getGuildConfig(guildId);
    
    if (!guildConfig) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }
    
    res.json({
      success: true,
      guild: {
        id: guildId,
        name: guildConfig.guildName || 'Unknown Guild',
        events: guildConfig.events || []
      }
    });
  } catch (error) {
    console.error('[API] Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Create/update event
app.post('/api/events/:guildId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { eventName, description, dateTime, reminderMinutes } = req.body;
    
    if (!eventName || !dateTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventName, dateTime'
      });
    }
    
    const eventsConfig = new EventsConfig();
    const eventManager = new EventManager(eventsConfig);
    
    const event = await eventManager.createEvent(
      guildId,
      eventName,
      new Date(dateTime),
      description,
      reminderMinutes
    );
    
    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('[API] Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Delete event
app.delete('/api/events/:guildId/:eventId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId, eventId } = req.params;
    
    const eventsConfig = new EventsConfig();
    const eventManager = new EventManager(eventsConfig);
    
    await eventManager.deleteEvent(guildId, eventId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('[API] Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Get calendar export URL
app.get('/api/calendar/:guildId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const eventsConfig = new EventsConfig();
    const calendarService = new CalendarService(eventsConfig);
    
    const url = await calendarService.getPublicUrl(guildId);
    
    res.json({
      success: true,
      url
    });
  } catch (error) {
    console.error('[API] Error generating calendar URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate calendar URL'
    });
  }
});

// Get presets
app.get('/api/presets/:guildId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId } = req.params;
    
    const presetManager = new PresetManager();
    const presets = await presetManager.getPresets(guildId);
    
    res.json({
      success: true,
      presets
    });
  } catch (error) {
    console.error('[API] Error fetching presets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch presets'
    });
  }
});

// Create preset
app.post('/api/presets/:guildId', verifyApiKey(), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, settings } = req.body;
    
    if (!name || !settings) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, settings'
      });
    }
    
    const presetManager = new PresetManager();
    const preset = await presetManager.createPreset(guildId, name, settings);
    
    res.json({
      success: true,
      preset
    });
  } catch (error) {
    console.error('[API] Error creating preset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create preset'
    });
  }
});

// ==========================================
// STATIC ROUTES
// ==========================================

// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
  console.log(`✅ Admin panel: http://localhost:${PORT}/admin`);
  console.log(`✅ API docs: http://localhost:${PORT}/api-docs`);
});