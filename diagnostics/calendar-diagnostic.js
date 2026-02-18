#!/usr/bin/env node
// calendar-diagnostic.js - Diagnose Calendar Import Issues

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     📅 Calendar Import Diagnostic Tool                ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  try {
    // Initialize database
    const { testConnection, initializeDatabase } = require('../src/config/database');
    console.log('🔌 Connecting to database...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error(colors.red + '❌ Database connection failed' + colors.reset);
      process.exit(1);
    }
    
    await initializeDatabase();
    console.log(colors.green + '✅ Database connected' + colors.reset);
    console.log('');

    // Load calendar configs from database
    const { CalendarConfig, Event } = require('../src/models');
    const { Op } = require('sequelize');
    const configs = await CalendarConfig.findAll();
    
    if (configs.length === 0) {
      console.log(colors.yellow + '⚠️  No calendars configured in database' + colors.reset);
      console.log('');
      console.log('Add calendars via the web UI: http://localhost:' + (process.env.WEB_PORT || 3000));
      console.log('');
      process.exit(0);
    }

    console.log(colors.bright + `Found ${configs.length} calendar(s) in database:` + colors.reset);
    console.log('');

    const CalendarService = require('../src/services/calendar');
    const { config } = require('../src/config');
    
    for (let i = 0; i < configs.length; i++) {
      const cal = configs[i];
      const calNum = i + 1;
      
      console.log(colors.cyan + `━━━ Calendar ${calNum}: ${cal.name} ━━━` + colors.reset);
      console.log(`ID: ${colors.dim}${cal.calendarId}${colors.reset}`);
      
      const isIcal = cal.calendarId.startsWith('http://') || cal.calendarId.startsWith('https://');
      console.log(`Type: ${isIcal ? '🔗 iCal URL' : '📅 Google Calendar'}`);
      console.log('');

      const calendarService = new CalendarService(config.google.credentials, [{
        name: cal.name,
        id: cal.calendarId
      }]);

      try {
        console.log('🔍 Testing connection...');
        const connectionOk = await calendarService.testConnection();
        
        if (!connectionOk) {
          console.log(colors.red + '❌ Connection failed' + colors.reset);
          console.log('');
          continue;
        }
        
        console.log(colors.green + '✅ Connection successful' + colors.reset);
        console.log('');

        // Try to fetch events
        console.log('📥 Fetching events (next 31 days)...');
        const result = await calendarService.syncEvents(744); // 31 days in hours
        
        if (!result.success) {
          console.log(colors.red + `❌ Sync failed: ${result.message}` + colors.reset);
          console.log('');
          continue;
        }

        console.log(colors.green + `✅ Found ${result.events.length} event(s)` + colors.reset);
        console.log('');

        if (result.events.length > 0) {
          console.log(colors.bright + 'Event samples:' + colors.reset);
          result.events.slice(0, 3).forEach((event, idx) => {
            const title = event.calendarEvent.summary || 'Untitled';
            const start = new Date(event.calendarEvent.start.dateTime);
            console.log(`  ${idx + 1}. ${title}`);
            console.log(`     ${colors.dim}${start.toLocaleString()}${colors.reset}`);
          });
          
          if (result.events.length > 3) {
            console.log(`  ${colors.dim}... and ${result.events.length - 3} more${colors.reset}`);
          }
        } else {
          console.log(colors.yellow + '⚠️  No events found in the next 31 days' + colors.reset);
          console.log(colors.dim + '   This could be normal if no events are scheduled' + colors.reset);
        }

        console.log('');

        // Check how many of this calendar's events are in the database
        console.log('💾 Checking database imports...');
        const sourceIdPrefix = `${cal.calendarId}::`;
        const importedEvents = await Event.findAll({
          where: {
            calendarSourceId: {
              [Op.like]: `${sourceIdPrefix}%`
            }
          }
        });

        console.log(colors.green + `✅ ${importedEvents.length} event(s) in database from this calendar` + colors.reset);
        
        if (importedEvents.length > 0) {
          console.log(colors.bright + 'Sample imported events:' + colors.reset);
          importedEvents.slice(0, 3).forEach((event, idx) => {
            console.log(`  ${idx + 1}. ${event.title}`);
            console.log(`     ${colors.dim}${new Date(event.dateTime).toLocaleString()}${colors.reset}`);
          });
          
          if (importedEvents.length > 3) {
            console.log(`  ${colors.dim}... and ${importedEvents.length - 3} more${colors.reset}`);
          }
        }

        console.log('');

      } catch (error) {
        console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
        console.log('');
        if (error.stack) {
          console.log(colors.dim + 'Stack trace:' + colors.reset);
          console.log(colors.dim + error.stack + colors.reset);
          console.log('');
        }
      }
    }

    // Summary
    console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    console.log('');
    console.log(colors.bright + '📊 Summary' + colors.reset);
    console.log('');

    const { Op } = require('sequelize');
    const totalEvents = await Event.count();
    const calendarEvents = await Event.count({
      where: { calendarSourceId: { [Op.not]: null } }
    });

    console.log(`Total events in database: ${colors.bright}${totalEvents}${colors.reset}`);
    console.log(`Calendar-imported events: ${colors.bright}${calendarEvents}${colors.reset}`);
    console.log(`Manual/Discord events: ${colors.bright}${totalEvents - calendarEvents}${colors.reset}`);
    console.log('');

    console.log(colors.green + '✅ Diagnostic complete!' + colors.reset);
    console.log('');

    console.log(colors.yellow + '💡 Recommendations:' + colors.reset);
    console.log('');
    console.log('1. If a calendar shows "Connection failed":');
    console.log('   • For iCal URLs: Check the URL is accessible');
    console.log('   • For Google Calendar: Verify credentials and permissions');
    console.log('');
    console.log('2. If "Found 0 events" but you expect events:');
    console.log('   • Check events are within next 31 days');
    console.log('   • Verify events have specific times (all-day events are skipped)');
    console.log('');
    console.log('3. If events found but not in database:');
    console.log('   • Run manual sync: /sync in Discord');
    console.log('   • Check auto-sync is enabled: /autosync');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error(colors.red + '❌ Diagnostic failed:' + colors.reset, error.message);
    console.error('');
    console.error(error.stack);
    process.exit(1);
  }
}

main();
