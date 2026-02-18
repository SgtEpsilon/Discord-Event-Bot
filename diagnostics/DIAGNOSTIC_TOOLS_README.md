# 🔧 Discord Event Bot - Diagnostic Tools

A comprehensive suite of diagnostic and troubleshooting tools to help you set up, maintain, and fix your Discord Event Bot.

---

## 📦 What's Included

This package includes **8 diagnostic tools** that check every aspect of your bot:

1. **Health Check** - Complete system diagnostic (runs all checks)
2. **Setup Diagnostic** - Installation and configuration check
3. **Database Diagnostic** - Database health and integrity
4. **Discord Diagnostic** - Bot connection and authentication
5. **Web Server Diagnostic** - Web UI and server status
6. **Calendar Sync Debugger** - Calendar import troubleshooting
7. **Calendar Sync Fix** - Automated calendar sync repair
8. **Calendar Connection Test** - Direct calendar access test

---

## 🚀 Quick Start

### Run Complete Health Check

```bash
npm run health
```

This is the **fastest way** to check if everything is working. It runs all diagnostics and gives you a complete report.

### First Time Setup

```bash
npm run diag:setup
```

This checks everything you need for initial setup:
- Node.js version
- NPM packages
- Environment variables
- Discord connection
- File structure

---

## 📋 All Diagnostic Tools

### 1. Health Check (`health-check.js`)

**Complete system health check - runs all diagnostics at once**

```bash
npm run health
# or
node health-check.js
```

**What it does:**
- Runs all diagnostics sequentially
- Categorizes results (critical, warnings, passed)
- Gives overall system health status
- Provides next steps

**When to use:**
- ✅ First-time setup
- ✅ Unknown issues
- ✅ After major updates
- ✅ Before deploying

**Output:**
```
✅ Passed: 4
⚠️  Warnings: 1  
❌ Critical Issues: 0

🎉 ALL SYSTEMS HEALTHY!
```

---

### 2. Setup Diagnostic (`setup-diagnostic.js`)

**Checks installation and initial configuration**

```bash
npm run diag:setup
# or
node setup-diagnostic.js
```

**Checks:**
- ✅ Node.js version (16+)
- ✅ NPM packages installed
- ✅ .env file exists and configured
- ✅ Data directory present
- ✅ File structure intact
- ✅ Web server port available
- ✅ PM2 installed
- ✅ Discord bot can connect

**When to use:**
- First-time setup
- "Module not found" errors
- Installation problems
- Missing files

**Common fixes provided:**
- How to install Node.js
- How to run `npm install`
- How to create .env file
- How to get Discord token

---

### 3. Database Diagnostic (`database-diagnostic.js`)

**Checks database health and integrity**

```bash
npm run diag:database
# or
node database-diagnostic.js
```

**Checks:**
- ✅ Database file exists
- ✅ File permissions
- ✅ Database integrity (corruption check)
- ✅ Required tables present
- ✅ Table schemas correct
- ✅ Data consistency
- ✅ Database statistics
- ✅ Fragmentation level

**When to use:**
- Events not saving
- Database errors
- Corruption suspected
- Performance issues

**Advanced usage:**
```bash
# Optimize database
node database-diagnostic.js --vacuum
```

**Common fixes provided:**
- How to recreate corrupted database
- How to fix permissions
- How to optimize database
- How to backup data

---

### 4. Discord Diagnostic (`discord-diagnostic.js`)

**Tests Discord bot connection and configuration**

```bash
npm run diag:discord
# or
node discord-diagnostic.js
```

**Checks:**
- ✅ DISCORD_TOKEN set and valid
- ✅ Token format correct
- ✅ Discord API accessible
- ✅ Bot can log in
- ✅ Bot is in servers
- ✅ Required intents enabled

**When to use:**
- Bot won't connect
- Invalid token errors
- Bot shows offline
- Login failures

