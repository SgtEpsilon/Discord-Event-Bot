// web-server.js - Complete implementation with username/password authentication
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

// ==================== SESSION MANAGEMENT ====================

// Session storage (in production, use Redis or database)
const sessions = new Map();

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Get credentials from environment
function getCredentials() {
  const username = process.env.WEB_USERNAME || 'admin';
  const password = process.env.WEB_PASSWORD || 'admin';
  return { username, password };
}

// Verify session token
function verifySession() {
  return (req, res, next) => {
    const token = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    // Check if session has expired (24 hours)
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      sessions.delete(token);
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    req.user = session.user;
    next();
  };
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > 24 * 60 * 60 * 1000) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

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

// ==================== PUBLIC AUTHENTICATION ENDPOINTS ====================

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const credentials = getCredentials();
    
    // Timing-safe comparison to prevent timing attacks
    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(username),
      Buffer.from(credentials.username)
    );
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(credentials.password)
    );

    if (!usernameMatch || !passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    sessions.set(sessionToken, {
      user: username,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      message: 'Login successful',
      sessionToken,
      user: username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (token && sessions.has(token)) {
      sessions.delete(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check session endpoint
app.get('/api/auth/check', (req, res) => {
  try {
    const token = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ success: true, authenticated: false });
    }

    const session = sessions.get(token);
    if (!session) {
      return res.json({ success: true, authenticated: false });
    }

    // Check if expired
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      sessions.delete(token);
      return res.json({ success: true, authenticated: false });
    }

    res.json({
      success: true,
      authenticated: true,
      user: session.user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PROTECTED ENDPOINTS ====================
app.use('/api', verifySession());

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

// ==================== STATS ENDPOINT ====================
app.get('/api/stats', (req, res) => {
  try {
    const allEvents = eventManager.getAllEvents();
    const eventList = Object.values(allEvents);
    
    const now = new Date();
    const upcomingEvents = eventList.filter(event => new Date(event.dateTime) > now);
    
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
    res.json({ success: true, guilds });
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
        warning: 'Channel list not available.'
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

// ==================== CALENDAR ENDPOINTS ====================
app.get('/api/calendar/status', (req, res) => {
  try {
    const enabled = calendarService.isEnabled();
    let status = 'disabled', message = 'Google Calendar not configured';
    
    if (enabled) {
      status = 'connected';
      message = 'Google Calendar is connected and ready';
    }

    let autosyncInfo = { enabled: false, interval: 'Unknown' };
    try {
      const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
      if (fs.existsSync(botStatusPath)) {
        const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
        if (botStatus.autoSync) {
          autosyncInfo = botStatus.autoSync;
        }
      }
    } catch (e) {}

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
      message: `Synced ${result.events.length} events`, 
      events: result.events,
      calendars: result.calendars
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
    const botStatusPath = path.join(__dirname, 'data', 'bot-status.json');
    
    if (!fs.existsSync(botStatusPath)) {
      return res.json({
        success: true,
        autosync: {
          enabled: false,
          interval: 300000,
          intervalFormatted: '5 minutes',
          message: 'Bot status unavailable.'
        }
      });
    }
    
    const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
    
    if (botStatus.autoSync) {
      res.json({
        success: true,
        autosync: {
          enabled: botStatus.autoSync.enabled || false,
          interval: botStatus.autoSync.interval || 300000,
          intervalFormatted: botStatus.autoSync.intervalFormatted || '5 minutes',
          channelId: botStatus.autoSync.channelId || null,
          guildId: botStatus.autoSync.guildId || null,
          message: botStatus.autoSync.enabled 
            ? `Auto-sync enabled, checking every ${botStatus.autoSync.intervalFormatted || '5 minutes'}`
            : 'Auto-sync disabled.'
        }
      });
    } else {
      res.json({
        success: true,
        autosync: {
          enabled: false,
          interval: 300000,
          intervalFormatted: '5 minutes',
          message: 'Auto-sync disabled.'
        }
      });
    }
  } catch (error) {
    res.json({
      success: true,
      autosync: {
        enabled: false,
        interval: 300000,
        intervalFormatted: '5 minutes',
        message: 'Error reading auto-sync status.',
        error: error.message
      }
    });
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
          warning: 'Bot status unavailable.'
        }
      });
    }
    
    const botStatus = JSON.parse(fs.readFileSync(botStatusPath, 'utf8'));
    res.json({ success: true, source: 'bot_process', status: botStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bot/restart', (req, res) => {
  const pm2Name = process.env.BOT_PM2_NAME || 'discord-event-bot';
  
  exec('pm2 list', (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(400).json({
        success: false,
        error: 'PM2 not available.',
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
        message: `Discord bot restart initiated!`,
        pm2Output: stdout
      });
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
      { name: 'create', description: 'Create custom event', category: 'events' },
      { name: 'preset', description: 'Create from preset', category: 'events' },
      { name: 'presets', description: 'List presets', category: 'events' },
      { name: 'sync', description: 'Sync Google Calendar', category: 'calendar' },
      { name: 'autosync', description: 'Manage auto-sync', category: 'calendar' }
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

  const credentials = getCredentials();

  console.log(`\n🌐 Web Interface Started!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Network: http://${localIP}:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔒 Authentication: Username/Password`);
  console.log(`👤 Username: ${credentials.username}`);
  console.log(`   ${credentials.username === 'admin' && credentials.password === 'admin' ? '⚠️  Using default credentials! Change in .env' : '✅ Custom credentials configured'}`);
  console.log(`\n💡 Session-based authentication (24h expiry)\n`);
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`.replace(/0[dh]\s*/g, '').trim() || '0m';
}

module.exports = app;