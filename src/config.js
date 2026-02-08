// src/config.js
const path = require('path');
require('dotenv').config();

const config = {
    // Discord Bot Configuration
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID || null
    },
    
    // File Storage Paths
    files: {
        events: path.join(__dirname, '../data/events.json'),
        presets: path.join(__dirname, '../data/presets.json'),
        streaming: path.join(__dirname, '../data/streaming-config.json')
    },
    
    // Google Calendar Configuration
    google: {
        credentials: process.env.GOOGLE_CREDENTIALS_PATH || null,
        calendars: process.env.GOOGLE_CALENDAR_IDS?.split(',') || []
    },
    
    // Twitch Streaming Configuration
    twitch: {
        enabled: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
        clientId: process.env.TWITCH_CLIENT_ID || null,
        clientSecret: process.env.TWITCH_CLIENT_SECRET || null,
        checkInterval: 60000 // Check every 60 seconds
    },
    
    // YouTube Streaming Configuration
    youtube: {
        enabled: true, // RSS-based, no API key needed
        checkInterval: 300000 // Check every 5 minutes
    },
    
    // Bot Behavior Settings
    bot: {
        autoSyncInterval: parseInt(process.env.AUTO_SYNC_INTERVAL) || 3600000 // 1 hour default
    }
};

/**
 * Validate required configuration
 */
function validateConfig() {
    const errors = [];
    
    if (!config.discord.token) {
        errors.push('DISCORD_TOKEN is required in .env file');
    }
    
    if (config.google.credentials && !require('fs').existsSync(config.google.credentials)) {
        console.warn(`⚠️  Google credentials file not found: ${config.google.credentials}`);
        console.warn('   Google Calendar features will be disabled.');
        config.google.credentials = null;
    }
    
    if (errors.length > 0) {
        console.error('\n❌ Configuration Errors:\n');
        errors.forEach(err => console.error(`  - ${err}`));
        console.error('\nPlease fix the above errors and try again.\n');
        throw new Error('Invalid configuration');
    }
    
    return true;
}

module.exports = { config, validateConfig };