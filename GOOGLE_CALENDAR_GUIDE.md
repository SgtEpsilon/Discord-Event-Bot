# Google Calendar Integration Guide

This guide explains exactly how the Google Calendar integration works with the Discord Event Bot.

## Overview

When enabled, the bot automatically creates Google Calendar events whenever you create a Discord event. This keeps your calendar synced with your gaming/event schedule.

## How It Works

### Step-by-Step Flow

1. **You create a Discord event:**
   ```
   !preset overwatch 2026-02-15 20:00
   ```

2. **Bot processes the event:**
   - Creates the event in Discord
   - Extracts event details (title, date, time, duration)
   - Converts to Google Calendar format

3. **Bot creates Calendar event:**
   - Sends request to Google Calendar API
   - Creates event with title, description, start/end times
   - Receives a link to the calendar event

4. **Bot updates Discord message:**
   - Adds calendar link to the Discord event embed
   - Users can click to view/add to their own calendars

### What Gets Synced

The bot syncs the following information to Google Calendar:

| Discord Field | Google Calendar Field |
|--------------|---------------------|
| Event Title | Event Summary |
| Description | Event Description |
| Date & Time | Start Time |
| Duration | End Time (calculated) |
| - | Calendar Link (added back to Discord) |

**Note:** Signups and role assignments are NOT synced to Google Calendar. The calendar only shows the event details, not who signed up.

## Visual Example

### Discord Event Created
```
!preset overwatch 2026-02-15 20:00 Competitive push
```

### What Appears in Discord
```
┌─────────────────────────────────────┐
│ 🎮 Overwatch                        │
├─────────────────────────────────────┤
│ Competitive push                     │
│                                      │
│ 📅 Date & Time: Feb 15, 2026 8:00 PM│
│ ⏱️ Duration: 90 minutes             │
│ 👥 Max Participants: 5              │
│                                      │
│ 🛡️ Tank (0/1)                       │
│ None yet                             │
│                                      │
│ ⚔️ Damage (0/2)                     │
│ None yet                             │
│                                      │
│ ❤️ Support (0/2)                    │
│ None yet                             │
│                                      │
│ 🔗 Google Calendar                  │
│ [View in Calendar] ← Click here!    │
└─────────────────────────────────────┘
```

### What Appears in Google Calendar
```
┌─────────────────────────────────────┐
│ February 15, 2026                   │
├─────────────────────────────────────┤
│ 8:00 PM - 9:30 PM                   │
│ 🎮 Overwatch                        │
│ Competitive push                     │
└─────────────────────────────────────┘
```

## Setup Process

### Prerequisites

You need:
1. A Google account
2. Access to Google Cloud Console
3. 10-15 minutes for setup

### Complete Setup Steps

#### Part 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a Project**
   - Click "Select a project" at the top
   - Click "New Project"
   - Name it (e.g., "Discord Event Bot")
   - Click "Create"

3. **Enable Google Calendar API**
   - In the search bar, type "Calendar API"
   - Click "Google Calendar API"
   - Click "Enable"
   - Wait for it to enable (~30 seconds)

4. **Create Service Account**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `discord-event-bot`
   - Description: `Service account for Discord bot`
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

5. **Create JSON Key**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Click "Create"
   - A JSON file downloads automatically - **save this file!**

#### Part 2: Share Your Calendar

1. **Open Google Calendar**
   - Go to https://calendar.google.com/

2. **Find the Service Account Email**
   - Open the JSON file you downloaded
   - Look for `"client_email":`
   - Copy the email address (looks like: `discord-event-bot@project-name.iam.gserviceaccount.com`)

3. **Share Your Calendar**
   - In Google Calendar, find the calendar you want to use
   - Click the three dots next to it
   - Select "Settings and sharing"
   - Scroll to "Share with specific people"
   - Click "Add people"
   - Paste the service account email
   - Set permission: **"Make changes to events"**
   - **Uncheck** "Send email notification"
   - Click "Send"

4. **Get Calendar ID (Optional)**
   - If using a non-primary calendar
   - In calendar settings, scroll to "Integrate calendar"
   - Copy the "Calendar ID" (looks like: `abcd1234@group.calendar.google.com`)