**Common fixes provided:**
- How to reset Discord token
- How to enable intents
- How to invite bot to server
- How to fix network issues

---

### 5. Web Server Diagnostic (`webserver-diagnostic.js`)

**Checks web UI and server status**

```bash
npm run diag:web
# or
node webserver-diagnostic.js
```

**Checks:**
- ✅ web-server.js file exists
- ✅ Public directory present
- ✅ Port configuration
- ✅ Port available or in use
- ✅ Server running
- ✅ PM2 process status
- ✅ Connection test
- ✅ Endpoints accessible

**When to use:**
- Can't access web UI
- "Connection refused" errors
- Port already in use
- Login page won't load

**Common fixes provided:**
- How to start server
- How to change port
- How to check firewall
- How to access from other devices

---

### 6. Calendar Sync Debugger (`calendar-sync-debugger.js`)

**Deep diagnostic for calendar sync issues**

```bash
npm run calendar:debug
# or
node calendar-sync-debugger.js
```

**Checks (9 steps):**
1. Database connection
2. Calendars in database
3. Google Calendar API credentials
4. Discord bot status
5. Background sync status
6. Recent bot logs
7. Test sync execution
8. Events in database
9. Discord auto-sync config

**When to use:**
- Calendar events not importing
- "No events found" messages
- Sync appears to hang
- Connection failures

**Output includes:**
- Exact error messages
- Sample events found
- Recommendations for fixes
- Step-by-step solutions

---

### 7. Calendar Sync Fix (`fix-calendar-sync.js`)

**Automated quick fix for calendar sync**

```bash
npm run calendar:fix
# or
node fix-calendar-sync.js
```

**What it does:**
1. ✅ Checks database
2. ✅ Verifies calendars configured
3. ✅ Restarts Discord bot
4. ✅ Triggers manual sync
5. ✅ Imports events to database
6. ✅ Verifies success

**When to use:**
- Quick calendar fix needed
- After adding new calendar
- After bot restart
- Background sync not working

**This is the fastest way to fix calendar issues!**

---

### 8. Calendar Connection Test (`test-calendar-connection.js`)

**Direct test of calendar access**

```bash
npm run calendar:test
# or
node test-calendar-connection.js
```

**What it does:**
- Tests connection to each calendar
- Fetches actual events
- Shows sample events found
- Identifies all-day events (which get skipped)
- Shows exact errors if connection fails

**When to use:**
- Verifying calendar setup
- Testing new calendar
- Troubleshooting connection
- Checking event types

**Example output:**
```
━━━ Testing: My Calendar ━━━
Type: iCal URL
✅ Connection successful
Events found: 5

Sample events:
  1. Team Meeting
     Date: 2/20/2026, 2:00:00 PM
     Duration: 60 minutes
```

---

## 🎯 Troubleshooting Workflows

### Unknown Issue
```bash
# Start here
npm run health

# Follow the diagnostic it recommends
```

### Bot Won't Start
```bash
npm run diag:setup    # Check setup
npm run diag:discord  # Check Discord connection
pm2 logs discord-event-bot  # Check logs
```

### Events Not Showing
```bash
npm run diag:database   # Check database
npm run calendar:debug  # Check calendar sync
```

### Web UI Not Loading
```bash
npm run diag:web        # Check web server
pm2 status              # Check if running
```

### Calendar Not Syncing
```bash
npm run calendar:fix    # Quick automated fix
npm run calendar:test   # Test connection
npm run calendar:debug  # Deep diagnostic
```

---

## 📊 Understanding Output

All diagnostics use color-coded output:

- 🟢 **✅ Success (Green)** - Everything OK
- 🟡 **⚠️  Warning (Yellow)** - Non-critical issue
- 🔴 **❌ Error (Red)** - Critical issue, needs fixing
- 🔵 **ℹ️  Info (Blue)** - Helpful information

Each diagnostic provides:
1. What it's checking
2. Current status
3. Specific fixes if needed
4. Next steps

