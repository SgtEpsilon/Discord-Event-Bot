#!/usr/bin/env node
// pm2-start.js - Custom PM2 Startup with Live Monitoring

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = process.env.WEB_PORT || 3000;
const discordToken = process.env.DISCORD_TOKEN ? '✅' : '❌';

// ANSI color codes for better visual appeal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

function printBanner() {
  console.log('\n');
  console.log(colors.cyan + colors.bright + '╔══════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║                                                              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '║         ' + colors.magenta + '🎮 DISCORD EVENT BOT - PM2 LAUNCHER' + colors.cyan + '              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '║                                                              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚══════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
}

function printConfig() {
  console.log(colors.bright + '📋 Configuration' + colors.reset);
  console.log(colors.dim + '─'.repeat(64) + colors.reset);
  console.log(`   ${colors.cyan}Web Port:${colors.reset}       ${colors.green}${port}${colors.reset} ${colors.dim}(from .env)${colors.reset}`);
  console.log(`   ${colors.cyan}Discord Token:${colors.reset}  ${discordToken === '✅' ? colors.green : colors.red}${discordToken} ${discordToken === '✅' ? 'Configured' : 'Missing'}${colors.reset}`);
  console.log('');
}

function ensureLogsDir() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`   ${colors.green}✓${colors.reset} Created logs directory`);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function getProcessStats(callback) {
  exec('pm2 jlist', (error, stdout) => {
    if (error) {
      callback(null);
      return;
    }
    
    try {
      const processes = JSON.parse(stdout);
      const stats = {};
      
      processes.forEach(proc => {
        if (proc.name === 'discord-event-bot' || proc.name === 'web-server') {
          stats[proc.name] = {
            status: proc.pm2_env.status,
            cpu: proc.monit.cpu,
            memory: proc.monit.memory,
            uptime: Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000),
            restarts: proc.pm2_env.restart_time
          };
        }
      });
      
      callback(stats);
    } catch (e) {
      callback(null);
    }
  });
}

function displayLiveStats() {
  console.log(colors.bright + '📊 Live Process Monitor' + colors.reset);
  console.log(colors.dim + '─'.repeat(64) + colors.reset);
  console.log('');
  
  let updateCount = 0;
  const maxUpdates = 10; // Show stats for 10 seconds
  
  const interval = setInterval(() => {
    getProcessStats((stats) => {
      if (!stats) {
        clearInterval(interval);
        return;
      }
      
      // Clear previous lines (move cursor up and clear)
      if (updateCount > 0) {
        process.stdout.write('\x1b[8A'); // Move up 8 lines
        process.stdout.write('\x1b[0J'); // Clear from cursor down
      }
      
      // Discord Bot Stats
      const bot = stats['discord-event-bot'];
      if (bot) {
        const statusColor = bot.status === 'online' ? colors.green : colors.red;
        const statusIcon = bot.status === 'online' ? '●' : '○';
        
        console.log(`   ${colors.cyan}${colors.bright}🤖 Discord Bot${colors.reset}`);
        console.log(`      Status:   ${statusColor}${statusIcon} ${bot.status}${colors.reset}`);
        console.log(`      CPU:      ${colors.yellow}${bot.cpu}%${colors.reset}`);
        console.log(`      Memory:   ${colors.blue}${formatBytes(bot.memory)}${colors.reset}`);
        console.log(`      Uptime:   ${colors.green}${formatUptime(bot.uptime)}${colors.reset}`);
        console.log('');
      }
      
      // Web Server Stats
      const web = stats['web-server'];
      if (web) {
        const statusColor = web.status === 'online' ? colors.green : colors.red;
        const statusIcon = web.status === 'online' ? '●' : '○';
        
        console.log(`   ${colors.cyan}${colors.bright}🌐 Web Server${colors.reset}`);
        console.log(`      Status:   ${statusColor}${statusIcon} ${web.status}${colors.reset}`);
        console.log(`      CPU:      ${colors.yellow}${web.cpu}%${colors.reset}`);
        console.log(`      Memory:   ${colors.blue}${formatBytes(web.memory)}${colors.reset}`);
        console.log(`      Uptime:   ${colors.green}${formatUptime(web.uptime)}${colors.reset}`);
        console.log('');
      }
      
      updateCount++;
      
      if (updateCount >= maxUpdates) {
        clearInterval(interval);
        displayFinalInfo();
      }
    });
  }, 1000);
}

function displayFinalInfo() {
  console.log('');
  console.log(colors.bright + '🔗 Access Points' + colors.reset);
  console.log(colors.dim + '─'.repeat(64) + colors.reset);
  console.log(`   ${colors.cyan}Web UI:${colors.reset}         ${colors.green}${colors.bright}http://localhost:${port}${colors.reset}`);
  console.log(`   ${colors.cyan}Local Network:${colors.reset}  ${colors.green}http://YOUR_IP:${port}${colors.reset}`);
  console.log('');
  
  console.log(colors.bright + '📋 Management Commands' + colors.reset);
  console.log(colors.dim + '─'.repeat(64) + colors.reset);
  console.log(`   ${colors.yellow}npm run pm2:logs${colors.reset}      - View live logs`);
  console.log(`   ${colors.yellow}npm run pm2:status${colors.reset}    - Check process status`);
  console.log(`   ${colors.yellow}npm run pm2:restart${colors.reset}   - Restart all services`);
  console.log(`   ${colors.yellow}npm run pm2:stop${colors.reset}      - Stop all services`);
  console.log(`   ${colors.yellow}pm2 monit${colors.reset}             - Interactive dashboard`);
  console.log('');
  
  console.log(colors.dim + '─'.repeat(64) + colors.reset);
  console.log(colors.green + colors.bright + '✅ All services running successfully!' + colors.reset);
  console.log(colors.dim + '   Press Ctrl+C to stop monitoring (services will keep running)' + colors.reset);
  console.log('');
}

// Main execution
printBanner();
printConfig();

console.log(colors.bright + '🚀 Starting PM2 Services' + colors.reset);
console.log(colors.dim + '─'.repeat(64) + colors.reset);

ensureLogsDir();

console.log(`   ${colors.cyan}>${colors.reset} Launching processes...`);

exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
  if (error) {
    console.log(`   ${colors.red}✗${colors.reset} Failed to start: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`   ${colors.green}✓${colors.reset} PM2 processes started`);
  console.log('');
  
  // Wait a moment for processes to initialize
  setTimeout(() => {
    displayLiveStats();
  }, 2000);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n');
  console.log(colors.yellow + '⚠️  Monitoring stopped (services still running)' + colors.reset);
  console.log(colors.dim + '   Use "npm run pm2:stop" to stop services' + colors.reset);
  console.log('');
  process.exit(0);
});
