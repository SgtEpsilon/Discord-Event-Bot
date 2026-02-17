# 🔧 Diagnostics Tools

Comprehensive diagnostic and troubleshooting tools for Discord Event Bot.

---

## 📦 What's In This Folder

### Diagnostic Scripts
- `health-check.js` - Complete system health check (runs all diagnostics)
- `setup-diagnostic.js` - Installation and configuration check
- `database-diagnostic.js` - Database health and integrity
- `discord-diagnostic.js` - Bot connection troubleshooting
- `webserver-diagnostic.js` - Web server diagnostics
- `calendar-sync-debugger.js` - Calendar sync deep diagnostic
- `fix-calendar-sync.js` - Automated calendar sync fix
- `test-calendar-connection.js` - Direct calendar connection test
- `calendar-diagnostic.js` - Basic calendar check

### Documentation
- `DIAGNOSTIC_TOOLS_README.md` - Complete guide to all tools
- `TROUBLESHOOTING_GUIDE.md` - Comprehensive troubleshooting workflows
- `DIAGNOSTIC_QUICK_REFERENCE.md` - Quick reference cheat sheet
- `ICAL_URL_SETUP.md` - iCal URL setup guide
- `GOOGLE_CALENDAR_API_SETUP.md` - Google Calendar API setup
- `CALENDAR_NOT_SYNCING_FIX.md` - Calendar sync fix guide
- `CALENDAR_TROUBLESHOOTING.md` - Calendar troubleshooting

---

## 🚀 Quick Start

### Run Complete Health Check

From your bot's root directory:

```bash
npm run health
```

This runs all diagnostics and gives you a complete system report.

### Run Specific Diagnostic

```bash
# Setup issues
npm run diag:setup

# Database problems
npm run diag:database

# Discord connection
npm run diag:discord

# Web server issues
npm run diag:web

# Calendar sync
npm run calendar:debug

# Quick calendar fix
npm run calendar:fix
```

---

## 📋 Available Commands

All commands run from your bot's root directory:

```bash
# Complete Health Check
npm run health              # Runs all diagnostics
npm run diag:all           # Same as above

# Individual Diagnostics
npm run diag:setup         # Setup & installation
npm run diag:database      # Database health
npm run diag:discord       # Discord connection
npm run diag:web           # Web server

# Calendar Tools
npm run calendar:debug     # Deep calendar diagnostic
npm run calendar:fix       # Auto-fix calendar sync
npm run calendar:test      # Test calendar connection
npm run calendar:diagnostic # Basic calendar check
```

---

## 🎯 When to Use Each Tool

### `health-check.js`
**Use when:**
- ✅ First-time setup
- ✅ Unknown issues
- ✅ After updates
- ✅ Before deploying

**What it does:** Runs all diagnostics and categorizes results

---

### `setup-diagnostic.js`
**Use when:**
- ✅ First-time installation
- ✅ "Module not found" errors
- ✅ Missing files/folders
- ✅ Node.js version issues

**What it checks:**
- Node.js version
- NPM packages
- .env configuration
- File structure
- Discord token

---

### `database-diagnostic.js`
**Use when:**
- ✅ Events not saving
- ✅ Database errors
- ✅ Corruption suspected
- ✅ Performance issues

**What it checks:**
- Database file integrity
- Table structure
- Data consistency
- Optimization status

**Advanced:**
```bash
node diagnostics/database-diagnostic.js --vacuum
```

---

### `discord-diagnostic.js`
**Use when:**
- ✅ Bot won't connect
- ✅ Invalid token errors
- ✅ Bot shows offline
- ✅ Login failures

**What it checks:**
- Token configuration
- Discord API access
- Bot authentication
- Server membership
- Required intents

---

### `webserver-diagnostic.js`
**Use when:**
- ✅ Can't access web UI
- ✅ Port already in use
- ✅ Connection refused
- ✅ Login page issues

**What it checks:**
- Server files present
- Port availability
- Server running status
- PM2 process status
- Network configuration

---

### `calendar-sync-debugger.js`
**Use when:**
- ✅ Events not importing
- ✅ "No events found"
- ✅ Sync failures
- ✅ Connection issues

**What it checks:** (9-step deep diagnostic)
1. Database connection
2. Calendar configuration
3. API credentials
4. Bot status
5. Background sync
6. Recent logs
7. Test sync
8. Database events
9. Auto-sync config

---

### `fix-calendar-sync.js`
**Use when:**
- ✅ Quick fix needed
- ✅ After adding calendar
- ✅ Sync stopped working

**What it does:**
1. Checks database
2. Verifies calendars
3. Restarts bot
4. Forces sync
5. Imports events
6. Verifies success

**This is the fastest calendar fix!**

---

### `test-calendar-connection.js`
**Use when:**
- ✅ Testing new calendar
- ✅ Verifying setup
- ✅ Troubleshooting connection

