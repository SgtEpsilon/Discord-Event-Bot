// web-server.js - Updated for Unified Guild Configuration
const express = require('express');
const path = require('path');
const config = require('./src/config');
const GuildConfigManager = require('./src/services/guildConfigManager');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize unified guild config
const guildConfig = new GuildConfigManager(
    config.files.guildConfig || path.join(__dirname, 'data/guild-config.json')
);

// Simple API key verification middleware
const verifyApiKey = () => {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        const configuredKey = process.env.WEB_API_KEY || config.web?.apiKey;
        
        if (configuredKey && apiKey !== configuredKey) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing API key'
            });
        }
        next();
    };
};

// ==========================================
// API ENDPOINTS
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Web server is running',
        timestamp: new Date().toISOString()
    });
});

// Get all guilds with their configurations
app.get('/api/guilds', (req, res) => {
    try {
        const guildConfigs = guildConfig.getAllGuildConfigs();
        const guilds = Object.entries(guildConfigs).map(([guildId, config]) => ({
            id: guildId,
            name: config.guildName || 'Unknown Guild',
            eventChannel: config.eventChannel?.channelId || null,
            eventChannelEnabled: config.eventChannel?.enabled || false,
            notificationChannel: config.notifications?.channelId || null,
            notificationChannelEnabled: config.notifications?.enabled || false,
            twitchEnabled: config.twitch?.enabled || false,
            twitchStreamers: config.twitch?.streamers?.length || 0,
            youtubeEnabled: config.youtube?.enabled || false,
            youtubeChannels: config.youtube?.channels?.length || 0,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        }));
        
        res.json({
            success: true,
            guilds,
            total: guilds.length
        });
    } catch (error) {
        console.error('[API] Error fetching guilds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch guilds'
        });
    }
});

