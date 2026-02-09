const Storage = require('../utils/storage');
const path = require('path');

/**
Events Configuration Service
Manages per-guild event settings including designated event channels
*/
class EventsConfig {
  constructor(configPath) {
    this.storage = new Storage(configPath || path.join(__dirname, '../../data/events-config.json'));
    this.configs = {};
    this.load();
  }

  /**
  Load all guild configurations from storage
  */
  load() {
    try {
      this.configs = this.storage.getAllAsObject();
      console.log(`Loaded event configurations for ${Object.keys(this.configs).length} guilds`);
    } catch (error) {
      console.error('Error loading events config:', error);
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
      console.error('Error saving events config:', error);
      throw error;
    }
  }

  /**
  Get configuration for a specific guild
  @param {string} guildId - Discord guild ID
  @returns {Object} Guild configuration or transient default config
  */
  getGuildConfig(guildId) {
    // Return transient default without mutating this.configs on read
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
      eventChannelId: null,
      guildName: null,  // 👈 CRITICAL: Store guild name for web UI
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
  Set the designated event channel for a guild
  @param {string} guildId - Discord guild ID
  @param {string} channelId - Discord channel ID
  @returns {Object} Updated guild configuration
  */
  setEventChannel(guildId, channelId) {
    // Only write-path: create and persist entry
    let config = this.configs[guildId];
    if (!config) {
      config = this.createDefaultConfig();
    }
    config.eventChannelId = channelId;
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Get the designated event channel for a guild
  @param {string} guildId - Discord guild ID
  @returns {string|null} Channel ID or null if not set
  */
  getEventChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.eventChannelId;
  }

  /**
  Remove event channel configuration for a guild
  @param {string} guildId - Discord guild ID
  @returns {Object} Updated guild configuration
  */
  removeEventChannel(guildId) {
    const config = this.configs[guildId];
    if (!config) {
      // No config exists, nothing to remove
      return this.createDefaultConfig();
    }
    config.eventChannelId = null;
    config.updatedAt = new Date().toISOString();
    this.configs[guildId] = config;
    this.save();
    return config;
  }

  /**
  Check if a guild has an event channel configured
  @param {string} guildId - Discord guild ID
  @returns {boolean} True if event channel is set
  */
  hasEventChannel(guildId) {
    // Check actual stored config, not transient default
    const config = this.configs[guildId];
    return config?.eventChannelId !== null && config?.eventChannelId !== undefined;
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
      console.log(`Deleted event config for guild: ${guildId}`);
    }
  }

  /**
  Get statistics about event configurations
  @returns {Object} Statistics object
  */
  getStats() {
    const totalGuilds = Object.keys(this.configs).length;
    const guildsWithChannel = Object.values(this.configs).filter(
      config => config.eventChannelId !== null
    ).length;
    return {
      totalGuilds,
      guildsWithChannel,
      guildsWithoutChannel: totalGuilds - guildsWithChannel
    };
  }
}

module.exports = EventsConfig;