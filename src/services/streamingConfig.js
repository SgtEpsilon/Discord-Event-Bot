const Storage = require('../utils/storage');
const path = require('path');

/**
Streaming Configuration Service
Manages per-guild streaming notification settings
*/
class StreamingConfigManager {
  constructor(configPath) {
    this.storage = new Storage(configPath || path.join(__dirname, '../../data/streaming-config.json'));
    this.configs = {};
    this.load();
  }

  /**
  Load all guild configurations from storage
  */
  load() {
    try {
      this.configs = this.storage.getAllAsObject();
      console.log(`Loaded streaming configurations for ${Object.keys(this.configs).length} guilds`);
    } catch (error) {
      console.error('Error loading streaming config:', error);
      this.configs = {};
    }
  }

  /**
  Save configurations to storage
  */
  save() {
    try {
      this.storage.save(this.configs);
    } catch (error) {
      console.error('Error saving streaming config:', error);
      throw error;
    }
  }

  /**
  Get configuration for a specific guild
  @param {string} guildId - Discord guild ID
  @returns {Object} Guild configuration or transient default config
  */
  getGuildConfig(guildId) {
    if (!this.configs[guildId]) {
      return this.createDefaultConfig();
    }
    return this.configs[guildId];
  }

  /**
  Create default configuration for a new guild
  @returns {Object} Default configuration object
  */
  createDefaultConfig() {
    return {
      notificationChannelId: null,
      guildName: null,  // 👈 CRITICAL: Store guild name for web UI
      twitch: {
        enabled: false,
        streamers: [],
        message: '🔴 {username} is live!'
      },
      youtube: {
        enabled: false,
        channels: [],
        message: '📺 {channel} uploaded!'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
  Set guild name for configuration
  @param {string} guildId - Discord guild ID
  @param {string} guildName - Guild display name
  @returns {Object} Updated config
  */
  setGuildName(guildId, guildName) {  // 👈 CRITICAL: Method to set guild name
    let config = this.configs[guildId];
    if (!config) {
      config = this.createDefaultConfig();
    }
    config.guildName = guildName;
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Set notification channel for a guild
  @param {string} guildId - Discord guild ID
  @param {string} channelId - Discord channel ID
  @returns {Object} Updated guild configuration
  */
  setNotificationChannel(guildId, channelId) {
    let config = this.configs[guildId];
    if (!config) {
      config = this.createDefaultConfig();
    }
    config.notificationChannelId = channelId;
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Get notification channel for a guild
  @param {string} guildId - Discord guild ID
  @returns {string|null} Channel ID or null if not set
  */
  getNotificationChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.notificationChannelId;
  }

  /**
  Enable Twitch monitoring for a guild
  @param {string} guildId - Discord guild ID
  @param {Array<string>} streamers - Array of Twitch usernames
  @param {string} message - Custom notification message
  @returns {Object} Updated guild configuration
  */
  enableTwitch(guildId, streamers, message) {
    let config = this.configs[guildId];
    if (!config) {
      config = this.createDefaultConfig();
    }
    config.twitch = {
      enabled: true,
      streamers: streamers || [],
      message: message || config.twitch.message
    };
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Disable Twitch monitoring for a guild
  @param {string} guildId - Discord guild ID
  @returns {Object} Updated guild configuration
  */
  disableTwitch(guildId) {
    const config = this.configs[guildId];
    if (config && config.twitch) {
      config.twitch.enabled = false;
      config.updatedAt = new Date().toISOString();
      this.save();
    }
    return config || this.createDefaultConfig();
  }

  /**
  Enable YouTube monitoring for a guild
  @param {string} guildId - Discord guild ID
  @param {Array<string>} channels - Array of YouTube channel IDs/URLs
  @param {string} message - Custom notification message
  @returns {Object} Updated guild configuration
  */
  enableYouTube(guildId, channels, message) {
    let config = this.configs[guildId];
    if (!config) {
      config = this.createDefaultConfig();
    }
    config.youtube = {
      enabled: true,
      channels: channels || [],
      message: message || config.youtube.message
    };
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Disable YouTube monitoring for a guild
  @param {string} guildId - Discord guild ID
  @returns {Object} Updated guild configuration
  */
  disableYouTube(guildId) {
    const config = this.configs[guildId];
    if (config && config.youtube) {
      config.youtube.enabled = false;
      config.updatedAt = new Date().toISOString();
      this.save();
    }
    return config || this.createDefaultConfig();
  }

  /**
  Get all guild configurations
  @returns {Object} All guild configurations
  */
  getAllGuildConfigs() {
    return { ...this.configs };
  }

  /**
  Delete configuration for a guild (cleanup on bot removal)
  @param {string} guildId - Discord guild ID
  */
  deleteGuildConfig(guildId) {
    if (this.configs[guildId]) {
      delete this.configs[guildId];
      this.save();
      console.log(`Deleted streaming config for guild: ${guildId}`);
    }
  }
}

module.exports = StreamingConfigManager;