#### Part 3: Configure the Bot

1. **Open the JSON key file**
   - Use any text editor (Notepad, VS Code, etc.)
   - You'll see something like:
   ```json
   {
     "type": "service_account",
     "project_id": "discord-bot-12345",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "discord-bot@discord-bot-12345.iam.gserviceaccount.com",
     ...
   }
   ```

2. **Copy the ENTIRE JSON**
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - **Important:** Must be copied as ONE line with no extra line breaks

3. **Add to .env file**
   - Open your `.env` file
   - Find the line: `GOOGLE_CREDENTIALS=`
   - Paste the JSON right after the `=`
   - It should look like:
   ```env
   GOOGLE_CREDENTIALS={"type":"service_account","project_id":"discord-bot-12345",...}
   ```

4. **Set Calendar ID (if needed)**
   - If using a specific calendar (not primary):
   ```env
   CALENDAR_ID=your-calendar-id@group.calendar.google.com
   ```
   - If using your primary calendar (default):
   ```env
   CALENDAR_ID=primary
   ```

5. **Save and restart the bot**
   ```bash
   npm start
   ```

6. **Verify Connection**
   - Look for: `✅ Google Calendar: Connected`
   - If you see this, you're all set!

## What You'll See

### When Calendar is Connected

```
✅ Claude's Event Bot is online!
🔗 Google Calendar: Connected
📋 Loaded 18 event presets
```

### When Calendar is NOT Configured

```
✅ Claude's Event Bot is online!
🔗 Google Calendar: Not configured
📋 Loaded 18 event presets
```

This is fine! The bot works perfectly without Google Calendar - it just won't sync events.

## How Users Interact with Calendar Events

### Discord Users Can:

1. **Click the calendar link** in the event embed
2. **View the event** in Google Calendar (read-only)
3. **Add to their own calendar** (using the Google Calendar interface)
4. **See event details** like time, date, location

### Discord Users CANNOT:

