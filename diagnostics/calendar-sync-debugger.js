#!/usr/bin/env node
// calendar-sync-debugger.js - Deep diagnostic for calendar sync issues

require('dotenv').config();
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

function error(msg) {
  console.log(colors.red + '❌ ' + msg + colors.reset);
  issuesFound.push(msg);
}

function warn(msg) {
  console.log(colors.yellow + '⚠️  ' + msg + colors.reset);
  warningsFound.push(msg);
}

function success(msg) {
  console.log(colors.green + '✅ ' + msg + colors.reset);
}

function info(msg) {
  console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset);
}

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
    const { testConnection, initializeDatabase } = require('./src/config/database');
    
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
  
  try {
    const { CalendarConfig } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    
    if (calendars.length === 0) {
      error('No calendars configured in database');
      console.log('');
      console.log('Fix:');
      console.log('  1. Go to http://localhost:3000');
      console.log('  2. Navigate to "Google Calendar" tab');
      console.log('  3. Click "Add Calendar" and add at least one calendar');
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
    './data/calendar-credentials.json',
    path.join(__dirname, 'data', 'calendar-credentials.json')
  ].filter(Boolean);
  
  let credentialsFound = false;
  let credentialsPath = null;
  
  for (const credPath of credPaths) {
    const fullPath = path.resolve(credPath);
    if (fs.existsSync(fullPath)) {
      credentialsFound = true;
      credentialsPath = fullPath;
      success(`Credentials file found: ${credPath}`);
      
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const creds = JSON.parse(content);
        
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
  
  if (!credentialsFound) {
    warn('No Google Calendar API credentials file found');
    console.log('');
    console.log('   This is OK if you are only using iCal URLs.');
    console.log('   For Google Calendar API access:');
    console.log('   1. Create service account in Google Cloud Console');
    console.log('   2. Download JSON key');
    console.log('   3. Save as data/calendar-credentials.json');
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
      console.log('Fix: Start the bot with:');
      console.log(colors.cyan + '  npm run pm2:start' + colors.reset);
      console.log('');
      process.exit(1);
    }
    
    if (botProcess.pm2_env.status !== 'online') {
      error(`Bot status: ${botProcess.pm2_env.status}`);
      console.log('');
      console.log('Fix: Restart the bot with:');
      console.log(colors.cyan + '  pm2 restart discord-event-bot' + colors.reset);
      console.log('');
      process.exit(1);
    }
    
    success('Bot is running (PM2 status: online)');
    
    const uptime = Math.floor((Date.now() - botProcess.pm2_env.pm_uptime) / 1000);
    const uptimeMin = Math.floor(uptime / 60);
    console.log(`   Uptime: ${uptimeMin} minutes`);
    console.log(`   Restarts: ${botProcess.pm2_env.restart_time}`);
    
    if (botProcess.pm2_env.restart_time > 5) {
      warn('Bot has restarted multiple times - check for errors');
    }
    
  } catch (err) {
    error('PM2 not available or error checking status');
    console.log('');
    console.log('Is PM2 installed? Run: npm install -g pm2');
    console.log('Is the bot running? Run: npm run pm2:start');
    console.log('');
  }

  // ==================== STEP 5: BACKGROUND SYNC CHECK ====================
  section('5. Background Sync Status');
  
  try {
    const statusPath = path.join(__dirname, 'data', 'bot-status.json');
    
    if (!fs.existsSync(statusPath)) {
      warn('Bot status file not found (bot may not have started yet)');
    } else {
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      
      if (status.backgroundSync && status.backgroundSync.enabled) {
        success('Background sync is enabled');
        console.log(`   Interval: ${status.backgroundSync.intervalFormatted || '5 minutes'}`);
        
        const lastUpdate = new Date(status.timestamp);
        const ageSeconds = (Date.now() - lastUpdate) / 1000;
        
        if (ageSeconds > 300) {
          warn(`Status file is ${Math.floor(ageSeconds)} seconds old - bot may be frozen`);
        } else {
          success(`Status updated ${Math.floor(ageSeconds)} seconds ago`);
        }
      } else {
        warn('Background sync is disabled in bot status');
      }
    }
  } catch (err) {
    warn('Could not check background sync status: ' + err.message);
  }

  // ==================== STEP 6: RECENT LOGS ====================
  section('6. Recent Bot Logs');
  
  try {
    const { stdout } = await execAsync('pm2 logs discord-event-bot --lines 30 --nostream');
    
    console.log(colors.dim + 'Last 30 log lines:' + colors.reset);
    console.log('');
    console.log(colors.dim + stdout + colors.reset);
    console.log('');
    
    // Check for specific sync messages
    if (stdout.includes('BackgroundSync')) {
      success('Background sync is running (found in logs)');
    } else {
      warn('No background sync activity in recent logs');
      console.log('');
      console.log('   This could mean:');
      console.log('   • Bot just started (wait 10 seconds)');
      console.log('   • No calendars configured');
      console.log('   • Background sync failed to start');
      console.log('');
    }
    
    // Check for errors
    if (stdout.toLowerCase().includes('error') || stdout.toLowerCase().includes('failed')) {
      warn('Errors found in recent logs - check above');
    }
    
  } catch (err) {
    warn('Could not retrieve PM2 logs: ' + err.message);
  }

  // ==================== STEP 7: TEST SYNC ====================
  section('7. Testing Calendar Sync');
  
  try {
    const { CalendarConfig } = require('./src/models');
    const calendars = await CalendarConfig.findAll();
    
    if (calendars.length === 0) {
      error('No calendars to test (already reported above)');
    } else {
      console.log('Testing sync with first calendar...');
      console.log('');
      
      const testCal = calendars[0];
      info(`Testing: ${testCal.name} (${testCal.calendarId.substring(0, 50)}...)`);
      console.log('');
      
      const CalendarService = require('./src/services/calendar');
      const { config } = require('./src/config');
      
      const calendarList = [{
        name: testCal.name,
        id: testCal.calendarId
      }];
      
      const calendarService = new CalendarService(credentialsPath || config.google.credentials, calendarList);
      
      console.log('Attempting to fetch events...');
      const result = await calendarService.syncEvents(744); // 31 days
      
      if (!result.success) {
        error(`Sync failed: ${result.message}`);
      } else {
        success(`Sync succeeded: ${result.message}`);
        console.log(`   Events found: ${result.events.length}`);
        
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
          warn('No events found in calendar (next 31 days)');
          console.log('');
          console.log('   Possible reasons:');
          console.log('   • Calendar has no events in next 31 days');
          console.log('   • All events are all-day (bot skips these)');
          console.log('   • Calendar ID is wrong');
          console.log('');
        }
      }
    }
  } catch (err) {
    error('Test sync failed: ' + err.message);
    console.log('');
    console.log(colors.dim + 'Stack trace:' + colors.reset);
    console.log(colors.dim + err.stack + colors.reset);
    console.log('');
  }

  // ==================== STEP 8: DATABASE EVENTS CHECK ====================
  section('8. Events in Database');
  
  try {
    const { Event } = require('./src/models');
    
    const totalEvents = await Event.count();
    const calendarEvents = await Event.count({
      where: {
        calendarSourceId: { [require('sequelize').Op.not]: null }
      }
    });
    const futureCalendarEvents = await Event.count({
      where: {
        calendarSourceId: { [require('sequelize').Op.not]: null },
        dateTime: { [require('sequelize').Op.gte]: new Date() }
      }
    });
    
    console.log(`Total events in database: ${colors.bright}${totalEvents}${colors.reset}`);
    console.log(`Calendar-imported events: ${colors.bright}${calendarEvents}${colors.reset}`);
    console.log(`Future calendar events: ${colors.bright}${futureCalendarEvents}${colors.reset}`);
    console.log('');
    
    if (calendarEvents === 0) {
      error('No calendar events in database');
      console.log('');
      console.log('This means events are not being imported. Check:');
      console.log('  • Calendar connection (Step 7 above)');
      console.log('  • Background sync is running (Step 5 above)');
      console.log('  • Recent logs for errors (Step 6 above)');
      console.log('');
    } else {
      success('Calendar events are in database');
      
      // Show some recent calendar events
      const recentEvents = await Event.findAll({
        where: {
          calendarSourceId: { [require('sequelize').Op.not]: null }
        },
        order: [['dateTime', 'DESC']],
        limit: 5
      });
      
      if (recentEvents.length > 0) {
        console.log(colors.bright + 'Recent calendar events:' + colors.reset);
        recentEvents.forEach((evt, idx) => {
          console.log(`  ${idx + 1}. ${evt.title}`);
          console.log(`     ${colors.dim}${new Date(evt.dateTime).toLocaleString()}${colors.reset}`);
          console.log(`     ${colors.dim}Source: ${evt.calendarSource || 'Unknown'}${colors.reset}`);
        });
      }
    }
    
  } catch (err) {
    error('Failed to check database events: ' + err.message);
  }

  // ==================== STEP 9: AUTO-SYNC CONFIG ====================
  section('9. Discord Auto-Sync Configuration');
  
  try {
    const { AutoSyncConfig } = require('./src/models');
    const configs = await AutoSyncConfig.findAll();
    
    if (configs.length === 0) {
      info('No Discord auto-sync configured (this is optional)');
      console.log('');
      console.log('   Discord auto-sync posts events to a Discord channel automatically.');
      console.log('   To enable: Use /autosync action:on in Discord');
      console.log('');
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
        info('Discord auto-sync is disabled');
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
    console.log('If events still aren\'t showing up:');
    console.log('  • Wait 5 minutes for next background sync');
    console.log('  • Check events are within next 31 days');
    console.log('  • Check events have specific times (not all-day)');
    console.log('  • Run manual sync from web UI');
    console.log('');
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issuesFound.length} issue(s)` + colors.reset);
    console.log('');
    issuesFound.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });
    console.log('');
    
    if (warningsFound.length > 0) {
      console.log(colors.yellow + `⚠️  Found ${warningsFound.length} warning(s)` + colors.reset);
      console.log('');
      warningsFound.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
      console.log('');
    }
    
    console.log(colors.bright + 'Next Steps:' + colors.reset);
    console.log('');
    console.log('1. Fix the issues listed above');
    console.log('2. Restart the bot: ' + colors.cyan + 'pm2 restart discord-event-bot' + colors.reset);
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
