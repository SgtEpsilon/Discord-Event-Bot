// scripts/migrate-guilds-to-db.js
//
// One-time migration: reads data/guilds.json and inserts every entry
// into the SQL `guilds` table via Sequelize.
//
// Run once:
//   node scripts/migrate-guilds-to-db.js
//
// Safe to run multiple times — uses upsert so existing rows are updated,
// not duplicated.

require('dotenv').config();

const path  = require('path');
const fs    = require('fs');
const { sequelize, testConnection } = require('../config/database');

// Register the Guild model so Sequelize knows about it before syncing
require('../src/models/Guild');

const GuildRepository = require('../src/repositories/GuildRepository');

const GUILDS_JSON_PATH = path.join(__dirname, '../data/guilds.json');

async function migrate() {
  console.log('[migrate-guilds] Starting migration…');

  // 1. Verify DB connection
  const connected = await testConnection();
  if (!connected) {
    console.error('[migrate-guilds] ❌ Cannot connect to database. Aborting.');
    process.exit(1);
  }

  // 2. Ensure the guilds table exists
  await sequelize.sync({ alter: false });
  console.log('[migrate-guilds] ✅ Database schema ready');

  // 3. Read guilds.json
  if (!fs.existsSync(GUILDS_JSON_PATH)) {
    console.warn(`[migrate-guilds] ⚠️  ${GUILDS_JSON_PATH} not found — nothing to migrate.`);
    process.exit(0);
  }

  let guilds;
  try {
    guilds = JSON.parse(fs.readFileSync(GUILDS_JSON_PATH, 'utf8'));
  } catch (err) {
    console.error('[migrate-guilds] ❌ Failed to parse guilds.json:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(guilds) || guilds.length === 0) {
    console.log('[migrate-guilds] guilds.json is empty — nothing to migrate.');
    process.exit(0);
  }

  // 4. Upsert each guild
  let success = 0;
  let failed  = 0;

  for (const g of guilds) {
    if (!g.id) {
      console.warn('[migrate-guilds] Skipping entry without id:', g);
      failed++;
      continue;
    }

    try {
      await GuildRepository.upsert({
        id:          g.id,
        name:        g.name        || 'Unknown Server',
        memberCount: g.memberCount || null
      });
      console.log(`[migrate-guilds]   ✅ ${g.name || g.id} (${g.id})`);
      success++;
    } catch (err) {
      console.error(`[migrate-guilds]   ❌ Failed to upsert guild ${g.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n[migrate-guilds] Done — ${success} migrated, ${failed} failed.`);

  // 5. Optionally rename the old file as a backup
  const backupPath = GUILDS_JSON_PATH + '.bak';
  try {
    fs.renameSync(GUILDS_JSON_PATH, backupPath);
    console.log(`[migrate-guilds] Original file renamed to ${backupPath}`);
  } catch (err) {
    console.warn('[migrate-guilds] Could not rename guilds.json:', err.message);
  }

  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

migrate().catch(err => {
  console.error('[migrate-guilds] Unexpected error:', err);
  process.exit(1);
});
