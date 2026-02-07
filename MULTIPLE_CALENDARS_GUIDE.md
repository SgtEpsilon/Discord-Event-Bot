# Multiple Calendars Setup Guide

This guide explains how to configure and use multiple Google Calendars with the Discord Event Bot.

## Overview

The bot now supports syncing from **multiple calendars** simultaneously. This is perfect for:

- 🎮 **Community Events** - Public gaming events
- 📺 **Streams** - Streaming schedule
- 🔒 **Private Group** - Clan/team events
- 🏆 **Tournaments** - Competitive events
- 📚 **Study Sessions** - Study groups
- 🎉 **Social Events** - Parties, meetups

## Configuration

### Format

You can configure multiple calendars in your `.env` file using the `CALENDAR_IDS` variable.

### Option 1: Single Calendar (Default)

```env
CALENDAR_IDS=primary
```

This uses your main Google Calendar.

### Option 2: Multiple Calendars with Custom Names

```env
CALENDAR_IDS=Community Events:abc123@group.calendar.google.com,Streams:xyz789@group.calendar.google.com,Private:primary
```

**Format:** `Name:CalendarID,Name:CalendarID,...`

### Option 3: Multiple Calendars without Names

```env
CALENDAR_IDS=abc123@group.calendar.google.com,xyz789@group.calendar.google.com,primary
```

The bot will name them "Calendar 1", "Calendar 2", etc.

## Complete Setup Example

### Step 1: Get Your Calendar IDs

For each calendar you want to sync:

