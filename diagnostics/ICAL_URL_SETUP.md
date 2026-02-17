# 🚀 Quick Setup: Use iCal URL (Recommended - 2 Minutes)

This is the **easiest way** to sync your Google Calendar - no API setup required!

---

## 📋 Steps

### 1. Get Your Calendar's iCal URL

1. Go to [Google Calendar](https://calendar.google.com)

2. On the **left sidebar**, find your calendar

3. Click the **three dots (⋮)** next to it

4. Click **Settings and sharing**

5. Scroll down to "**Integrate calendar**"

6. Look for "**Secret address in iCal format**"

7. Click the **copy icon** 📋 to copy the URL

**The URL looks like:**
```
https://calendar.google.com/calendar/ical/yourname%40gmail.com/private-abc123.../basic.ics
```

---

### 2. Add Calendar to Bot

1. Go to `http://localhost:3000`

2. **Login** (default: admin/admin)

3. Click **Google Calendar** tab

4. If you have an old calendar:
   - Click **Delete** on "Testing Calendar"

5. Click **Add Calendar**

6. **Paste the iCal URL** you copied

7. Give it a name (e.g., "My Calendar")

8. Click **Save**

---

### 3. Restart Bot

```bash
pm2 restart discord-event-bot
```

---

### 4. Test It

Wait 10 seconds for the bot to start, then run:

```bash
npm run calendar:test
```

You should see:
```
✅ Connection successful
Result: ✅ Calendar sync successful
Events found: X
```

---

## ⚠️ Important Notes

### Only Events with Specific Times Are Imported

The bot **skips all-day events**. Make sure your events have times:

**Examples:**

✅ **Will Import:**
- "Meeting at 2:00 PM"
- "Call from 10:30 AM - 11:00 AM"
- "Event at 6:00 PM"

❌ **Will Skip:**
- "Meeting" (all-day)
- "Vacation" (all-day/multi-day)
- "Birthday" (all-day)

### Event Must Be in Next 31 Days

The bot only syncs events **0-31 days** ahead.

---

## 🔍 Troubleshooting

### "No events found"

**Check:**
1. Does your calendar have events in the next 31 days?
2. Do those events have **specific times** (not all-day)?
3. Is the iCal URL correct?

**Test the URL:**
```bash
curl "YOUR_ICAL_URL" | head -30
```

Should show event data starting with `BEGIN:VCALENDAR`

### "Connection failed"

**Possible issues:**
- Wrong URL
- Calendar is private (iCal URL must be the "Secret address")
- URL expired

**Fix:**
1. Go back to Calendar Settings
2. Get a fresh iCal URL
3. Re-add in the bot

---

## ✅ Success!

Once working, you'll see:

1. **In bot logs:**
   ```bash
   pm2 logs discord-event-bot | grep Sync
   ```
   Should show:
   ```
   [BackgroundSync] ✅ Complete - Imported: 3, Skipped: 5, Total: 8
   ```

2. **In web UI:**
   - Go to `http://localhost:3000`
   - Click "All Events"
   - See your calendar events listed

3. **In database:**
   ```bash
   npm run calendar:test
   ```
   Shows your events

---

## 🆚 iCal URL vs Google Calendar API

You just used **iCal URL** - that's perfect for most users!

**iCal URL** (what you just set up):
- ✅ Super simple
- ✅ No API setup
- ✅ Works immediately
- ⏱️ Syncs every 5 minutes

**Google Calendar API** (more complex):
- Requires Google Cloud setup
- Needs service account
- Needs credentials file
- Requires sharing calendar
- Only needed for advanced features

**Stick with iCal URL unless you have a specific reason to use the API!**

---

## 🎯 Quick Reference

**Add calendar:**
1. Get iCal URL from Google Calendar Settings
2. Add in bot web UI (`http://localhost:3000`)
3. Restart: `pm2 restart discord-event-bot`
4. Test: `npm run calendar:test`

**Check sync:**
```bash
pm2 logs discord-event-bot | grep BackgroundSync
```

**View events:**
- Web: `http://localhost:3000`
- Test: `npm run calendar:test`

---

That's it! Your calendar should now be syncing automatically every 5 minutes. 🎉
