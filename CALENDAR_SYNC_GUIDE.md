# Calendar Sync Guide

This guide explains how to sync events FROM Google Calendar TO Discord using the new sync features.

## Overview

The bot now supports **two-way communication** with Google Calendar:

1. **Discord → Calendar** (Original feature)
   - Create events in Discord
   - They automatically appear in Google Calendar

2. **Calendar → Discord** (NEW feature)
   - Create events in Google Calendar
   - Import them to Discord with `!sync`
   - Or enable auto-sync for automatic hourly imports

## Manual Sync

### Command: `!sync`

Imports upcoming events from Google Calendar to Discord.

**Usage:**
```
!sync
```

**What it does:**
1. Fetches events from Google Calendar (next 7 days)
2. Checks which events are new
3. Imports new events to Discord
4. Posts them in the current channel
5. Skips events already in Discord

**Example:**
```
User: !sync
Bot: 🔄 Syncing events from Google Calendar...
Bot: ✅ Imported 3 events from Google Calendar

     [Posts 3 event embeds with signup buttons]
```

### When to use `!sync`

- After creating events in Google Calendar
- To import existing calendar events
- To manually refresh event list
- When starting to use the bot with existing calendar

## Auto-Sync

### Command: `!autosync`

Enables automatic hourly syncing from Google Calendar.

**Enable auto-sync:**
```
!autosync on
```

**Disable auto-sync:**
```
!autosync off
```

**Check status:**
```
!autosync
```

### How Auto-Sync Works

Once enabled:
1. ✅ Runs immediately (imports current events)
2. ✅ Runs every hour automatically
3. ✅ Only imports NEW events (no duplicates)
4. ✅ Posts new events to the channel where it was enabled
5. ✅ Continues until manually disabled

**Example:**
```
User: !autosync on
Bot: ✅ Auto-sync enabled! Events will be synced from Google Calendar every hour.

[1 hour later - bot automatically posts any new calendar events]
```

### Auto-Sync Behavior

**What gets synced:**
- Events created in Google Calendar
- Events in the next 7 days (168 hours)
- Events with a start date/time
- Events not already in Discord

**What doesn't get synced:**
- All-day events (no specific time)
- Events already imported
- Events created by the bot (to avoid loops)
- Past events

## Use Cases

### Use Case 1: Manage Events in Google Calendar

**Setup:**
1. Enable auto-sync in your Discord channel
2. Create all events in Google Calendar
3. Events automatically appear in Discord every hour

**Benefits:**
- Use Google Calendar's powerful interface
- Set reminders on your phone
- Share calendar with non-Discord users
- Manage events from anywhere (mobile, desktop)

**Example workflow:**
```
Monday 9:00 AM - Create "Raid Night" in Google Calendar for Friday 8 PM
Monday 10:00 AM - Auto-sync runs, imports to Discord
Friday 8:00 PM - Users signed up via Discord buttons
```

### Use Case 2: Import Existing Events

**Setup:**
1. You already have gaming events in Google Calendar
2. Run `!sync` once to import them all
3. Add signup roles as needed

**Example:**
```
!sync
[Bot imports 5 upcoming events]

!addrole event_123 ⚔️ Tank 2
!addrole event_123 ❤️ Healer 2
!addrole event_123 🏹 DPS 6
```

### Use Case 3: Hybrid Management

**Setup:**
- Create some events in Discord (with presets)
- Create some events in Google Calendar
- Use `!sync` to import calendar events when needed

**When to create in Discord:**
- Using preset templates (quick)
- Need role signups immediately
- Gaming-specific events

**When to create in Calendar:**
- Complex recurring events
- Events shared with other calendars
- Events needing mobile reminders

## Important Notes

### Event Deduplication

The bot tracks which calendar events have been imported using `calendarEventId`.

**This means:**
- ✅ Each calendar event only imported once
- ✅ Running `!sync` multiple times is safe
- ✅ No duplicate event posts
- ✅ Auto-sync won't spam your channel

### Event Updates

Currently, the bot does NOT sync updates to events.

**What this means:**
- Calendar: Change event time → Discord: Still shows old time
- You need to manually update Discord events
- Or delete and re-import

**Workaround:**
1. Delete the Discord event: `!delete event_123`
2. Delete the calendar event ID from events.json
3. Run `!sync` to reimport

### Calendar Permissions

To sync FROM calendar, the service account needs:
- ✅ "See all event details" permission
- ✅ Calendar shared with service account email

**How to check:**
1. Google Calendar → Calendar Settings
2. "Share with specific people"
3. Find your service account email
4. Permission should be "Make changes to events" or "See all event details"

### Sync Window

By default, syncs events from the next **7 days** (168 hours).

**To change:**
Edit `bot.js` and modify the `!sync` command:
```javascript
// Default: 168 hours (7 days)
const result = await syncFromGoogleCalendar(message.channel.id, message.guild.id, 168);

// Change to 14 days:
const result = await syncFromGoogleCalendar(message.channel.id, message.guild.id, 336);

// Change to 24 hours:
const result = await syncFromGoogleCalendar(message.channel.id, message.guild.id, 24);
```

## Commands Summary

| Command | Description | Permission Required |
|---------|-------------|-------------------|
| `!sync` | Import events from calendar now | Manage Events |
| `!autosync on` | Enable hourly auto-sync | Manage Events |
| `!autosync off` | Disable auto-sync | Manage Events |
| `!autosync` | Check auto-sync status | Manage Events |