**What it does:**
- Tests each calendar
- Fetches actual events
- Shows sample events
- Identifies all-day events

---

## 📖 Documentation

### Start Here
Read `DIAGNOSTIC_TOOLS_README.md` for a complete overview of all tools.

### Having Issues?
Check `TROUBLESHOOTING_GUIDE.md` for step-by-step troubleshooting workflows.

### Need Quick Help?
See `DIAGNOSTIC_QUICK_REFERENCE.md` for a command cheat sheet.

### Setting Up Calendar?
- iCal URL: `ICAL_URL_SETUP.md`
- Google API: `GOOGLE_CALENDAR_API_SETUP.md`
- Not syncing: `CALENDAR_NOT_SYNCING_FIX.md`

---

## 🎨 Understanding Output

All diagnostics use color-coded output:

- 🟢 `✅` **Success (Green)** - All good, no action needed
- 🟡 `⚠️` **Warning (Yellow)** - Non-critical issue
- 🔴 `❌` **Error (Red)** - Critical, needs fixing
- 🔵 `ℹ️` **Info (Blue)** - Helpful information

Each diagnostic provides:
1. Current status
2. What's wrong (if anything)
3. How to fix it
4. Next steps

---

## 💡 Pro Tips

1. **Always start with `npm run health`** - it identifies problem areas quickly
2. **Read output carefully** - specific fixes are included
3. **Check PM2 logs first** - often shows the exact error:
   ```bash
   pm2 logs discord-event-bot --lines 50
   ```
4. **Run after updates** - catch breaking changes early
5. **Save diagnostic output** when reporting issues:
   ```bash
   npm run health > diagnostic-output.txt
   ```

---

## 🔄 Regular Maintenance

### Weekly
```bash
npm run health
```

### Monthly
```bash
node diagnostics/database-diagnostic.js --vacuum
npm run health
```

### After Updates
```bash
npm install
npm run health
pm2 restart discord-event-bot
```

---

## 🆘 Getting Help

If diagnostics don't solve your issue:

1. **Run and save health check:**
   ```bash
   npm run health > diagnostic-output.txt
   ```

2. **Get PM2 logs:**
   ```bash
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

3. **When reporting issues, include:**
   - Output from health check
   - PM2 logs
   - Operating system
   - Node.js version
   - Exact error message

---

## ✅ Success Indicators

Your bot is fully working when:

- [ ] `npm run health` shows "ALL SYSTEMS HEALTHY"
- [ ] `pm2 status` shows "online"
- [ ] Web UI loads at `http://localhost:3000`
- [ ] Bot is online in Discord
- [ ] Slash commands work
- [ ] Calendar sync logs appear
- [ ] No errors in logs

---

## 🚦 Common Workflows

### Unknown Issue
```bash
npm run health
# Follow its recommendations
```

### Bot Won't Start
```bash
npm run diag:setup
npm run diag:discord
pm2 logs discord-event-bot
```

### Calendar Issues
```bash
npm run calendar:fix        # Try quick fix first
npm run calendar:test       # Test connection
npm run calendar:debug      # Deep diagnostic
```

### Database Problems
```bash
npm run diag:database       # Check health
# If corrupted:
cp data/database.sqlite data/backup.sqlite
rm data/database.sqlite
pm2 restart discord-event-bot
```

---

## 📁 File Organization

```
diagnostics/
├── README.md                          ← You are here
│
├── Diagnostic Scripts/
│   ├── health-check.js                Complete health check
│   ├── setup-diagnostic.js            Setup & installation
│   ├── database-diagnostic.js         Database health
│   ├── discord-diagnostic.js          Discord connection
│   ├── webserver-diagnostic.js        Web server status
│   ├── calendar-sync-debugger.js      Calendar deep diagnostic
│   ├── fix-calendar-sync.js           Auto-fix calendars
│   ├── test-calendar-connection.js    Test calendar access
│   └── calendar-diagnostic.js         Basic calendar check
│
└── Documentation/
    ├── DIAGNOSTIC_TOOLS_README.md     Complete tools guide
    ├── TROUBLESHOOTING_GUIDE.md       Troubleshooting workflows
    ├── DIAGNOSTIC_QUICK_REFERENCE.md  Command cheat sheet
    ├── ICAL_URL_SETUP.md             iCal setup guide
    ├── GOOGLE_CALENDAR_API_SETUP.md   API setup guide
    ├── CALENDAR_NOT_SYNCING_FIX.md   Calendar fixes
    └── CALENDAR_TROUBLESHOOTING.md    Calendar issues
```

---

**Happy troubleshooting!** 🎉

These tools will help you quickly identify and fix issues, keeping your Discord Event Bot running smoothly.

For detailed information on any tool, see the documentation files in this folder.
