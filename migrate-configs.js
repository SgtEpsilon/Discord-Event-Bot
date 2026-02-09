// scripts/migrate-configs.js
/**
 * Migration Script: Consolidate Separate Config Files
 * 
 * This script migrates from:
 * - data/events-config.json
 * - data/streaming-config.json
 * 
 * To unified:
 * - data/guild-config.json
 * 
 * Usage: node scripts/migrate-configs.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// File paths
const EVENTS_CONFIG_PATH = path.join(DATA_DIR, 'events-config.json');
const STREAMING_CONFIG_PATH = path.join(DATA_DIR, 'streaming-config.json');
const UNIFIED_CONFIG_PATH = path.join(DATA_DIR, 'guild-config.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Load JSON file safely
 */
function loadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return {};
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return {};
  }
}

/**
 * Save JSON file
 */
function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Backup existing config file
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${fileName}.${timestamp}.backup`);
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backed up ${fileName} to ${backupPath}`);
  } catch (error) {
    console.error(`❌ Failed to backup ${fileName}:`, error.message);
  }
}

/**
 * Main migration function
 */
function migrate() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   Config Migration: Consolidating to guild-config.json ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // 1. Load existing configs
  console.log('📂 Loading existing configurations...');
  const eventsConfig = loadJSON(EVENTS_CONFIG_PATH);
  const streamingConfig = loadJSON(STREAMING_CONFIG_PATH);
  
  const eventsCount = Object.keys(eventsConfig).length;
  const streamingCount = Object.keys(streamingConfig).length;
  
  console.log(`   Events config: ${eventsCount} guilds`);
  console.log(`   Streaming config: ${streamingCount} guilds`);
  
  // 2. Check if unified config already exists
  if (fs.existsSync(UNIFIED_CONFIG_PATH)) {
    console.log('\n⚠️  WARNING: guild-config.json already exists!');
    console.log('   This migration will MERGE data, not replace it.');
    console.log('   Existing data in guild-config.json will be preserved.');
    console.log('');
  }
  
  // 3. Backup existing files
  console.log('\n💾 Creating backups...');
  backupFile(EVENTS_CONFIG_PATH);
  backupFile(STREAMING_CONFIG_PATH);
  backupFile(UNIFIED_CONFIG_PATH);
  
  // 4. Load or create unified config
  const unifiedConfig = loadJSON(UNIFIED_CONFIG_PATH);
  
  // 5. Merge events config
  console.log('\n🔄 Merging events config...');
  let eventsMerged = 0;
  
  for (const [guildId, eventConfig] of Object.entries(eventsConfig)) {
    if (!unifiedConfig[guildId]) {
      unifiedConfig[guildId] = {
        guildId,
        guildName: eventConfig.guildName || null,
        eventChannel: {
          channelId: eventConfig.eventChannelId || null,
          enabled: !!(eventConfig.eventChannelId)
        },
        notifications: {
          channelId: null,
          enabled: false
        },
        twitch: {
          enabled: false,
          streamers: [],
          customMessages: {}
        },
        youtube: {
          enabled: false,
          channels: []
        },
        createdAt: eventConfig.createdAt || new Date().toISOString(),
        updatedAt: eventConfig.updatedAt || new Date().toISOString()
      };
      eventsMerged++;
    } else {
      // Update existing entry
      unifiedConfig[guildId].eventChannel = {
        channelId: eventConfig.eventChannelId || unifiedConfig[guildId].eventChannel?.channelId || null,
        enabled: !!(eventConfig.eventChannelId || unifiedConfig[guildId].eventChannel?.channelId)
      };
      unifiedConfig[guildId].updatedAt = new Date().toISOString();
    }
  }
  
  console.log(`   ✅ Merged ${eventsMerged} event configs`);
  
  // 6. Merge streaming config
  console.log('\n🔄 Merging streaming config...');
  let streamingMerged = 0;
  
  for (const [guildId, streamConfig] of Object.entries(streamingConfig)) {
    if (!unifiedConfig[guildId]) {
      unifiedConfig[guildId] = {
        guildId,
        guildName: streamConfig.guildName || null,
        eventChannel: {
          channelId: null,
          enabled: false
        },
        notifications: {
          channelId: streamConfig.notificationChannelId || null,
          enabled: !!(streamConfig.notificationChannelId)
        },
        twitch: {
          enabled: streamConfig.twitch?.enabled || false,
          streamers: streamConfig.twitch?.streamers || [],
          customMessages: streamConfig.twitch?.customMessages || {}
        },
        youtube: {
          enabled: streamConfig.youtube?.enabled || false,
          channels: streamConfig.youtube?.channels || []
        },
        createdAt: streamConfig.createdAt || new Date().toISOString(),
        updatedAt: streamConfig.updatedAt || new Date().toISOString()
      };
      streamingMerged++;
    } else {
      // Update existing entry
      unifiedConfig[guildId].notifications = {
        channelId: streamConfig.notificationChannelId || unifiedConfig[guildId].notifications?.channelId || null,
        enabled: !!(streamConfig.notificationChannelId || unifiedConfig[guildId].notifications?.channelId)
      };
      
      unifiedConfig[guildId].twitch = {
        enabled: streamConfig.twitch?.enabled || unifiedConfig[guildId].twitch?.enabled || false,
        streamers: streamConfig.twitch?.streamers || unifiedConfig[guildId].twitch?.streamers || [],
        customMessages: streamConfig.twitch?.customMessages || unifiedConfig[guildId].twitch?.customMessages || {}
      };
      
      unifiedConfig[guildId].youtube = {
        enabled: streamConfig.youtube?.enabled || unifiedConfig[guildId].youtube?.enabled || false,
        channels: streamConfig.youtube?.channels || unifiedConfig[guildId].youtube?.channels || []
      };
      
      unifiedConfig[guildId].updatedAt = new Date().toISOString();
    }
  }
  
  console.log(`   ✅ Merged ${streamingMerged} streaming configs`);
  
  // 7. Save unified config
  console.log('\n💾 Saving unified configuration...');
  if (saveJSON(UNIFIED_CONFIG_PATH, unifiedConfig)) {
    console.log(`   ✅ Saved to ${UNIFIED_CONFIG_PATH}`);
    console.log(`   📊 Total guilds: ${Object.keys(unifiedConfig).length}`);
  } else {
    console.error('   ❌ Failed to save unified config');
    process.exit(1);
  }
  
  // 8. Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║               Migration Complete! ✅                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Summary:');
  console.log(`   • Total guilds in unified config: ${Object.keys(unifiedConfig).length}`);
  console.log(`   • Event configs merged: ${eventsMerged}`);
  console.log(`   • Streaming configs merged: ${streamingMerged}`);
  console.log(`   • Backups saved to: ${BACKUP_DIR}`);
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Test the bot to ensure configs load correctly');
  console.log('   2. Verify web UI can read/write configurations');
  console.log('   3. Once confirmed working, you can archive old files:');
  console.log('      mv data/events-config.json data/backups/');
  console.log('      mv data/streaming-config.json data/backups/');
  console.log('\n⚠️  DO NOT delete old files until you verify everything works!\n');
}

// Run migration
migrate();
