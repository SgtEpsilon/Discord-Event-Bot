#!/usr/bin/env node
// setup-diagnostic.js - Comprehensive first-time setup diagnostic

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

function error(msg) {
  console.log(colors.red + '❌ ' + msg + colors.reset);
  issues.push(msg);
}

function warn(msg) {
  console.log(colors.yellow + '⚠️  ' + msg + colors.reset);
  warnings.push(msg);
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

async function checkNodeVersion() {
  section('1. Node.js Version');
  
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    const major = parseInt(version.substring(1).split('.')[0]);
    
    console.log(`   Installed: ${version}`);
    
    if (major < 16) {
      error(`Node.js ${major} is too old (need 16+)`);
      console.log('');
      console.log('   Fix: Install Node.js 16 or higher from https://nodejs.org');
      console.log('');
    } else {
      success(`Node.js version OK (${version})`);
    }
  } catch (err) {
    error('Node.js not found');
    console.log('');
    console.log('   Fix: Install Node.js from https://nodejs.org');
    console.log('');
  }
}

async function checkNpmPackages() {
  section('2. NPM Packages');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found');
    console.log('');
    console.log('   Are you in the correct directory?');
    console.log('   Run: cd Discord-Event-Bot');
    console.log('');
    return;
  }
  
  success('package.json found');
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    error('node_modules not found - packages not installed');
    console.log('');
    console.log('   Fix: npm install');
    console.log('');
    return;
  }
  
  success('node_modules folder exists');
  
  // Check critical packages
  const criticalPackages = [
    'discord.js',
    'express',
    'sequelize',
    'sqlite3',
    'dotenv'
  ];
  
  let missing = [];
  for (const pkg of criticalPackages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (!fs.existsSync(pkgPath)) {
      missing.push(pkg);
    }
  }
  
  if (missing.length > 0) {
    error(`Missing packages: ${missing.join(', ')}`);
    console.log('');
    console.log('   Fix: npm install');
    console.log('');
  } else {
    success('All critical packages installed');
  }
}

async function checkEnvFile() {
  section('3. Environment Configuration');
  
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    error('.env file not found');
    console.log('');
    
    if (fs.existsSync(envExamplePath)) {
      console.log('   Fix:');
      console.log('   1. Copy .env.example to .env');
      console.log('      cp .env.example .env');
      console.log('   2. Edit .env and add your Discord bot token');
      console.log('');
    } else {
      console.log('   Fix: Create .env file with required variables');
      console.log('');
    }
    return;
  }
  
  success('.env file exists');
  
  // Check required variables
  require('dotenv').config();
  
  const requiredVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID'
  ];
  
  const missingVars = [];
  const emptyVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else if (process.env[varName].includes('your_') || process.env[varName].includes('YOUR_')) {
      emptyVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    error(`Missing required variables: ${missingVars.join(', ')}`);
    console.log('');
    console.log('   Fix: Add these to your .env file');
    console.log('');
  }
  
  if (emptyVars.length > 0) {
    error(`Variables not configured: ${emptyVars.join(', ')}`);
    console.log('');
    console.log('   These still have placeholder values like "your_token_here"');
    console.log('');
    console.log('   Fix:');
    console.log('   1. Go to https://discord.com/developers/applications');
    console.log('   2. Select your application');
    console.log('   3. Get your bot token and client ID');
    console.log('   4. Update .env file');
    console.log('');
  }
  
  if (missingVars.length === 0 && emptyVars.length === 0) {
    success('Required environment variables configured');
    
    // Validate token format
    if (process.env.DISCORD_TOKEN) {
      const token = process.env.DISCORD_TOKEN;
      if (token.split('.').length !== 3) {
        warn('DISCORD_TOKEN format looks incorrect');
        console.log('   Discord tokens have 3 parts separated by dots');
        console.log('');
      } else {
        success('DISCORD_TOKEN format looks valid');
      }
    }
  }
}

async function checkDataDirectory() {
  section('4. Data Directory');
  
  const dataPath = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataPath)) {
    warn('data/ directory not found');
    console.log('');
    console.log('   Creating data directory...');
    fs.mkdirSync(dataPath, { recursive: true });
    success('Created data/ directory');
    console.log('');
  } else {
    success('data/ directory exists');
  }
  
  // Check for database
  const dbPath = path.join(dataPath, 'database.sqlite');
  if (fs.existsSync(dbPath)) {
    success('Database file exists');
    
    const stats = fs.statSync(dbPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
  } else {
    info('Database file will be created on first run');
  }
}

