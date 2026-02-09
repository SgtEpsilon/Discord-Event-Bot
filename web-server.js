// web-server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
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
    
    if (apiKey !== validApiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }
    
    next();
  };
}

// ==========================================
// INITIALIZE SERVICES
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
// CRITICAL: Initialize streaming config for /api/guilds
const streamingConfig = new StreamingConfigManager(
  config.files.streaming || path.join(__dirname, 'data/streaming-config.json')
);

// ==========================================
// API ROUTES (PUBLIC)
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
// API ROUTES (PROTECTED)
// ==========================================
app.use('/api', verifyApiKey());

// CRITICAL: Add /api/guilds endpoint
app.get('/api/guilds', (req, res) => {
  try {
    const eventsGuilds = eventsConfig.getAllGuildConfigs();
    const streamingGuilds = streamingConfig.getAllGuildConfigs();
    
    const guildIds = new Set([
      ...Object.keys(eventsGuilds),
      ...Object.keys(streamingGuilds)
    ]);
    
    const guilds = Array.from(guildIds).map(guildId => {
      const eventsData = eventsGuilds[guildId] || {};
      const streamingData = streamingGuilds[guildId] || {};
      
      // Use stored name if available, otherwise truncated ID
      const guildName = eventsData.guildName || 
                        streamingData.guildName || 
                        `Server (${guildId.slice(0, 5)}...)`;
      
      return {
        id: guildId,
        name: guildName,
        hasEvents: !!eventsGuilds[guildId],
        hasStreaming: !!streamingGuilds[guildId]
      };
    });
    
    guilds.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({ 
      success: true, 
      guilds,
      count: guilds.length 
    });
  } catch (error) {
    console.error('[API] Error fetching guilds:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load guilds. Check server logs.' 
    });
  }
});

// Get bot statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = eventManager.getStats();
    stats.totalPresets = presetManager.getPresetCount();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all events
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
app.get('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
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
      return res.status(400).json({ success: false, error: 'Title and dateTime are required' });
    }

    // Validate dateTime
    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid dateTime format: "${dateTime}". Please provide a valid ISO 8601 date/time string.` 
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

// Update event
app.put('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const { title, description, dateTime, duration, maxParticipants, roles } = req.body;

    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    
    if (dateTime) {
      const parsedDate = new Date(dateTime);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid dateTime format: "${dateTime}"` 
        });
      }
      updates.dateTime = parsedDate.toISOString();
    }
    
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (maxParticipants !== undefined) updates.maxParticipants = parseInt(maxParticipants);
    if (roles) updates.roles = roles;

    eventManager.updateEvent(req.params.id, updates);
    const updatedEvent = eventManager.getEvent(req.params.id);
    
    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  try {
    const event = eventManager.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    eventManager.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all presets
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
    if (!key || !name || !duration || !roles) {
      return res.status(400).json({ 
        success: false, 
        error: 'Key, name, duration, and roles are required' 
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
      duration: parseInt(duration),
      maxParticipants: parseInt(maxParticipants) || 0,
      roles: roles || []
    });

    res.json({ success: true, preset, key });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update preset
app.put('/api/presets/:key', (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.key);
    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    const { name, description, duration, maxParticipants, roles } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (maxParticipants !== undefined) updates.maxParticipants = parseInt(maxParticipants);
    if (roles) updates.roles = roles;

    presetManager.updatePreset(req.params.key, updates);
    const updatedPreset = presetManager.getPreset(req.params.key);
    
    res.json({ success: true, preset: updatedPreset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete preset
app.delete('/api/presets/:key', (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.key);
    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    presetManager.deletePreset(req.params.key);
    res.json({ success: true, message: 'Preset deleted' });
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

    await eventManager.updateEvent(event.id, {
      createdBy: 'web_interface',
      channelId: null,
      guildId: null
    });

    const updatedEvent = eventManager.getEvent(event.id);
    res.json({ success: true, event: updatedEvent });
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

// Start server
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
  console.log(`   • /api/health (public)`);
  console.log(`   • /api/stats (protected)`);
  console.log(`   • /api/guilds (protected) ← NEW!`);
  console.log(`   • /api/events, /api/presets, etc.`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const apiKeyConfigured = process.env.WEB_API_KEY || config.web?.apiKey;
  if (apiKeyConfigured) {
    console.log(`🔒 API authentication: ENABLED`);
  } else {
    console.log(`⚠️  API authentication: DISABLED (set WEB_API_KEY in .env)`);
  }
  
  console.log(`\n💡 Access web UI at: http://${localIP}:${PORT}\n`);
});

module.exports = app;