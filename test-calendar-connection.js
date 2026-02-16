#!/usr/bin/env node
// test-calendar-connection.js - Direct test of calendar access

require('dotenv').config();

async function main() {
  console.log('🔍 Testing Calendar Connection\n');

  // Initialize database
  const { testConnection, initializeDatabase } = require('./src/config/database');
  await testConnection();
  await initializeDatabase();

  // Get calendars
  const { CalendarConfig } = require('./src/models');
  const calendars = await CalendarConfig.findAll();

  if (calendars.length === 0) {
    console.log('❌ No calendars configured');
    process.exit(1);
  }

  console.log(`Found ${calendars.length} calendar(s):\n`);

  for (const cal of calendars) {
    console.log(`━━━ Testing: ${cal.name} ━━━`);
    console.log(`Type: ${cal.calendarId.startsWith('http') ? 'iCal URL' : 'Google Calendar'}`);
    console.log(`ID: ${cal.calendarId.substring(0, 60)}${cal.calendarId.length > 60 ? '...' : ''}\n`);

    const CalendarService = require('./src/services/calendar');
    const { config } = require('./src/config');

    const calendarService = new CalendarService(
      config.google.credentials,
      [{ name: cal.name, id: cal.calendarId }]
    );

    try {
      console.log('Testing connection...');
      const connected = await calendarService.testConnection();
      
      if (!connected) {
        console.log('❌ Connection FAILED\n');
        continue;
      }

      console.log('✅ Connection successful\n');

      console.log('Fetching events (next 31 days)...');
      const result = await calendarService.syncEvents(744);

      console.log(`Result: ${result.success ? '✅' : '❌'} ${result.message}`);
      console.log(`Events found: ${result.events.length}\n`);

      if (result.events.length > 0) {
        console.log('Sample events:');
        result.events.slice(0, 5).forEach((evt, idx) => {
          const summary = evt.calendarEvent.summary || 'Untitled';
          const start = new Date(evt.calendarEvent.start.dateTime);
          const isAllDay = !evt.calendarEvent.start.dateTime;
          
          console.log(`  ${idx + 1}. ${summary}`);
          console.log(`     Date: ${start.toLocaleString()}`);
          console.log(`     Duration: ${evt.duration} minutes`);
          
          if (isAllDay) {
            console.log(`     ⚠️  ALL-DAY EVENT (will be skipped)`);
          }
          console.log('');
        });
      } else {
        console.log('⚠️  No events found. Possible reasons:');
        console.log('   • Calendar has no events in next 31 days');
        console.log('   • All events are all-day (bot skips these)');
        console.log('   • Calendar ID is incorrect');
        console.log('');
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
      console.log('Stack trace:');
      console.log(error.stack);
      console.log('');
    }
  }
}

main().catch(console.error);
