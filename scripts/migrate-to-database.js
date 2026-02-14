#!/usr/bin/env node
// scripts/migrate-to-database.js - Migrate JSON data to SQLite database

const fs = require('fs');
const path = require('path');
const { sequelize, testConnection, initializeDatabase } = require('../src/config/database');
const { 
  Event, 
  Preset, 
  EventsConfig, 
  StreamingConfig,
  AutoSyncConfig 
} = require('../src/models');

const DATA_DIR = path.join(__dirname, '../data');

async function loadJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
  }
  return null;
}

async function migrateEvents() {
  console.log('\n📅 Migrating events...');
  const eventsData = await loadJSON('events.json');
  
  if (!eventsData) {
    console.log('   ℹ️  No events.json found or empty');
    return 0;
  }

  let count = 0;
  for (const [id, event] of Object.entries(eventsData)) {
    try {
      const existing = await Event.findByPk(id);
      if (existing) {
        console.log(`   ⏭️  Event ${id} already exists, skipping`);
        continue;
      }

      await Event.create({
        id: event.id,
        title: event.title,
        description: event.description || '',
        dateTime: new Date(event.dateTime),
        duration: event.duration || 60,
        maxParticipants: event.maxParticipants || 0,
        roles: event.roles || [],
        signups: event.signups || {},
        createdBy: event.createdBy || 'unknown',
        channelId: event.channelId,
        guildId: event.guildId,
        messageId: event.messageId,
        calendarLink: event.calendarLink,
        calendarEventId: event.calendarEventId,
        calendarSource: event.calendarSource,
        calendarSourceId: event.calendarSourceId
      });

      count++;
      console.log(`   ✅ Migrated event: ${event.title}`);
    } catch (error) {
      console.error(`   ❌ Error migrating event ${id}:`, error.message);
    }
  }

  console.log(`   📊 Migrated ${count} events`);
  return count;
}

async function migratePresets() {
  console.log('\n📋 Migrating presets...');
  const presetsData = await loadJSON('presets.json');
  
  if (!presetsData) {
    console.log('   ℹ️  No presets.json found or empty');
    return 0;
  }

  let count = 0;
  for (const [key, preset] of Object.entries(presetsData)) {
    try {
      const existing = await Preset.findByPk(key);
      if (existing) {
        console.log(`   ⏭️  Preset ${key} already exists, skipping`);
        continue;
      }

      await Preset.create({
        key: key,
        name: preset.name,
        description: preset.description || '',
        duration: preset.duration,
        maxParticipants: preset.maxParticipants || 0,
        roles: preset.roles || []
      });

      count++;
      console.log(`   ✅ Migrated preset: ${preset.name}`);
    } catch (error) {
      console.error(`   ❌ Error migrating preset ${key}:`, error.message);
    }
  }

  console.log(`   📊 Migrated ${count} presets`);
  return count;
}

async function migrateEventsConfig() {
  console.log('\n⚙️  Migrating events config...');
  const configData = await loadJSON('events-config.json');
  
  if (!configData) {
    console.log('   ℹ️  No events-config.json found or empty');
    return 0;
  }

  let count = 0;
  for (const [guildId, config] of Object.entries(configData)) {
    if (guildId.startsWith('_')) continue;

    try {
      const existing = await EventsConfig.findByPk(guildId);
      if (existing) {
        console.log(`   ⏭️  Events config for ${guildId} already exists, skipping`);
        continue;
      }

      await EventsConfig.create({
        guildId: guildId,
        eventChannelId: config.eventChannelId,
        guildName: config.guildName
      });

      count++;
      console.log(`   ✅ Migrated events config for guild: ${guildId}`);
    } catch (error) {
      console.error(`   ❌ Error migrating events config for ${guildId}:`, error.message);
    }
  }

  console.log(`   📊 Migrated ${count} events configs`);
  return count;
}

