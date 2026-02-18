#!/usr/bin/env node
// calendar-sync-debugger.js - Deep diagnostic for calendar sync issues

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
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

let issuesFound = [];
let warningsFound = [];

function error(msg)   { console.log(colors.red + '❌ ' + msg + colors.reset); issuesFound.push(msg); }
function warn(msg)    { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); warningsFound.push(msg); }
function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function info(msg)    { console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset); }
function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🔍 Calendar Sync Deep Diagnostic Tool             ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // ==================== STEP 1: DATABASE ====================
  section('1. Database Connection');
  
  try {
    const { testConnection, initializeDatabase } = require('../src/config/database');
    
    const connected = await testConnection();
    if (!connected) {
      error('Database connection failed');
      console.log('');
      console.log('Fix: Check that data/database.sqlite exists and is not corrupted');
      process.exit(1);
    }
    
    success('Database connected');
    await initializeDatabase();
    success('Database initialized');
  } catch (err) {
    error('Database error: ' + err.message);
    console.log('');
    console.log(err.stack);
    process.exit(1);
  }

  // ==================== STEP 2: CALENDARS IN DATABASE ====================
  section('2. Calendars Configuration');
  
  let calendars = [];
  try {
    const { CalendarConfig } = require('../src/models');
    calendars = await CalendarConfig.findAll();
    
    if (calendars.length === 0) {
      error('No calendars configured in database');
      console.log('');
      console.log('Fix:');
      console.log('  1. Go to http://localhost:' + (process.env.WEB_PORT || 3000));
      console.log('  2. Navigate to "Google Calendar" tab');
      console.log('  3. Add at least one calendar');
      console.log('');
      process.exit(1);
    }
    
    success(`Found ${calendars.length} calendar(s) in database`);
    console.log('');
    
    calendars.forEach((cal, idx) => {
      const isIcal = cal.calendarId.startsWith('http');
      const type = isIcal ? '🔗 iCal URL' : '📅 Google Calendar';
      console.log(`  ${idx + 1}. ${colors.bright}${cal.name}${colors.reset}`);
      console.log(`     Type: ${type}`);
      console.log(`     ID: ${colors.dim}${cal.calendarId}${colors.reset}`);
      console.log('');
    });
    
  } catch (err) {
    error('Failed to load calendars: ' + err.message);
    process.exit(1);
  }

  // ==================== STEP 3: CREDENTIALS ====================
  section('3. Google Calendar API Credentials');
  
  const credPaths = [
    process.env.GOOGLE_CALENDAR_CREDENTIALS,
    process.env.GOOGLE_CREDENTIALS,
    path.join(__dirname, '../data/calendar-credentials.json')
  ].filter(Boolean);
  
  let credentialsPath = null;
  
  for (const credPath of credPaths) {
    const fullPath = path.resolve(credPath);
    if (fs.existsSync(fullPath)) {
      credentialsPath = fullPath;
      success(`Credentials file found: ${credPath}`);
      
      try {
        const creds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (creds.type === 'service_account') {
          success('Valid service account credentials');
          console.log(`   Email: ${colors.dim}${creds.client_email}${colors.reset}`);
        } else {
          warn('Credentials file is not a service account key');
        }
      } catch (err) {
        error('Credentials file is not valid JSON: ' + err.message);
      }
      break;
    }
  }
  
  if (!credentialsPath) {
    warn('No Google Calendar API credentials file found');
    console.log('');
    console.log('   This is OK if you only use iCal URLs.');
    console.log('   For Google Calendar API: save service account JSON as data/calendar-credentials.json');
    console.log('');
  }

  // ==================== STEP 4: BOT STATUS ====================
  section('4. Discord Bot Status');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const botProcess = processes.find(p => p.name === 'discord-event-bot');
    
    if (!botProcess) {
      error('Discord bot is not running in PM2');
      console.log('');
      console.log('Fix: npm run pm2:start');
      console.log('');
    } else if (botProcess.pm2_env.status !== 'online') {
      error(`Bot status: ${botProcess.pm2_env.status}`);
      console.log('Fix: pm2 restart discord-event-bot');
    } else {
      success('Bot is running (PM2 status: online)');
      const uptimeMin = Math.floor((Date.now() - botProcess.pm2_env.pm_uptime) / 60000);
      console.log(`   Uptime: ${uptimeMin} minutes`);
      console.log(`   Restarts: ${botProcess.pm2_env.restart_time}`);
      if (botProcess.pm2_env.restart_time > 5) warn('Bot has restarted multiple times — check for errors');
    }
  } catch (err) {
    warn('PM2 not available or error checking status: ' + err.message);
    console.log('   Is PM2 running? Try: npm install -g pm2');
  }

  // ==================== STEP 5: RECENT LOGS ====================
  section('5. Recent Bot Logs');
  
  try {
    const { stdout } = await execAsync('pm2 logs discord-event-bot --lines 30 --nostream');
    console.log(colors.dim + 'Last 30 log lines:' + colors.reset);
    console.log('');
    console.log(colors.dim + stdout + colors.reset);
    
    if (stdout.toLowerCase().includes('error') || stdout.toLowerCase().includes('failed')) {
      warn('Errors found in recent logs — check above');
    }
  } catch (err) {
    warn('Could not retrieve PM2 logs: ' + err.message);
  }

  // ==================== STEP 6: TEST SYNC ====================
  section('6. Testing Calendar Sync');
  
  try {
    if (calendars.length > 0) {
      const testCal = calendars[0];
      info(`Testing: ${testCal.name}`);
      console.log('');
      
      const CalendarService = require('../src/services/calendar');
      const { config } = require('../src/config');
      
      const calendarService = new CalendarService(
        credentialsPath || config.google.credentials,
        [{ name: testCal.name, id: testCal.calendarId }]
      );
      
      const result = await calendarService.syncEvents(744); // 31 days
      
      if (!result.success) {
        error(`Sync failed: ${result.message}`);
      } else {
        success(`Sync succeeded — ${result.events.length} event(s) found`);
        
        if (result.events.length > 0) {
          console.log('');
          console.log(colors.bright + '   Sample events:' + colors.reset);
          result.events.slice(0, 3).forEach((evt, idx) => {
            const title = evt.calendarEvent.summary || 'Untitled';
            const start = new Date(evt.calendarEvent.start.dateTime);
            console.log(`     ${idx + 1}. ${title}`);
            console.log(`        ${colors.dim}${start.toLocaleString()}${colors.reset}`);
          });
          if (result.events.length > 3) {
            console.log(`     ${colors.dim}... and ${result.events.length - 3} more${colors.reset}`);
          }
        } else {
          warn('No events found in next 31 days');
          console.log('   • Calendar may have no events in this range');
          console.log('   • All-day events are skipped');
          console.log('   • Check the calendar ID is correct');
        }
      }
    }
  } catch (err) {
    error('Test sync failed: ' + err.message);
    console.log(colors.dim + err.stack + colors.reset);
  }

  // ==================== STEP 7: DATABASE EVENTS CHECK ====================
  section('7. Events in Database');
  
  try {
    const { Event } = require('../src/models');
    const { Op } = require('sequelize');
    
    const totalEvents = await Event.count();
    const calendarEvents = await Event.count({
      where: { calendarSourceId: { [Op.not]: null } }
    });
    const futureCalendarEvents = await Event.count({
      where: {
        calendarSourceId: { [Op.not]: null },
        dateTime: { [Op.gte]: new Date() }
      }
    });
    
    console.log(`Total events in database: ${colors.bright}${totalEvents}${colors.reset}`);
    console.log(`Calendar-imported events: ${colors.bright}${calendarEvents}${colors.reset}`);
    console.log(`Future calendar events:   ${colors.bright}${futureCalendarEvents}${colors.reset}`);
    console.log('');
    
    if (calendarEvents === 0) {
      error('No calendar events in database — events are not being imported');
      console.log('   Run /sync in Discord or use fix-calendar-sync.js');
    } else {
      success('Calendar events are present in database');
      
      const recentEvents = await Event.findAll({
        where: { calendarSourceId: { [Op.not]: null } },
        order: [['dateTime', 'DESC']],
        limit: 5
      });
      
      console.log(colors.bright + 'Recent calendar events:' + colors.reset);
      recentEvents.forEach((evt, idx) => {
        console.log(`  ${idx + 1}. ${evt.title}`);
        console.log(`     ${colors.dim}${new Date(evt.dateTime).toLocaleString()}${colors.reset}`);
        console.log(`     ${colors.dim}Source: ${evt.calendarSource || 'Unknown'}${colors.reset}`);
      });
    }
    
  } catch (err) {
    error('Failed to check database events: ' + err.message);
  }

  // ==================== STEP 8: AUTO-SYNC CONFIG ====================
  section('8. Discord Auto-Sync Configuration');
  
  try {
    const { AutoSyncConfig } = require('../src/models');
    const configs = await AutoSyncConfig.findAll();
    
    if (configs.length === 0) {
      info('No Discord auto-sync configured (optional)');
      console.log('   Enable with /autosync in Discord');
    } else {
      const activeConfig = configs.find(c => c.enabled);
      if (activeConfig) {
        success('Discord auto-sync is enabled');
        console.log(`   Channel ID: ${activeConfig.channelId}`);
        console.log(`   Guild ID: ${activeConfig.guildId}`);
        if (activeConfig.lastSync) {
          console.log(`   Last sync: ${new Date(activeConfig.lastSync).toLocaleString()}`);
        }
      } else {
        info('Discord auto-sync is configured but disabled');
        console.log('   Enable with /autosync action:on in Discord');
      }
    }
  } catch (err) {
    warn('Could not check auto-sync config: ' + err.message);
  }

  // ==================== SUMMARY ====================
  section('Summary');
  
  if (issuesFound.length === 0 && warningsFound.length === 0) {
    console.log(colors.green + colors.bright + '✅ No issues found!' + colors.reset);
    console.log('');
    console.log('Your calendar sync appears to be working correctly.');
    console.log('');
    console.log('If events still aren\'t appearing:');
    console.log('  • Wait for next background sync (every 5 minutes)');
    console.log('  • Check events are within next 31 days with specific times');
    console.log('  • Run /sync in Discord to force an immediate sync');
    console.log('');
  } else {
    if (issuesFound.length > 0) {
      console.log(colors.red + colors.bright + `❌ Found ${issuesFound.length} issue(s):` + colors.reset);
      console.log('');
      issuesFound.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
      console.log('');
    }
    
    if (warningsFound.length > 0) {
      console.log(colors.yellow + `⚠️  Found ${warningsFound.length} warning(s):` + colors.reset);
      console.log('');
      warningsFound.forEach((w, idx) => console.log(`  ${idx + 1}. ${w}`));
      console.log('');
    }
    
    console.log(colors.bright + 'Next Steps:' + colors.reset);
    console.log('1. Fix the issues above');
    console.log('2. pm2 restart discord-event-bot');
    console.log('3. Run this diagnostic again to verify');
    console.log('');
  }
  
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log('');
  
  process.exit(issuesFound.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('');
  console.error(colors.red + '❌ Diagnostic failed: ' + err.message + colors.reset);
  console.error('');
  console.error(err.stack);
  process.exit(1);
});
