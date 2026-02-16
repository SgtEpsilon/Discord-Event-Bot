#!/usr/bin/env node
// calendar-sync-diagnostic.js - Diagnose calendar sync issues

require('dotenv').config();
const path = require('path');

async function runDiagnostics() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     📅 Calendar Sync Diagnostic Tool                  ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Step 1: Check database connection
  console.log('1️⃣  Checking database connection...');
  try {
    const { testConnection, initializeDatabase } = require('./src/config/database');
    const connected = await testConnection();
    
    if (!connected) {
      console.log('   ❌ Database connection failed!');
      console.log('   Fix: Check your database configuration\n');
      process.exit(1);
    }
    
    await initializeDatabase();
    console.log('   ✅ Database connected\n');
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}\n`);
    process.exit(1);
  }

  // Step 2: Check calendars in database
  console.log('2️⃣  Checking calendars in database...');
  try {
    const { CalendarConfig } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    
    if (calendars.length === 0) {
      console.log('   ❌ No calendars configured in database!');
      console.log('   Fix: Add calendars via web UI (http://localhost:3000)\n');
      process.exit(1);
    }
    
    console.log(`   ✅ Found ${calendars.length} calendar(s):\n`);
    calendars.forEach((cal, i) => {
      console.log(`   ${i + 1}. ${cal.name}`);
      console.log(`      ID: ${cal.calendarId}`);
      console.log(`      Type: ${cal.calendarId.startsWith('http') ? 'iCal URL' : 'Google Calendar'}`);
    });
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error loading calendars: ${error.message}\n`);
    process.exit(1);
  }

  // Step 3: Check Google Calendar credentials
  console.log('3️⃣  Checking Google Calendar credentials...');
  const credPath = process.env.GOOGLE_CALENDAR_CREDENTIALS || 
                   process.env.GOOGLE_CREDENTIALS ||
                   './data/calendar-credentials.json';
  
  const fs = require('fs');
  if (!fs.existsSync(credPath)) {
    console.log(`   ⚠️  Credentials file not found at: ${credPath}`);
    console.log('   Note: Only needed for Google Calendar API (not iCal URLs)\n');
  } else {
    try {
      const credContent = fs.readFileSync(credPath, 'utf8');
      const creds = JSON.parse(credContent);
      console.log('   ✅ Credentials file found and valid');
      console.log(`      Type: ${creds.type || 'unknown'}`);
      console.log(`      Project ID: ${creds.project_id || 'unknown'}\n`);
    } catch (error) {
      console.log(`   ❌ Invalid credentials file: ${error.message}\n`);
    }
  }

  // Step 4: Test calendar access
  console.log('4️⃣  Testing calendar access...');
  try {
    const { CalendarConfig } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    const CalendarService = require('./src/services/calendar');
    
    const calendarArray = calendars.map(c => ({
      name: c.name,
      id: c.calendarId
    }));
    
    const calendarService = new CalendarService(
      process.env.GOOGLE_CALENDAR_CREDENTIALS || process.env.GOOGLE_CREDENTIALS,
      calendarArray
    );
    
    const canConnect = await calendarService.testConnection();
    
    if (canConnect) {
      console.log('   ✅ Successfully connected to all calendars\n');
    } else {
      console.log('   ⚠️  Some calendars failed connection (see logs above)\n');
    }
  } catch (error) {
    console.log(`   ❌ Connection test failed: ${error.message}\n`);
  }

  // Step 5: Try fetching events
  console.log('5️⃣  Attempting to fetch events...');
  try {
    const { CalendarConfig } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    const CalendarService = require('./src/services/calendar');
    
    const calendarArray = calendars.map(c => ({
      name: c.name,
      id: c.calendarId
    }));
    
    const calendarService = new CalendarService(
      process.env.GOOGLE_CALENDAR_CREDENTIALS || process.env.GOOGLE_CREDENTIALS,
      calendarArray
    );
    
    console.log('   Fetching events from next 7 days...\n');
    const result = await calendarService.syncEvents(168); // 7 days
    
    if (!result.success) {
      console.log(`   ❌ Sync failed: ${result.message}\n`);
      process.exit(1);
    }
    
    console.log(`   ✅ Successfully fetched events!`);
    console.log(`      Total events found: ${result.events.length}`);
    console.log(`      Calendars: ${result.calendars ? result.calendars.join(', ') : 'N/A'}\n`);
    
    if (result.events.length === 0) {
      console.log('   ⚠️  No events found in the next 7 days');
      console.log('   Check:');
      console.log('   - Are there events in your calendar within the next 7 days?');
      console.log('   - Is the calendar shared with the service account?');
      console.log('   - Are the events all-day events? (These are filtered out)\n');
    } else {
      console.log('   📋 Events found:\n');
      result.events.slice(0, 5).forEach((event, i) => {
        const summary = event.calendarEvent.summary || 'Untitled';
        const start = event.calendarEvent.start?.dateTime;
        const source = event.calendarSource;
        console.log(`   ${i + 1}. ${summary}`);
        console.log(`      Start: ${start ? new Date(start).toLocaleString() : 'No time'}`);
        console.log(`      Source: ${source}`);
        console.log(`      Duration: ${event.duration} minutes`);
      });
      
      if (result.events.length > 5) {
        console.log(`   ... and ${result.events.length - 5} more\n`);
      } else {
        console.log('');
      }
    }
  } catch (error) {
    console.log(`   ❌ Error fetching events: ${error.message}`);
    console.log(`   Stack: ${error.stack}\n`);
    process.exit(1);
  }

  // Step 6: Check database for existing events
  console.log('6️⃣  Checking database for imported events...');
  try {
    const { Event } = require('./src/models');
    const allEvents = await Event.findAll({
      order: [['dateTime', 'DESC']],
      limit: 10
    });
    
    console.log(`   Found ${allEvents.length} events in database\n`);
    
    if (allEvents.length === 0) {
      console.log('   ⚠️  No events in database yet!');
      console.log('   This is the problem - events are not being imported.\n');
    } else {
      console.log('   Recent events in database:\n');
      allEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.title}`);
        console.log(`      Date: ${new Date(event.dateTime).toLocaleString()}`);
        console.log(`      Created by: ${event.createdBy}`);
        console.log(`      Calendar source: ${event.calendarSource || 'N/A'}`);
      });
      console.log('');
    }
    
    // Check for calendar-synced events specifically
    const calendarEvents = await Event.findAll({
      where: {
        calendarSource: { [require('sequelize').Op.not]: null }
      }
    });
    
    console.log(`   Calendar-synced events: ${calendarEvents.length}`);
    
    if (calendarEvents.length === 0) {
      console.log('   ⚠️  No calendar events have been imported!\n');
    } else {
      console.log('');
    }
    
  } catch (error) {
    console.log(`   ❌ Error checking database: ${error.message}\n`);
  }

  // Step 7: Test import
  console.log('7️⃣  Attempting test import...');
  try {
    const { CalendarConfig, Event } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    const CalendarService = require('./src/services/calendar');
    
    const calendarArray = calendars.map(c => ({
      name: c.name,
      id: c.calendarId
    }));
    
    const calendarService = new CalendarService(
      process.env.GOOGLE_CALENDAR_CREDENTIALS || process.env.GOOGLE_CREDENTIALS,
      calendarArray
    );
    
    const result = await calendarService.syncEvents(168);
    
    if (result.events.length === 0) {
      console.log('   No events to import\n');
    } else {
      let imported = 0;
      let skipped = 0;
      
      for (const eventData of result.events) {
        try {
          // Check if exists
          const exists = await Event.findOne({
            where: { calendarSourceId: eventData.calendarSourceId }
          });
          
          if (!exists) {
            const eventId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await Event.create({
              id: eventId,
              title: eventData.calendarEvent.summary || 'Untitled Event',
              description: eventData.calendarEvent.description || '',
              dateTime: new Date(eventData.calendarEvent.start.dateTime),
              duration: eventData.duration,
              maxParticipants: 0,
              roles: [],
              signups: {},
              createdBy: 'diagnostic_test',
              calendarLink: eventData.calendarEvent.htmlLink,
              calendarEventId: eventData.calendarEvent.id,
              calendarSource: eventData.calendarSource,
              calendarSourceId: eventData.calendarSourceId,
              channelId: null,
              guildId: null,
              messageId: null
            });
            
            imported++;
            console.log(`   ✅ Imported: ${eventData.calendarEvent.summary}`);
          } else {
            skipped++;
          }
        } catch (error) {
          console.log(`   ❌ Failed to import: ${error.message}`);
        }
      }
      
      console.log('');
      console.log(`   📊 Import Results:`);
      console.log(`      Imported: ${imported}`);
      console.log(`      Skipped (already exist): ${skipped}`);
      console.log(`      Total: ${result.events.length}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Test import failed: ${error.message}\n`);
  }

  // Summary
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  const { Event } = require('./src/models');
  const finalCount = await Event.count({
    where: {
      calendarSource: { [require('sequelize').Op.not]: null }
    }
  });
  
  if (finalCount > 0) {
    console.log('✅ SUCCESS! Calendar events are in the database.');
    console.log(`   Total calendar events: ${finalCount}`);
    console.log('   Check the web UI "All Events" tab to see them.\n');
  } else {
    console.log('❌ PROBLEM: No calendar events in database.');
    console.log('\nPossible causes:');
    console.log('1. No events in calendar within next 7 days');
    console.log('2. All events are all-day events (these are filtered out)');
    console.log('3. Calendar not shared with service account');
    console.log('4. Calendar credentials incorrect');
    console.log('5. Background sync not running\n');
    
    console.log('Next steps:');
    console.log('1. Check your calendar has timed events (not all-day)');
    console.log('2. Verify calendar is shared with service account');
    console.log('3. Start the bot: npm start');
    console.log('4. Wait 10 seconds and check logs for [BackgroundSync]\n');
  }
  
  process.exit(0);
}

runDiagnostics().catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  console.error(error.stack);
  process.exit(1);
});
