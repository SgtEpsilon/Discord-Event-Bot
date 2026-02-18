// src/models/UserOAuth.js - Store user OAuth tokens
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserOAuth = sequelize.define('UserOAuth', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Internal user ID (could be Discord user ID or web user ID)'
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'google',
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scopes: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('scopes');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('scopes', JSON.stringify(value));
    }
  }
}, {
  tableName: 'user_oauth',
  indexes: [
    { fields: ['userId'] },
    { fields: ['email'] }
  ]
});

module.exports = UserOAuth;
