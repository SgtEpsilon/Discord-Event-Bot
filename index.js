// src/config/index.js
require('dotenv').config();

/**
 * Parse calendar IDs from environment variable
 */
function parseCalendarIds(calendarIdsString) {
    const calendars = [];
    const parts = calendarIdsString.split(',').map(s => s.trim()).filter(s => s);
    
    parts.forEach((part, index) => {
        if (part.includes(':')) {
            const [name, id] = part.split(':').map(s => s.trim());
            calendars.push({ name, id });
        } else {
            calendars.push({ 
                name: parts.length === 1 ? 'Calendar' : `Calendar ${index + 1}`, 
                id: part 
            });
        }
    });
    
    return calendars.length > 0 ? calendars : [{ name: 'Calendar', id: 'primary' }];
}

const config = {
    // Discord configuration
    discord: {
        token: process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN,
        clientId: null // Will be set when bot is ready
    },
    
    // Google Calendar configuration
    google: {
        credentials: process.env.GOOGLE_CREDENTIALS || null,
        calendarIds: process.env.CALENDAR_IDS || 'primary',
        calendars: parseCalendarIds(process.env.CALENDAR_IDS || 'primary')
    },
    
    // Twitch configuration
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID || null,
        clientSecret: process.env.TWITCH_CLIENT_SECRET || null,
        enabled: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
    },
    
    // YouTube configuration
    youtube: {
        // No API key needed - uses RSS feeds
        enabled: true
    },
    
    // Web server configuration
    web: {
        port: process.env.WEB_PORT || 3000,
        host: '0.0.0.0'
    },
    
    // File paths
    files: {
        events: './data/events.json',
        presets: './data/presets.json',
        streaming: './data/streaming.json' // New: streaming configuration per guild
    },
    
    // Bot settings
    bot: {
        commandPrefix: '!',
        autoSyncInterval: 60 * 60 * 1000, // 1 hour
        twitchCheckInterval: 60 * 1000, // 1 minute
        youtubeCheckInterval: 5 * 60 * 1000 // 5 minutes
    }
};

// Validate required configuration
function validateConfig() {
    if (!config.discord.token) {
        throw new Error('DISCORD_TOKEN or DISCORD_BOT_TOKEN is required in .env file');
    }
    
    return true;
}

module.exports = {
    config,
    validateConfig,
    parseCalendarIds
};
