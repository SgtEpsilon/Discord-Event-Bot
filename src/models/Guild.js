// src/models/Guild.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Guild model — represents a Discord server the bot has joined.
 *
 * Fields mirror what was previously stored in data/guilds.json,
 * with additional columns for per-guild configuration that was
 * previously scattered across other JSON files (channels.json, etc.).
 */
const Guild = sequelize.define('Guild', {
  // Discord snowflake ID — the primary key (string, not auto-increment)
  id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    allowNull: false,
    comment: 'Discord guild (server) snowflake ID'
  },

  // Human-readable server name, kept in sync when the bot sees a nameUpdate event
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Unknown Server'
  },

  // Approximate member count; updated when the bot fetches guild info
  memberCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },

  // The Discord channel ID where event announcements are posted
  eventChannelId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Channel ID for event announcement posts'
  },

  // The Discord channel ID where streaming notifications are posted
  streamingChannelId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Channel ID for Twitch / YouTube notifications'
  },

  // Whether this guild is currently active (bot is still a member)
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'guilds',
  timestamps: true,   // adds createdAt + updatedAt automatically
  comment: 'Discord servers (guilds) the bot is a member of'
});

module.exports = Guild;
