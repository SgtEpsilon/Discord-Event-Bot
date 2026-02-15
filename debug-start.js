#!/usr/bin/env node
// debug-start.js - Start bot with detailed logging

console.log('🔍 Starting Discord Event Bot in DEBUG mode...\n');

// Load environment variables
require('dotenv').config();

console.log('1️⃣  Environment Check:');
console.log(`   DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? '✅ Set (length: ' + process.env.DISCORD_TOKEN.length + ')' : '❌ NOT SET'}`);
console.log(`   WEB_PORT: ${process.env.WEB_PORT || '3000 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);

console.log('2️⃣  Loading bot configuration...');
try {
  const { config, validateConfig } = require('./src/config/index');
  console.log('   ✅ Config loaded\n');
  
  console.log('3️⃣  Validating configuration...');
  try {
    validateConfig();
    console.log('   ✅ Config validated\n');
  } catch (error) {
    console.error('   ❌ Config validation failed:', error.message);
    process.exit(1);
  }
  
  console.log('4️⃣  Testing database connection...');
  const { testConnection, initializeDatabase } = require('./src/config/database');
  
  testConnection().then(async (connected) => {
    if (connected) {
      console.log('   ✅ Database connected\n');
      
      console.log('5️⃣  Initializing database...');
      await initializeDatabase();
      console.log('   ✅ Database initialized\n');
      
      console.log('6️⃣  Starting Discord client...');
      require('./src/bot');
      console.log('   ✅ Bot script loaded\n');
      console.log('✅ Bot is now running! Press Ctrl+C to stop.\n');
      
    } else {
      console.error('   ❌ Database connection failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('   ❌ Database error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed to load bot:', error.message);
  console.error('\nFull error stack:');
  console.error(error.stack);
  process.exit(1);
}

// Keep process alive and show status
setInterval(() => {
  const uptime = Math.floor(process.uptime());
  process.stdout.write(`\r⏱️  Uptime: ${uptime}s | Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB   `);
}, 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Catch uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});