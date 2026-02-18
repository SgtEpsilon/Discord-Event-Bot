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

function error(msg) { console.log(colors.red + '❌ ' + msg + colors.reset); issues.push(msg); }
function warn(msg)  { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); }
function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function info(msg)  { console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset); }
function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     💾 Database Diagnostic & Repair Tool              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // Resolve db path the same way the app does
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/database.sqlite');

  // Step 1: Check file exists
  section('1. Database File');
  
  if (!fs.existsSync(dbPath)) {
    error('Database file not found');
    console.log('');
    console.log(`   Expected location: ${dbPath}`);
    console.log('');
    console.log('   Fix: The database is created automatically on first bot start');
    console.log('   Run: npm start (or npm run pm2:start)');
    console.log('');
    process.exit(1);
  }
  
  success('Database file exists');
  const stats = fs.statSync(dbPath);
  console.log(`   Location: ${dbPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toLocaleString()}`);

  // Step 2: Permissions
  section('2. File Permissions');
  
  try {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    success('Database file is readable and writable');
  } catch (err) {
    error('Database file permission issue');
    console.log('');
    if (process.platform !== 'win32') {
      console.log('   Fix: chmod 666 ' + dbPath);
    }
    console.log('');
  }

  // Step 3: Open database
  section('3. Database Connection');
  
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const d = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) reject(err); else resolve(d);
      });
    });
    success('Database opened successfully');
  } catch (err) {
    error('Cannot open database: ' + err.message);
    console.log('');
    console.log('   The database file may be corrupted.');
    console.log('   Fix:');
    console.log('   1. cp data/database.sqlite data/database.sqlite.backup');
    console.log('   2. rm data/database.sqlite');
    console.log('   3. npm start  (bot recreates it automatically)');
    console.log('');
    process.exit(1);
  }

  // Step 4: Integrity check
  section('4. Database Integrity');
  
  try {
    const result = await query(db, 'PRAGMA integrity_check');
    if (result[0]['integrity_check'] === 'ok') {
      success('Database integrity check passed');
    } else {
      error('Database integrity check failed: ' + result[0]['integrity_check']);
      console.log('');
      console.log('   Database may be corrupted. See backup instructions in Step 3.');
    }
  } catch (err) {
    error('Integrity check error: ' + err.message);
  }

  // Step 5: Check tables
  section('5. Database Tables');
  
  // These are the actual tableName values from the Sequelize models
  const requiredTables = [
    'events',
    'calendar_config',
    'autosync_config',
    'Presets',
    'EventsConfigs',
    'StreamingConfigs'
  ];
  
  try {
    const tables = await query(db, "SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    
    console.log(`   Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
    console.log('');
    
    let allPresent = true;
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(colors.green + `   ✓ ${table}` + colors.reset);
      } else {
        console.log(colors.yellow + `   ⚠ ${table} (missing — may not exist yet)` + colors.reset);
        allPresent = false;
      }
    }
    
    console.log('');
    
    if (allPresent) {
      success('All expected tables present');
    } else {
      warn('Some tables are missing — they are created on first use');
      console.log('   If the bot has been running, restart it to trigger table creation.');
    }
  } catch (err) {
    error('Cannot read tables: ' + err.message);
  }

  // Step 6: Schema check on core tables
  section('6. Table Schemas');
  
  const expectedColumns = {
    'events': ['id', 'title', 'dateTime', 'description', 'duration', 'calendarSourceId', 'guildId', 'channelId'],
    'calendar_config': ['id', 'name', 'calendarId'],
    'autosync_config': ['id', 'guildId', 'channelId', 'enabled']
  };
  
  for (const [tableName, columns] of Object.entries(expectedColumns)) {
    try {
      const schema = await query(db, `PRAGMA table_info(${tableName})`);
      const columnNames = schema.map(c => c.name);
      const missing = columns.filter(col => !columnNames.includes(col));
      
      if (missing.length === 0) {
        success(`${tableName} schema OK`);
      } else {
        warn(`${tableName} missing columns: ${missing.join(', ')}`);
        console.log('   Run: npm start  to trigger schema migration');
      }
    } catch (err) {
      // Table doesn't exist yet — already flagged above
    }
  }

  // Step 7: Database contents
  section('7. Database Contents');
  
  try {
    const eventCount = (await query(db, 'SELECT COUNT(*) as count FROM events'))[0].count;
    const calCount = (await query(db, 'SELECT COUNT(*) as count FROM calendar_config'))[0].count;
    
    let autoSyncCount = 0;
    try {
      autoSyncCount = (await query(db, 'SELECT COUNT(*) as count FROM autosync_config'))[0].count;
    } catch { /* table may not exist yet */ }

    console.log(`   Events: ${eventCount}`);
    console.log(`   Calendars: ${calCount}`);
    console.log(`   Auto-sync configs: ${autoSyncCount}`);
    console.log('');
    
    if (eventCount === 0) {
      info('No events in database (normal for new setup)');
    }
    if (calCount === 0) {
      info('No calendars configured — add them via the web UI');
    }
    
    // Show recent events using the correct camelCase column name
    if (eventCount > 0) {
      console.log('');
      console.log('   Recent events:');
      const recentEvents = await query(db,
        'SELECT title, dateTime, calendarSource FROM events ORDER BY dateTime DESC LIMIT 5'
      );
      recentEvents.forEach((evt, idx) => {
        const date = new Date(evt.dateTime).toLocaleString();
        const source = evt.calendarSource || 'Manual';
        console.log(`     ${idx + 1}. ${evt.title} (${date}) [${source}]`);
      });
    }
    
  } catch (err) {
    error('Cannot read data: ' + err.message);
  }

  // Step 8: Data consistency
  section('8. Data Consistency');
  
  try {
    const orphaned = await query(db, `
      SELECT COUNT(*) as count FROM events e
      WHERE e.calendarSourceId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM calendar_config c
        WHERE e.calendarSourceId LIKE (c.calendarId || '::%')
      )
    `);
    
    if (orphaned[0].count > 0) {
      warn(`Found ${orphaned[0].count} events from deleted/unknown calendars`);
      console.log('   These are events whose source calendar is no longer configured.');
      console.log('   You can safely delete them from the web UI if needed.');
    } else {
      success('No orphaned calendar events found');
    }
  } catch (err) {
    warn('Cannot check data consistency: ' + err.message);
  }

  // Step 9: Statistics
  section('9. Database Statistics');
  
  try {
    const pageCount = (await query(db, 'PRAGMA page_count'))[0].page_count;
    const pageSize  = (await query(db, 'PRAGMA page_size'))[0].page_size;
    const freePages = (await query(db, 'PRAGMA freelist_count'))[0].freelist_count;
    
    const totalSize = pageCount * pageSize;
    const freeSize  = freePages * pageSize;
    const usedPct   = ((totalSize - freeSize) / totalSize * 100).toFixed(1);
    
    console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Used: ${usedPct}%`);
    console.log(`   Free pages: ${freePages}`);
    console.log('');
    
    if (freePages > 100) {
      info('Database has some fragmentation');
      console.log('   Optimize with: node diagnostics/database-diagnostic.js --vacuum');
    } else {
      success('Database is well optimized');
    }
  } catch (err) {
    warn('Cannot get statistics: ' + err.message);
  }

  db.close();

  // Summary
  section('Summary');
  
  if (issues.length === 0) {
    console.log(colors.green + colors.bright + '✅ Database is healthy!' + colors.reset);
    console.log('');
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
    console.log('');
    console.log('Review the fixes suggested in each section above.');
    console.log('');
  }
  
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log('');
  
  // Optional VACUUM
  if (process.argv.includes('--vacuum')) {
    section('Running VACUUM');
    const db2 = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
      db2.run('VACUUM', (err) => {
        if (err) { error('VACUUM failed: ' + err.message); reject(err); }
        else { success('Database optimized'); resolve(); }
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
