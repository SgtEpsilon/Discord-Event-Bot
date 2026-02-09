// src/services/streamingConfig.js
const Storage = require('../utils/storage');

class StreamingConfigManager {
  constructor(filePath) {
    this.storage = new Storage(filePath);
  }

  /**
   * Get guild streaming configuration
   */
  getGuildConfig(guildId) {
    let guildConfig = this.storage.get(guildId);
    
    if (!guildConfig) {
      guildConfig = this.createDefaultConfig();
      this.storage.set(guildId, guildConfig);
    }
    
    return guildConfig;
  }

  /**
   * Create default streaming configuration
   */
  createDefaultConfig() {
    return {
      notificationChannelId: null,
      twitch: {
        enabled: false,
        streamers: [], // Array of usernames
        message: "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}",
        customMessages: {} // username -> custom message
      },
      youtube: {
        enabled: false,
        channels: [], // Array of channel IDs
        message: "📺 {channel} just uploaded a new video!\n**{title}**"
      }
    };
  }

  /**
   * Set notification channel for guild
   */
  setNotificationChannel(guildId, channelId) {
    const config = this.getGuildConfig(guildId);
    config.notificationChannelId = channelId;
    this.storage.set(guildId, config);
    return config;
  }

  /**
   * Add Twitch streamer
   */
  addTwitchStreamer(guildId, username, customMessage = null) {
    const config = this.getGuildConfig(guildId);
    
    if (!config.twitch.streamers.includes(username)) {
      config.twitch.streamers.push(username);
    }
    
    if (customMessage) {
      config.twitch.customMessages[username] = customMessage;
    }
    
    config.twitch.enabled = true;
    this.storage.set(guildId, config);
    return config;
  }

  /**
   * Remove Twitch streamer
   */
  removeTwitchStreamer(guildId, username) {
    const config = this.getGuildConfig(guildId);
    const index = config.twitch.streamers.indexOf(username);
    
    if (index !== -1) {
      config.twitch.streamers.splice(index, 1);
    }
    
    if (config.twitch.customMessages[username]) {
      delete config.twitch.customMessages[username];
    }
    
    if (config.twitch.streamers.length === 0) {
      config.twitch.enabled = false;
    }
    
    this.storage.set(guildId, config);
    return config;
  }

  /**
   * Add YouTube channel
   */
  addYouTubeChannel(guildId, channelId) {
    const config = this.getGuildConfig(guildId);
    
    if (!config.youtube.channels.includes(channelId)) {
      config.youtube.channels.push(channelId);
    }
    
    config.youtube.enabled = true;
    this.storage.set(guildId, config);
    return config;
  }

  /**
   * Remove YouTube channel
   */
  removeYouTubeChannel(guildId, channelId) {
    const config = this.getGuildConfig(guildId);
    const index = config.youtube.channels.indexOf(channelId);
     
    if (index !== -1) {
      config.youtube.channels.splice(index, 1);
    }
    
    if (config.youtube.channels.length === 0) {
      config.youtube.enabled = false;
    }
    
    this.storage.set(guildId, config);
    return config;
  }

  /**
   * Get all guilds with streaming enabled
   */
  getAllGuildConfigs() {
    return this.storage.getAllAsObject();
  }

  /**
   * Delete guild config
   */
  deleteGuildConfig(guildId) {
    return this.storage.delete(guildId);
  }
}

module.exports = StreamingConfigManager;