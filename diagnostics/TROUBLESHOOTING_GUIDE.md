# 🔧 Discord Event Bot - Troubleshooting Guide

This guide covers common issues and how to diagnose and fix them using the diagnostic tools included with this bot.

---

## 🚀 Quick Start Diagnostics

### Run All Diagnostics at Once

```bash
node health-check.js
```

This runs all diagnostic tools and gives you a complete health report.

**Use this when:**
- First time setup
- Bot isn't working and you don't know why
- After major updates
- Before deploying to production

---

## 🎯 Specific Diagnostic Tools

### 1. Setup Diagnostic

**File:** `setup-diagnostic.js`

**When to use:**
- First time setting up the bot
- After cloning the repository
- Installation issues
- "Module not found" errors

**What it checks:**
- ✅ Node.js version
- ✅ NPM packages installed
- ✅ .env file configured
- ✅ Data directory exists
- ✅ File structure intact
- ✅ Port availability
- ✅ PM2 installation
- ✅ Discord bot connection

**Run:**
```bash
node setup-diagnostic.js
```

**Common fixes:**
- Missing .env file → Copy .env.example to .env
- Old Node.js → Upgrade to Node 16+
- Missing packages → Run `npm install`
- Wrong directory → `cd Discord-Event-Bot`

---

### 2. Database Diagnostic

**File:** `database-diagnostic.js`

**When to use:**
- Events not saving
- "Database error" messages
- Missing events
- Corruption suspected

**What it checks:**
- ✅ Database file exists
- ✅ File permissions
- ✅ Database integrity
- ✅ Required tables present
- ✅ Table schemas correct
- ✅ Data consistency
- ✅ Database optimization

**Run:**
```bash
node database-diagnostic.js
```

**Advanced:**
```bash
# Optimize database
node database-diagnostic.js --vacuum
```

**Common fixes:**
- Database missing → Bot creates it automatically
- Corrupted database → Backup and delete, restart bot
- Permission issues → `chmod 666 data/database.sqlite`
- Fragmented → Run with --vacuum flag

---

### 3. Discord Connection Diagnostic

**File:** `discord-diagnostic.js`

**When to use:**
- Bot won't connect to Discord
- "Invalid token" errors
- Bot shows offline
- Login fails

**What it checks:**
- ✅ DISCORD_TOKEN configured
- ✅ Token format valid
- ✅ Discord API accessible
- ✅ Bot can log in
- ✅ Bot is in servers
- ✅ Required intents enabled

**Run:**
```bash
node discord-diagnostic.js
```

**Common fixes:**
- Invalid token → Reset token in Discord Developer Portal
- Token incomplete → Copy entire token (3 parts)
- Intents missing → Enable in Discord Developer Portal
- Not in servers → Invite bot using OAuth2 URL

---

### 4. Web Server Diagnostic

**File:** `webserver-diagnostic.js`

**When to use:**
- Can't access web UI
- "Connection refused" errors
- Port already in use
- Login page won't load

**What it checks:**
- ✅ web-server.js file exists
- ✅ Public directory present
- ✅ Port configuration
- ✅ Port availability
- ✅ Server running
- ✅ PM2 process status
- ✅ Network configuration

**Run:**
```bash
node webserver-diagnostic.js
```

**Common fixes:**
- Server not running → `npm run pm2:start`
- Port in use → Change WEB_PORT in .env
- Can't connect → Check firewall
- Files missing → Re-clone repository

---

### 5. Calendar Sync Diagnostic

**File:** `calendar-sync-debugger.js`

**When to use:**
- Calendar events not importing
- "No events found" messages
- Sync appears to hang
- Calendar connection fails

**What it checks:**
- ✅ Database connection
- ✅ Calendars configured
- ✅ API credentials (if using)
- ✅ Bot running status
- ✅ Background sync enabled
- ✅ Recent sync logs
- ✅ Test sync execution
- ✅ Events in database

**Run:**
```bash
node calendar-sync-debugger.js
```

**Quick fix:**
```bash
npm run calendar:fix
```

**Common fixes:**
- No calendars → Add in web UI
- No credentials → Set up iCal URL or API credentials
- All-day events → Bot skips these (use timed events)
- Wrong date range → Events must be within 31 days

---

## 🆘 Common Problems & Solutions

### Problem: "Bot won't start"

**Diagnostics to run:**
```bash
node setup-diagnostic.js
node discord-diagnostic.js
```

**Likely causes:**
- Missing .env file
- Invalid Discord token
- Missing NPM packages
- Wrong Node.js version

**Quick fix:**
```bash
# 1. Check setup
node setup-diagnostic.js

# 2. Install dependencies
npm install

# 3. Configure .env
cp .env.example .env
# Edit .env with your token

# 4. Start bot
npm run pm2:start
```

---

### Problem: "Events not showing up"

**Diagnostics to run:**
```bash
node database-diagnostic.js
node calendar-sync-debugger.js
```

**Likely causes:**
- No calendars configured
- Calendar sync failing
- Events outside 31-day range
- All-day events (skipped)

**Quick fix:**
```bash
# 1. Add calendar in web UI
# http://localhost:3000

# 2. Force sync
npm run calendar:fix

# 3. Check logs
pm2 logs discord-event-bot | grep BackgroundSync
```

---

### Problem: "Web UI won't load"

**Diagnostics to run:**
```bash
node webserver-diagnostic.js
```

**Likely causes:**
- Server not running
- Wrong port
- Firewall blocking
- Files missing

