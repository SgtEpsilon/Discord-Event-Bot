// src/services/eventsConfig.js
const { EventsConfig } = require('../models');

class EventsConfigService {
  constructor(configPath) {
    // configPath parameter kept for backward compatibility but not used
  }

  /**
   * Load all guild configurations (no-op for database version)
   */
  async load() {
    // Database auto-loads, nothing to do
    console.log('Events config using database backend');
  }

  /**
   * Save configurations (no-op for database version)
   */
  async save() {
    // Database auto-saves, nothing to do
  }

  /**
   * Get configuration for a specific guild
   */
  async getGuildConfig(guildId) {
    let config = await EventsConfig.findByPk(guildId);
    
    if (!config) {
      return this.createDefaultConfig();
    }

    return {
      eventChannelId: config.eventChannelId,
      guildName: config.guildName,
      createdAt: config.createdAt?.toISOString(),
      updatedAt: config.updatedAt?.toISOString()
    };
  }

  /**
   * Create default configuration
   */
  createDefaultConfig() {
    return {
      eventChannelId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Set event channel for a guild
   */
  async setEventChannel(guildId, channelId) {
    let config = await EventsConfig.findByPk(guildId);

    if (!config) {
      config = await EventsConfig.create({
        guildId,
        eventChannelId: channelId
      });
    } else {
      await config.update({ eventChannelId: channelId });
    }

    return {
      eventChannelId: config.eventChannelId,
      guildName: config.guildName,
      createdAt: config.createdAt?.toISOString(),
      updatedAt: config.updatedAt?.toISOString()
    };
  }

  /**
   * Get event channel for a guild
   */
  async getEventChannel(guildId) {
    const config = await EventsConfig.findByPk(guildId);
    return config?.eventChannelId || null;
  }

  /**
   * Remove event channel configuration
   */
  async removeEventChannel(guildId) {
    const config = await EventsConfig.findByPk(guildId);
    
    if (!config) {
      return this.createDefaultConfig();
    }

    await config.update({ eventChannelId: null });

    return {
      eventChannelId: null,
      guildName: config.guildName,
      createdAt: config.createdAt?.toISOString(),
      updatedAt: config.updatedAt?.toISOString()
    };
  }

  /**
   * Check if guild has event channel configured
   */
  async hasEventChannel(guildId) {
    const config = await EventsConfig.findByPk(guildId);
    return config?.eventChannelId !== null && config?.eventChannelId !== undefined;
  }

  /**
   * Get all guild configurations
   */
  async getAllGuildConfigs() {
    const configs = await EventsConfig.findAll();
    const configsObj = {};

    configs.forEach(config => {
      configsObj[config.guildId] = {
        eventChannelId: config.eventChannelId,
        guildName: config.guildName,
        createdAt: config.createdAt?.toISOString(),
        updatedAt: config.updatedAt?.toISOString()
      };
    });

    return configsObj;
  }

  /**
   * Delete configuration for a guild
   */
  async deleteGuildConfig(guildId) {
    const config = await EventsConfig.findByPk(guildId);
    if (config) {
      await config.destroy();
      console.log(`Deleted event config for guild: ${guildId}`);
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    const { Op } = require('sequelize');
    
    const totalGuilds = await EventsConfig.count();
    const guildsWithChannel = await EventsConfig.count({
      where: {
        eventChannelId: {
          [Op.not]: null
        }
      }
    });

    return {
      totalGuilds,
      guildsWithChannel,
      guildsWithoutChannel: totalGuilds - guildsWithChannel
    };
  }
}

module.exports = EventsConfigService;