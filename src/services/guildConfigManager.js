// src/services/guildConfigManager.js
const Storage = require('../utils/storage');
const path = require('path');

/**
 * Unified Guild Configuration Manager
 * Consolidates event channels, streaming config, and notification settings
 */
class GuildConfigManager {
  constructor(configPath) {
    this.storage = new Storage(configPath || path.join(__dirname, '../../data/guild-config.json'));
    this.configs = {};
    this.load();
  }

  /**
   * Load all guild configurations from storage
   */
  load() {
    try {
      this.configs = this.storage.getAllAsObject();
      console.log(`[GuildConfig] Loaded configurations for ${Object.keys(this.configs).length} guilds`);
    } catch (error) {
      console.error('[GuildConfig] Error loading configs:', error);
      this.configs = {};
    }
  }

  /**
   * Save configurations to storage
   */
  save() {
    try {
      this.storage.save(this.configs);
    } catch (error) {
      console.error('[GuildConfig] Error saving configs:', error);
      throw error;
    }
  }

  /**
   * Create default configuration for a new guild
   */
  createDefaultConfig() {
    return {
      guildId: null,
      guildName: null,
      eventChannel: {
        channelId: null,
        enabled: false
      },
      notifications: {
        channelId: null,
        enabled: false
      },
      twitch: {
        enabled: false,
        streamers: [],
        customMessages: {}
      },
      youtube: {
        enabled: false,
        channels: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get configuration for a specific guild (read-only, no mutation)
   */
  getGuildConfig(guildId) {
    if (!this.configs[guildId]) {
      return this.createDefaultConfig();
    }
    return this.configs[guildId];
  }

  /**
   * Ensure guild config exists (write-path only)
   */
  ensureGuildConfig(guildId, guildName = null) {
    if (!this.configs[guildId]) {
      this.configs[guildId] = this.createDefaultConfig();
      this.configs[guildId].guildId = guildId;
      this.configs[guildId].guildName = guildName;
      this.save();
    }
    return this.configs[guildId];
  }

  /**
   * Set guild name
   */
  setGuildName(guildId, guildName) {
    const config = this.ensureGuildConfig(guildId, guildName);
    config.guildName = guildName;
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  // ==========================================
  // EVENT CHANNEL METHODS
  // ==========================================

  /**
   * Set event channel for a guild
   */
  setEventChannel(guildId, channelId) {
    const config = this.ensureGuildConfig(guildId);
    config.eventChannel.channelId = channelId;
    config.eventChannel.enabled = true;
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Get event channel for a guild
   */
  getEventChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.eventChannel.enabled ? config.eventChannel.channelId : null;
  }

  /**
   * Remove event channel for a guild
   */
  removeEventChannel(guildId) {
    const config = this.configs[guildId];
    if (config) {
      config.eventChannel.channelId = null;
      config.eventChannel.enabled = false;
      config.updatedAt = new Date().toISOString();
      this.save();
    }
    return config || this.createDefaultConfig();
  }

  /**
   * Check if guild has event channel configured
   */
  hasEventChannel(guildId) {
    const config = this.configs[guildId];
    return config?.eventChannel?.enabled && config?.eventChannel?.channelId !== null;
  }

  // ==========================================
  // NOTIFICATION CHANNEL METHODS
  // ==========================================

  /**
   * Set notification channel for streaming alerts
   */
  setNotificationChannel(guildId, channelId) {
    const config = this.ensureGuildConfig(guildId);
    config.notifications.channelId = channelId;
    config.notifications.enabled = true;
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Get notification channel for a guild
   */
  getNotificationChannel(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.notifications.enabled ? config.notifications.channelId : null;
  }

  // ==========================================
  // TWITCH METHODS
  // ==========================================

  /**
   * Add Twitch streamer to monitor
   */
  addTwitchStreamer(guildId, username, customMessage = null) {
    const config = this.ensureGuildConfig(guildId);
    
    if (!config.twitch.streamers.includes(username)) {
      config.twitch.streamers.push(username);
    }
    
    if (customMessage) {
      config.twitch.customMessages[username] = customMessage;
    }
    
    config.twitch.enabled = true;
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Remove Twitch streamer
   */
  removeTwitchStreamer(guildId, username) {
    const config = this.configs[guildId];
    if (!config) return this.createDefaultConfig();
    
    config.twitch.streamers = config.twitch.streamers.filter(s => s !== username);
    delete config.twitch.customMessages[username];
    
    if (config.twitch.streamers.length === 0) {
      config.twitch.enabled = false;
    }
    
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Get Twitch streamers for a guild
   */
  getTwitchStreamers(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.twitch.streamers || [];
  }

  // ==========================================
  // YOUTUBE METHODS
  // ==========================================

  /**
   * Add YouTube channel to monitor
   */
  addYouTubeChannel(guildId, channelId) {
    const config = this.ensureGuildConfig(guildId);
    
    if (!config.youtube.channels.includes(channelId)) {
      config.youtube.channels.push(channelId);
    }
    
    config.youtube.enabled = true;
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Remove YouTube channel
   */
  removeYouTubeChannel(guildId, channelId) {
    const config = this.configs[guildId];
    if (!config) return this.createDefaultConfig();
    
    config.youtube.channels = config.youtube.channels.filter(c => c !== channelId);
    
    if (config.youtube.channels.length === 0) {
      config.youtube.enabled = false;
    }
    
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Get YouTube channels for a guild
   */
  getYouTubeChannels(guildId) {
    const config = this.getGuildConfig(guildId);
    return config.youtube.channels || [];
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  /**
   * Update entire guild configuration at once
   */
  updateGuildConfig(guildId, updates) {
    const config = this.ensureGuildConfig(guildId);
    
    // Merge updates while preserving structure
    if (updates.eventChannel) {
      config.eventChannel = { ...config.eventChannel, ...updates.eventChannel };
    }
    if (updates.notifications) {
      config.notifications = { ...config.notifications, ...updates.notifications };
    }
    if (updates.twitch) {
      config.twitch = { ...config.twitch, ...updates.twitch };
    }
    if (updates.youtube) {
      config.youtube = { ...config.youtube, ...updates.youtube };
    }
    if (updates.guildName) {
      config.guildName = updates.guildName;
    }
    
    config.updatedAt = new Date().toISOString();
    this.save();
    return config;
  }

  /**
   * Get all guild configurations
   */
  getAllGuildConfigs() {
    return { ...this.configs };
  }

  /**
   * Delete configuration for a guild (cleanup on bot removal)
   */
  deleteGuildConfig(guildId) {
    if (this.configs[guildId]) {
      delete this.configs[guildId];
      this.save();
      console.log(`[GuildConfig] Deleted config for guild: ${guildId}`);
    }
  }

  /**
   * Get statistics about configurations
   */
  getStats() {
    const totalGuilds = Object.keys(this.configs).length;
    const guildsWithEventChannel = Object.values(this.configs).filter(
      c => c.eventChannel?.enabled
    ).length;
    const guildsWithNotifications = Object.values(this.configs).filter(
      c => c.notifications?.enabled
    ).length;
    const guildsWithTwitch = Object.values(this.configs).filter(
      c => c.twitch?.enabled
    ).length;
    const guildsWithYouTube = Object.values(this.configs).filter(
      c => c.youtube?.enabled
    ).length;
    
    return {
      totalGuilds,
      guildsWithEventChannel,
      guildsWithNotifications,
      guildsWithTwitch,
      guildsWithYouTube
    };
  }
}

module.exports = GuildConfigManager;
