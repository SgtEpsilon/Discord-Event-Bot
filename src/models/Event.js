// src/models/Event.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('dateTime');
      return rawValue ? new Date(rawValue).toISOString() : null;
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  roles: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('roles');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('roles', JSON.stringify(value));
    }
  },
  signups: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    get() {
      const rawValue = this.getDataValue('signups');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('signups', JSON.stringify(value));
    }
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: 'unknown'
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  calendarLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  calendarEventId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  calendarSource: {
    type: DataTypes.STRING,
    allowNull: true
  },
  calendarSourceId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
}, {
  tableName: 'events',
  indexes: [
    { fields: ['guildId'] },
    { fields: ['dateTime'] },
    { fields: ['calendarSourceId'] }
  ]
});

module.exports = Event;