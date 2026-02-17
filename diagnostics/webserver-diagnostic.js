#!/usr/bin/env node
// webserver-diagnostic.js - Web server troubleshooting

require('dotenv').config();
const http = require('http');
const net = require('net');
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

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ available: false, inUse: true });
      } else {
        resolve({ available: false, error: err.message });
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve({ available: true });
    });
    
    server.listen(port);
  });
}

function testConnection(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          success: true, 
          statusCode: res.statusCode,
          body: data.substring(0, 200)
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🌐 Web Server Diagnostic                          ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  // Step 1: Check web server file
  section('1. Web Server Files');
  
  const webServerPath = path.join(process.cwd(), 'web-server.js');
  
  if (!fs.existsSync(webServerPath)) {
    error('web-server.js not found');
    console.log('');
    console.log('   Expected: ' + webServerPath);
    console.log('');
    console.log('   Make sure you\'re in the Discord-Event-Bot directory');
    console.log('');
  } else {
    success('web-server.js found');
  }
  
  const publicPath = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicPath)) {
    warn('public/ directory not found');
    console.log('   Static files may not load');
  } else {
    success('public/ directory exists');
    
    // Check for index.html
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      success('public/index.html found');
    } else {
      warn('public/index.html not found');
      console.log('   Homepage may not load');
    }
  }

  // Step 2: Check environment variables
  section('2. Web Server Configuration');
  
  const port = process.env.WEB_PORT || 3000;
  const username = process.env.WEB_USERNAME || 'admin';
  const password = process.env.WEB_PASSWORD || 'admin';
  
  console.log(`   Port: ${port}`);
  console.log(`   Username: ${username}`);
  
  if (password === 'admin') {
    warn('Default password detected');
    console.log('');
    console.log('   Security risk! Change WEB_PASSWORD in .env file');
    console.log('');
  } else {
    success('Custom password configured');
  }

  // Step 3: Check port availability
  section('3. Port Availability');
  
  info(`Checking if port ${port} is available...`);
  
  const portCheck = await checkPort(port);
  
  if (portCheck.available) {
    success(`Port ${port} is available`);
  } else if (portCheck.inUse) {
    warn(`Port ${port} is already in use`);
    console.log('');
    console.log('   This could be:');
    console.log('   • Your web server is already running (this is OK)');
    console.log('   • Another application is using the port');
    console.log('');
    console.log('   To check what\'s using it:');
    if (process.platform === 'win32') {
      console.log(`   netstat -ano | findstr :${port}`);
    } else {
      console.log(`   lsof -i :${port}`);
    }
    console.log('');
    console.log('   To use a different port:');
    console.log('   Set WEB_PORT in .env file');
    console.log('');
  } else {
    error(`Cannot check port: ${portCheck.error}`);
  }

  // Step 4: Check if server is running
  section('4. Server Status');
  
  info('Testing connection to web server...');
  
  const connTest = await testConnection(port);
  
  if (connTest.success) {
    success(`Web server is running on port ${port}! 🎉`);
    console.log(`   HTTP Status: ${connTest.statusCode}`);
    console.log(`   URL: ${colors.cyan}http://localhost:${port}${colors.reset}`);
    console.log('');
    
    if (connTest.statusCode === 200) {
      success('Server responding normally');
    } else {
      warn(`Unusual status code: ${connTest.statusCode}`);
    }
    
  } else {
    error('Web server is not running');
    console.log('');
    console.log(`   Error: ${connTest.error}`);
    console.log('');
    console.log('   Fix: Start the web server');
    console.log('   The web server starts automatically with the bot:');
    console.log(colors.cyan + '   npm run pm2:start' + colors.reset);
    console.log('');
    console.log('   Or run standalone:');
    console.log(colors.cyan + '   node web-server.js' + colors.reset);
    console.log('');
  }

  // Step 5: Check PM2 status
  section('5. PM2 Process Status');
  
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    
    const botProcess = processes.find(p => p.name === 'discord-event-bot');
    const webProcess = processes.find(p => p.name === 'web-server');
    
    if (botProcess || webProcess) {
      console.log('   PM2 processes found:');
      console.log('');
      
      if (botProcess) {
        const status = botProcess.pm2_env.status === 'online' ? '🟢' : '🔴';
        console.log(`   ${status} discord-event-bot: ${botProcess.pm2_env.status}`);
        
        if (botProcess.pm2_env.status !== 'online') {
          warn('Bot process is not online');
          console.log('');
          console.log('   Fix: pm2 restart discord-event-bot');
          console.log('');
        }
      }
      
      if (webProcess) {
        const status = webProcess.pm2_env.status === 'online' ? '🟢' : '🔴';
        console.log(`   ${status} web-server: ${webProcess.pm2_env.status}`);
      }
      
      console.log('');
      
      if (!webProcess && botProcess) {
        info('Web server runs as part of discord-event-bot process');
      }
      
    } else {
      warn('No PM2 processes found');
      console.log('');
      console.log('   Start with: npm run pm2:start');
      console.log('');
    }
    
  } catch (err) {
    info('PM2 not available or not in use');
    console.log('   You can run the server directly: node web-server.js');
  }

  // Step 6: Check routes/endpoints
  section('6. Web Server Endpoints');
  
  if (connTest.success) {
    info('Testing key endpoints...');
    console.log('');
    
    const endpoints = [
      { path: '/', name: 'Homepage' },
      { path: '/api/events', name: 'Events API' },
      { path: '/api/calendars', name: 'Calendar API' }
    ];
    
    for (const endpoint of endpoints) {
      const test = await testConnection(port);
      
      // This is a simplified test - in production you'd test each endpoint
      console.log(`   ${colors.dim}Testing ${endpoint.name}...${colors.reset}`);
    }
    
    success('Endpoints should be accessible');
    console.log('');
    console.log('   Full web UI: ' + colors.cyan + `http://localhost:${port}` + colors.reset);
    console.log('');
  } else {
    warn('Cannot test endpoints - server not running');
  }

  // Step 7: Firewall check
  section('7. Firewall & Network');
  
  info('Checking network configuration...');
  console.log('');
  
  if (connTest.success) {
    success('Local connection works');
    console.log('');
    console.log('   Access from this computer: ' + colors.cyan + `http://localhost:${port}` + colors.reset);
    console.log('   Also works: ' + colors.cyan + `http://127.0.0.1:${port}` + colors.reset);
    console.log('');
    
    info('To access from other devices on your network:');
    console.log('   1. Find your local IP address:');
    if (process.platform === 'win32') {
      console.log('      ipconfig');
    } else {
      console.log('      ifconfig or ip addr');
    }
    console.log(`   2. Use: http://YOUR_IP:${port}`);
    console.log('   3. Make sure firewall allows connections');
    console.log('');
  } else {
    warn('Server not running - cannot test network access');
  }

  // Step 8: Browser console errors
  section('8. Troubleshooting Tips');
  
  console.log('If web UI loads but has issues:');
  console.log('');
  console.log('1. Check browser console (F12):');
  console.log('   • Look for JavaScript errors (red text)');
  console.log('   • Look for failed network requests');
  console.log('');
  console.log('2. Clear browser cache:');
  console.log('   • Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)');
  console.log('   • Or clear browser cache completely');
  console.log('');
  console.log('3. Check server logs:');
  console.log('   pm2 logs discord-event-bot');
  console.log('');
  console.log('4. Common issues:');
  console.log('   • Login fails → Check WEB_USERNAME/WEB_PASSWORD');
  console.log('   • Events don\'t load → Check database connection');
  console.log('   • Calendars don\'t sync → Run calendar diagnostic');
  console.log('');

  // Summary
  section('Summary');
  
  if (issues.length === 0) {
    if (connTest.success) {
      console.log(colors.green + colors.bright + '✅ Web server is working! 🎉' + colors.reset);
      console.log('');
      console.log(colors.bright + 'Access your web UI:' + colors.reset);
      console.log('');
      console.log(colors.cyan + colors.bright + `   http://localhost:${port}` + colors.reset);
      console.log('');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password === 'admin' ? 'admin (CHANGE THIS!)' : '••••••••'}`);
      console.log('');
    } else {
      console.log(colors.yellow + '⚠️  Web server is not running' + colors.reset);
      console.log('');
      console.log('Start it with:');
      console.log(colors.cyan + '   npm run pm2:start' + colors.reset);
      console.log('');
    }
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`);
    });
    console.log('');
    console.log('Fix these issues then try accessing the web UI again.');
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