async function checkDiscordBot() {
  section('5. Discord Bot Setup');
  
  require('dotenv').config();
  
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.includes('your_')) {
    error('Discord token not configured (see step 3)');
    return;
  }
  
  info('Testing Discord bot connection...');
  
  try {
    const { Client, GatewayIntentBits } = require('discord.js');
    
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });
    
    const loginPromise = new Promise((resolve, reject) => {
      client.once('ready', () => {
        resolve(true);
      });
      
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Timeout')), 10000);
    });
    
    await client.login(process.env.DISCORD_TOKEN);
    await loginPromise;
    
    success('Discord bot connected successfully!');
    console.log(`   Bot username: ${client.user.tag}`);
    console.log(`   Bot ID: ${client.user.id}`);
    
    await client.destroy();
    
  } catch (err) {
    error('Discord bot connection failed');
    console.log('');
    console.log(`   Error: ${err.message}`);
    console.log('');
    
    if (err.message.includes('token')) {
      console.log('   Possible issues:');
      console.log('   • Invalid or expired bot token');
      console.log('   • Token has typos or extra spaces');
      console.log('');
      console.log('   Fix:');
      console.log('   1. Go to https://discord.com/developers/applications');
      console.log('   2. Select your application → Bot');
      console.log('   3. Click "Reset Token" to get a new token');
      console.log('   4. Update DISCORD_TOKEN in .env');
      console.log('');
    }
  }
}

async function checkPM2() {
  section('6. PM2 Process Manager');
  
  try {
    await execAsync('pm2 --version');
    const { stdout } = await execAsync('pm2 --version');
    success(`PM2 installed (version ${stdout.trim()})`);
  } catch (err) {
    warn('PM2 not installed');
    console.log('');
    console.log('   PM2 is optional but recommended for production');
    console.log('');
    console.log('   Install: npm install -g pm2');
    console.log('   Or run bot directly: node src/bot.js');
    console.log('');
  }
}

async function checkWebServerPort() {
  section('7. Web Server Port');
  
  require('dotenv').config();
  
  const port = process.env.WEB_PORT || 3000;
  
  info(`Web server will run on port ${port}`);
  
  // Try to connect to see if port is already in use
  const net = require('net');
  
  const checkPort = () => {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  };
  
  const available = await checkPort();
  
  if (available) {
    success(`Port ${port} is available`);
  } else {
    warn(`Port ${port} is already in use`);
    console.log('');
    console.log('   Fix: Either:');
    console.log('   • Stop the other process using the port');
    console.log('   • Change WEB_PORT in .env to a different port');
    console.log('');
  }
}

async function checkFileStructure() {
  section('8. File Structure');
  
  const requiredFiles = [
    'src/bot.js',
    'src/config/database.js',
    'src/models/index.js',
    'web-server.js',
    'package.json'
  ];
  
  const requiredDirs = [
    'src',
    'src/commands',
    'src/models',
    'src/config'
  ];
  
  let allGood = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(colors.green + `   ✓ ${file}` + colors.reset);
    } else {
      console.log(colors.red + `   ✗ ${file} (missing)` + colors.reset);
      allGood = false;
    }
  }
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(path.join(process.cwd(), dir))) {
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
    console.log('');
    console.log('   Fix: Ensure you have the complete repository');
    console.log('   Clone again from: https://github.com/yourusername/Discord-Event-Bot');
    console.log('');
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
    console.log('1. Start the bot:');
    console.log(colors.cyan + '   npm run pm2:start' + colors.reset);
    console.log('');
    console.log('2. Check status:');
    console.log(colors.cyan + '   pm2 status' + colors.reset);
    console.log('');
    console.log('3. View logs:');
    console.log(colors.cyan + '   pm2 logs discord-event-bot' + colors.reset);
    console.log('');
    console.log('4. Open web UI:');
    console.log(colors.cyan + '   http://localhost:' + (process.env.WEB_PORT || 3000) + colors.reset);
    console.log('');
  } else {
    if (issues.length > 0) {
      console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s) that must be fixed:` + colors.reset);
      console.log('');
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.log(colors.yellow + `⚠️  Found ${warnings.length} warning(s):` + colors.reset);
      console.log('');
      warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
      console.log('');
    }
    
    console.log(colors.bright + 'Fix these issues, then run this diagnostic again:' + colors.reset);
    console.log(colors.cyan + '  node setup-diagnostic.js' + colors.reset);
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
