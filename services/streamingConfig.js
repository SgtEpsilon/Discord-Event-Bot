// src/services/streamingConfig.js
const { StreamingConfig } = require('../models');

class StreamingConfigManager {
  constructor(filePath) {
    // filePath parameter kept for backward compatibility but not used
  }

  /**
   * Get guild streaming configuration
   */
  async getGuildConfig(guildId) {
    let config = await StreamingConfig.findByPk(guildId);

    if (!config) {
      config = await this.createDefaultConfig(guildId);
    }

    return {
      notificationChannelId: config.notificationChannelId,
      guildName: config.guildName,
      twitch: {
        enabled: config.twitchEnabled,
        streamers: config.twitchStreamers,
        message: config.twitchMessage,
        customMessages: config.twitchCustomMessages
      },
      youtube: {
        enabled: config.youtubeEnabled,
        channels: config.youtubeChannels,
        message: config.youtubeMessage
      },
      createdAt: config.createdAt?.toISOString(),
      updatedAt: config.updatedAt?.toISOString()
    };
  }

  /**
   * Create default streaming configuration
   */
  async createDefaultConfig(guildId) {
    const config = await StreamingConfig.create({
      guildId,
      notificationChannelId: null,
      twitchEnabled: false,
      twitchStreamers: [],
      twitchMessage: "🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}",
      twitchCustomMessages: {},
      youtubeEnabled: false,
      youtubeChannels: [],
      youtubeMessage: "📺 {channel} just uploaded a new video!\n**{title}**"
    });

    return config;
  }

  /**
   * Set notification channel for guild
   */
  async setNotificationChannel(guildId, channelId) {
    let config = await StreamingConfig.findByPk(guildId);

    if (!config) {
      config = await this.createDefaultConfig(guildId);
    }

    await config.update({ notificationChannelId: channelId });

    return this.getGuildConfig(guildId);
  }

  /**
   * Add Twitch streamer
   */
  async addTwitchStreamer(guildId, username, customMessage = null) {
    let config = await StreamingConfig.findByPk(guildId);

    if (!config) {
      config = await this.createDefaultConfig(guildId);
    }

    const streamers = config.twitchStreamers;
    const customMessages = config.twitchCustomMessages;

    if (!streamers.includes(username)) {
      streamers.push(username);
    }

    if (customMessage) {
      customMessages[username] = customMessage;
    }

    await config.update({
      twitchStreamers: streamers,
      twitchCustomMessages: customMessages,
      twitchEnabled: true
    });

    return this.getGuildConfig(guildId);
  }

  /**
   * Remove Twitch streamer
   */
  async removeTwitchStreamer(guildId, username) {
    const config = await StreamingConfig.findByPk(guildId);
    if (!config) return null;

    const streamers = config.twitchStreamers.filter(s => s !== username);
    const customMessages = config.twitchCustomMessages;
    
    if (customMessages[username]) {
      delete customMessages[username];
    }

    await config.update({
      twitchStreamers: streamers,
      twitchCustomMessages: customMessages,
      twitchEnabled: streamers.length > 0
    });

    return this.getGuildConfig(guildId);
  }

  /**
   * Add YouTube channel
   */
  async addYouTubeChannel(guildId, channelId) {
    let config = await StreamingConfig.findByPk(guildId);

    if (!config) {
      config = await this.createDefaultConfig(guildId);
    }

    const channels = config.youtubeChannels;

    if (!channels.includes(channelId)) {
      channels.push(channelId);
    }

    await config.update({
      youtubeChannels: channels,
      youtubeEnabled: true
    });

    return this.getGuildConfig(guildId);
  }

  /**
   * Remove YouTube channel
   */
  async removeYouTubeChannel(guildId, channelId) {
    const config = await StreamingConfig.findByPk(guildId);
    if (!config) return null;

    const channels = config.youtubeChannels.filter(c => c !== channelId);

    await config.update({
      youtubeChannels: channels,
      youtubeEnabled: channels.length > 0
    });

    return this.getGuildConfig(guildId);
  }

  /**
   * Get all guilds with streaming enabled
   */
  async getAllGuildConfigs() {
    const configs = await StreamingConfig.findAll();
    const configsObj = {};

    for (const config of configs) {
      configsObj[config.guildId] = await this.getGuildConfig(config.guildId);
    }

    return configsObj;
  }

  /**
   * Delete guild config
   */
  async deleteGuildConfig(guildId) {
    const config = await StreamingConfig.findByPk(guildId);
    if (config) {
      await config.destroy();
      return true;
    }
    return false;
  }
}

module.exports = StreamingConfigManager;