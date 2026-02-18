#!/usr/bin/env node
// discord-diagnostic.js - Discord bot connection troubleshooting

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');

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

function error(msg)   { console.log(colors.red + '❌ ' + msg + colors.reset); issues.push(msg); }
function warn(msg)    { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); }
function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function info(msg)    { console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset); }
function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

function checkDiscordAPI() {
  return new Promise((resolve) => {
    const req = https.get('https://discord.com/api/v10/gateway', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve({ success: true, data: JSON.parse(data) }); }
          catch { resolve({ success: true, data: {} }); }
        } else {
          resolve({ success: false, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🤖 Discord Bot Connection Diagnostic              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // Step 1: Environment variables
  section('1. Environment Variables');
  
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (!token) {
    error('DISCORD_TOKEN not set in .env file');
    console.log('   Fix: Add DISCORD_TOKEN=your_token to .env');
    console.log('   Get token: https://discord.com/developers/applications');
  } else if (token.includes('your_') || token.includes('YOUR_')) {
    error('DISCORD_TOKEN has placeholder value');
    console.log('   Replace with your actual bot token');
  } else {
    success('DISCORD_TOKEN is set');
    const parts = token.split('.');
    if (parts.length !== 3) {
      error('DISCORD_TOKEN format is invalid (should have 3 dot-separated parts)');
      console.log('   Fix: Reset your token at https://discord.com/developers/applications → Bot');
    } else {
      success('DISCORD_TOKEN format looks valid');
    }
  }
  
  if (!clientId) {
    warn('DISCORD_CLIENT_ID not set — needed for slash commands');
    console.log('   Get it from: https://discord.com/developers/applications');
  } else if (clientId.includes('your_')) {
    warn('DISCORD_CLIENT_ID has placeholder value');
  } else {
    success(`DISCORD_CLIENT_ID is set: ${clientId}`);
  }

  // Step 2: Discord API accessibility
  section('2. Discord API Access');
  
  info('Testing connection to Discord API...');
  const apiCheck = await checkDiscordAPI();
  
  if (apiCheck.success) {
    success('Discord API is accessible');
    if (apiCheck.data && apiCheck.data.url) console.log(`   Gateway URL: ${apiCheck.data.url}`);
  } else {
    error('Cannot reach Discord API');
    console.log(`   Error: ${apiCheck.error || 'HTTP ' + apiCheck.statusCode}`);
    console.log('   Possible issues: no internet, firewall, or Discord outage');
    console.log('   Check: https://discordstatus.com');
  }

  // Step 3: Bot login test
  section('3. Bot Login Test');
  
  if (!token || token.includes('your_') || issues.length > 0) {
    error('Skipping login test — fix above issues first');
  } else {
    info('Attempting to log in to Discord...');
    
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
      ]
    });
    
    try {
      await new Promise((resolve, reject) => {
        client.once('ready', () => {
          success('Bot logged in successfully! 🎉');
          console.log('');
          console.log(`   Bot Username: ${colors.bright}${client.user.tag}${colors.reset}`);
          console.log(`   Bot ID: ${client.user.id}`);
          console.log('');
          
          const guilds = client.guilds.cache;
          console.log(`   Connected to ${guilds.size} server(s):`);
          
          if (guilds.size === 0) {
            warn('Bot is not in any servers');
            console.log('   Invite: https://discord.com/developers/applications → OAuth2 → URL Generator');
          } else {
            guilds.forEach(g => console.log(`      • ${g.name} (${g.memberCount} members)`));
          }
          
          client.destroy();
          resolve();
        });
        
        client.on('error', reject);
        setTimeout(() => reject(new Error('Login timeout (30 seconds)')), 30000);
        client.login(token).catch(reject);
      });
      
    } catch (err) {
      error('Bot login failed: ' + err.message);
      console.log('');
      
      if (err.message.toLowerCase().includes('token')) {
        console.log('   Token may be invalid or expired:');
        console.log('   1. Go to https://discord.com/developers/applications → Bot');
        console.log('   2. Click "Reset Token" and copy the new one');
        console.log('   3. Update DISCORD_TOKEN in .env');
      } else if (err.message.toLowerCase().includes('intent')) {
        console.log('   Fix: Enable Privileged Gateway Intents in Developer Portal → Bot');
      }
      
      try { await client.destroy(); } catch {}
    }
  }

  // Step 4: Required intents info
  section('4. Bot Intents Configuration');
  
  info('Required intents for this bot:');
  console.log('   • GUILDS (required for all Discord bots)');
  console.log('   • GUILD_MESSAGES (for message features)');
  console.log('   • GUILD_MESSAGE_REACTIONS (for reaction signups)');
  console.log('');
  console.log('   Enable at: https://discord.com/developers/applications → Bot → Privileged Gateway Intents');

  // Step 5: Permissions
  section('5. Required Bot Permissions');
  
  info('Make sure the bot has these permissions in your server:');
  console.log('   • View Channels');
  console.log('   • Send Messages');
  console.log('   • Embed Links');
  console.log('   • Add Reactions');
  console.log('   • Use Slash Commands');
  console.log('   • Manage Messages (for cleanup)');

  // Summary
  section('Summary');
  
  if (issues.length === 0) {
    console.log(colors.green + colors.bright + '✅ Discord bot is properly configured!' + colors.reset);
    console.log('');
    console.log('Start the bot:  ' + colors.cyan + 'npm run pm2:start' + colors.reset);
    console.log('');
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
    console.log('');
    console.log('Fix these then run:  ' + colors.cyan + 'node diagnostics/discord-diagnostic.js' + colors.reset);
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
