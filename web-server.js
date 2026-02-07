const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File paths
const EVENTS_FILE = path.join(__dirname, 'events.json');
const PRESETS_FILE = path.join(__dirname, 'presets.json');

// Helper to load events
function loadEvents() {
    if (fs.existsSync(EVENTS_FILE)) {
        return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    }
    return {};
}

// Helper to save events
function saveEvents(events) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Helper to load presets
function loadPresets() {
    if (fs.existsSync(PRESETS_FILE)) {
        return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    }
    return {};
}

// Helper to save presets
function savePresets(presets) {
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
}

// ==========================================
// API ROUTES
// ==========================================

// Get all events
app.get('/api/events', (req, res) => {
    try {
        const events = loadEvents();
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
        const events = loadEvents();
        const event = events[req.params.id];
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new event
app.post('/api/events', (req, res) => {
    try {
        const { title, description, dateTime, duration, maxParticipants, roles } = req.body;
        
        if (!title || !dateTime) {
            return res.status(400).json({ success: false, error: 'Title and dateTime are required' });
        }

        const events = loadEvents();
        const eventId = `event_${Date.now()}`;
        
        const newEvent = {
            id: eventId,
            title,
            description: description || '',
            dateTime: new Date(dateTime).toISOString(),
            duration: parseInt(duration) || 60,
            maxParticipants: parseInt(maxParticipants) || 0,
            roles: roles || [],
            signups: {},
            createdBy: 'web_interface',
            channelId: null,
            guildId: null,
            messageId: null
        };

        // Initialize signups for each role
        if (roles) {
            roles.forEach(role => {
                newEvent.signups[role.name] = [];
            });
        }

        events[eventId] = newEvent;
        saveEvents(events);

        res.json({ success: true, event: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update event
app.put('/api/events/:id', (req, res) => {
    try {
        const events = loadEvents();
        const event = events[req.params.id];
        
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const { title, description, dateTime, duration, maxParticipants, roles } = req.body;

        if (title) event.title = title;
        if (description !== undefined) event.description = description;
        if (dateTime) event.dateTime = new Date(dateTime).toISOString();
        if (duration) event.duration = parseInt(duration);
        if (maxParticipants !== undefined) event.maxParticipants = parseInt(maxParticipants);
        
        if (roles) {
            event.roles = roles;
            // Initialize signups for new roles
            roles.forEach(role => {
                if (!event.signups[role.name]) {
                    event.signups[role.name] = [];
                }
            });
        }

        saveEvents(events);
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
    try {
        const events = loadEvents();
        
        if (!events[req.params.id]) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        delete events[req.params.id];
        saveEvents(events);

        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all presets
app.get('/api/presets', (req, res) => {
    try {
        const presets = loadPresets();
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

        const presets = loadPresets();
        
        // Check if preset already exists
        if (presets[key]) {
            return res.status(400).json({ 
                success: false, 
                error: 'Preset already exists. Use a different key.' 
            });
        }

        // Create new preset
        const newPreset = {
            name,
            description: description || '',
            duration: parseInt(duration),
            maxParticipants: parseInt(maxParticipants) || 0,
            roles: roles || []
        };

        presets[key] = newPreset;
        savePresets(presets);

        res.json({ success: true, preset: newPreset, key });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update preset
app.put('/api/presets/:key', (req, res) => {
    try {
        const presets = loadPresets();
        const preset = presets[req.params.key];
        
        if (!preset) {
            return res.status(404).json({ success: false, error: 'Preset not found' });
        }

        const { name, description, duration, maxParticipants, roles } = req.body;

        if (name) preset.name = name;
        if (description !== undefined) preset.description = description;
        if (duration) preset.duration = parseInt(duration);
        if (maxParticipants !== undefined) preset.maxParticipants = parseInt(maxParticipants);
        if (roles) preset.roles = roles;

        savePresets(presets);
        res.json({ success: true, preset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete preset
app.delete('/api/presets/:key', (req, res) => {
    try {
        const presets = loadPresets();
        
        if (!presets[req.params.key]) {
            return res.status(404).json({ success: false, error: 'Preset not found' });
        }

        delete presets[req.params.key];
        savePresets(presets);

        res.json({ success: true, message: 'Preset deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create event from preset
app.post('/api/events/from-preset', (req, res) => {
    try {
        const { presetName, dateTime, description } = req.body;
        
        if (!presetName || !dateTime) {
            return res.status(400).json({ success: false, error: 'Preset name and dateTime are required' });
        }

        const presets = loadPresets();
        const preset = presets[presetName];
        
        if (!preset) {
            return res.status(404).json({ success: false, error: 'Preset not found' });
        }

        const events = loadEvents();
        const eventId = `event_${Date.now()}`;
        
        const newEvent = {
            id: eventId,
            title: preset.name,
            description: description || preset.description,
            dateTime: new Date(dateTime).toISOString(),
            duration: preset.duration,
            maxParticipants: preset.maxParticipants,
            roles: JSON.parse(JSON.stringify(preset.roles)), // Deep copy
            signups: {},
            createdBy: 'web_interface',
            channelId: null,
            guildId: null,
            messageId: null
        };

        // Initialize signups
        preset.roles.forEach(role => {
            newEvent.signups[role.name] = [];
        });

        events[eventId] = newEvent;
        saveEvents(events);

        res.json({ success: true, event: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get bot statistics
app.get('/api/stats', (req, res) => {
    try {
        const events = loadEvents();
        const presets = loadPresets();
        
        const eventList = Object.values(events);
        const now = new Date();
        
        const stats = {
            totalEvents: eventList.length,
            upcomingEvents: eventList.filter(e => new Date(e.dateTime) > now).length,
            pastEvents: eventList.filter(e => new Date(e.dateTime) <= now).length,
            totalSignups: eventList.reduce((sum, event) => {
                return sum + Object.values(event.signups || {}).reduce((s, arr) => s + arr.length, 0);
            }, 0),
            totalPresets: Object.keys(presets).length,
            eventsWithCalendar: eventList.filter(e => e.calendarLink).length
        };

        res.json({ success: true, stats });
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