#!/usr/bin/env node
// pm2-start-custom.js - Custom PM2 Startup Script with Enhanced Information

require('dotenv').config();
const { exec, spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

const PORT = process.env.WEB_PORT || 3000;

function printHeader() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║' + colors.reset + '       🚀 Discord Event Bot - PM2 Startup Manager       ' + colors.cyan + colors.bright + '║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
}

function printSection(title) {
  console.log('');
  console.log(colors.yellow + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

async function checkPM2Installed() {
  return new Promise((resolve) => {
    exec('pm2 --version', (error) => {
      resolve(!error);
    });
  });
}

async function stopExistingProcesses() {
  return new Promise((resolve) => {
    exec('pm2 delete all', { stdio: 'ignore' }, () => {
      resolve();
    });
  });
}

async function startPM2() {
  return new Promise((resolve, reject) => {
    const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');
    
    exec(`pm2 start ${ecosystemPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(colors.red + '❌ Error starting PM2:' + colors.reset, error.message);
        reject(error);
        return;
      }
      
      console.log(stdout);
      resolve();
    });
  });
}

function printServerInfo() {
  printSection('🌐 Server Information');
  
  console.log(colors.green + '  ✅ Web Interface:' + colors.reset);
  console.log(colors.bright + `     http://localhost:${PORT}` + colors.reset);
  console.log('');
  console.log(colors.cyan + '  📡 API Endpoint:' + colors.reset);
  console.log(colors.bright + `     http://localhost:${PORT}/api` + colors.reset);
  console.log('');
  console.log(colors.magenta + '  🔐 Default Credentials:' + colors.reset);
  console.log(`     Username: ${process.env.WEB_USERNAME || 'admin'}`);
  console.log(`     Password: ${process.env.WEB_PASSWORD || 'admin'}`);
  console.log('');
}

function printPM2Commands() {
  printSection('📋 Available PM2 Commands');
  
  const commands = [
    { cmd: 'pm2 status', desc: 'Show process status' },
    { cmd: 'pm2 logs', desc: 'Show live logs (all processes)' },
    { cmd: 'pm2 logs discord-event-bot', desc: 'Show Discord bot logs only' },
    { cmd: 'pm2 logs web-server', desc: 'Show web server logs only' },
    { cmd: 'pm2 monit', desc: 'Real-time process monitoring' },
    { cmd: 'pm2 restart all', desc: 'Restart all processes' },
    { cmd: 'pm2 restart discord-event-bot', desc: 'Restart Discord bot only' },
    { cmd: 'pm2 restart web-server', desc: 'Restart web server only' },
    { cmd: 'pm2 stop all', desc: 'Stop all processes' },
    { cmd: 'pm2 delete all', desc: 'Delete all processes from PM2' },
    { cmd: 'pm2 save', desc: 'Save current process list' },
    { cmd: 'pm2 startup', desc: 'Generate startup script' },
    { cmd: 'npm run pm2:monitor', desc: 'Launch custom live monitor' }
  ];
  
  const maxCmdLength = Math.max(...commands.map(c => c.cmd.length));
  
  commands.forEach(({ cmd, desc }) => {
    const padding = ' '.repeat(maxCmdLength - cmd.length + 2);
    console.log(`  ${colors.cyan}${cmd}${colors.reset}${padding}${colors.dim}${desc}${colors.reset}`);
  });
  
  console.log('');
}

function printNPMScripts() {
  printSection('🔧 NPM Quick Commands');
  
  const scripts = [
    { cmd: 'npm run pm2:status', desc: 'Check PM2 status' },
    { cmd: 'npm run pm2:logs', desc: 'View logs' },
    { cmd: 'npm run pm2:restart', desc: 'Restart all processes' },
    { cmd: 'npm run pm2:stop', desc: 'Stop all processes' },
    { cmd: 'npm run pm2:monitor', desc: 'Launch live monitor dashboard' },
    { cmd: 'npm run pm2:delete', desc: 'Remove all processes from PM2' }
  ];
  
  const maxCmdLength = Math.max(...scripts.map(s => s.cmd.length));
  
  scripts.forEach(({ cmd, desc }) => {
    const padding = ' '.repeat(maxCmdLength - cmd.length + 2);
    console.log(`  ${colors.green}${cmd}${colors.reset}${padding}${colors.dim}${desc}${colors.reset}`);
  });
  
  console.log('');
}

function printNextSteps() {
  printSection('🎯 Next Steps');
  
  console.log(colors.bright + '  1. Open your browser:' + colors.reset);
  console.log(`     ${colors.cyan}http://localhost:${PORT}${colors.reset}`);
  console.log('');
  console.log(colors.bright + '  2. Monitor processes:' + colors.reset);
  console.log(`     ${colors.green}npm run pm2:monitor${colors.reset}  ${colors.dim}(recommended)${colors.reset}`);
  console.log(`     ${colors.cyan}pm2 logs${colors.reset}              ${colors.dim}(view logs)${colors.reset}`);
  console.log('');
  console.log(colors.bright + '  3. Check status anytime:' + colors.reset);
  console.log(`     ${colors.cyan}pm2 status${colors.reset}`);
  console.log('');
}

function launchMonitor() {
  console.log(colors.yellow + '🔄 Launching PM2 Monitor in 3 seconds...' + colors.reset);
  console.log(colors.dim + '   (Press Ctrl+C in monitor to exit, processes keep running)' + colors.reset);
  console.log('');
  
  setTimeout(() => {
    const monitorPath = path.join(__dirname, 'pm2-monitor.js');
    const monitor = spawn('node', [monitorPath], {
      stdio: 'inherit'
    });
    
    monitor.on('error', (error) => {
      console.error(colors.red + '❌ Failed to start monitor:' + colors.reset, error.message);
      process.exit(1);
    });
    
    monitor.on('exit', (code) => {
      if (code !== 0) {
        console.log('');
        console.log(colors.yellow + '⚠️  Monitor exited' + colors.reset);
      }
      process.exit(code);
    });
  }, 3000);
}

async function main() {
  try {
    printHeader();
    
    // Check if PM2 is installed
    console.log('🔍 Checking PM2 installation...');
    const pm2Installed = await checkPM2Installed();
    
    if (!pm2Installed) {
      console.error(colors.red + '❌ PM2 is not installed!' + colors.reset);
      console.log('');
      console.log('Install it with:');
      console.log(colors.cyan + '  npm install -g pm2' + colors.reset);
      console.log('');
      process.exit(1);
    }
    
    console.log(colors.green + '✅ PM2 is installed' + colors.reset);
    console.log('');
    
    // Stop any existing processes
    console.log('🧹 Cleaning up existing processes...');
    await stopExistingProcesses();
    console.log(colors.green + '✅ Cleanup complete' + colors.reset);
    console.log('');
    
    // Start PM2 processes
    console.log('🚀 Starting PM2 processes...');
    console.log('');
    await startPM2();
    
    // Give processes a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Print information
    printServerInfo();
    printPM2Commands();
    printNPMScripts();
    printNextSteps();
    
    // Launch monitor
    launchMonitor();
    
  } catch (error) {
    console.error('');
    console.error(colors.red + '❌ Startup failed:' + colors.reset, error.message);
    console.error('');
    process.exit(1);
  }
}

// Run
main();
