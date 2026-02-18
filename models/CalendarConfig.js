// src/models/CalendarConfig.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CalendarConfig = sequelize.define('CalendarConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  calendarId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  credentials: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'calendar_config'
});

module.exports = CalendarConfig;