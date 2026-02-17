# 🆘 Calendar Not Syncing - Quick Fix Guide

Your calendar isn't syncing. Let's fix it quickly.

---

## 🚀 Quick Fix (Try This First)

Run the automated fix script:

```bash
node fix-calendar-sync.js
```

This will:
1. ✅ Check database connection
2. ✅ Verify calendars are configured
3. ✅ Restart the Discord bot
4. ✅ Trigger a manual sync
5. ✅ Import events to database
6. ✅ Verify everything is working

**If this works, you're done!** 🎉

---

## 🔍 Deep Diagnostic (If Quick Fix Doesn't Work)

Run the comprehensive debugger:

```bash
node calendar-sync-debugger.js
```

This will check **9 different areas** and tell you exactly what's wrong:

1. Database connection
2. Calendars in database
3. Google Calendar credentials
4. Bot running status
5. Background sync status
6. Recent logs
7. Test sync with your calendar
8. Events in database
9. Discord auto-sync config

**The debugger will tell you exactly what to fix.**

---

## 🎯 Common Issues & Quick Fixes

### Issue 1: "No calendars configured"

**Fix:**
1. Go to `http://localhost:3000`
2. Navigate to "Google Calendar" tab
3. Click "Add Calendar"
4. Add your calendar ID or iCal URL

---

### Issue 2: "Bot is not running"

**Fix:**
```bash
npm run pm2:start
```

Or:
```bash
pm2 restart discord-event-bot
```

---

### Issue 3: "No events found"

**Possible reasons:**
- ❌ Calendar has no events in next 31 days
- ❌ All events are all-day (bot skips these)
- ❌ Wrong calendar ID

**Fix:**
1. Check your calendar has events with specific times
2. Verify events are within next 31 days
3. Verify calendar ID is correct

---

### Issue 4: "Connection failed"

**For iCal URLs:**
```bash
# Test if URL is accessible
curl -I "YOUR_ICAL_URL"
```

Should return `HTTP/1.1 200 OK`

**For Google Calendar API:**
- Check `data/calendar-credentials.json` exists
- Verify it's a service account key
- Ensure calendar is shared with service account

---

### Issue 5: "Events found but not in database"

**Fix:**
```bash
# Run manual sync from web UI
# OR use the fix script:
node fix-calendar-sync.js
```

---

## 📊 Check Current Status

### View Bot Logs
```bash
pm2 logs discord-event-bot
```

Look for:
- `[BackgroundSync] Starting background calendar sync...`
- `[BackgroundSync] ✅ Complete - Imported: X`

### Check Database
```bash
sqlite3 data/database.sqlite
```

```sql
-- Count calendar events
SELECT COUNT(*) FROM events WHERE calendarSourceId IS NOT NULL;

-- View recent calendar events
SELECT title, datetime, calendarSource 
FROM events 
WHERE calendarSourceId IS NOT NULL 
ORDER BY datetime DESC 
LIMIT 10;

-- Exit
.quit
```

### Check Web UI
```bash
# Open in browser:
http://localhost:3000
```

Navigate to "All Events" - calendar events should appear here.

---

## 🔄 Force a Fresh Sync

Sometimes you just need to restart everything:

```bash
# 1. Restart bot
pm2 restart discord-event-bot

# 2. Wait 10 seconds for background sync
sleep 10

# 3. Check logs
pm2 logs discord-event-bot --lines 20

# 4. Run fix script
node fix-calendar-sync.js
```

---

## ⚙️ Manual Sync from Web UI

If you prefer a manual approach:

1. Go to `http://localhost:3000`
2. Login (default: admin/admin)
3. Navigate to "Google Calendar" tab
4. Click "🔄 Manual Sync Now"
5. Check the result message

---

## 🐛 Still Not Working?

### Step 1: Run Both Diagnostics

```bash
# Quick fix
node fix-calendar-sync.js

# Full diagnostic
node calendar-sync-debugger.js
```

### Step 2: Check These Files Exist

```bash
ls -la data/database.sqlite
ls -la data/calendar-credentials.json  # If using Google Calendar API
```

### Step 3: Verify Calendar Configuration

```bash
# Check calendars in database
sqlite3 data/database.sqlite "SELECT id, name, calendarId FROM calendar_config;"
```

### Step 4: Check PM2 Status

```bash
pm2 status
pm2 logs discord-event-bot --err --lines 50
```

### Step 5: Test Calendar Connection

For iCal URL:
```bash
curl "YOUR_ICAL_URL" | head -20
```

For Google Calendar:
```bash
# Verify credentials file
cat data/calendar-credentials.json | jq .type
# Should output: "service_account"
```

---

## 📝 Checklist

Before asking for help, verify:

- [ ] Ran `node fix-calendar-sync.js`
- [ ] Ran `node calendar-sync-debugger.js`
- [ ] Bot is running (`pm2 status`)
- [ ] Calendars are configured in database
- [ ] Calendar has events in next 31 days
- [ ] Events have specific times (not all-day)
- [ ] Background sync is running (check logs)
- [ ] No errors in `pm2 logs`

---

## 💡 Understanding Background Sync

The bot automatically syncs calendars every 5 minutes:

1. **Checks all configured calendars**
2. **Finds events in next 31 days**
3. **Skips all-day events**
4. **Skips already-imported events**
5. **Imports new events to database**

**You should see this in logs:**
```
[BackgroundSync] Starting background calendar sync...
[BackgroundSync] ✅ Complete - Imported: 3, Skipped: 5, Total: 8
```

If you don't see this, background sync isn't working.

---

## 🎯 Most Common Solution

**90% of calendar sync issues are fixed by:**

```bash
node fix-calendar-sync.js
```

This restarts the bot and forces a fresh sync. Try this first!

---

## 📞 Getting Help

If you've tried everything above and still have issues:

1. **Run diagnostics:**
   ```bash
   node calendar-sync-debugger.js > diagnostic-output.txt
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

2. **Check these files:**
   - `diagnostic-output.txt`
   - `bot-logs.txt`
   - Output of `pm2 status`

3. **Include this information:**
   - Calendar type (iCal URL or Google Calendar API)
   - Bot status (online/stopped)
   - Any error messages from diagnostic

---

## ✅ Success Indicators

You'll know sync is working when:

- ✅ `pm2 logs` shows regular `[BackgroundSync]` messages
- ✅ Web UI shows calendar events at `http://localhost:3000`
- ✅ Database has events: `SELECT COUNT(*) FROM events WHERE calendarSourceId IS NOT NULL;` returns > 0
- ✅ Diagnostic shows "No issues found"

---

**Remember:** Background sync runs every 5 minutes, so after fixing issues, wait at least 5 minutes before checking!
