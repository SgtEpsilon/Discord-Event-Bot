#!/usr/bin/env node
// diagnostic.js - Run this to check your setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Discord Event Bot - Diagnostic Check\n');
console.log('═══════════════════════════════════════════════════════\n');

// Check 1: Data directory
console.log('1️⃣  Checking data directory...');
const dataDir = path.join(__dirname, 'data');
if (fs.existsSync(dataDir)) {
  console.log('   ✅ data/ directory exists');
  const files = fs.readdirSync(dataDir);
  console.log(`   📁 Files found: ${files.join(', ')}`);
} else {
  console.log('   ❌ data/ directory missing - creating it...');
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('   ✅ Created data/ directory');
}

// Check 2: Critical files
console.log('\n2️⃣  Checking critical files...');
const criticalFiles = [
  'data/events.json',
  'data/presets.json',
  'data/streaming-config.json',
  'data/guilds.json',
  'data/bot-status.json',
  'data/events-config.json'
];

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    try {
      const parsed = JSON.parse(content);
      const size = Object.keys(parsed).length;
      console.log(`   ✅ ${file} (${size} entries)`);
    } catch (e) {
      console.log(`   ⚠️  ${file} exists but invalid JSON: ${e.message}`);
    }
  } else {
    console.log(`   ❌ ${file} missing`);
    // Create empty file
    fs.writeFileSync(fullPath, '{}', 'utf8');
    console.log(`   ✅ Created ${file}`);
  }
});

// Check 3: .env file
console.log('\n3️⃣  Checking .env configuration...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env file exists');
  const envContent = fs.readFileSync('.env', 'utf8');
  
  const checks = {
    'DISCORD_TOKEN': envContent.includes('DISCORD_TOKEN=') && !envContent.includes('DISCORD_TOKEN=your_'),
    'WEB_PORT': envContent.includes('WEB_PORT='),
    'WEB_API_KEY': envContent.includes('WEB_API_KEY=') && !envContent.includes('WEB_API_KEY=your_'),
    'GOOGLE_CREDENTIALS': envContent.includes('GOOGLE_CREDENTIALS='),
    'TWITCH_CLIENT_ID': envContent.includes('TWITCH_CLIENT_ID=')
  };
  
  Object.entries(checks).forEach(([key, found]) => {
    if (found) {
      console.log(`   ✅ ${key} configured`);
    } else {
      console.log(`   ⚠️  ${key} not configured (optional for some)`);
    }
  });
} else {
  console.log('   ❌ .env file missing!');
  console.log('   💡 Copy .env.example to .env and configure it');
}

// Check 4: Node modules
console.log('\n4️⃣  Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  console.log(`   📦 ${deps.length} dependencies listed`);
  
  const nodeModules = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    console.log('   ✅ node_modules/ exists');
  } else {
    console.log('   ❌ node_modules/ missing - run: npm install');
  }
} else {
  console.log('   ❌ package.json missing!');
}

// Check 5: Bot files
console.log('\n5️⃣  Checking source files...');
const sourceFiles = [
  'src/bot.js',
  'src/config/index.js',
  'src/services/eventManager.js',
  'src/services/presetManager.js',
  'src/services/calendar.js',
  'src/utils/datetime.js',
  'web-server.js'
];

sourceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} missing!`);
  }
});

// Check 6: Guild data
console.log('\n6️⃣  Checking guild sync data...');
const guildsPath = path.join(__dirname, 'data/guilds.json');
if (fs.existsSync(guildsPath)) {
  try {
    const guilds = JSON.parse(fs.readFileSync(guildsPath, 'utf8'));
    if (Array.isArray(guilds)) {
      console.log(`   ✅ guilds.json valid (${guilds.length} servers)`);
      if (guilds.length === 0) {
        console.log('   ⚠️  No guilds found - is the bot running and in any servers?');
      } else {
        guilds.forEach((g, i) => {
          console.log(`      ${i+1}. ${g.name} (${g.id})`);
        });
      }
    } else {
      console.log('   ⚠️  guilds.json should be an array, found:', typeof guilds);
    }
  } catch (e) {
    console.log(`   ❌ guilds.json parse error: ${e.message}`);
  }
} else {
  console.log('   ⚠️  guilds.json missing - bot needs to start first');
}

// Check 7: Bot status
console.log('\n7️⃣  Checking bot status...');
const statusPath = path.join(__dirname, 'data/bot-status.json');
if (fs.existsSync(statusPath)) {
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    console.log(`   ✅ bot-status.json valid`);
    console.log(`      Bot: ${status.botName || 'Unknown'}`);
    console.log(`      Uptime: ${status.uptimeFormatted || 'Unknown'}`);
    console.log(`      Guilds: ${status.guildCount || 0}`);
    console.log(`      Last update: ${status.timestamp || 'Unknown'}`);
    
    // Check if stale
    const lastUpdate = new Date(status.timestamp);
    const now = new Date();
    const ageSeconds = (now - lastUpdate) / 1000;
    if (ageSeconds > 60) {
      console.log(`   ⚠️  Bot status is ${Math.floor(ageSeconds)}s old - bot may not be running`);
    } else {
      console.log(`   ✅ Bot status is fresh (${Math.floor(ageSeconds)}s old)`);
    }
  } catch (e) {
    console.log(`   ❌ bot-status.json parse error: ${e.message}`);
  }
} else {
  console.log('   ⚠️  bot-status.json missing - bot needs to start first');
}

// Check 8: Web server test
console.log('\n8️⃣  Testing web server components...');
try {
  require('dotenv').config();
  const { config } = require('./src/config/index');
  console.log('   ✅ Config loads successfully');
  console.log(`      Discord token: ${config.discord.token ? 'Set' : 'Missing'}`);
  console.log(`      Web port: ${config.web.port || 3000}`);
  console.log(`      Calendar: ${config.google.credentials ? 'Configured' : 'Not configured'}`);
  console.log(`      Twitch: ${config.twitch?.enabled ? 'Enabled' : 'Disabled'}`);
} catch (e) {
  console.log(`   ❌ Config error: ${e.message}`);
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('📋 SUMMARY\n');

const botRunning = fs.existsSync('data/bot-status.json') && fs.existsSync('data/guilds.json');
const webReady = fs.existsSync('web-server.js') && fs.existsSync('node_modules');
const dataReady = fs.existsSync('data/events.json');

if (botRunning && webReady && dataReady) {
  console.log('✅ Everything looks good! Both bot and web server should work.');
  console.log('\n💡 Next steps:');
  console.log('   1. Start bot: npm start');
  console.log('   2. Start web: npm run web');
  console.log('   3. Visit: http://localhost:3000');
} else {
  console.log('⚠️  Some issues found:\n');
  if (!botRunning) {
    console.log('   ❌ Bot not running or hasn\'t started yet');
    console.log('      → Run: npm start');
  }
  if (!webReady) {
    console.log('   ❌ Web server not ready');
    console.log('      → Run: npm install');
  }
  if (!dataReady) {
    console.log('   ❌ Data files missing');
    console.log('      → Files created, restart bot');
  }
}

console.log('\n═══════════════════════════════════════════════════════\n');