**Quick fix:**
```bash
# 1. Check if server is running
pm2 status

# 2. Restart if needed
pm2 restart discord-event-bot

# 3. Check port
# Default: http://localhost:3000
# Or check WEB_PORT in .env

# 4. Check logs
pm2 logs discord-event-bot --err
```

---

### Problem: "Commands not working in Discord"

**Diagnostics to run:**
```bash
node discord-diagnostic.js
```

**Likely causes:**
- Commands not registered
- Missing permissions
- Bot offline
- Wrong guild

**Quick fix:**
```bash
# 1. Check bot is online in Discord
pm2 status

# 2. Re-register commands
npm run commands:register

# 3. Check bot has permissions
# In Discord: Server Settings → Integrations → Bot

# 4. Try command again
/event action:create
```

---

### Problem: "Calendar won't sync"

**Diagnostics to run:**
```bash
node calendar-sync-debugger.js
node test-calendar-connection.js
```

**Likely causes:**
- No API credentials (if using Google Calendar API)
- Wrong calendar ID
- iCal URL not accessible
- All events are all-day

**Quick fix:**
```bash
# Option 1: Quick automated fix
npm run calendar:fix

# Option 2: Manual check
npm run calendar:test

# Option 3: Use iCal URL instead of API
# See ICAL_URL_SETUP.md
```

---

### Problem: "Database errors"

**Diagnostics to run:**
```bash
node database-diagnostic.js
```

**Likely causes:**
- Database corrupted
- Permission issues
- Disk full
- Missing tables

**Quick fix:**
```bash
# 1. Backup database
cp data/database.sqlite data/database.sqlite.backup

# 2. Run diagnostic
node database-diagnostic.js

# 3. If corrupted, recreate
pm2 stop discord-event-bot
rm data/database.sqlite
pm2 start discord-event-bot

# Database will be recreated automatically
```

---

## 📊 Understanding Diagnostic Output

### ✅ Success (Green)
Everything is working correctly. No action needed.

### ⚠️  Warning (Yellow)
Non-critical issues. Bot will work but may not be optimal.

Example: Default password in use, PM2 not installed

### ❌ Error (Red)
Critical issues that prevent the bot from working.

Example: Missing .env file, invalid Discord token

### ℹ️  Info (Blue)
Informational messages. Helpful context.

Example: "Port 3000 is being used", "Events found: 5"

---

## 🔄 Diagnostic Workflow

### For First-Time Setup:

```bash
# 1. Run setup diagnostic
node setup-diagnostic.js

# 2. Fix any issues it finds

# 3. Run health check
node health-check.js

# 4. Start the bot
npm run pm2:start
```

---

### For Ongoing Issues:

```bash
# 1. Run health check to identify problem area
node health-check.js

# 2. Run specific diagnostic for that area
node [specific-diagnostic].js

# 3. Follow the fixes suggested

# 4. Run diagnostic again to verify
```

---

### For Calendar Issues:

```bash
# 1. Quick fix attempt
npm run calendar:fix

# 2. If that doesn't work, deep diagnostic
npm run calendar:debug

# 3. Test connection
npm run calendar:test

# 4. Check logs
pm2 logs discord-event-bot | grep Calendar
```

---

## 🛠️ Preventive Maintenance

Run these regularly to catch issues early:

```bash
# Weekly health check
node health-check.js

# Monthly database optimization
node database-diagnostic.js --vacuum

# After bot updates
node setup-diagnostic.js
node health-check.js
```

---

## 📝 Diagnostic Scripts Summary

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `health-check.js` | Complete system check | First-time setup, unknown issues |
| `setup-diagnostic.js` | Installation & config | Setup problems, missing files |
| `database-diagnostic.js` | Database health | Events not saving, DB errors |
| `discord-diagnostic.js` | Bot connection | Bot won't connect, token issues |
| `webserver-diagnostic.js` | Web UI | Can't access web interface |
| `calendar-sync-debugger.js` | Calendar sync | Events not importing |
| `fix-calendar-sync.js` | Auto-fix calendars | Quick calendar sync fix |
| `test-calendar-connection.js` | Test calendar | Verify calendar access |

---

## 💡 Pro Tips

1. **Always run setup-diagnostic.js first** if you're having issues - it catches 80% of problems

2. **Check PM2 logs** before running diagnostics:
   ```bash
   pm2 logs discord-event-bot --lines 50
   ```

3. **Use health-check.js after major changes** to ensure nothing broke

4. **Keep diagnostic scripts up to date** - they improve with each release

5. **Read the output carefully** - diagnostics include specific fix instructions

---

## 🆘 Still Need Help?

If diagnostics don't solve your issue:

1. **Run health check and save output:**
   ```bash
   node health-check.js > diagnostic-output.txt
   ```

2. **Save PM2 logs:**
   ```bash
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

3. **Check these files:**
   - `.env` (remove sensitive data before sharing)
   - `package.json`
   - Output of `pm2 status`

4. **Include this information when asking for help:**
   - Operating system
   - Node.js version (`node --version`)
   - What you were trying to do
   - Exact error message
   - Diagnostic output

---

## ✅ Success Indicators

You'll know everything is working when:

- ✅ `health-check.js` shows "ALL SYSTEMS HEALTHY"
- ✅ `pm2 status` shows "online" for discord-event-bot
- ✅ Web UI accessible at `http://localhost:3000`
- ✅ Bot shows online in Discord
- ✅ Slash commands work: `/event action:create`
- ✅ Calendar events appear in web UI
- ✅ Background sync logs appear every 5 minutes

---

**Remember:** Most issues can be diagnosed and fixed automatically by running the appropriate diagnostic script. Start with `health-check.js` and work from there!
