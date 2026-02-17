# 🔍 Diagnostic Tools - Quick Reference

## 🚀 One-Command Diagnostics

### Run Everything at Once
```bash
npm run health
# or
node health-check.js
```
**Use this first!** Comprehensive check of all systems.

---

## 🎯 Specific Diagnostics

### Setup & Installation
```bash
npm run diag:setup
# or
node setup-diagnostic.js
```
**Checks:** Node.js, packages, .env, file structure, Discord connection

**Use when:**
- First-time setup
- "Module not found" errors
- Installation problems

---

### Database
```bash
npm run diag:database
# or
node database-diagnostic.js
```
**Checks:** Database file, integrity, tables, schemas, data

**Use when:**
- Events not saving
- Database errors
- Data corruption suspected

**Optimize database:**
```bash
node database-diagnostic.js --vacuum
```

---

### Discord Connection
```bash
npm run diag:discord
# or
node discord-diagnostic.js
```
**Checks:** Token, API access, bot login, server membership

**Use when:**
- Bot won't connect
- Invalid token errors
- Bot shows offline

---

### Web Server
```bash
npm run diag:web
# or
node webserver-diagnostic.js
```
**Checks:** Server files, port, server running, endpoints

**Use when:**
- Can't access web UI
- "Connection refused" errors
- Port issues

---

### Calendar Sync
```bash
# Full diagnostic
npm run calendar:debug
# or
node calendar-sync-debugger.js

# Quick automated fix
npm run calendar:fix
# or
node fix-calendar-sync.js

# Test connection
npm run calendar:test
# or
node test-calendar-connection.js
```

**Use when:**
- Calendar events not importing
- Sync failing
- "No events found" messages

---

## 📋 Quick Troubleshooting Chart

```
Problem                     → Run This
───────────────────────────────────────────────────────
Bot won't start            → npm run diag:setup
                           → npm run diag:discord

Events not saving          → npm run diag:database

Calendar won't sync        → npm run calendar:fix
                           → npm run calendar:debug

Web UI won't load          → npm run diag:web

Commands not working       → npm run diag:discord

Unknown issue              → npm run health
```

---

## 🎨 Understanding Output Colors

- 🟢 **Green (✅)** - All good, no action needed
- 🟡 **Yellow (⚠️)** - Warning, non-critical issue
- 🔴 **Red (❌)** - Error, needs fixing
- 🔵 **Blue (ℹ️)** - Information, helpful context

---

## ⚡ Quick Fixes

### Bot Issues
```bash
# Restart bot
pm2 restart discord-event-bot

# Check status
pm2 status

# View logs
pm2 logs discord-event-bot
```

### Database Issues
```bash
# Backup database
cp data/database.sqlite data/database.sqlite.backup

# Recreate if corrupted
pm2 stop discord-event-bot
rm data/database.sqlite
pm2 start discord-event-bot
```

### Calendar Issues
```bash
# Automated fix
npm run calendar:fix

# Manual sync from web UI
# Go to http://localhost:3000
# Click "Manual Sync Now"
```

### Web Server Issues
```bash
# Check if running
pm2 status

# Restart
pm2 restart discord-event-bot

# Check port
echo $WEB_PORT  # or check .env file
```

---

## 📦 Available Scripts

### Health & Diagnostics
- `npm run health` - Complete health check
- `npm run diag:all` - Same as health
- `npm run diag:setup` - Setup diagnostic
- `npm run diag:database` - Database diagnostic
- `npm run diag:discord` - Discord diagnostic
- `npm run diag:web` - Web server diagnostic

### Calendar Tools
- `npm run calendar:debug` - Full calendar diagnostic
- `npm run calendar:fix` - Auto-fix calendar sync
- `npm run calendar:test` - Test calendar connection
- `npm run calendar:diagnostic` - Basic calendar check

### PM2 Management
- `npm run pm2:start` - Start bot with PM2
- `npm run pm2:stop` - Stop bot
- `npm run pm2:restart` - Restart bot
- `npm run pm2:logs` - View logs
- `npm run pm2:status` - Check status
- `npm run pm2:monitor` - Interactive monitor

---

## 🆘 When Things Go Wrong

### Step 1: Health Check
```bash
npm run health
```

### Step 2: Read Output Carefully
Look for ❌ errors and ⚠️ warnings

### Step 3: Run Specific Diagnostic
Based on health check results

### Step 4: Follow Fix Instructions
Each diagnostic provides specific fixes

### Step 5: Verify Fix
Run diagnostic again to confirm

---

## 💡 Pro Tips

1. **Always start with `npm run health`** - saves time
2. **Check PM2 logs first** - often shows the exact error
3. **Run diagnostics after updates** - catch breaking changes
4. **Save diagnostic output** when reporting issues
5. **Use `--help` flag** on any script for more info (if available)

---

## 📞 Common Commands

```bash
# Start fresh
pm2 delete all
npm install
npm run pm2:start

# Check everything
npm run health
pm2 status
pm2 logs discord-event-bot --lines 20

# Reset database
cp data/database.sqlite data/backup.sqlite
rm data/database.sqlite
pm2 restart discord-event-bot

# Fix calendar sync
npm run calendar:fix

# Access web UI
http://localhost:3000
```

---

## ✅ All Systems Green Checklist

- [ ] `npm run health` shows "ALL SYSTEMS HEALTHY"
- [ ] `pm2 status` shows "online"
- [ ] Web UI loads at `http://localhost:3000`
- [ ] Bot is online in Discord
- [ ] `/event` command works
- [ ] Calendar sync running (check logs)
- [ ] No errors in PM2 logs

---

**Need more details?** See `TROUBLESHOOTING_GUIDE.md` for comprehensive documentation.