1. Open Google Calendar (https://calendar.google.com)
2. Find the calendar in the left sidebar
3. Click the three dots (⋮) next to it
4. Click "Settings and sharing"
5. Scroll to "Integrate calendar"
6. Copy the "Calendar ID"

**Example Calendar IDs:**
- Primary calendar: `your-email@gmail.com` or use `primary`
- Created calendars: `abcd1234@group.calendar.google.com`

### Step 2: Share All Calendars

For EACH calendar:

1. In calendar settings, find "Share with specific people"
2. Click "Add people"
3. Enter your service account email (from the JSON file):
   ```
   discord-event-bot@project-name.iam.gserviceaccount.com
   ```
4. Set permission: **"Make changes to events"** or **"See all event details"**
5. Uncheck "Send email notification"
6. Click "Send"

⚠️ **Important:** You must share EVERY calendar you want to use!

### Step 3: Configure .env

Edit your `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
GOOGLE_CREDENTIALS={"type":"service_account",...}
CALENDAR_IDS=Community Events:abc123@group.calendar.google.com,Streams:xyz789@group.calendar.google.com,Private:primary
```

### Step 4: Restart the Bot

```bash
npm start
```

You should see:
```
📅 Configured 3 calendar(s): Community Events, Streams, Private
[Calendar] Testing connection to 3 calendar(s)...
[Calendar] Testing "Community Events" (abc123@group.calendar.google.com)
[Calendar] ✅ "Community Events" - Successfully connected
[Calendar] Testing "Streams" (xyz789@group.calendar.google.com)
[Calendar] ✅ "Streams" - Successfully connected
[Calendar] Testing "Private" (primary)
[Calendar] ✅ "Private" - Successfully connected
```

## Using Multiple Calendars

### List Configured Calendars

```
!calendars
```

**Response:**
```
📅 Configured Calendars
These calendars are available for syncing:

1. Community Events
   ID: abc123@group.calendar.google.com
   To sync only this calendar: !sync Community Events

2. Streams
   ID: xyz789@group.calendar.google.com
   To sync only this calendar: !sync Streams

3. Private
   ID: primary
   To sync only this calendar: !sync Private
```

### Sync All Calendars

```
!sync
```

Imports events from ALL configured calendars.

### Sync Specific Calendar

```
!sync Community Events
!sync Streams
!sync Private
```

Imports events from only the specified calendar.

**Tip:** The filter is case-insensitive and matches partial names:
```
!sync community    # Matches "Community Events"
!sync stream       # Matches "Streams"
```

## Use Cases

### Use Case 1: Gaming Community

**Setup:**
```env
CALENDAR_IDS=Public Events:community@group.calendar.google.com,Clan Events:clan@group.calendar.google.com,Tournaments:tournaments@group.calendar.google.com
```

**Usage:**
```
!sync Public Events      # Import public raids, events
!sync Clan Events        # Import clan-only events
!sync Tournaments        # Import tournament schedule
```

**Result:**
- Each event shows which calendar it came from
- Easy to distinguish event types
- Separate signups for each calendar

### Use Case 2: Content Creator

**Setup:**
```env
CALENDAR_IDS=Stream Schedule:streams@group.calendar.google.com,Community Games:community@group.calendar.google.com
```

**Usage:**
```
!sync Stream Schedule    # Import streaming schedule
!sync Community Games    # Import viewer games
```

**Workflow:**
1. Create stream schedule in Google Calendar
2. Run `!sync Stream Schedule` in Discord
3. Viewers see upcoming streams
4. Can sign up for games/events

### Use Case 3: Multi-Game Community

**Setup:**
```env
CALENDAR_IDS=Valorant:valorant@group.calendar.google.com,Overwatch:overwatch@group.calendar.google.com,League:league@group.calendar.google.com
```

**Usage:**
```
!sync Valorant     # Import Valorant events
!sync Overwatch    # Import Overwatch events
!sync League       # Import League events
!sync              # Import ALL game events
```

**Benefits:**
- Organized by game
- Players can see all events or filter by game
- Easy calendar management

### Use Case 4: Study Group

**Setup:**
```env
CALENDAR_IDS=Group Study:study@group.calendar.google.com,Exam Prep:exams@group.calendar.google.com,Social:social@group.calendar.google.com
```

**Usage:**
- Separate calendars for different purposes
- Easy to manage different event types
- Clear organization

## Event Display

When events are imported, they show which calendar they came from:

```
┌─────────────────────────────────────┐
│ 🎮 Friday Night Raid                │
├─────────────────────────────────────┤
│ Weekly raid night                    │
│                                      │
│ 📅 Date & Time: 15-02-2026 8:00 PM  │
│ ⏱️ Duration: 180 minutes            │
│ 👥 Max Participants: Unlimited      │
│                                      │
│ Event ID: event_123 | From: Community Events
└─────────────────────────────────────┘
```

Notice the footer: `From: Community Events`

## Auto-Sync with Multiple Calendars

Auto-sync imports from ALL configured calendars:

```
!autosync on
```

**What happens:**
1. Immediately syncs all calendars
2. Every hour, checks all calendars for new events
3. Imports new events from any calendar
4. Posts them with calendar source labeled

**Example output:**
```
✅ Imported 5 events from 3 calendars
📅 Calendars: Community Events, Streams, Private

[5 events posted with their calendar sources]
```

## Advanced Configuration

### Priority Order

Calendars are checked in the order you list them in `CALENDAR_IDS`.

**Example:**
```env
CALENDAR_IDS=Priority:primary,Secondary:abc@group.calendar.google.com
```

Events created in Discord are sent to the **first calendar** (Priority).

### Filtering by Calendar

You can filter by calendar name OR calendar ID:

```
!sync Community Events          # By name
!sync abc123@group.calendar.google.com   # By ID
!sync community                 # Partial match
```

### Calendar Names Best Practices

✅ **Good Names:**
- Descriptive: "Raid Events", "Stream Schedule"
- Short: "Raids", "Streams", "Private"
- Clear: "Public Events", "Clan Only"

❌ **Avoid:**
- Too long: "Super Amazing Community Gaming Events Calendar"
- Confusing: "Calendar1", "Test", "Misc"
- Similar names: "Events", "Event", "Events2"

## Troubleshooting

### "No calendar found matching X"

**Cause:** The calendar name/ID doesn't match any configured calendars.

**Solution:**
1. Run `!calendars` to see available calendars
2. Check spelling and capitalization
3. Use exact or partial name

### Calendar not syncing

**Check:**
1. Calendar is in `CALENDAR_IDS`
2. Calendar is shared with service account
3. Service account has correct permissions
4. Calendar ID is correct

**Test:**
```
!calendars           # See all configured
!sync CalendarName   # Try syncing specific one
```

### Some calendars work, others don't

**Individual calendar issues:**

Run `!calendars` to see which are configured.

Check bot startup logs:
```
[Calendar] ✅ "Community Events" - Successfully connected
[Calendar] ❌ "Streams" - Failed: Not Found
```

**Fix failing calendars:**
1. Verify Calendar ID is correct
2. Ensure calendar is shared with service account
3. Check permissions

### Events from wrong calendar

**Check:**
- Events show calendar source in footer
- Filter by calendar when syncing: `!sync SpecificCalendar`

### Too many calendars

**Limit:** No hard limit, but recommended 5-10 max for performance.

**If you have many calendars:**
- Group similar events into one calendar
- Use selective syncing: `!sync CalendarName`
- Don't enable auto-sync for all

## Examples

### Example 1: Esports Team

```env
CALENDAR_IDS=Scrims:scrims@group.calendar.google.com,Tournaments:tournaments@group.calendar.google.com,Practice:practice@group.calendar.google.com
```

**Commands:**
```
!sync Scrims        # Import scrimmages
!sync Tournaments   # Import tournament matches
!sync Practice      # Import practice sessions
!sync               # Import everything
```

### Example 2: Content Creator Network

```env
CALENDAR_IDS=Main Channel:main@group.calendar.google.com,Collab:collab@group.calendar.google.com,Community:community@group.calendar.google.com
```

**Usage:**
- Main Channel: Your stream schedule
- Collab: Collaboration events
- Community: Community game nights

### Example 3: Educational Server

```env
CALENDAR_IDS=Lectures:lectures@group.calendar.google.com,Study Groups:study@group.calendar.google.com,Office Hours:office@group.calendar.google.com
```

**Benefits:**
- Clear event categorization
- Easy for students to see relevant events
- Organized schedule management

## Migration from Single Calendar

### If you currently use one calendar:

**Before:**
```env
CALENDAR_ID=primary
```

**After:**
```env
CALENDAR_IDS=Main Events:primary,Secondary:abc@group.calendar.google.com
```

**Steps:**
1. Add new calendars to `CALENDAR_IDS`
2. Remove old `CALENDAR_ID` variable
3. Restart bot
4. Run `!calendars` to verify
5. Test with `!sync`

**Note:** Existing events remain unchanged. New syncs will include all calendars.

## Best Practices

### ✅ DO:

1. Use descriptive calendar names
2. Share all calendars with service account
3. Test each calendar individually first
4. Use `!calendars` to verify setup
5. Filter by calendar when needed
6. Organize events by type/purpose

### ❌ DON'T:

1. Use too many calendars (5-10 max recommended)
2. Forget to share calendars with service account
3. Use confusing or similar names
4. Mix unrelated event types in one calendar
5. Enable auto-sync without testing first

## FAQ

**Q: How many calendars can I use?**
A: No hard limit, but 5-10 recommended for best performance.

**Q: Can I sync some calendars automatically and others manually?**
A: Auto-sync syncs ALL calendars. Use manual `!sync CalendarName` for selective syncing.

**Q: Where do Discord-created events go?**
A: To the first calendar in your `CALENDAR_IDS` list.

**Q: Can I rename calendars in Discord?**
A: Yes, just change the name in `CALENDAR_IDS` and restart the bot.

**Q: Do I need separate service accounts?**
A: No, one service account can access all calendars (if properly shared).

**Q: Can different Discord channels sync different calendars?**
A: Currently no. All channels see all configured calendars. (Feature could be added)

**Q: What if a calendar is deleted?**
A: Bot will show error on startup. Remove from `CALENDAR_IDS` and restart.

**Q: Can I sync calendars from different Google accounts?**
A: Yes, as long as all are shared with the service account.

---

**Summary:** Multiple calendar support lets you organize events by type, purpose, or community. Configure in `.env`, share all calendars with service account, and use `!sync` with optional filtering to import events selectively or all at once!