## Workflow Examples

### Example 1: Weekly Raid Planning

**Monday:**
```
# Create event in Google Calendar
"Friday Night Raid - 8:00 PM - 3 hours"
```

**Monday (within 1 hour if auto-sync on, or manually):**
```
!sync
```

**Bot response:**
```
✅ Imported 1 event from Google Calendar

📅 Friday Night Raid
Friday, 20:00 PM
Duration: 180 minutes
```

**Monday - Friday:**
```
# Team members sign up using Discord buttons
```

**Friday 8 PM:**
```
# Everyone knows who's coming, raid starts!
```

### Example 2: Tournament Organization

**Organizer creates in Google Calendar:**
- Qualifier Round 1 - Saturday 2 PM
- Qualifier Round 2 - Saturday 4 PM
- Finals - Sunday 2 PM

**In Discord:**
```
!sync
✅ Imported 3 events from Google Calendar

[3 events posted]

!addrole event_xxx 🎮 Player 32
!addrole event_xxx 📋 Substitute 8
[Repeat for each event]
```

**Players sign up throughout the week using buttons**

### Example 3: Community Calendar

**Setup:**
- One shared Google Calendar for the community
- Auto-sync enabled in Discord
- Multiple event organizers

**Flow:**
1. Any organizer creates events in shared calendar
2. Auto-sync imports them every hour
3. Discord members see and sign up
4. Everyone's calendar stays in sync

## Troubleshooting

### "No new events to import"

**Causes:**
- No upcoming events in calendar
- All calendar events already imported
- Events outside the 7-day window

**Solution:**
- Create events in Google Calendar
- Make sure events have date/time (not all-day)
- Check events are in the future

### "Failed to sync: Not Found"

**Cause:**
- Calendar ID is wrong
- Calendar not shared with service account

**Solution:**
- Check `CALENDAR_ID` in `.env`
- Verify calendar is shared with service account
- See GOOGLE_CALENDAR_GUIDE.md for setup

### Events imported without roles

**Expected behavior:**
- Calendar events don't have role information
- Imported as basic events

**Solution:**
Add roles manually after import:
```
!addrole event_xxx 🎮 Role1 5
!addrole event_xxx 🛡️ Role2 3
```

### Auto-sync stopped working

**Causes:**
- Bot restarted (auto-sync doesn't persist)
- Error in sync function
- Calendar permissions changed

**Solution:**
1. Check bot is running: `npm start`
2. Re-enable auto-sync: `!autosync on`
3. Check console logs for errors
4. Verify calendar permissions

### Getting duplicate events

**This shouldn't happen**, but if it does:

**Check:**
- `events.json` for duplicate event IDs
- Console logs for errors during sync

**Fix:**
1. Delete duplicate events from Discord
2. Clear `events.json` (backup first!)
3. Run `!sync` again

## Advanced: Recurring Events

Google Calendar recurring events are treated as separate events.

**Example:**
- Calendar: "Weekly Raid - Every Friday 8 PM"
- Imports as: Separate event for each Friday

**This means:**
- ✅ Each occurrence can have different signups
- ✅ Can add roles to each individually
- ⚠️ Need to manage each occurrence separately

## Best Practices

### ✅ DO:

1. Use auto-sync if you manage events in Google Calendar
2. Add signup roles after importing events
3. Keep calendar events in the future (within 7 days)
4. Use descriptive event titles
5. Enable auto-sync in a dedicated events channel

### ❌ DON'T:

1. Enable auto-sync in multiple channels (picks last one)
2. Create duplicate events in both Discord and Calendar
3. Expect auto-updates when changing calendar events
4. Import all-day events (they'll be skipped)
5. Run `!sync` constantly (once per hour is enough)

## Migration Guide

### Moving from Discord-only to Calendar-first

**Before:**
- Create events with `!preset` or `!create`
- Manage everything in Discord

**After:**
1. Enable auto-sync: `!autosync on`
2. Create events in Google Calendar instead
3. Let bot import them automatically
4. Add signup roles in Discord as needed

**Benefits:**
- Mobile calendar access
- Better event management UI
- Share with non-Discord users
- Calendar reminders on your phone

## FAQ

**Q: Will synced events appear in my personal calendar?**
A: Yes! If you subscribe to the shared calendar, all events appear on your devices.

**Q: Can I still create events in Discord?**
A: Yes! You can use both methods. Discord-created events still sync TO calendar.

**Q: What happens if I delete an event from calendar?**
A: The Discord event remains. You need to delete it manually with `!delete`.

**Q: Can I sync from multiple calendars?**
A: No, currently only one calendar ID is supported. Use a shared calendar for multiple organizers.

**Q: Does auto-sync use a lot of API calls?**
A: No, just one API call per hour. Well within Google's free tier limits.

**Q: Can regular users run !sync?**
A: No, only users with "Manage Events" permission.

**Q: Where does auto-sync post events?**
A: In the channel where `!autosync on` was run. Only one channel at a time.

**Q: Does the bot restart lose auto-sync settings?**
A: Yes, you need to re-enable it after restarts. (Could be improved with persistence.)

---

**Summary:** The sync feature lets you manage events in Google Calendar and have them automatically appear in Discord with signup capabilities. Use `!sync` for manual imports or `!autosync on` for automatic hourly syncing!
