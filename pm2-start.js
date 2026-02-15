#!/usr/bin/env node
// pm2-start.js - Custom PM2 startup script with URL display

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     Discord Event Bot - PM2 Startup Manager           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Created logs directory\n');
}

// Get port from environment or use default
const port = process.env.WEB_PORT || 3000;

console.log('🚀 Starting services with PM2...\n');

// Start PM2 processes
exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error starting PM2:', error.message);
        process.exit(1);
    }
    
    if (stderr) {
        console.error('⚠️  PM2 stderr:', stderr);
    }
    
    console.log(stdout);
    
    // Display status after a brief delay
    setTimeout(() => {
        exec('pm2 list', (err, out) => {
            if (!err) {
                console.log('\n' + '═'.repeat(60));
                console.log('✅ Services Started Successfully!');
                console.log('═'.repeat(60));
                console.log('📡 Discord Bot: Running');
                console.log(`🌐 Web Interface: http://localhost:${port}`);
                console.log('═'.repeat(60));
                console.log('\n📋 Available Commands:');
                console.log('  npm run pm2:logs     - View live logs');
                console.log('  npm run pm2:status   - Check process status');
                console.log('  npm run pm2:restart  - Restart all services');
                console.log('  npm run pm2:stop     - Stop all services');
                console.log('\n💡 Run "pm2 monit" for an interactive dashboard\n');
            }
        });
    }, 1500);
});
