// src/models/EventsConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventsConfig = sequelize.define('EventsConfig', {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  eventChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guildName: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'events_config'
});

module.exports = EventsConfig;