- Modify the bot's calendar event
- See who signed up (that's Discord-only)
- Delete the event from calendar
- Access the service account

## Calendar Behavior

### When Events are Created

✅ **What happens:**
- Bot creates event in Google Calendar
- Event appears immediately
- Link is added to Discord message
- Users can click to view

### When Events are Modified

⚠️ **Currently:**
- Modifying roles in Discord does NOT update calendar
- Calendar shows original event details
- Role signups are Discord-only

### When Events are Deleted

✅ **Using `!delete` command:**
- Event removed from Discord
- Calendar event remains (manual deletion needed)

❌ **Deleting from Calendar:**
- Does NOT delete Discord event
- These are independent systems

## Technical Details

### API Calls

The bot makes these API calls:

1. **When creating an event:**
   ```
   POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
   ```

2. **Data sent:**
   ```json
   {
     "summary": "Overwatch",
     "description": "Competitive push",
     "start": {
       "dateTime": "2026-02-15T20:00:00.000Z",
       "timeZone": "UTC"
     },
     "end": {
       "dateTime": "2026-02-15T21:30:00.000Z",
       "timeZone": "UTC"
     }
   }
   ```

3. **Response received:**
   ```json
   {
     "htmlLink": "https://calendar.google.com/calendar/event?eid=...",
     ...
   }
   ```

### Time Zone Handling

- **Bot:** Uses UTC for all calculations
- **Google Calendar:** Converts to user's timezone automatically
- **Users:** See events in their local timezone

### Authentication Flow

```
Discord Bot → Service Account → Google Calendar API → Your Calendar
     ↓              ↓                    ↓                 ↓
  Creates      Authenticates        Accepts          Displays
   Event       with JSON Key        Request           Event
```

## Troubleshooting

### "Failed to initialize Google Calendar"

**Cause:** Invalid JSON in `GOOGLE_CREDENTIALS`

**Fix:**
1. Re-copy the JSON from the downloaded file
2. Ensure it's all on ONE line
3. Check for extra quotes or spaces
4. Verify the `.env` file is saved

### "Google Calendar: Not configured"

**This is normal if:**
- You haven't set up Google Calendar yet
- You left `GOOGLE_CREDENTIALS` empty
- You want to use the bot without calendar sync

**To enable:**
- Follow the setup steps above
- Add credentials to `.env`
- Restart the bot

### Events create in Discord but not Calendar

**Check:**
1. Is the service account shared with the calendar?
2. Does it have "Make changes to events" permission?
3. Is the Google Calendar API enabled?
4. Are you using the correct Calendar ID?

**Test:**
1. Create a simple event: `!preset apex 2026-02-20 12:00`
2. Check bot logs for errors
3. Check Google Calendar

### Calendar link doesn't work

**Cause:** Event created before calendar was configured

**Fix:**
- Delete and recreate the event
- Calendar links only work for new events

### Wrong calendar being used

**Cause:** Incorrect `CALENDAR_ID` in `.env`

**Fix:**
1. Get the correct Calendar ID from Google Calendar settings
2. Update `.env`: `CALENDAR_ID=your-calendar-id@group.calendar.google.com`
3. Restart bot

## Privacy & Security

### Who Can Access the Calendar?

**Service Account:**
- Only has access to calendars you explicitly share
- Cannot access other Google services
- Cannot read emails, files, etc.

**Discord Users:**
- Can view events via the link
- Cannot modify or delete
- See the same info everyone sees

### Best Practices

✅ **DO:**
- Use a dedicated calendar for bot events
- Keep the JSON key file secure
- Add `.env` to `.gitignore`
- Use a descriptive service account name

❌ **DON'T:**
- Share your JSON key file
- Commit `.env` to git
- Give service account unnecessary permissions
- Use your personal main calendar (create a new one)

## Advanced Configuration

### Using Multiple Calendars

You can configure different calendars for different servers by:
1. Creating multiple service accounts
2. Using different `.env` configurations
3. Running separate bot instances

### Custom Time Zones

To change the default timezone from UTC:

Edit `bot.js`, find the `createGoogleCalendarEvent` function:

```javascript
start: {
    dateTime: new Date(event.dateTime).toISOString(),
    timeZone: 'America/New_York',  // Change this
},
end: {
    dateTime: endTime.toISOString(),
    timeZone: 'America/New_York',  // Change this
},
```

Valid timezone strings: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Syncing Signups (Future Enhancement)

Currently, signups are NOT synced. To add this feature, you would need to:
1. Update the event description with signup lists
2. Call the calendar API to update events
3. Handle race conditions and rate limits

This is not implemented by default to keep the integration simple and reliable.

## Costs

### Google Calendar API

- **Free Tier:** 1,000,000 requests per day
- **Bot Usage:** ~1 request per event created
- **Estimated Cost:** $0 for typical Discord server

Even with 100 events per day, you'd use only 100 requests - well within the free tier.

## FAQ

**Q: Do I need Google Calendar for the bot to work?**
A: No! It's completely optional. The bot works great without it.

**Q: Can users add events to their own calendars?**
A: Yes! They click the calendar link and use Google Calendar's "Add to Calendar" feature.

**Q: Will deleted Discord events be removed from Calendar?**
A: No, you need to delete them manually from Google Calendar.

**Q: Can I use a Google Workspace account?**
A: Yes! The process is the same. Just make sure the service account is shared with your workspace calendar.

**Q: What if I want to disable calendar sync later?**
A: Just remove the `GOOGLE_CREDENTIALS` from `.env` or set it to empty.

**Q: Can multiple bots use the same calendar?**
A: Yes, but each bot should have its own service account for better tracking.

## Summary

**Calendar Integration:**
- ✅ Automatic event creation
- ✅ Shareable calendar links
- ✅ Multi-timezone support
- ✅ Free to use
- ❌ No automatic event updates
- ❌ No signup syncing
- ❌ Manual calendar deletion needed

**Perfect for:**
- Keeping a centralized event calendar
- Sharing schedules across platforms
- Setting phone reminders for events
- Viewing all events in one place

**Not needed if:**
- You only use Discord for events
- You don't want external calendar sync
- You prefer simpler setup

---

Need help? Check the README.md or ENV_SETUP.md files for more details!
