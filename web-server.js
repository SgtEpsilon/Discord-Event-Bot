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

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
const calendarService = new CalendarService(
    config.google.credentials,
    config.google.calendars
);
const eventManager = new EventManager(config.files.events, calendarService);
const presetManager = new PresetManager(config.files.presets);
const eventsConfig = new EventsConfig(
    config.files.eventsConfig || path.join(__dirname, 'data/events-config.json')
);

// ==========================================
// API ROUTES
// ==========================================

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

        const event = await eventManager.createEvent({
            title,
            description: description || '',
            dateTime: new Date(dateTime).toISOString(),
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
        if (dateTime) updates.dateTime = new Date(dateTime).toISOString();
        if (duration) updates.duration = parseInt(duration);
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

        // Validate key format (lowercase, hyphens only)
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
        if (duration) updates.duration = parseInt(duration);
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

        const preset = presetManager.getPreset(presetName);
        
        if (!preset) {
            return res.status(404).json({ success: false, error: 'Preset not found' });
        }

        const event = await eventManager.createFromPreset(
            preset,
            dateTime,
            description
        );

        eventManager.updateEvent(event.id, {
            createdBy: 'web_interface',
            channelId: null,
            guildId: null
        });

        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server on all network interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    
    function getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return 'localhost';
    }
    
    const localIP = getLocalIP();
    
    console.log(`\n🌐 Web Interface Started Successfully!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Local access:   http://localhost:${PORT}`);
    console.log(`📱 Network access: http://${localIP}:${PORT}`);
    console.log(`📊 API endpoint:   http://localhost:${PORT}/api`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n💡 To access from other devices on your network:`);
    console.log(`   1. Make sure devices are on the same WiFi/network`);
    console.log(`   2. Open browser and go to: http://${localIP}:${PORT}`);
    console.log(`   3. If blocked, allow port ${PORT} through firewall\n`);
});

module.exports = app;