// src/config/index.js
require('dotenv').config();

/**
Parse calendar IDs from environment variable
Supports formats:
Single: "primary"
Multiple with names: "Work:id1,Gaming:id2"
Multiple without names: "id1,id2,id3"
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
    token: process.env.DISCORD_TOKEN,
    clientId: null // Will be set when bot is ready
  },
  
  // Google Calendar configuration
  google: {
    credentials: process.env.GOOGLE_CREDENTIALS || null,
    calendarIds: process.env.CALENDAR_IDS || 'primary',
    calendars: parseCalendarIds(process.env.CALENDAR_IDS || 'primary')
  },

  // Web server configuration
  web: {
    port: process.env.WEB_PORT || 3000,
    host: '0.0.0.0',
    apiKey: process.env.WEB_API_KEY || null  // API key for authentication
  },

  // File paths
  files: {
    events: './data/events.json',
    presets: './data/presets.json',
    eventsConfig: './data/events-config.json',
    streaming: './data/streaming-config.json'
  },

  // Bot settings
  bot: {
    commandPrefix: '!',
    autoSyncInterval: 60 * 60 * 1000 // 1 hour in milliseconds
  },
  
  // Twitch configuration (optional)
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || null,
    clientSecret: process.env.TWITCH_CLIENT_SECRET || null,
    enabled: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
  }
};

// Validate required configuration
function validateConfig() {
  if (!config.discord.token) {
    throw new Error('DISCORD_TOKEN is required in .env file');
  }
  return true;
}

module.exports = {
  config,
  validateConfig,
  parseCalendarIds
};