// src/models/AutoSyncConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AutoSyncConfig = sequelize.define('AutoSyncConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'autosync_config'
});

module.exports = AutoSyncConfig;