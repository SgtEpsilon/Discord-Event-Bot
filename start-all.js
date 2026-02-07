// start-all.js - Cross-platform solution to start both servers
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Discord Event Bot with Web Interface...\n');

// Start Discord bot
console.log('📡 Starting Discord bot...');
const bot = spawn('node', ['src/bot.js'], {
    stdio: 'inherit',
    shell: true
});

// Start web server
console.log('🌐 Starting web server...');
const web = spawn('node', ['web-server.js'], {
    stdio: 'inherit',
    shell: true
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    bot.kill();
    web.kill();
    process.exit(0);
});

bot.on('exit', (code) => {
    console.log(`\n❌ Discord bot exited with code ${code}`);
    web.kill();
    process.exit(code);
});

web.on('exit', (code) => {
    console.log(`\n❌ Web server exited with code ${code}`);
    bot.kill();
    process.exit(code);
});

console.log('\n✅ Both servers started!');
console.log('📡 Discord bot: Running');
console.log('🌐 Web interface: http://localhost:3000');
console.log('\n💡 Press Ctrl+C to stop both servers\n');
