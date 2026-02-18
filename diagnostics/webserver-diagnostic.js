#!/usr/bin/env node
// webserver-diagnostic.js - Web server troubleshooting

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

function error(msg)   { console.log(colors.red + '❌ ' + msg + colors.reset); issues.push(msg); }
function warn(msg)    { console.log(colors.yellow + '⚠️  ' + msg + colors.reset); }
function success(msg) { console.log(colors.green + '✅ ' + msg + colors.reset); }
function info(msg)    { console.log(colors.cyan + 'ℹ️  ' + msg + colors.reset); }
function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '━━━ ' + title + ' ━━━' + colors.reset);
  console.log('');
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve({ available: err.code !== 'EADDRINUSE', inUse: err.code === 'EADDRINUSE' }));
    server.once('listening', () => { server.close(); resolve({ available: true }); });
    server.listen(port);
  });
}

function testHttpConnection(port, urlPath = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ success: true, statusCode: res.statusCode, body: data.substring(0, 200) }));
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
  });
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🌐 Web Server Diagnostic                          ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');

  const port = process.env.WEB_PORT || 3000;

  // Step 1: Check web server files
  section('1. Web Server Files');
  
  const webServerPath = path.join(PROJECT_ROOT, 'web-server.js');
  if (!fs.existsSync(webServerPath)) {
    error('web-server.js not found at project root');
    console.log('   Expected: ' + webServerPath);
  } else {
    success('web-server.js found');
  }
  
  const publicPath = path.join(PROJECT_ROOT, 'public');
  if (!fs.existsSync(publicPath)) {
    warn('public/ directory not found — static files may not load');
  } else {
    success('public/ directory exists');
    if (fs.existsSync(path.join(publicPath, 'index.html'))) {
      success('public/index.html found');
    } else {
      warn('public/index.html not found — homepage may not load');
    }
  }

  // Step 2: Configuration
  section('2. Web Server Configuration');
  
  const username = process.env.WEB_USERNAME || 'admin';
  const password = process.env.WEB_PASSWORD || 'admin';
  const apiKey   = process.env.WEB_API_KEY;
  
  console.log(`   Port: ${port}`);
  console.log(`   Username: ${username}`);
  
  if (password === 'admin' || !password) {
    warn('Default/empty password detected — change WEB_PASSWORD in .env');
  } else {
    success('Custom password configured');
  }
  
  if (!apiKey) {
    info('WEB_API_KEY not set — running in development mode (no API auth)');
  } else {
    success('WEB_API_KEY configured');
  }

  // Step 3: Port availability
  section('3. Port Availability');
  
  info(`Checking port ${port}...`);
  const portCheck = await checkPort(port);
  
  if (portCheck.available) {
    success(`Port ${port} is available`);
  } else if (portCheck.inUse) {
    info(`Port ${port} is in use — server may already be running`);
  } else {
    error(`Cannot check port: ${portCheck.error}`);
  }

  // Step 4: Server status
  section('4. Server Status');
  
  info('Testing connection to web server...');
  const connTest = await testHttpConnection(port);
  
  if (connTest.success) {
    success(`Web server is running on port ${port}! 🎉`);
    console.log(`   HTTP Status: ${connTest.statusCode}`);
    console.log(`   URL: ${colors.cyan}http://localhost:${port}${colors.reset}`);
    if (connTest.statusCode !== 200 && connTest.statusCode !== 302) {
      warn(`Unusual response code: ${connTest.statusCode}`);
    }
  } else {
    error('Web server is not running or not responding');
    console.log(`   Error: ${connTest.error}`);
    console.log('');
    console.log('   Start with: npm run pm2:start');
    console.log('   Or standalone: node web-server.js');
  }

  // Step 5: PM2 process status
  section('5. PM2 Process Status');
  
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const botProcess = processes.find(p => p.name === 'discord-event-bot');
    const webProcess = processes.find(p => p.name === 'web-server');
    
    if (!botProcess && !webProcess) {
      warn('No relevant PM2 processes found');
      console.log('   Start with: npm run pm2:start');
    } else {
      if (botProcess) {
        const icon = botProcess.pm2_env.status === 'online' ? '🟢' : '🔴';
        console.log(`   ${icon} discord-event-bot: ${botProcess.pm2_env.status}`);
        if (botProcess.pm2_env.status !== 'online') {
          warn('Bot process is not online — run: pm2 restart discord-event-bot');
        }
      }
      if (webProcess) {
        const icon = webProcess.pm2_env.status === 'online' ? '🟢' : '🔴';
        console.log(`   ${icon} web-server: ${webProcess.pm2_env.status}`);
      }
      if (!webProcess && botProcess) {
        info('Web server runs as part of the discord-event-bot process');
      }
    }
  } catch (err) {
    info('PM2 not available — run server directly: node web-server.js');
  }

  // Step 6: API endpoint check
  section('6. API Endpoints');
  
  if (connTest.success) {
    const endpoints = [
      { path: '/api/events', name: 'Events API' },
      { path: '/api/calendars', name: 'Calendars API' }
    ];
    
    for (const ep of endpoints) {
      const test = await testHttpConnection(port, ep.path);
      if (test.success) {
        // 401/403 is fine — means the endpoint exists but needs auth
        const ok = [200, 401, 403].includes(test.statusCode);
        if (ok) {
          success(`${ep.name} (${ep.path}) — responds with HTTP ${test.statusCode}`);
        } else {
          warn(`${ep.name} returned unexpected status: ${test.statusCode}`);
        }
      } else {
        warn(`${ep.name} not reachable: ${test.error}`);
      }
    }
  } else {
    warn('Cannot test endpoints — server not running');
  }

  // Step 7: Troubleshooting tips
  section('7. Troubleshooting Tips');
  
  console.log('If the web UI loads but behaves incorrectly:');
  console.log('');
  console.log('1. Browser console (F12):');
  console.log('   • Look for JavaScript errors (red text)');
  console.log('   • Look for failed API requests (Network tab)');
  console.log('');
  console.log('2. Hard refresh:  Ctrl+Shift+R  (Cmd+Shift+R on Mac)');
  console.log('');
  console.log('3. Check bot logs:  pm2 logs discord-event-bot');
  console.log('');
  console.log('4. Common issues:');
  console.log('   • Login fails → check WEB_USERNAME / WEB_PASSWORD in .env');
  console.log('   • Events don\'t load → run: node diagnostics/database-diagnostic.js');
  console.log('   • Calendars don\'t sync → run: node diagnostics/calendar-sync-debugger.js');

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
      console.log('Start it:  ' + colors.cyan + 'npm run pm2:start' + colors.reset);
      console.log('');
    }
  } else {
    console.log(colors.red + colors.bright + `❌ Found ${issues.length} issue(s):` + colors.reset);
    console.log('');
    issues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
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
