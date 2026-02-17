#!/usr/bin/env node
// discord-diagnostic.js - Discord bot connection troubleshooting

require('dotenv').config();
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

function checkDiscordAPI() {
  return new Promise((resolve) => {
    const req = https.get('https://discord.com/api/v10/gateway', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(data) });
        } else {
          resolve({ success: false, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🤖 Discord Bot Connection Diagnostic              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // Step 1: Check environment variables
  section('1. Environment Variables');
  
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (!token) {
    error('DISCORD_TOKEN not set in .env file');
    console.log('');
    console.log('   Fix:');
    console.log('   1. Create/edit .env file');
    console.log('   2. Add: DISCORD_TOKEN=your_token_here');
    console.log('   3. Get token from https://discord.com/developers/applications');
    console.log('');
  } else if (token.includes('your_') || token.includes('YOUR_')) {
    error('DISCORD_TOKEN has placeholder value');
    console.log('');
    console.log('   You need to replace "your_token_here" with your actual bot token');
    console.log('');
  } else {
    success('DISCORD_TOKEN is set');
    
    // Validate token format
    const parts = token.split('.');
    if (parts.length !== 3) {
      error('DISCORD_TOKEN format is invalid');
      console.log('');
      console.log('   Discord bot tokens have 3 parts separated by dots');
      console.log('   Example: MTIzNDU2Nzg5MDEyMzQ1Njc4.GhtRbL.xYz...');
      console.log('');
      console.log('   Your token has ' + parts.length + ' parts');
      console.log('');
      console.log('   Fix:');
      console.log('   1. Go to https://discord.com/developers/applications');
      console.log('   2. Select your application → Bot');
      console.log('   3. Click "Reset Token"');
      console.log('   4. Copy the new token (copy the ENTIRE token)');
      console.log('   5. Update DISCORD_TOKEN in .env');
      console.log('');
    } else {
      success('DISCORD_TOKEN format looks valid');
      console.log(`   Token ID: ${parts[0].substring(0, 10)}...`);
    }
  }
  
  if (!clientId) {
    warn('DISCORD_CLIENT_ID not set');
    console.log('   This is needed for slash commands');
    console.log('   Get it from https://discord.com/developers/applications');
  } else if (clientId.includes('your_')) {
    warn('DISCORD_CLIENT_ID has placeholder value');
  } else {
    success('DISCORD_CLIENT_ID is set');
    console.log(`   Client ID: ${clientId}`);
  }

  // Step 2: Check Discord API accessibility
  section('2. Discord API Access');
  
  info('Testing connection to Discord API...');
  
  const apiCheck = await checkDiscordAPI();
  
  if (apiCheck.success) {
    success('Discord API is accessible');
    console.log(`   Gateway URL: ${apiCheck.data.url}`);
  } else {
    error('Cannot reach Discord API');
    console.log('');
    if (apiCheck.error === 'Timeout') {
      console.log('   Connection timed out - possible network/firewall issue');
    } else {
      console.log(`   Error: ${apiCheck.error || 'HTTP ' + apiCheck.statusCode}`);
    }
    console.log('');
    console.log('   Possible issues:');
    console.log('   • No internet connection');
    console.log('   • Firewall blocking Discord');
    console.log('   • Discord is down (check https://discordstatus.com)');
    console.log('');
  }

  // Step 3: Test bot login
  section('3. Bot Login Test');
  
  if (!token || token.includes('your_') || issues.length > 0) {
    error('Skipping login test - fix above issues first');
  } else {
    info('Attempting to log in to Discord...');
    
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
      ]
    });
    
    let loginSuccess = false;
    let loginError = null;
    let botUser = null;
    
    const loginPromise = new Promise((resolve) => {
      client.once('ready', () => {
        loginSuccess = true;
        botUser = client.user;
        resolve();
      });
      
      client.on('error', (err) => {
        loginError = err;
        resolve();
      });
      
      setTimeout(() => {
        if (!loginSuccess) {
          loginError = new Error('Login timeout (30 seconds)');
        }
        resolve();
      }, 30000);
    });
    
    try {
      await client.login(token);
      await loginPromise;
      
      if (loginSuccess) {
        success('Bot logged in successfully! 🎉');
        console.log('');
        console.log(`   Bot Username: ${colors.bright}${botUser.tag}${colors.reset}`);
        console.log(`   Bot ID: ${botUser.id}`);
        console.log(`   Bot Created: ${botUser.createdAt.toLocaleDateString()}`);
        console.log('');
        
        // Check guilds
        const guilds = client.guilds.cache;
        console.log(`   Connected to ${guilds.size} server(s):`);
        
        if (guilds.size === 0) {
          warn('Bot is not in any servers');
          console.log('');
          console.log('   Invite bot to a server:');
          console.log('   1. Go to https://discord.com/developers/applications');
          console.log('   2. Select your application → OAuth2 → URL Generator');
          console.log('   3. Select scopes: bot, applications.commands');
          console.log('   4. Select permissions: Send Messages, Manage Messages, etc.');
          console.log('   5. Copy and open the generated URL');
          console.log('');
        } else {
          guilds.forEach(guild => {
            console.log(`      • ${guild.name} (${guild.memberCount} members)`);
          });
        }
        
        await client.destroy();
        
      } else {
        error('Bot login failed');
        console.log('');
        
        if (loginError) {
          console.log(`   Error: ${loginError.message}`);
          console.log('');
          
          if (loginError.message.includes('token')) {
            console.log('   Common token issues:');
            console.log('   • Token is invalid or has been reset');
            console.log('   • Token has typos or extra spaces');
            console.log('   • Token is incomplete (not copied fully)');
            console.log('');
            console.log('   Fix:');
            console.log('   1. Go to https://discord.com/developers/applications');
            console.log('   2. Select your application → Bot');
            console.log('   3. Click "Reset Token"');
            console.log('   4. Copy the ENTIRE token (all 3 parts)');
            console.log('   5. Update DISCORD_TOKEN in .env');
            console.log('   6. Make sure there are no spaces before/after');
            console.log('');
          } else if (loginError.message.includes('intent')) {
            console.log('   Intent issue detected');
            console.log('');
            console.log('   Fix:');
            console.log('   1. Go to https://discord.com/developers/applications');
            console.log('   2. Select your application → Bot');
            console.log('   3. Scroll to "Privileged Gateway Intents"');
            console.log('   4. Enable required intents:');
            console.log('      - GUILD_MEMBERS (for member info)');
            console.log('      - MESSAGE_CONTENT (for message commands)');
            console.log('   5. Save changes');
            console.log('   6. Restart your bot');
            console.log('');
          } else if (loginError.message.includes('timeout') || loginError.message.includes('ECONNREFUSED')) {
            console.log('   Network/connection issue');
            console.log('');
            console.log('   Possible causes:');
            console.log('   • Firewall blocking Discord');
            console.log('   • VPN interfering with connection');
            console.log('   • Discord is down (check https://discordstatus.com)');
            console.log('');
          }
        }
        
        try {
          await client.destroy();
        } catch {}
      }
      
    } catch (err) {
      error('Login attempt failed: ' + err.message);
      console.log('');
      console.log(colors.dim + err.stack + colors.reset);
      console.log('');
    }
  }

  // Step 4: Check intents
  section('4. Bot Intents Configuration');
  
  info('Required intents for this bot:');
  console.log('   • GUILDS (required)');
  console.log('   • GUILD_MESSAGES (for message features)');
  console.log('   • GUILD_MESSAGE_REACTIONS (for reactions)');
  console.log('');
  console.log('To enable these:');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Select your application → Bot');
  console.log('3. Scroll to "Privileged Gateway Intents"');
  console.log('4. Enable as needed');
  console.log('');

  // Step 5: Bot permissions check
  section('5. Bot Permissions');
  
  info('Required permissions for full functionality:');
  console.log('   • View Channels');
  console.log('   • Send Messages');
  console.log('   • Manage Messages');
  console.log('   • Embed Links');
  console.log('   • Add Reactions');
  console.log('   • Use Slash Commands');
  console.log('');
  console.log('When inviting bot, make sure these are selected!');
  console.log('');

  // Summary
  section('Summary');
  
  if (issues.length === 0) {
    console.log(colors.green + colors.bright + '✅ Discord bot is properly configured!' + colors.reset);
    console.log('');
    console.log('Your bot should be able to connect without issues.');
    console.log('');
    console.log(colors.bright + 'Next steps:' + colors.reset);
    console.log('');
    console.log('1. Start the bot:');
    console.log(colors.cyan + '   npm run pm2:start' + colors.reset);
    console.log('');
    console.log('2. Check it\'s online in Discord');
    console.log('');
    console.log('3. Try a slash command:');
    console.log(colors.cyan + '   /event action:create' + colors.reset);
    console.log('');
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });
    console.log('');
    console.log('Fix these issues then run this diagnostic again:');
    console.log(colors.cyan + '  node discord-diagnostic.js' + colors.reset);
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
