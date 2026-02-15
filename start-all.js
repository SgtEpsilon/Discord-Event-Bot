// start-all.js - Cross-platform solution to start both servers
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Discord Event Bot with Web Interface...\n');

// Start Discord bot
console.log('📡 Starting Discord bot...');
const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
});

// Wait a bit for the bot to initialize
setTimeout(() => {
    // Start web server
    console.log('🌐 Starting web server...');
    const web = spawn('node', ['web-server.js'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
    });
    
    // Handle web server termination
    web.on('exit', (code) => {
        console.log(`\n❌ Web server exited with code ${code}`);
        bot.kill();
        process.exit(code);
    });
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    bot.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down...');
    bot.kill();
    process.exit(0);
});

bot.on('exit', (code) => {
    console.log(`\n❌ Discord bot exited with code ${code}`);
    process.exit(code);
});

// Display startup info after a delay
setTimeout(() => {
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Both servers started successfully!');
    console.log('═'.repeat(60));
    console.log('📡 Discord bot: Running');
    console.log('🌐 Web interface: http://localhost:3000');
    console.log('═'.repeat(60));
    console.log('\n💡 Press Ctrl+C to stop both servers\n');
}, 3000);
