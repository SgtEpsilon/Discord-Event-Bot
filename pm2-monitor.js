#!/usr/bin/env node
// pm2-monitor.js - Live PM2 Process Monitor with Auto-refresh

require('dotenv').config();
const { exec } = require('child_process');

const port = process.env.WEB_PORT || 3000;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bgBlack: '\x1b[40m'
};

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
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
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function getProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let color;
  if (percentage < 50) color = colors.green;
  else if (percentage < 80) color = colors.yellow;
  else color = colors.red;
  
  return color + '█'.repeat(filled) + colors.dim + '░'.repeat(empty) + colors.reset;
}

function displayDashboard(stats) {
  clearScreen();
  
  const timestamp = new Date().toLocaleString();
  
  // Header
  console.log(colors.cyan + colors.bright + '╔══════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║' + colors.reset + '              ' + colors.magenta + colors.bright + '🎮 DISCORD EVENT BOT - LIVE MONITOR' + colors.reset + '                  ' + colors.cyan + colors.bright + '║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚══════════════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
  console.log(colors.dim + `Last Updated: ${timestamp}` + colors.reset);
  console.log('');
  
  if (!stats) {
    console.log(colors.red + '❌ Unable to fetch PM2 process stats' + colors.reset);
    console.log(colors.dim + 'Make sure PM2 is running: pm2 list' + colors.reset);
    return;
  }
  
  // Discord Bot Section
  const bot = stats['discord-event-bot'];
  if (bot) {
    const statusColor = bot.status === 'online' ? colors.green : colors.red;
    const statusIcon = bot.status === 'online' ? '●' : '○';
    
    console.log(colors.cyan + colors.bright + '┌─ 🤖 DISCORD BOT ' + '─'.repeat(54) + colors.reset);
    console.log(`│ Status:    ${statusColor}${statusIcon} ${bot.status.toUpperCase()}${colors.reset}`);
    console.log(`│ CPU:       ${bot.cpu.toFixed(1)}% ${getProgressBar(bot.cpu)}`);
    console.log(`│ Memory:    ${formatBytes(bot.memory)} ${getProgressBar((bot.memory / (1024 * 1024 * 1024)) * 100)}`);
    console.log(`│ Uptime:    ${colors.green}${formatUptime(bot.uptime)}${colors.reset}`);
    console.log(`│ Restarts:  ${bot.restarts === 0 ? colors.green : colors.yellow}${bot.restarts}${colors.reset}`);
    console.log(colors.cyan + '└' + '─'.repeat(70) + colors.reset);
    console.log('');
  }
  
  // Web Server Section
  const web = stats['web-server'];
  if (web) {
    const statusColor = web.status === 'online' ? colors.green : colors.red;
    const statusIcon = web.status === 'online' ? '●' : '○';
    
    console.log(colors.blue + colors.bright + '┌─ 🌐 WEB SERVER ' + '─'.repeat(54) + colors.reset);
    console.log(`│ Status:    ${statusColor}${statusIcon} ${web.status.toUpperCase()}${colors.reset}`);
    console.log(`│ CPU:       ${web.cpu.toFixed(1)}% ${getProgressBar(web.cpu)}`);
    console.log(`│ Memory:    ${formatBytes(web.memory)} ${getProgressBar((web.memory / (1024 * 1024 * 1024)) * 100)}`);
    console.log(`│ Uptime:    ${colors.green}${formatUptime(web.uptime)}${colors.reset}`);
    console.log(`│ Restarts:  ${web.restarts === 0 ? colors.green : colors.yellow}${web.restarts}${colors.reset}`);
    console.log(`│ URL:       ${colors.green}${colors.bright}http://localhost:${port}${colors.reset}`);
    console.log(colors.blue + '└' + '─'.repeat(70) + colors.reset);
    console.log('');
  }
  
  // Quick Commands
  console.log(colors.yellow + colors.bright + '📋 Quick Commands' + colors.reset);
  console.log(colors.dim + '─'.repeat(72) + colors.reset);
  console.log(`  ${colors.cyan}pm2 logs${colors.reset}           View live logs`);
  console.log(`  ${colors.cyan}pm2 restart all${colors.reset}    Restart both services`);
  console.log(`  ${colors.cyan}pm2 stop all${colors.reset}       Stop both services`);
  console.log(`  ${colors.cyan}Ctrl+C${colors.reset}             Exit monitor (services keep running)`);
  console.log('');
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

function startMonitoring() {
  // Initial display
  getProcessStats(displayDashboard);
  
  // Update every 2 seconds
  const interval = setInterval(() => {
    getProcessStats(displayDashboard);
  }, 2000);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    clearScreen();
    console.log('');
    console.log(colors.green + '✅ Monitor stopped (services still running)' + colors.reset);
    console.log(colors.dim + '   Use "pm2 stop all" to stop services' + colors.reset);
    console.log('');
    process.exit(0);
  });
}

// Start monitoring
startMonitoring();