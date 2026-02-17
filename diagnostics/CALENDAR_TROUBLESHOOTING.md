# 📅 Calendar Import Troubleshooting Guide

## Quick Diagnosis

Run the diagnostic tool to identify which calendars are working:

```bash
npm run calendar:diagnostic
```

This will:
- ✅ Test connection to each calendar
- 📊 Show how many events are found
- 💾 Check if events are in the database
- 🔍 Identify specific issues

---

## Common Issues & Solutions

### ❌ Issue 1: Calendar Connection Failed

**Symptoms:**
- Diagnostic shows "Connection failed" for a calendar
- No events imported from that calendar

**For iCal URLs:**

1. **Verify URL is accessible:**
   ```bash
   curl -I "YOUR_ICAL_URL"
   ```
   Should return `HTTP/1.1 200 OK`

2. **Check URL format:**
   - ✅ Good: `https://calendar.google.com/calendar/ical/...`
   - ❌ Bad: Missing `https://`
   - ❌ Bad: Malformed URL

3. **Make calendar public (if Google Calendar):**
   - Go to Google Calendar settings
   - Under "Access permissions" → Make available to public
   - Copy the **public iCal URL** (not private)

**For Google Calendar API:**

1. **Check credentials file exists:**
   ```bash
   ls -la data/calendar-credentials.json
   ```

2. **Verify credentials format:**
   - Should be a service account JSON key
   - Must have `type: "service_account"`

3. **Ensure Calendar API is enabled:**
   - Go to Google Cloud Console
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Click "Enable"

4. **Share calendar with service account:**
   - Open Google Calendar
   - Settings → Your calendar → Share with specific people
   - Add service account email (from JSON key)
   - Grant "Make changes to events" permission

---

### ⚠️ Issue 2: Events Found But Not Imported

**Symptoms:**
- Diagnostic shows "Found X events"
- But database shows "0 events in database from this calendar"

**Solutions:**

1. **Run manual sync from web UI:**
   - Go to `http://localhost:3000`
   - Navigate to Google Calendar tab
   - Click "🔄 Manual Sync Now"

2. **Check background sync is enabled:**
   ```bash
   # Check bot status
   pm2 logs discord-event-bot | grep -i "background"
   ```
   Should show: `[BackgroundSync] Starting automatic calendar sync`

3. **Verify calendarSourceId uniqueness:**
   - Each event gets a unique `calendarSourceId`
   - Format: `{calendarId}::{eventId}`
   - Duplicates are skipped (not re-imported)

4. **Check event date range:**
   - Default sync: Next 168 hours (7 days)
   - Events outside this range won't import
   - Past events are not imported

---

### 📅 Issue 3: No Events Found (But Calendar Has Events)

**Symptoms:**
- Diagnostic shows "Found 0 events"
- You know the calendar has events

**Common Causes:**

1. **All-day events (SKIPPED BY DESIGN):**
   - Bot only imports events with specific times
   - All-day events are intentionally skipped
   - **Solution:** Add a time to the event (e.g., 12:00 PM)

2. **Events outside date range:**
   - Only imports next 7 days by default
   - Past events are ignored
   - **Solution:** Events must be in the future

3. **Wrong calendar selected:**
   - Verify you're checking the correct calendar
   - Run diagnostic to see all calendars

---

### 🔄 Issue 4: Background Sync Not Working

**Symptoms:**
- Manual sync works
- Auto-sync doesn't import new events

**Solutions:**

1. **Check background sync is running:**
   ```bash
   pm2 logs discord-event-bot | tail -50 | grep -i sync
   ```

   Should see periodic:
   ```
   [BackgroundSync] Starting background calendar sync...
   [BackgroundSync] ✅ Complete - Imported: X, Skipped: Y
   ```

2. **Verify bot is running:**
   ```bash
   pm2 status
   ```
   `discord-event-bot` should be `online`

3. **Check for errors:**
   ```bash
   pm2 logs discord-event-bot --err --lines 50
   ```

4. **Restart bot to reset sync:**
   ```bash
   pm2 restart discord-event-bot
   ```

---

### 🔐 Issue 5: Permission Denied / 403 Errors

**Symptoms:**
- Error: "403 Forbidden"
- Error: "insufficient permissions"

**For Google Calendar API:**

1. **Service account not shared:**
   - Share calendar with service account email
   - Grant at least "See all event details" permission

