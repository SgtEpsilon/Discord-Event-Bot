#!/usr/bin/env node
// setup-diagnostic.js - Comprehensive first-time setup diagnostic

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Project root is one level up from /diagnostics/
const PROJECT_ROOT = path.join(__dirname, '..');

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
let warnings = [];

function error(msg)   { console.log(colors.red + '❌ ' + msg + colors.reset); issues.push(msg); }
function warn(msg)    { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); warnings.push(msg); }
function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function info(msg)    { console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset); }
function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

async function checkNodeVersion() {
  section('1. Node.js Version');
  
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    const major = parseInt(version.substring(1).split('.')[0]);
    
    console.log(`   Installed: ${version}`);
    
    if (major < 16) {
      error(`Node.js ${major} is too old (need 16+)`);
      console.log('   Fix: Install Node.js 16+ from https://nodejs.org');
    } else {
      success(`Node.js version OK (${version})`);
    }
  } catch (err) {
    error('Node.js not found');
    console.log('   Fix: Install Node.js from https://nodejs.org');
  }
}

async function checkNpmPackages() {
  section('2. NPM Packages');
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found');
    console.log('   Are you running from the correct directory?');
    return;
  }
  
  success('package.json found');
  
  const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    error('node_modules not found — packages not installed');
    console.log('   Fix: npm install');
    return;
  }
  
  success('node_modules folder exists');
  
  const criticalPackages = ['discord.js', 'express', 'sequelize', 'sqlite3', 'dotenv', 'archiver'];
  const missing = criticalPackages.filter(pkg => !fs.existsSync(path.join(nodeModulesPath, pkg)));
  
  if (missing.length > 0) {
    error(`Missing packages: ${missing.join(', ')}`);
    console.log('   Fix: npm install');
  } else {
    success('All critical packages installed');
  }
}

async function checkEnvFile() {
  section('3. Environment Configuration');
  
  const envPath = path.join(PROJECT_ROOT, '.env');
  const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    error('.env file not found');
    console.log('');
    if (fs.existsSync(envExamplePath)) {
      console.log('   Fix:');
      console.log('   1. cp .env.example .env');
      console.log('   2. Edit .env with your Discord token and other settings');
    } else {
      console.log('   Create a .env file with at minimum:');
      console.log('   DISCORD_TOKEN=your_bot_token');
      console.log('   DISCORD_CLIENT_ID=your_client_id');
    }
    return;
  }
  
  success('.env file exists');
  
  require('dotenv').config({ path: envPath });
  
  const requiredVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  const placeholderVars = requiredVars.filter(v => process.env[v] && (process.env[v].includes('your_') || process.env[v].includes('YOUR_')));
  
  if (missingVars.length > 0) {
    error(`Missing required variables: ${missingVars.join(', ')}`);
    console.log('   Add these to your .env file');
  }
  
  if (placeholderVars.length > 0) {
    error(`Variables still have placeholder values: ${placeholderVars.join(', ')}`);
    console.log('   Replace the placeholder values with real ones from:');
    console.log('   https://discord.com/developers/applications');
  }
  
  if (missingVars.length === 0 && placeholderVars.length === 0) {
    success('Required environment variables configured');
    
    if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.split('.').length !== 3) {
      warn('DISCORD_TOKEN format looks incorrect (should have 3 parts separated by dots)');
    } else if (process.env.DISCORD_TOKEN) {
      success('DISCORD_TOKEN format looks valid');
    }
  }
}

async function checkDataDirectory() {
  section('4. Data Directory');
  
  const dataPath = path.join(PROJECT_ROOT, 'data');
  
  if (!fs.existsSync(dataPath)) {
    warn('data/ directory not found — creating...');
    fs.mkdirSync(dataPath, { recursive: true });
    success('Created data/ directory');
  } else {
    success('data/ directory exists');
  }
  
  const dbPath = path.join(dataPath, 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    success(`Database file exists (${(stats.size / 1024).toFixed(2)} KB)`);
    console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
  } else {
    info('Database will be created automatically on first run');
  }
  
  const backupsPath = path.join(dataPath, 'backups');
  if (fs.existsSync(backupsPath)) {
    const backups = fs.readdirSync(backupsPath).filter(f => f.endsWith('.zip'));
    info(`Backup directory exists (${backups.length} backup(s))`);
  }
}

