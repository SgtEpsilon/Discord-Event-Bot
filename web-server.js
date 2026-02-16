// web-server.js - Discord Event Bot Web Interface Server
const express = require('express');
const path = require('path');
const fs = require('fs');

// FIXED IMPORTS - Use the actual file structure
const EventManager = require('./src/services/eventManager');
const PresetManager = require('./src/services/presetManager');
const CalendarService = require('./src/services/calendar');
const { config } = require('./src/config');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize managers
const eventManager = new EventManager();
const presetManager = new PresetManager();
const calendarService = new CalendarService(
  config.google.credentials,
  config.google.calendars
);

// Session storage (in production, use Redis or database)
const sessions = new Map();

// Make sessions available to routes
app.locals.sessions = sessions;

// Authentication middleware
function verifySession(req, res, next) {
  const token = req.headers['x-auth-token'];
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// ==================== AUTHENTICATION ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication (in production, use proper password hashing)
  const validUsername = process.env.WEB_USERNAME || 'admin';
  const validPassword = process.env.WEB_PASSWORD || 'password';
  
  if (username === validUsername && password === validPassword) {
    const token = Math.random().toString(36).substring(2);
    sessions.set(token, { username, loginTime: Date.now() });
    
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.get('/api/auth/check', verifySession, (req, res) => {
  res.json({ authenticated: true });
});

// ==================== DASHBOARD ====================

app.get('/api/stats', verifySession, async (req, res) => {
  try {
    const allEvents = await eventManager.getAllEvents();
    const events = Object.values(allEvents);
    const now = new Date();
    
    const upcomingEvents = events.filter(e => new Date(e.dateTime) > now).length;
    const totalSignups = events.reduce((sum, e) => 
      sum + Object.values(e.signups || {}).reduce((total, arr) => total + arr.length, 0), 0
    );
    
    const presets = await presetManager.loadPresets();
    
    res.json({
      totalEvents: events.length,
      upcomingEvents,
      totalSignups,
      totalPresets: Object.keys(presets).length
    });
  } catch (error) {
    console.error('Error loading stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EVENTS ====================

app.get('/api/events', verifySession, async (req, res) => {
  try {
    const allEvents = await eventManager.getAllEvents();
    const events = Object.values(allEvents);
    res.json(events);
  } catch (error) {
    console.error('Error loading events:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', verifySession, async (req, res) => {
  try {
    const eventData = req.body;
    
    // Generate event ID if not provided
    if (!eventData.id) {
      eventData.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add to Google Calendar if requested
    let calendarLink = null;
    if (eventData.addToCalendar && eventData.calendarId) {
      try {
        calendarLink = await calendarService.createEvent(eventData);
      } catch (error) {
        console.error('Error adding to Google Calendar:', error);
        // Continue without calendar link
      }
    }
    
    // Create event in database
    await eventManager.createEvent({
      ...eventData,
      calendarLink: calendarLink || eventData.calendarLink
    });
    
    res.json({ success: true, eventId: eventData.id });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/events/:eventId', verifySession, async (req, res) => {
  try {
    const { eventId } = req.params;
    await eventManager.deleteEvent(eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events/from-preset', verifySession, async (req, res) => {
  try {
    const { presetKey, dateTime, guildId } = req.body;
    
    const preset = await presetManager.getPreset(presetKey);
    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await eventManager.createEvent({
      id: eventId,
      title: preset.name,
      description: preset.description,
      dateTime,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles,
      createdBy: req.body.createdBy || 'web_interface',
      guildId: guildId || null
    });
    
    res.json({ success: true, eventId });
  } catch (error) {
    console.error('Error creating event from preset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PRESETS ====================

app.get('/api/presets', verifySession, async (req, res) => {
  try {
    const presets = await presetManager.loadPresets();
    res.json(Object.entries(presets).map(([key, preset]) => ({
      key,
      ...preset
    })));
  } catch (error) {
    console.error('Error loading presets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presets', verifySession, async (req, res) => {
  try {
    const { key, ...presetData } = req.body;
    await presetManager.createPreset(key, presetData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/presets/:presetKey', verifySession, async (req, res) => {
  try {
    const { presetKey } = req.params;
    await presetManager.deletePreset(presetKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GOOGLE CALENDAR ====================

// ✅ FIXED: This endpoint now checks the database instead of environment variables
app.get('/api/calendars/status', verifySession, async (req, res) => {
  try {
    const { CalendarConfig } = require('./src/models');
    const configs = await CalendarConfig.findAll();
    
    const hasIcalCalendars = configs.some(cal => 
      cal.calendarId.startsWith('http://') || cal.calendarId.startsWith('https://')
    );
    
    const hasGoogleCalendars = configs.some(cal => 
      !cal.calendarId.startsWith('http://') && !cal.calendarId.startsWith('https://')
    );
    
    // Check if Google Calendar API credentials file exists (for write operations)
    let apiConfigured = false;
    try {
      const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS || 
                             process.env.GOOGLE_CREDENTIALS ||
                             path.join(__dirname, 'data', 'calendar-credentials.json');
      apiConfigured = fs.existsSync(credentialsPath);
    } catch (error) {
      apiConfigured = false;
    }
    
    res.json({ 
      configured: apiConfigured || configs.length > 0,
      hasIcalCalendars,
      hasGoogleCalendars,
      apiConfigured,
      totalCalendars: configs.length,
      supportsIcal: true
    });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    res.json({ 
      configured: false, 
      hasIcalCalendars: false,
      hasGoogleCalendars: false,
      apiConfigured: false,
      totalCalendars: 0,
      supportsIcal: true,
      error: error.message 
    });
  }
});

app.get('/api/calendars', verifySession, async (req, res) => {
  try {
    const { CalendarConfig } = require('./src/models');
    const configs = await CalendarConfig.findAll();
    const calendars = configs.map(c => ({
      id: c.id,
      name: c.name,
      calendarId: c.calendarId,
      createdAt: c.createdAt
    }));
    res.json(calendars);
  } catch (error) {
    console.error('Error loading calendars:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendars/available', verifySession, async (req, res) => {
  try {
    // Use the calendar service's authenticated client
    const { google } = require('googleapis');
    const path = require('path');
    
    // Read credentials from the configured path
    const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS || 
                           process.env.GOOGLE_CREDENTIALS ||
                           path.join(__dirname, 'data', 'calendar-credentials.json');
    
    const fs = require('fs');
    if (!fs.existsSync(credentialsPath)) {
      return res.status(400).json({ 
        error: 'Calendar credentials file not found at: ' + credentialsPath + '. Please add your calendar-credentials.json file to the data folder.' 
      });
    }

    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    
    const response = await calendar.calendarList.list({
      maxResults: 50,
      showHidden: false
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return res.json([]);
    }

    const calendars = response.data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description || '',
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor
    }));

    console.log(`[Calendar API] Found ${calendars.length} available calendars`);
    res.json(calendars);
    
  } catch (error) {
    console.error('Error fetching available calendars:', error);
    
    // Provide more detailed error messages
    let errorMessage = error.message;
    if (error.code === 401 || error.code === 403) {
      errorMessage = 'Authentication failed. Please check that:\n' +
                    '1. Your service account credentials are valid\n' +
                    '2. The Calendar API is enabled in Google Cloud Console\n' +
                    '3. The service account has calendar access';
    }
    
    res.status(error.code || 500).json({ 
      error: errorMessage,
      details: error.errors || []
    });
  }
});

app.post('/api/calendars', verifySession, async (req, res) => {
  try {
    const { name, calendarId } = req.body;
    const { CalendarConfig } = require('./src/models');
    await CalendarConfig.create({ name, calendarId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding calendar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/calendars/:id', verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, calendarId } = req.body;
    const { CalendarConfig } = require('./src/models');
    await CalendarConfig.update({ name, calendarId }, { where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/calendars/:id', verifySession, async (req, res) => {
  try {
    console.log(`[Calendar] Delete request for ID: ${req.params.id}`);
    
    const { CalendarConfig } = require('./src/models');
    
    // Parse ID (handles both string and integer IDs)
    const calendarId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);
    
    // Find calendar first
    const calendar = await CalendarConfig.findOne({
      where: { id: calendarId }
    });
    
    if (!calendar) {
      console.log(`[Calendar] Calendar not found with ID: ${calendarId}`);
      return res.status(404).json({ 
        success: false, 
        error: `Calendar not found (ID: ${calendarId})` 
      });
    }
    
    const calendarName = calendar.name;
    const calendarIdValue = calendar.calendarId;
    
    // Delete the calendar
    await calendar.destroy();
    
    console.log(`[Calendar] ✅ Deleted calendar: ${calendarName}`);
    console.log(`[Calendar]    Calendar ID: ${calendarIdValue}`);
    console.log(`[Calendar]    Database ID: ${calendarId}`);
    
    res.json({ 
      success: true, 
      message: `Calendar "${calendarName}" deleted successfully` 
    });
    
  } catch (error) {
    console.error('[Calendar] ❌ Delete error:', error);
    console.error('[Calendar] Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: `Failed to delete calendar: ${error.message}` 
    });
  }
});

app.post('/api/calendars/manual-sync', verifySession, async (req, res) => {
  try {
    // Load calendars from database instead of config
    const { CalendarConfig } = require('./src/models');
    const dbCalendars = await CalendarConfig.findAll();
    
    if (dbCalendars.length === 0) {
      return res.json({ 
        success: false, 
        error: 'No calendars configured. Please add calendars in the Google Calendar tab first.' 
      });
    }
    
    // Build calendar array in the format CalendarService expects
    const calendars = dbCalendars.map(cal => ({
      name: cal.name,
      id: cal.calendarId
    }));
    
    console.log(`[Manual Sync] Syncing from ${calendars.length} calendar(s):`, calendars.map(c => c.name).join(', '));
    
    // Create a temporary calendar service with database calendars
    const CalendarService = require('./src/services/calendar');
    const tempCalendarService = new CalendarService(
      config.google.credentials,
      calendars
    );
    
    // Sync events
    const result = await tempCalendarService.syncEvents(744); // Next 31 days
    
    if (!result.success) {
      return res.json({ success: false, error: result.message });
    }
    
    let importedCount = 0;
    const { Event } = require('./src/models');
    
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
            createdBy: 'manual_calendar_sync',
            channelId: null,
            guildId: null,
            messageId: null,
            calendarLink: eventData.calendarEvent.htmlLink,
            calendarEventId: eventData.calendarEvent.id,
            calendarSource: eventData.calendarSource,
            calendarSourceId: eventData.calendarSourceId
          });
          
          importedCount++;
        }
      } catch (error) {
        console.error('[Manual Sync] Error importing event:', error.message);
      }
    }
    
    console.log(`[Manual Sync] Complete - Imported: ${importedCount}, Total: ${result.events.length}`);
    
    res.json({
      success: true,
      message: `Synced from ${calendars.map(c => c.name).join(', ')}`,
      imported: importedCount,
      total: result.events.length,
      calendars: calendars.map(c => c.name)
    });
  } catch (error) {
    console.error('[Manual Sync] Error during sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GUILD CONFIGURATION ====================

app.get('/api/guilds', verifySession, async (req, res) => {
  try {
    // Read from guilds.json file
    const guildsPath = path.join(__dirname, 'data', 'guilds.json');
    if (fs.existsSync(guildsPath)) {
      const guildsData = JSON.parse(fs.readFileSync(guildsPath, 'utf8'));
      res.json(guildsData);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading guilds:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { EventsConfig } = require('./src/models');
    const config = await EventsConfig.findByPk(guildId);
    res.json({ channelId: config?.eventChannelId || '' });
  } catch (error) {
    console.error('Error loading event channel:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId } = req.body;
    const { EventsConfig } = require('./src/models');
    await EventsConfig.upsert({ guildId, eventChannelId: channelId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving event channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/event-channel/:guildId', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { EventsConfig } = require('./src/models');
    await EventsConfig.update({ eventChannelId: null }, { where: { guildId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing event channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STREAMING CONFIGURATION ====================

app.get('/api/streaming/:guildId', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { StreamingConfig } = require('./src/models');
    const config = await StreamingConfig.findByPk(guildId);
    
    if (!config) {
      return res.json({
        notificationChannelId: '',
        twitch: { streamers: [] },
        youtube: { channels: [] }
      });
    }
    
    res.json({
      notificationChannelId: config.notificationChannelId || '',
      twitch: { streamers: config.twitchStreamers || [] },
      youtube: { channels: config.youtubeChannels || [] }
    });
  } catch (error) {
    console.error('Error loading streaming config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/streaming/:guildId/channel', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId } = req.body;
    const { StreamingConfig } = require('./src/models');
    await StreamingConfig.upsert({ guildId, notificationChannelId: channelId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving notification channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/streaming/:guildId/twitch', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { streamers } = req.body;
    
    if (!Array.isArray(streamers)) {
      return res.status(400).json({ error: 'Streamers must be an array' });
    }
    
    const { StreamingConfig } = require('./src/models');
    const dbConfig = await StreamingConfig.findByPk(guildId);
    
    if (dbConfig) {
      await dbConfig.update({
        twitchStreamers: streamers,
        twitchEnabled: streamers.length > 0
      });
    } else {
      await StreamingConfig.create({
        guildId,
        twitchStreamers: streamers,
        twitchEnabled: streamers.length > 0
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving Twitch config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/streaming/:guildId/youtube', verifySession, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channels } = req.body;
    
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Channels must be an array' });
    }
    
    const { StreamingConfig } = require('./src/models');
    const dbConfig = await StreamingConfig.findByPk(guildId);
    
    if (dbConfig) {
      await dbConfig.update({
        youtubeChannels: channels,
        youtubeEnabled: channels.length > 0
      });
    } else {
      await StreamingConfig.create({
        guildId,
        youtubeChannels: channels,
        youtubeEnabled: channels.length > 0
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving YouTube config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BOT CONTROL ====================

app.get('/api/bot/status', verifySession, async (req, res) => {
  try {
    const statusPath = path.join(__dirname, 'data', 'bot-status.json');
    if (fs.existsSync(statusPath)) {
      const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      res.json(statusData);
    } else {
      res.json({
        status: 'Unknown',
        uptime: 0,
        guildCount: 0,
        autoSync: { enabled: false }
      });
    }
  } catch (error) {
    console.error('Error loading bot status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/autosync/status', verifySession, async (req, res) => {
  try {
    const { AutoSyncConfig } = require('./src/models');
    const config = await AutoSyncConfig.findOne({ where: { enabled: true } });
    
    if (config) {
      res.json({
        enabled: true,
        guildId: config.guildId,
        channelId: config.channelId,
        lastSync: config.lastSync
      });
    } else {
      res.json({
        enabled: false,
        guildId: null,
        channelId: null,
        lastSync: null
      });
    }
  } catch (error) {
    console.error('Error loading autosync status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bot/pm2-status', verifySession, async (req, res) => {
  try {
    const { execSync } = require('child_process');
    
    try {
      const pm2List = execSync('pm2 jlist', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const processes = JSON.parse(pm2List);
      const botProcess = processes.find(p => p.name === 'discord-event-bot');
      
      res.json({
        pm2Running: !!botProcess,
        processInfo: botProcess || null
      });
    } catch (error) {
      res.json({
        pm2Running: false,
        processInfo: null
      });
    }
  } catch (error) {
    console.error('Error checking PM2 status:', error);
    res.json({
      pm2Running: false,
      processInfo: null
    });
  }
});

app.post('/api/bot/restart', verifySession, async (req, res) => {
  try {
    const { exec } = require('child_process');
    
    exec('pm2 restart discord-event-bot', (error, stdout, stderr) => {
      if (error) {
        console.error('Error restarting bot:', error);
        return res.json({
          success: false,
          error: 'Failed to restart bot. Make sure bot is running in PM2.'
        });
      }
      
      res.json({
        success: true,
        message: 'Bot restart initiated'
      });
    });
  } catch (error) {
    console.error('Error restarting bot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== OAUTH ROUTES ====================
// Mount OAuth routes
try {
  const oauthRoutes = require('./oauth-routes');
  app.use('/api', oauthRoutes);
  console.log('✅ OAuth routes loaded successfully');
} catch (error) {
  console.warn('⚠️  OAuth routes not available:', error.message);
  console.warn('   To enable OAuth, create oauth-routes.js file');
}

// ==================== COMMANDS ====================

app.get('/api/commands', verifySession, async (req, res) => {
  try {
    // Return a static list of commands
    const commands = [
      { name: 'create', description: 'Create a custom event', category: 'Events' },
      { name: 'preset', description: 'Create event from preset', category: 'Events' },
      { name: 'presets', description: 'List all presets', category: 'Events' },
      { name: 'addrole', description: 'Add role to event', category: 'Events' },
      { name: 'list', description: 'List all events', category: 'Events' },
      { name: 'delete', description: 'Delete an event', category: 'Events' },
      { name: 'sync', description: 'Sync from Google Calendar', category: 'Calendar' },
      { name: 'calendars', description: 'List calendars', category: 'Calendar' },
      { name: 'autosync', description: 'Manage auto-sync', category: 'Calendar' },
      { name: 'help', description: 'Show help', category: 'General' }
    ];
    
    res.json(commands);
  } catch (error) {
    console.error('Error loading commands:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BACKUP MANAGEMENT ====================

// Get backup service status
app.get('/api/backups/status', verifySession, async (req, res) => {
  try {
    const BackupService = require('./src/services/backupService');
    const backupService = new BackupService();
    
    const status = backupService.getStatus();
    const lastBackup = await backupService.getLastBackupTime();
    
    res.json({
      ...status,
      lastBackup: lastBackup?.toISOString() || null,
      nextBackup: getNextSundayMidnight().toISOString()
    });
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all backups
app.get('/api/backups/list', verifySession, async (req, res) => {
  try {
    const BackupService = require('./src/services/backupService');
    const backupService = new BackupService();
    
    const backups = await backupService.listBackups();
    
    res.json({
      success: true,
      backups: backups.map(b => ({
        fileName: b.fileName,
        size: b.size,
        sizeMB: (b.size / 1024 / 1024).toFixed(2),
        created: b.created,
        age: getBackupAge(b.created)
      }))
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger manual backup
app.post('/api/backups/create', verifySession, async (req, res) => {
  try {
    const BackupService = require('./src/services/backupService');
    const backupService = new BackupService();
    
    await backupService.performBackup();
    
    res.json({
      success: true,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download a backup
app.get('/api/backups/download/:filename', verifySession, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename (security)
    if (!filename.startsWith('backup-') || !filename.endsWith('.sqlite')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const BackupService = require('./src/services/backupService');
    const backupService = new BackupService();
    const backupPath = path.join(backupService.backupDir, filename);
    
    // Check if file exists
    await fs.promises.access(backupPath);
    
    res.download(backupPath, filename);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(404).json({ error: 'Backup not found' });
  }
});

// Get event tracker stats
app.get('/api/tracker/stats', verifySession, async (req, res) => {
  try {
    const EventTracker = require('./src/services/eventTracker');
    const eventTracker = new EventTracker();
    
    await eventTracker.load();
    const stats = eventTracker.getStats();
    
    res.json({
      success: true,
      stats: {
        totalTracked: stats.totalTracked,
        oldestPosted: stats.oldestPosted?.toISOString() || null,
        newestPosted: stats.newestPosted?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error getting tracker stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions for backups
function getNextSundayMidnight() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
}

function getBackupAge(created) {
  const now = new Date();
  const createdDate = new Date(created);
  const diffMs = now - createdDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log(`🌐 Web interface running on http://localhost:${PORT}`);
});

module.exports = app;