// Get complete guild configuration
app.get('/api/guild-config/:guildId', (req, res) => {
    try {
        const config = guildConfig.getGuildConfig(req.params.guildId);
        res.json({ 
            success: true, 
            config 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Bulk update guild configuration
app.put('/api/guild-config/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const updates = req.body;
        
        // Validate updates object
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid updates object'
            });
        }
        
        const config = guildConfig.updateGuildConfig(guildId, updates);
        
        res.json({
            success: true,
            message: 'Guild configuration updated successfully',
            config
        });
    } catch (error) {
        console.error('[API] Error updating guild config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// EVENT CHANNEL ENDPOINTS
// ==========================================

// Get event channel for a guild
app.get('/api/event-channel/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const channelId = guildConfig.getEventChannel(guildId);
        const hasChannel = guildConfig.hasEventChannel(guildId);
        
        res.json({
            success: true,
            guildId,
            channelId,
            hasChannel
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
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
        
        const config = guildConfig.setEventChannel(guildId, channelId);
        
        res.json({ 
            success: true, 
            message: 'Event channel set successfully',
            guildId,
            channelId,
            config
        });
    } catch (error) {
        console.error('[API] Error setting event channel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Clear event channel for a guild
app.delete('/api/event-channel/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const config = guildConfig.removeEventChannel(guildId);
        
        res.json({
            success: true,
            message: 'Event channel cleared successfully',
            guildId,
            config
        });
    } catch (error) {
        console.error('[API] Error clearing event channel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// NOTIFICATION CHANNEL ENDPOINTS
// ==========================================

// Set notification channel for streaming alerts
app.post('/api/notification-channel/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { channelId } = req.body;
        
        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'channelId is required'
            });
        }
        
        guildConfig.setNotificationChannel(guildId, channelId);
        
        res.json({
            success: true,
            message: 'Notification channel set successfully',
            guildId,
            channelId
        });
    } catch (error) {
        console.error('[API] Error setting notification channel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get notification channel for a guild
app.get('/api/notification-channel/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const config = guildConfig.getGuildConfig(guildId);
        const channelId = config.notifications?.channelId || null;
        const enabled = config.notifications?.enabled || false;
        
        res.json({
            success: true,
            guildId,
            channelId,
            enabled
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// TWITCH ENDPOINTS
// ==========================================

// Get Twitch configuration for a guild
app.get('/api/twitch/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const streamers = guildConfig.getTwitchStreamers(guildId);
        const config = guildConfig.getGuildConfig(guildId);
        
        res.json({
            success: true,
            guildId,
            streamers,
            enabled: config.twitch?.enabled || false,
            customMessages: config.twitch?.customMessages || {}
        });
    } catch (error) {
        console.error('[API] Error fetching Twitch config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update Twitch configuration for a guild
app.post('/api/twitch/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { streamers, enabled } = req.body;
        
        if (!streamers || !Array.isArray(streamers)) {
            return res.status(400).json({
                success: false,
                error: 'streamers array is required'
            });
        }
        
        // Get current config
        const config = guildConfig.getGuildConfig(guildId);
        
        // Clear existing streamers
        config.twitch.streamers = [];
        config.twitch.customMessages = {};
        
        // Add new streamers
        for (const streamer of streamers) {
            if (typeof streamer === 'string') {
                guildConfig.addTwitchStreamer(guildId, streamer);
            } else if (streamer.username) {
                guildConfig.addTwitchStreamer(guildId, streamer.username, streamer.customMessage);
            }
        }
        
        // Update enabled status if provided
        if (typeof enabled === 'boolean') {
            config.twitch.enabled = enabled;
            guildConfig.updateGuildConfig(guildId, { twitch: config.twitch });
        }
        
        res.json({
            success: true,
            message: 'Twitch configuration saved successfully',
            guildId,
            streamers: config.twitch.streamers,
            enabled: config.twitch.enabled
        });
    } catch (error) {
        console.error('[API] Error saving Twitch config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add a single Twitch streamer
app.post('/api/twitch/:guildId/streamer', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { username, customMessage } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'username is required'
            });
        }
        
        guildConfig.addTwitchStreamer(guildId, username, customMessage);
        
        res.json({
            success: true,
            message: `Added Twitch streamer: ${username}`,
            guildId,
            username,
            customMessage
        });
    } catch (error) {
        console.error('[API] Error adding Twitch streamer:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Remove a Twitch streamer
app.delete('/api/twitch/:guildId/streamer/:username', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const username = req.params.username.toLowerCase();
        
        guildConfig.removeTwitchStreamer(guildId, username);
        
        res.json({
            success: true,
            message: `Removed Twitch streamer: ${username}`,
            guildId,
            username
        });
    } catch (error) {
        console.error('[API] Error removing Twitch streamer:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// YOUTUBE ENDPOINTS
// ==========================================

// Get YouTube configuration for a guild
app.get('/api/youtube/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const channels = guildConfig.getYouTubeChannels(guildId);
        const config = guildConfig.getGuildConfig(guildId);
        
        res.json({
            success: true,
            guildId,
            channels,
            enabled: config.youtube?.enabled || false
        });
    } catch (error) {
        console.error('[API] Error fetching YouTube config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update YouTube configuration for a guild
app.post('/api/youtube/:guildId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { channels, enabled } = req.body;
        
        if (!channels || !Array.isArray(channels)) {
            return res.status(400).json({
                success: false,
                error: 'channels array is required'
            });
        }
        
        // Get current config
        const config = guildConfig.getGuildConfig(guildId);
        
        // Clear existing channels
        config.youtube.channels = [];
        
        // Add new channels
        for (const channel of channels) {
            guildConfig.addYouTubeChannel(guildId, channel);
        }
        
        // Update enabled status if provided
        if (typeof enabled === 'boolean') {
            config.youtube.enabled = enabled;
            guildConfig.updateGuildConfig(guildId, { youtube: config.youtube });
        }
        
        res.json({
            success: true,
            message: 'YouTube configuration saved successfully',
            guildId,
            channels: config.youtube.channels,
            enabled: config.youtube.enabled
        });
    } catch (error) {
        console.error('[API] Error saving YouTube config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add a single YouTube channel
app.post('/api/youtube/:guildId/channel', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { channelId } = req.body;
        
        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'channelId is required'
            });
        }
        
        guildConfig.addYouTubeChannel(guildId, channelId);
        
        res.json({
            success: true,
            message: `Added YouTube channel: ${channelId}`,
            guildId,
            channelId
        });
    } catch (error) {
        console.error('[API] Error adding YouTube channel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Remove a YouTube channel
app.delete('/api/youtube/:guildId/channel/:channelId', (req, res) => {
    try {
        const guildId = req.params.guildId;
        const channelId = req.params.channelId;
        
        guildConfig.removeYouTubeChannel(guildId, channelId);
        
        res.json({
            success: true,
            message: `Removed YouTube channel: ${channelId}`,
            guildId,
            channelId
        });
    } catch (error) {
        console.error('[API] Error removing YouTube channel:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// STATISTICS AND UTILITY ENDPOINTS
// ==========================================

// Get guild statistics
app.get('/api/stats', (req, res) => {
    try {
        const stats = guildConfig.getStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[API] Error fetching stats:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Clean up inactive guilds (requires API key)
app.post('/api/cleanup', verifyApiKey(), (req, res) => {
    try {
        const { retentionDays } = req.body;
        const days = retentionDays || 30;
        
        const result = guildConfig.cleanupInactiveGuilds(days);
        
        res.json({
            success: true,
            message: `Cleanup completed`,
            ...result
        });
    } catch (error) {
        console.error('[API] Error during cleanup:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// SERVE HTML PAGES
// ==========================================

// Main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Guild configuration page
app.get('/guild/:guildId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'guild.html'));
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('[Server] Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`[Web Server] 🌐 Running on http://localhost:${PORT}`);
    console.log(`[Web Server] 📊 Dashboard: http://localhost:${PORT}`);
    console.log(`[Web Server] 🔧 API: http://localhost:${PORT}/api/guilds`);
});

module.exports = app;