2. **Wrong scopes in credentials:**
   - Service account needs Calendar API access
   - Regenerate service account key if needed

3. **Calendar API not enabled:**
   - Enable in Google Cloud Console

**For iCal URLs:**

1. **Calendar not public:**
   - Make calendar public in Google Calendar settings

2. **Private URL expired:**
   - Regenerate public iCal URL

---

## Verification Steps

### ✅ Step 1: Check Calendar Configuration

```bash
# Run diagnostic
npm run calendar:diagnostic

# Should show:
# ✅ Connection successful
# ✅ Found X event(s)
# ✅ Y event(s) in database
```

### ✅ Step 2: Check Database

```bash
sqlite3 data/database.sqlite
```

```sql
-- Count calendar-imported events
SELECT COUNT(*) FROM events WHERE calendarSourceId IS NOT NULL;

-- See recent calendar events
SELECT title, datetime, calendarSource 
FROM events 
WHERE calendarSourceId IS NOT NULL 
ORDER BY datetime DESC 
LIMIT 10;

-- Exit
.quit
```

### ✅ Step 3: Test Manual Sync

1. Go to web UI: `http://localhost:3000`
2. Navigate to "Google Calendar" tab
3. Click "🔄 Manual Sync Now"
4. Check the result message

### ✅ Step 4: Monitor Background Sync

```bash
# Watch live logs
pm2 logs discord-event-bot

# Should see every 5 minutes:
# [BackgroundSync] Starting background calendar sync...
# [BackgroundSync] ✅ Complete
```

---

## Advanced Debugging

### Enable Verbose Logging

Add to `.env`:
```env
DB_LOGGING=true
```

Restart bot:
```bash
pm2 restart discord-event-bot
```

View SQL queries:
```bash
pm2 logs discord-event-bot | grep SELECT
```

### Test Calendar Directly

```javascript
// test-calendar.js
require('dotenv').config();
const CalendarService = require('./src/services/calendar');
const { config } = require('./src/config');

const calendars = [
  { name: 'Test', id: 'YOUR_CALENDAR_ID_HERE' }
];

const service = new CalendarService(config.google.credentials, calendars);

service.syncEvents(168).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error);
});
```

Run:
```bash
node test-calendar.js
```

---

## Still Having Issues?

1. **Check logs for specific errors:**
   ```bash
   pm2 logs discord-event-bot --err --lines 100
   ```

2. **Verify .env configuration:**
   ```bash
   cat .env | grep GOOGLE
   ```

3. **Test credentials file:**
   ```bash
   cat data/calendar-credentials.json | jq .
   ```

4. **Re-run diagnostic:**
   ```bash
   npm run calendar:diagnostic
   ```

5. **Check bot status:**
   ```bash
   npm run pm2:status
   ```

---

## Expected Behavior

### Normal Import Flow:

1. **Background sync runs every 5 minutes**
2. **Checks all configured calendars**
3. **Finds events in next 7 days**
4. **Skips all-day events**
5. **Skips already-imported events (by calendarSourceId)**
6. **Imports new events to database**
7. **Logs: "✅ Complete - Imported: X"**

### Events appear in:
- Web UI (`http://localhost:3000`)
- Database (`data/database.sqlite`)
- If Discord auto-sync enabled: Discord channel

---

## Quick Fixes Checklist

- [ ] Ran `npm run calendar:diagnostic`
- [ ] All calendars show "✅ Connection successful"
- [ ] Events are found (> 0 events)
- [ ] Events are in database
- [ ] Background sync is running (check logs)
- [ ] Bot is online (`pm2 status`)
- [ ] Credentials file exists and is valid
- [ ] Calendars are shared with service account (if using API)
- [ ] Calendar API is enabled (if using API)
- [ ] iCal URLs are public and accessible (if using iCal)

---

## Getting Help

If you've tried all of the above and still have issues:

1. **Gather diagnostic info:**
   ```bash
   npm run calendar:diagnostic > calendar-diag.txt
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

2. **Check these files:**
   - `calendar-diag.txt`
   - `bot-logs.txt`
   - `.env` (remove sensitive data)
   - `data/calendar-config.json`

3. **Common final checks:**
   - Is the bot actually running?
   - Are the calendar IDs correct?
   - Are the events within the next 7 days?
   - Do the events have specific times (not all-day)?