async function migrateStreamingConfig() {
  console.log('\n🎮 Migrating streaming config...');
  const configData = await loadJSON('streaming-config.json');
  
  if (!configData) {
    console.log('   ℹ️  No streaming-config.json found or empty');
    return 0;
  }

  let count = 0;
  for (const [guildId, config] of Object.entries(configData)) {
    try {
      const existing = await StreamingConfig.findByPk(guildId);
      if (existing) {
        console.log(`   ⏭️  Streaming config for ${guildId} already exists, skipping`);
        continue;
      }

      await StreamingConfig.create({
        guildId: guildId,
        guildName: config.guildName,
        notificationChannelId: config.notificationChannelId,
        twitchEnabled: config.twitch?.enabled || false,
        twitchStreamers: config.twitch?.streamers?.streamers || config.twitch?.streamers || [],
        twitchMessage: config.twitch?.message || '🔴 {username} is now live on Twitch!\n**{title}**\nPlaying: {game}',
        twitchCustomMessages: config.twitch?.customMessages || {},
        youtubeEnabled: config.youtube?.enabled || false,
        youtubeChannels: config.youtube?.channels || [],
        youtubeMessage: config.youtube?.message || '📺 {channel} just uploaded a new video!\n**{title}**'
      });

      count++;
      console.log(`   ✅ Migrated streaming config for guild: ${guildId}`);
    } catch (error) {
      console.error(`   ❌ Error migrating streaming config for ${guildId}:`, error.message);
    }
  }

  console.log(`   📊 Migrated ${count} streaming configs`);
  return count;
}

async function migrateAutoSyncConfig() {
  console.log('\n🔄 Migrating auto-sync config...');
  const configData = await loadJSON('autosync-config.json');
  
  if (!configData) {
    console.log('   ℹ️  No autosync-config.json found or empty');
    return 0;
  }

  try {
    const existing = await AutoSyncConfig.findOne();
    if (existing) {
      console.log('   ⏭️  Auto-sync config already exists, updating...');
      await existing.update({
        enabled: configData.enabled || false,
        channelId: configData.channelId,
        guildId: configData.guildId,
        lastSync: configData.lastSync ? new Date(configData.lastSync) : null
      });
    } else {
      await AutoSyncConfig.create({
        enabled: configData.enabled || false,
        channelId: configData.channelId,
        guildId: configData.guildId,
        lastSync: configData.lastSync ? new Date(configData.lastSync) : null
      });
    }

    console.log('   ✅ Migrated auto-sync config');
    return 1;
  } catch (error) {
    console.error('   ❌ Error migrating auto-sync config:', error.message);
    return 0;
  }
}

async function backupJSONFiles() {
  console.log('\n💾 Creating backup of JSON files...');
  const backupDir = path.join(DATA_DIR, 'backup_' + Date.now());
  
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    
    const filesToBackup = [
      'events.json',
      'presets.json',
      'events-config.json',
      'streaming-config.json',
      'autosync-config.json'
    ];

    let count = 0;
    for (const file of filesToBackup) {
      const source = path.join(DATA_DIR, file);
      const dest = path.join(backupDir, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        count++;
        console.log(`   ✅ Backed up: ${file}`);
      }
    }

    console.log(`   📊 Backed up ${count} files to: ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.error('   ❌ Error creating backup:', error.message);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Discord Event Bot - Database Migration Tool     ║');
  console.log('╚════════════════════════════════════════════════════╝');

  console.log('\n🔌 Testing database connection...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('\n❌ Failed to connect to database. Exiting.');
    process.exit(1);
  }

  console.log('\n🗄️  Initializing database schema...');
  await initializeDatabase();

  const backupDir = await backupJSONFiles();

  const stats = {
    events: await migrateEvents(),
    presets: await migratePresets(),
    eventsConfig: await migrateEventsConfig(),
    streamingConfig: await migrateStreamingConfig(),
    autoSync: await migrateAutoSyncConfig()
  };

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║              Migration Complete!                   ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n📊 Migration Summary:');
  console.log(`   Events:           ${stats.events}`);
  console.log(`   Presets:          ${stats.presets}`);
  console.log(`   Events Configs:   ${stats.eventsConfig}`);
  console.log(`   Streaming Configs: ${stats.streamingConfig}`);
  console.log(`   Auto-Sync Config:  ${stats.autoSync}`);
  
  if (backupDir) {
    console.log(`\n💾 Backup created at: ${backupDir}`);
    console.log('   ℹ️  Keep this backup until you verify everything works!');
  }

  console.log('\n✅ Next steps:');
  console.log('   1. Start your bot: npm start');
  console.log('   2. Start web server: npm run web');
  console.log('   3. Test all functionality');
  console.log('   4. Once verified, you can delete JSON files (keep backup!)');
  console.log('\n');

  await sequelize.close();
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});