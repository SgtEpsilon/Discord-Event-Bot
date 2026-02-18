// src/config/database.js
const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
const DB_LOGGING = process.env.DB_LOGGING === 'true' ? console.log : false;

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: DB_LOGGING,
  
  // Connection pool configuration
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // SQLite specific options
  dialectOptions: {
    // Enable foreign keys
    foreignKeys: true
  },
  
  // Model options
  define: {
    // Use camelCase for automatically added timestamp fields
    underscored: false,
    // Add createdAt and updatedAt timestamps
    timestamps: true,
    // Don't delete rows, just mark them as deleted
    paranoid: false,
    // Use singular table names
    freezeTableName: true
  }
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('[Database] ✅ Connection established successfully');
    return true;
  } catch (error) {
    console.error('[Database] ❌ Unable to connect:', error.message);
    return false;
  }
}

/**
 * Initialize database (create tables)
 */
async function initializeDatabase() {
  try {
    // Sync all models
    await sequelize.sync({ alter: false }); // Set to true for development to auto-update schema
    console.log('[Database] ✅ All models synchronized');
    return true;
  } catch (error) {
    console.error('[Database] ❌ Failed to sync models:', error.message);
    return false;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('[Database] Connection closed');
  } catch (error) {
    console.error('[Database] Error closing connection:', error.message);
  }
}

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  closeConnection
};