# Discord Event Bot - Startup Guide

## Quick Start Methods

### Method 1: Standard Startup (Node.js)
Start both the Discord bot and web server together:
```bash
npm run start:all
```

This will:
- ✅ Start the Discord bot
- ✅ Start the web server on port 3000
- ✅ Display the URL in the terminal
- ℹ️ Both processes run in the foreground
- ⚠️ Pressing Ctrl+C stops both services

**Output:**
```
🚀 Starting Discord Event Bot with Web Interface...

📡 Starting Discord bot...
🌐 Starting web server...

════════════════════════════════════════════════════════
✅ Both servers started successfully!
════════════════════════════════════════════════════════
📡 Discord bot: Running
🌐 Web interface: http://localhost:3000
════════════════════════════════════════════════════════

💡 Press Ctrl+C to stop both servers
```

---

### Method 2: PM2 (Production/Background)
For production or to run services in the background:

```bash
npm run pm2:start
```

This will:
- ✅ Start both services as PM2 processes
- ✅ Auto-restart on crashes
- ✅ Run in the background
- ✅ Show the web URL in terminal
- ✅ Create logs in `./logs/` directory

**Output:**
```
╔════════════════════════════════════════════════════════╗
║     Discord Event Bot - PM2 Startup Manager           ║
╚════════════════════════════════════════════════════════╝

🚀 Starting services with PM2...

════════════════════════════════════════════════════════
✅ Services Started Successfully!
════════════════════════════════════════════════════════
📡 Discord Bot: Running
🌐 Web Interface: http://localhost:3000
════════════════════════════════════════════════════════

📋 Available Commands:
  npm run pm2:logs     - View live logs
  npm run pm2:status   - Check process status
  npm run pm2:restart  - Restart all services
  npm run pm2:stop     - Stop all services

💡 Run "pm2 monit" for an interactive dashboard
```

**PM2 Management Commands:**

| Command | Description |
|---------|-------------|
| `npm run pm2:start` | Start all services |
| `npm run pm2:stop` | Stop all services |
| `npm run pm2:restart` | Restart all services |
| `npm run pm2:status` | Check process status |
| `npm run pm2:logs` | View live logs |
| `pm2 monit` | Interactive monitoring dashboard |
| `pm2 flush` | Clear all logs |

---

## Individual Services

### Start Only Discord Bot
```bash
npm start
```

### Start Only Web Server
```bash
npm run web
```

---

## Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

---

## Accessing the Web Interface

Once started, open your browser to:
```
http://localhost:3000
```

**Default Credentials:**
- Username: `admin` (or check `.env` for `WEB_USERNAME`)
- Password: `password` (or check `.env` for `WEB_PASSWORD`)

---

## Troubleshooting

### Port Already in Use
If port 3000 is already taken, set a different port in `.env`:
```bash
WEB_PORT=3001
```

### PM2 Not Installed
Install PM2 globally:
```bash
npm install -g pm2
```

### Services Won't Start
1. Check if dependencies are installed:
   ```bash
   npm install
   ```

2. Verify `.env` file exists with required variables:
   ```bash
   DISCORD_TOKEN=your_bot_token_here
   ```

3. Check logs:
   ```bash
   # For PM2
   npm run pm2:logs
   
   # Or check log files
   cat logs/bot-error.log
   cat logs/web-error.log
   ```

### View Running Processes
```bash
npm run pm2:status
```

### Stop All Services
```bash
# For standard startup (Ctrl+C)
# For PM2:
npm run pm2:stop
```

---

## Configuration

Edit `ecosystem.config.js` to change:
- Memory limits
- Log file locations
- Environment variables
- Auto-restart behavior

---

## Logs

Logs are stored in `./logs/`:
- `bot-out.log` - Discord bot output
- `bot-error.log` - Discord bot errors
- `web-out.log` - Web server output
- `web-error.log` - Web server errors

View logs in real-time:
```bash
# All logs
npm run pm2:logs

# Specific service
pm2 logs discord-event-bot
pm2 logs web-server
```

---

## Recommended Setup

**Development:**
```bash
npm run start:all
```

**Production:**
```bash
npm run pm2:start
pm2 startup  # Configure PM2 to start on system boot
pm2 save     # Save current process list
```

This ensures your bot automatically starts when the server reboots.
