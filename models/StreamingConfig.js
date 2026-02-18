// src/models/StreamingConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StreamingConfig = sequelize.define('StreamingConfig', {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  guildName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notificationChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twitchEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twitchStreamers: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('twitchStreamers');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('twitchStreamers', JSON.stringify(value));
    }
  },
  twitchMessage: {
    type: DataTypes.TEXT,
    defaultValue: '🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}'
  },
  twitchCustomMessages: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const rawValue = this.getDataValue('twitchCustomMessages');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('twitchCustomMessages', JSON.stringify(value));
    }
  },
  youtubeEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  youtubeChannels: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('youtubeChannels');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('youtubeChannels', JSON.stringify(value));
    }
  },
  youtubeMessage: {
    type: DataTypes.TEXT,
    defaultValue: '📺 {channel} just uploaded a new video!\n**{title}**'
  }
}, {
  tableName: 'streaming_config'
});

module.exports = StreamingConfig;