#!/usr/bin/env node
// fix-calendar-sync.js - Quick fixes for calendar sync issues

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🔧 Calendar Sync Quick Fix                        ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // Step 1: Check database
  console.log('1️⃣  Checking database...');
  try {
    const { testConnection, initializeDatabase } = require('../src/config/database');
    const connected = await testConnection();
    if (!connected) {
      console.log(colors.red + '   ❌ Database not accessible' + colors.reset);
      console.log('   Fix: Check data/database.sqlite exists');
      return;
    }
    await initializeDatabase();
    console.log(colors.green + '   ✅ Database OK' + colors.reset);
  } catch (err) {
    console.log(colors.red + '   ❌ Database error: ' + err.message + colors.reset);
    return;
  }

  // Step 2: Check calendars
  console.log('');
  console.log('2️⃣  Checking calendars...');
  let dbCalendars = [];
  try {
    const { CalendarConfig } = require('../src/models');
    dbCalendars = await CalendarConfig.findAll();
    
    if (dbCalendars.length === 0) {
      console.log(colors.red + '   ❌ No calendars configured' + colors.reset);
      console.log('');
      console.log('   Fix:');
      console.log('   1. Go to http://localhost:' + (process.env.WEB_PORT || 3000));
      console.log('   2. Navigate to Google Calendar tab');
      console.log('   3. Add at least one calendar');
      return;
    }
    
    console.log(colors.green + `   ✅ Found ${dbCalendars.length} calendar(s)` + colors.reset);
    dbCalendars.forEach(cal => {
      const type = cal.calendarId.startsWith('http') ? 'iCal' : 'Google';
      console.log(`      • ${cal.name} (${type})`);
    });
  } catch (err) {
    console.log(colors.red + '   ❌ Calendar check failed: ' + err.message + colors.reset);
    return;
  }

  // Step 3: Restart bot
  console.log('');
  console.log('3️⃣  Restarting Discord bot...');
  try {
    await execAsync('pm2 restart discord-event-bot');
    console.log(colors.green + '   ✅ Bot restarted' + colors.reset);
    console.log('   ⏳ Waiting 5 seconds for bot to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.log(colors.yellow + '   ⚠️  Could not restart via PM2: ' + err.message + colors.reset);
    console.log('   Manual restart: pm2 restart discord-event-bot');
  }

  // Step 4: Trigger manual sync
  console.log('');
  console.log('4️⃣  Triggering manual calendar sync...');
  
  try {
    const CalendarService = require('../src/services/calendar');
    const { config } = require('../src/config');
    const { Event } = require('../src/models');
    const { Op } = require('sequelize');

    const calendarList = dbCalendars.map(cal => ({ name: cal.name, id: cal.calendarId }));
    const calendarService = new CalendarService(config.google.credentials, calendarList);
    const result = await calendarService.syncEvents(744); // 31 days
    
    if (!result.success) {
      console.log(colors.red + '   ❌ Sync failed: ' + result.message + colors.reset);
      return;
    }
    
    console.log(colors.green + `   ✅ Sync successful — found ${result.events.length} event(s)` + colors.reset);
    
    // Import new events to database
    let imported = 0;
    
    for (const eventData of result.events) {
      // Skip if already imported (calendarSourceId is unique)
      const exists = await Event.findOne({
        where: { calendarSourceId: eventData.calendarSourceId }
      });
      
      if (!exists) {
        await Event.create({
          id: `gcal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: eventData.calendarEvent.summary || 'Untitled Event',
          description: eventData.calendarEvent.description || '',
          dateTime: new Date(eventData.calendarEvent.start.dateTime),
          duration: eventData.duration || 60,
          maxParticipants: 0,
          roles: [],
          signups: {},
          createdBy: 'fix_sync',
          channelId: null,
          guildId: null,
          messageId: null,
          calendarLink: eventData.calendarEvent.htmlLink || null,
          calendarEventId: eventData.calendarEvent.id || null,
          calendarSource: eventData.calendarSource,
          calendarSourceId: eventData.calendarSourceId
        });
        imported++;
      }
    }
    
    console.log(colors.green + `   ✅ Imported ${imported} new event(s) to database` + colors.reset);
    if (imported === 0 && result.events.length > 0) {
      console.log(colors.yellow + '      (All events already existed in database)' + colors.reset);
    }
    
  } catch (err) {
    console.log(colors.red + '   ❌ Manual sync failed: ' + err.message + colors.reset);
    console.log('');
    console.log(colors.yellow + '   Stack trace:' + colors.reset);
    console.log(err.stack);
    return;
  }

  // Step 5: Verify
  console.log('');
  console.log('5️⃣  Verifying...');
  
  try {
    const { Event } = require('../src/models');
    const { Op } = require('sequelize');
    
    const calendarEvents = await Event.count({
      where: {
        calendarSourceId: { [Op.not]: null },
        dateTime: { [Op.gte]: new Date() }
      }
    });
    
    if (calendarEvents === 0) {
      console.log(colors.yellow + '   ⚠️  No future calendar events in database' + colors.reset);
      console.log('   Possible reasons:');
      console.log('   • Calendars have no events in the next 31 days');
      console.log('   • All events are all-day (skipped by the bot)');
      console.log('   • Calendar connection issue');
      console.log('   Run: node diagnostics/calendar-sync-debugger.js');
    } else {
      console.log(colors.green + `   ✅ Database has ${calendarEvents} future calendar event(s)` + colors.reset);
      console.log('');
      console.log(colors.green + colors.bright + '🎉 Calendar sync is working!' + colors.reset);
      console.log('');
      console.log('View events at: http://localhost:' + (process.env.WEB_PORT || 3000));
    }
    
  } catch (err) {
    console.log(colors.red + '   ❌ Verification failed: ' + err.message + colors.reset);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(colors.bright + '📋 Next Steps:' + colors.reset);
  console.log('');
  console.log('1. Check events in web UI:    ' + colors.cyan + 'http://localhost:' + (process.env.WEB_PORT || 3000) + colors.reset);
  console.log('2. Monitor background sync:   ' + colors.cyan + 'pm2 logs discord-event-bot' + colors.reset);
  console.log('3. Run full diagnostic:       ' + colors.cyan + 'node diagnostics/calendar-sync-debugger.js' + colors.reset);
  console.log('');
}

main().catch(err => {
  console.error('');
  console.error(colors.red + '❌ Fix failed: ' + err.message + colors.reset);
  console.error('');
  console.error(err.stack);
  process.exit(1);
});