async function checkFileStructure() {
  section('5. File Structure');
  
  const requiredFiles = [
    'src/bot.js',
    'src/config/database.js',
    'src/config/index.js',
    'src/models/index.js',
    'src/services/eventManager.js',
    'src/utils/datetime.js',
    'package.json'
  ];
  
  const requiredDirs = [
    'src',
    'src/discord',
    'src/discord/commands',
    'src/models',
    'src/config',
    'src/services',
    'src/utils'
  ];
  
  let allGood = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(PROJECT_ROOT, file))) {
      console.log(colors.green + `   ✓ ${file}` + colors.reset);
    } else {
      console.log(colors.red + `   ✗ ${file} (missing)` + colors.reset);
      allGood = false;
    }
  }
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(path.join(PROJECT_ROOT, dir))) {
      console.log(colors.green + `   ✓ ${dir}/` + colors.reset);
    } else {
      console.log(colors.red + `   ✗ ${dir}/ (missing)` + colors.reset);
      allGood = false;
    }
  }
  
  console.log('');
  
  if (allGood) {
    success('All required files and directories present');
  } else {
    error('Some required files/directories are missing');
    console.log('   Ensure you have the complete project — re-clone if needed');
  }
}

async function checkWebServerPort() {
  section('6. Web Server Port');
  
  require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
  const port = process.env.WEB_PORT || 3000;
  info(`Web server configured for port ${port}`);
  
  const net = require('net');
  const available = await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code !== 'EADDRINUSE'));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port);
  });
  
  if (available) {
    success(`Port ${port} is available`);
  } else {
    warn(`Port ${port} is already in use`);
    console.log('   This is fine if the bot/web server is already running');
    console.log('   To use a different port, set WEB_PORT in .env');
  }
}

async function checkPM2() {
  section('7. PM2 Process Manager');
  
  try {
    const { stdout } = await execAsync('pm2 --version');
    success(`PM2 installed (v${stdout.trim()})`);
  } catch (err) {
    warn('PM2 not installed');
    console.log('   PM2 is recommended for production use');
    console.log('   Install: npm install -g pm2');
    console.log('   Or run the bot directly: node src/bot.js');
  }
}

async function checkDiscordBot() {
  section('8. Discord Bot Connection Test');
  
  require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
  
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.includes('your_')) {
    error('Discord token not configured (see step 3)');
    return;
  }
  
  info('Testing Discord bot connection...');
  
  try {
    const { Client, GatewayIntentBits } = require('discord.js');
    
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });
    
    await new Promise((resolve, reject) => {
      client.once('ready', () => {
        success(`Discord bot connected: ${client.user.tag}`);
        console.log(`   Bot ID: ${client.user.id}`);
        console.log(`   Servers: ${client.guilds.cache.size}`);
        
        if (client.guilds.cache.size === 0) {
          warn('Bot is not in any servers — invite it via OAuth2 URL Generator');
        } else {
          client.guilds.cache.forEach(g => console.log(`      • ${g.name} (${g.memberCount} members)`));
        }
        
        client.destroy();
        resolve();
      });
      
      client.on('error', reject);
      setTimeout(() => reject(new Error('Login timeout (15 seconds)')), 15000);
      client.login(process.env.DISCORD_TOKEN).catch(reject);
    });
    
  } catch (err) {
    error('Discord bot connection failed: ' + err.message);
    console.log('');
    if (err.message.includes('token')) {
      console.log('   Fix:');
      console.log('   1. Go to https://discord.com/developers/applications');
      console.log('   2. Select your app → Bot → Reset Token');
      console.log('   3. Update DISCORD_TOKEN in .env');
    }
  }
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🔍 Discord Event Bot - Setup Diagnostic           ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
  
  await checkNodeVersion();
  await checkNpmPackages();
  await checkEnvFile();
  await checkDataDirectory();
  await checkFileStructure();
  await checkWebServerPort();
  await checkPM2();
  await checkDiscordBot();
  
  // Summary
  section('Summary');
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log(colors.green + colors.bright + '✅ All checks passed! Bot is ready to run.' + colors.reset);
    console.log('');
    console.log(colors.bright + 'Next steps:' + colors.reset);
    console.log('');
    console.log('1. Start the bot:       ' + colors.cyan + 'npm run pm2:start' + colors.reset);
    console.log('2. Check status:        ' + colors.cyan + 'pm2 status' + colors.reset);
    console.log('3. View logs:           ' + colors.cyan + 'pm2 logs discord-event-bot' + colors.reset);
    console.log('4. Open web UI:         ' + colors.cyan + 'http://localhost:' + (process.env.WEB_PORT || 3000) + colors.reset);
    console.log('');
  } else {
    if (issues.length > 0) {
      console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s) that must be fixed:` + colors.reset);
      console.log('');
      issues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.log(colors.yellow + `⚠️  Found ${warnings.length} warning(s):` + colors.reset);
      console.log('');
      warnings.forEach((w, idx) => console.log(`  ${idx + 1}. ${w}`));
      console.log('');
    }
    
    console.log('Fix these issues, then run:');
    console.log(colors.cyan + '  node diagnostics/setup-diagnostic.js' + colors.reset);
    console.log('');
  }
  
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log('');
  
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('');
  console.error(colors.red + '❌ Diagnostic failed: ' + err.message + colors.reset);
  console.error('');
  console.error(err.stack);
  process.exit(1);
});