---

## 🛠️ Installation

All diagnostic tools are included in the repository. Just make sure you have:

```bash
# Install dependencies
npm install

# Make scripts executable (Linux/Mac)
chmod +x *.js
```

---

## 📚 Documentation

### Quick Reference
See `DIAGNOSTIC_QUICK_REFERENCE.md` for a cheat sheet of all commands.

### Complete Guide
See `TROUBLESHOOTING_GUIDE.md` for comprehensive troubleshooting information.

### Setup Guides
- `ICAL_URL_SETUP.md` - Set up calendar sync with iCal URLs
- `GOOGLE_CALENDAR_API_SETUP.md` - Set up Google Calendar API
- `CALENDAR_NOT_SYNCING_FIX.md` - Fix calendar sync issues

---

## ⚡ NPM Scripts Reference

```bash
# Health & Diagnostics
npm run health              # Complete health check
npm run diag:all           # Same as health
npm run diag:setup         # Setup diagnostic
npm run diag:database      # Database diagnostic
npm run diag:discord       # Discord diagnostic
npm run diag:web           # Web server diagnostic

# Calendar Tools
npm run calendar:debug     # Full calendar diagnostic
npm run calendar:fix       # Auto-fix calendar sync
npm run calendar:test      # Test calendar connection

# Bot Management
npm run pm2:start          # Start bot
npm run pm2:stop           # Stop bot
npm run pm2:restart        # Restart bot
npm run pm2:logs           # View logs
npm run pm2:status         # Check status
```

---

## 🔄 Regular Maintenance

### Weekly
```bash
npm run health
```

### Monthly
```bash
npm run diag:database --vacuum
npm run health
```

### After Updates
```bash
npm install
npm run health
pm2 restart discord-event-bot
```

---

## 💡 Pro Tips

1. **Always start with `npm run health`** - it identifies problem areas
2. **Read diagnostic output carefully** - fixes are included
3. **Check PM2 logs** before running diagnostics: `pm2 logs discord-event-bot`
4. **Run diagnostics after major changes** to catch issues early
5. **Keep diagnostics updated** with your bot updates

---

## 🆘 Getting Help

If diagnostics don't solve your issue:

1. Run health check and save output:
   ```bash
   npm run health > diagnostic-output.txt
   ```

2. Get PM2 logs:
   ```bash
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

3. When reporting issues, include:
   - Output from `npm run health`
   - PM2 logs
   - Operating system
   - Node.js version (`node --version`)
   - Exact error message

---

## ✅ Success Checklist

Your bot is fully working when:

- [ ] `npm run health` shows "ALL SYSTEMS HEALTHY"
- [ ] `pm2 status` shows "online"
- [ ] Web UI loads at `http://localhost:3000`
- [ ] Bot is online in Discord
- [ ] `/event` commands work
- [ ] Calendar sync logs appear every 5 minutes
- [ ] Events show in web UI
- [ ] No errors in PM2 logs

---

## 📝 File List

```
setup-diagnostic.js              - Setup and installation check
database-diagnostic.js           - Database health check
discord-diagnostic.js            - Discord connection test
webserver-diagnostic.js          - Web server diagnostic
calendar-sync-debugger.js        - Calendar sync diagnostic
fix-calendar-sync.js             - Auto-fix calendar sync
test-calendar-connection.js      - Test calendar access
health-check.js                  - Complete health check

TROUBLESHOOTING_GUIDE.md         - Comprehensive guide
DIAGNOSTIC_QUICK_REFERENCE.md    - Quick reference card
ICAL_URL_SETUP.md               - iCal URL setup guide
GOOGLE_CALENDAR_API_SETUP.md    - API setup guide
CALENDAR_NOT_SYNCING_FIX.md     - Calendar fix guide
```

---

**Happy troubleshooting!** 🎉

These tools will help you quickly identify and fix issues, keeping your Discord Event Bot running smoothly.
