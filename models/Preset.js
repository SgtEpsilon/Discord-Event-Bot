// src/models/Preset.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Preset = sequelize.define('Preset', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    validate: {
      is: /^[a-z0-9-]+$/
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  }
}, {
  tableName: 'presets'
});

module.exports = Preset;