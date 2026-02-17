#!/usr/bin/env node
// database-diagnostic.js - Database health check and repair

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

let issues = [];

function error(msg) {
  console.log(colors.red + '❌ ' + msg + colors.reset);
  issues.push(msg);
}

function warn(msg) {
  console.log(colors.yellow + '⚠️  ' + msg + colors.reset);
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

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     💾 Database Diagnostic & Repair Tool              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

  // Step 1: Check file exists
  section('1. Database File');
  
  if (!fs.existsSync(dbPath)) {
    error('Database file not found');
    console.log('');
    console.log(`   Expected location: ${dbPath}`);
    console.log('');
    console.log('   Fix: The database will be created automatically when you start the bot');
    console.log('   Run: npm run pm2:start');
    console.log('');
    process.exit(1);
  }
  
  success('Database file exists');
  
  const stats = fs.statSync(dbPath);
  console.log(`   Location: ${dbPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toLocaleString()}`);

  // Step 2: Check file permissions
  section('2. File Permissions');
  
  try {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    success('Database file is readable and writable');
  } catch (err) {
    error('Database file permission issue');
    console.log('');
    console.log('   Fix: Ensure file has read/write permissions');
    if (process.platform !== 'win32') {
      console.log('   Run: chmod 666 ' + dbPath);
    }
    console.log('');
  }

  // Step 3: Open database
  section('3. Database Connection');
  
  let db;
  try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) throw err;
    });
    success('Database opened successfully');
  } catch (err) {
    error('Cannot open database: ' + err.message);
    console.log('');
    console.log('   Database file may be corrupted');
    console.log('');
    console.log('   Fix:');
    console.log('   1. Backup current database:');
    console.log('      cp data/database.sqlite data/database.sqlite.backup');
    console.log('   2. Delete corrupted file:');
    console.log('      rm data/database.sqlite');
    console.log('   3. Restart bot to create new database:');
    console.log('      npm run pm2:start');
    console.log('');
    process.exit(1);
  }

  // Step 4: Check integrity
  section('4. Database Integrity');
  
  try {
    const result = await query(db, 'PRAGMA integrity_check');
    if (result[0]['integrity_check'] === 'ok') {
      success('Database integrity check passed');
    } else {
      error('Database integrity check failed: ' + result[0]['integrity_check']);
      console.log('');
      console.log('   Database may be corrupted. See backup instructions in Step 3.');
      console.log('');
    }
  } catch (err) {
    error('Integrity check failed: ' + err.message);
  }

  // Step 5: Check tables
  section('5. Database Tables');
  
  const requiredTables = [
    'events',
    'calendar_config',
    'auto_sync_config',
    'users'
  ];
  
  try {
    const tables = await query(db, "SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    
    console.log(`   Found ${tableNames.length} tables`);
    console.log('');
    
    let allPresent = true;
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(colors.green + `   ✓ ${table}` + colors.reset);
      } else {
        console.log(colors.red + `   ✗ ${table} (missing)` + colors.reset);
        allPresent = false;
      }
    }
    
    console.log('');
    
    if (allPresent) {
      success('All required tables present');
    } else {
      error('Some tables are missing');
      console.log('');
      console.log('   Fix: Run database initialization:');
      console.log('   1. Stop the bot: pm2 stop discord-event-bot');
      console.log('   2. Delete database: rm data/database.sqlite');
      console.log('   3. Start bot: npm run pm2:start');
      console.log('');
    }
  } catch (err) {
    error('Cannot read tables: ' + err.message);
  }

  // Step 6: Check table schemas
  section('6. Table Schemas');
  
  try {
    // Check events table
    const eventsSchema = await query(db, "PRAGMA table_info(events)");
    
    const requiredColumns = {
      'events': ['id', 'title', 'dateTime', 'description', 'duration', 'calendarSourceId'],
      'calendar_config': ['id', 'name', 'calendarId'],
      'auto_sync_config': ['id', 'guildId', 'channelId', 'enabled']
    };
    
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      try {
        const schema = await query(db, `PRAGMA table_info(${tableName})`);
        const columnNames = schema.map(c => c.name);
        
        const missing = columns.filter(col => !columnNames.includes(col));
        
        if (missing.length === 0) {
          success(`${tableName} schema OK`);
        } else {
          warn(`${tableName} missing columns: ${missing.join(', ')}`);
          console.log('   This may be fine if table was created by an older version');
        }
      } catch (err) {
        // Table doesn't exist, already reported
      }
    }
  } catch (err) {
    warn('Cannot check schemas: ' + err.message);
  }

  // Step 7: Check data
  section('7. Database Contents');
  
  try {
    const eventCount = await query(db, 'SELECT COUNT(*) as count FROM events');
    const calendarCount = await query(db, 'SELECT COUNT(*) as count FROM calendar_config');
    const autoSyncCount = await query(db, 'SELECT COUNT(*) as count FROM auto_sync_config');
    
    console.log(`   Events: ${eventCount[0].count}`);
    console.log(`   Calendars: ${calendarCount[0].count}`);
    console.log(`   Auto-sync configs: ${autoSyncCount[0].count}`);
    console.log('');
    
    if (eventCount[0].count === 0) {
      info('No events in database (this is normal for new setup)');
    }
    
    if (calendarCount[0].count === 0) {
      info('No calendars configured');
      console.log('   Add calendars at: http://localhost:3000');
    }
    
    // Show recent events
    if (eventCount[0].count > 0) {
      console.log('');
      console.log('   Recent events:');
      const recentEvents = await query(db, 
        'SELECT title, datetime, calendarSource FROM events ORDER BY datetime DESC LIMIT 5'
      );
      
      recentEvents.forEach((evt, idx) => {
        const date = new Date(evt.datetime).toLocaleString();
        const source = evt.calendarSource || 'Manual';
        console.log(`     ${idx + 1}. ${evt.title} (${date}) [${source}]`);
      });
    }
    
  } catch (err) {
    error('Cannot read data: ' + err.message);
  }

  // Step 8: Check for orphaned data
  section('8. Data Consistency');
  
  try {
    // Check for events with invalid calendar IDs
    const orphanedEvents = await query(db, `
      SELECT COUNT(*) as count FROM events e
      WHERE e.calendarSourceId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM calendar_config c 
        WHERE c.calendarId = e.calendarSource
      )
    `);
    
    if (orphanedEvents[0].count > 0) {
      warn(`Found ${orphanedEvents[0].count} events from deleted calendars`);
      console.log('');
      console.log('   You can clean these up if needed:');
      console.log('   DELETE FROM events WHERE calendarSourceId IS NOT NULL');
      console.log('   AND calendarSource NOT IN (SELECT calendarId FROM calendar_config);');
      console.log('');
    } else {
      success('No orphaned data found');
    }
  } catch (err) {
    warn('Cannot check data consistency: ' + err.message);
  }

  // Step 9: Database size analysis
  section('9. Database Statistics');
  
  try {
    const pageCount = await query(db, 'PRAGMA page_count');
    const pageSize = await query(db, 'PRAGMA page_size');
    const freePages = await query(db, 'PRAGMA freelist_count');
    
    const totalSize = pageCount[0].page_count * pageSize[0].page_size;
    const freeSize = freePages[0].freelist_count * pageSize[0].page_size;
    const usedPercent = ((totalSize - freeSize) / totalSize * 100).toFixed(1);
    
    console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Used: ${usedPercent}%`);
    console.log(`   Free pages: ${freePages[0].freelist_count}`);
    console.log('');
    
    if (freePages[0].freelist_count > 100) {
      info('Database has fragmentation');
      console.log('');
      console.log('   Optimize with: VACUUM;');
      console.log('   Or run: node database-diagnostic.js --vacuum');
      console.log('');
    } else {
      success('Database is well optimized');
    }
  } catch (err) {
    warn('Cannot get statistics: ' + err.message);
  }

  // Close database
  db.close();

  // Summary
  section('Summary');
  
  if (issues.length === 0) {
    console.log(colors.green + colors.bright + '✅ Database is healthy!' + colors.reset);
    console.log('');
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });
    console.log('');
    console.log('Review the fixes suggested above.');
    console.log('');
  }
  
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log('');
  
  // Check for vacuum flag
  if (process.argv.includes('--vacuum')) {
    section('Running VACUUM');
    
    const db2 = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
      db2.run('VACUUM', (err) => {
        if (err) {
          error('VACUUM failed: ' + err.message);
          reject(err);
        } else {
          success('Database optimized');
          resolve();
        }
      });
    });
    
    db2.close();
  }
  
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('');
  console.error(colors.red + '❌ Diagnostic failed: ' + err.message + colors.reset);
  console.error('');
  console.error(err.stack);
  process.exit(1);
});
