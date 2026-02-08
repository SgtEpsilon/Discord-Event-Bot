# Features & Advanced Topics

In-depth guide to bot features, calendar integration, streaming, presets, and timezone handling.

## 📋 Table of Contents

- [Google Calendar Integration](#google-calendar-integration)
- [Stream Monitoring](#stream-monitoring)
- [Event Presets](#event-presets)
- [Timezone Handling](#timezone-handling)
- [Web Interface](#web-interface)
- [Creating Custom Presets](#creating-custom-presets)

---

## Google Calendar Integration

Two-way sync between Discord and Google Calendar.

### How It Works

**Discord → Calendar:**
- Events created in Discord automatically sync to Google Calendar
- Updates include title, time, duration, description
- Generates calendar link in event message

**Calendar → Discord:**
- Manual import with `/sync` command
- Automatic import with `/autosync on`
- New calendar events appear in Discord with signup buttons

### Manual Sync

**Command:** `/sync`

**What it does:**
1. Fetches upcoming events (next 7 days)
2. Checks which are new (not already in Discord)
3. Imports new events to Discord
4. Posts in current channel
5. Skips already-imported events

**Example workflow:**
```
[Create event in Google Calendar]
"Friday Night Raid - 8:00 PM - 3 hours"

[In Discord]
/sync

Bot: 🔄 Syncing events from Google Calendar...
Bot: ✅ Imported 1 event

[Event appears with signup buttons]
```

**Use cases:**
- After creating events in Google Calendar
- Import existing calendar to Discord
- Refresh event list
- Starting to use bot with populated calendar

### Auto-Sync

**Command:** `/autosync enabled:true`

**How it works:**
1. Runs immediately when enabled
2. Checks every hour automatically
3. Only imports NEW events (no duplicates)
4. Posts to channel where enabled
5. Continues until disabled

**Example:**
```
/autosync enabled:true

Bot: ✅ Auto-sync enabled! Events synced every hour.

[1 hour later]
[Bot automatically posts any new calendar events]
```

**Behavior:**
- **Syncs:** Events in next 7 days
- **Skips:** Events already in Discord, all-day events, past events
- **Tracks:** Uses `calendarEventId` to prevent duplicates
- **Runs:** Every 60 minutes
- **Posts:** In enabled channel only

**Best for:**
- Managing events primarily in Google Calendar
- Teams with shared calendars
- Mobile event creation
- Non-Discord users need access

### Event Deduplication

The bot tracks calendar events to prevent duplicates:

- Each calendar event has unique `calendarEventId`
- Running `/sync` multiple times is safe
- Already-imported events are skipped
- No spam from auto-sync

### Important Notes

**Event updates:**
- Calendar changes DON'T auto-update Discord
- To update: delete Discord event, then re-sync

**Workaround for updates:**
```
/delete event_id:event_123
[Delete from calendar or wait]
/sync
```

**Calendar permissions:**
- Service account needs "Make changes to events"
- Calendar must be shared with service account email
- See SETUP.md for configuration

### Multi-Calendar Support

**Configure in .env:**
```env
CALENDAR_IDS=primary,work@group.calendar.google.com,personal@gmail.com
```

**Features:**
- Sync from multiple calendars
- All events import together
- Each keeps original calendar link

### Use Cases

#### Use Case 1: Calendar-First Management

**Setup:**
```
/autosync enabled:true
```

**Workflow:**
1. Create all events in Google Calendar
2. Events auto-import to Discord hourly
3. Users signup via Discord buttons
4. Everyone's calendar stays synced

**Benefits:**
- Use Google Calendar's superior UI
- Mobile calendar access
- Phone reminders
- Share with non-Discord users

#### Use Case 2: Import Existing Events

**Setup:**
```
[Have 10 gaming events in calendar]

/sync
[Imports all 10 events]

/addrole event_id:event_123 emoji:⚔️ role_name:DPS max_slots:6
[Add roles to each event as needed]
```

**Benefits:**
- Migrate existing calendar
- Bulk import events
- Add Discord features (signups) to calendar events

#### Use Case 3: Hybrid Management

**Workflow:**
- Quick events: Use Discord `/preset`
- Complex events: Use Google Calendar
- Sync when needed with `/sync`

**When to use each:**

| Task | Use Discord | Use Calendar |
|------|-------------|--------------|
| Quick gaming session | ✅ | |
| Weekly recurring event | | ✅ |
| Event with presets | ✅ | |
| Complex scheduling | | ✅ |
| Mobile creation | | ✅ |
| Need signup roles NOW | ✅ | |

---

## Stream Monitoring

Real-time notifications for Twitch streams and YouTube videos.

### Twitch Monitoring

**Features:**
- Live stream detection
- Rich embeds with thumbnails
- Viewer count tracking
- Game/category detection
- Smart game change updates
- Custom per-streamer messages

**How it works:**
1. Bot checks every 60 seconds
2. Detects when streamer goes live
3. Posts rich notification
4. Updates message if game changes
5. Tracks sessions to prevent duplicates

**Setup:**
```
/setup-streaming channel:#stream-announcements
/add-streamer
Username: shroud
Custom message: 🎯 {username} just went live! {url}
```

**Smart game changes:**
- Stream starts: Posts new message
- Game changes: Edits existing message (no spam!)
- Stream ends: Next stream gets new message

**Notification includes:**
- Stream title
- Game/category
- Viewer count
- Live thumbnail
- "Watch Now" button

**Custom message placeholders:**
- `{username}` - Streamer display name
- `{title}` - Current stream title
- `{game}` - Game being played
- `{url}` - Twitch stream URL

**Example custom messages:**
```
Default:
🔴 {username} is now live!
**{title}**
Playing: {game}

Custom:
🎯 {username} streaming {game}!
"{title}"
Watch: {url}
```

### YouTube Monitoring

**Features:**
- New video detection
- RSS-based (no API quota!)
- Support for @handles and channel IDs
- Automatic notifications

**No API key needed!** Uses RSS feeds:
- ✅ No quotas
- ✅ No costs
- ✅ Works instantly
- ✅ Checks every 5 minutes

**Setup:**
```
/setup-streaming channel:#youtube-uploads
/add-youtube channel:@LinusTechTips
```

**Supported formats:**
- @handle: `@MrBeast`
- Full URL: `https://youtube.com/@LinusTechTips`
- Channel ID: `UCX6OQ3DkcsbYNE6H8uQQuVA`

**How it works:**
1. Bot fetches RSS feed every 5 minutes
2. Detects new videos
3. Posts notification with video link
4. Includes title and channel name

**Note:** First run initializes tracking - won't send notifications for existing videos.

### Best Practices

**Twitch:**
- ✅ Monitor active streamers
- ✅ Use custom messages for variety
- ✅ Set specific notification channel
- ❌ Don't add 50+ streamers (spam)
- ❌ Don't enable in multiple channels

**YouTube:**
- ✅ Monitor regular uploaders
- ✅ Use @handles when possible
- ✅ Group similar channels
- ❌ Don't expect instant notifications (5min delay)

### Notification Examples

**Twitch notification:**
```
🔴 shroud is now live!

Title: VALORANT ranked grind
Game: VALORANT
Viewers: 45,234

[Stream thumbnail image]

[Watch Now] button
```

**YouTube notification:**
```
📺 LinusTechTips uploaded a new video!

**"I built a $10,000 PC"**

[Watch on YouTube] button
```

---

## Event Presets

Pre-configured templates for instant event creation.

### Available Presets

**FPS/Shooter:**
- `overwatch` - 5 players, role queue (Tank/DPS/Support)
- `valorant` - 5 players, agent roles
- `csgo` - 5 players, team roles
- `apex` - 3 players, legends
- `cod-warzone` - 4 players, operators
- `tarkov` - 5 players, PMCs

**Co-op/PvE:**
- `helldivers` - 4 players, helldivers
- `division` - 4 players, specializations
- `phasmophobia` - 4 players, investigators

**MMO Raids:**
- `wow-raid` - 20 players, Holy Trinity (Tank/Healer/DPS)
- `ffxiv-raid` - 8 players, raid composition
- `destiny-raid` - 6 players, raiders

**MOBA:**
- `league` - 5 players, lane roles

**Survival:**
- `minecraft` - Unlimited, builder/miner/explorer
- `rust` - Unlimited, farmer/builder/PvP
- `sea-of-thieves` - 4 players, captain/crew

**Social:**
- `among-us` - 10 players, crewmates

**Tabletop:**
- `dnd` - 6 players (DM + 5 players), 4-hour sessions

### Using Presets

**Quick creation:**
```
/preset preset_name:overwatch datetime:15-02-2026 20:00
```

**With description:**
```
/preset preset_name:valorant datetime:16-02-2026 19:00 
        description:Competitive grind to Immortal
```

**Benefits:**
- ✅ Instant setup - no manual role configuration
- ✅ Standard compositions for each game
- ✅ Consistent formatting across events
- ✅ Saves time on recurring events
- ✅ Pre-configured durations

### When to Use Presets

**Use presets when:**
- Playing games in the preset list
- Want standard role setup
- Creating recurring events
- Need quick event creation

**Create custom when:**
- Game not in presets
- Non-standard role configuration
- Unique event type
- Custom participant limits

### Preset Configuration

Each preset includes:
- **Game name** - Display title
- **Description** - Default text (can override)
- **Duration** - Event length in minutes
- **Max participants** - Total player limit
- **Roles** - Pre-configured signup categories with limits

**Example preset structure:**
```json
{
  "overwatch": {
    "name": "Overwatch",
    "description": "5v5 competitive match",
    "duration": 90,
    "maxParticipants": 5,
    "roles": [
      { "name": "Tank", "emoji": "🛡️", "maxSlots": 1 },
      { "name": "Damage", "emoji": "⚔️", "maxSlots": 2 },
      { "name": "Support", "emoji": "❤️", "maxSlots": 2 }
    ]
  }
}
```

---

## Timezone Handling

Automatic timezone conversion for everyone.

### How It Works

**Discord's Magic:**
- Bot stores events as Unix timestamps
- Discord auto-converts to each user's timezone
- Everyone sees their own local time
- No manual conversion needed!

**What you see:**
```
📅 Raid Night

Original: 15-02-2026 8:00 PM
🌍 Your Time: Friday, February 15, 2026 3:00 PM
in 3 days
```

**Different users see different times:**
- 🇺🇸 Los Angeles: Friday 12:00 PM
- 🇬🇧 London: Friday 8:00 PM
- 🇯🇵 Tokyo: Saturday 5:00 AM
- 🇦🇺 Sydney: Saturday 7:00 AM

**All seeing the SAME event - just in their timezone!**

### Unix Timestamps

Every event shows Unix timestamp in footer:
```
Event ID: event_123 | Unix: 1739649600
```

**Why useful:**
- Universal - same everywhere
- Shareable - works on any platform
- Convertible - use with tools/websites

**Using Unix timestamps:**

**In Discord:**
```
Event at <t:1739649600:F>
```
Everyone sees their local time!

**In websites:**
- https://www.unixtimestamp.com/
- https://www.epochconverter.com/

**In code:**
```javascript
new Date(1739649600 * 1000)
```

### Event Info Command

**Get detailed timezone info:**
```
/eventinfo event_id:event_123
```

**Shows:**
- Original format
- Discord timestamps (multiple formats)
- Unix timestamp
- Sharable formats

**Perfect for:**
- Sharing events cross-platform
- Coordinating international teams
- Verifying your local time
- Converting to other timezones

### Cross-Timezone Planning

**International gaming group:**

Alice (LA, UTC-8), Bob (London, UTC+0), Charlie (Tokyo, UTC+9)

**Event created:** 15-02-2026 20:00 UTC

**What each sees:**
- Alice: Friday 12:00 PM
- Bob: Friday 8:00 PM  
- Charlie: Saturday 5:00 AM

**All see "in 3 days" countdown!**

### Best Practices

**Creating events:**
- ✅ Use your local time - bot converts
- ✅ Trust "Your Time" display
- ✅ Check relative countdown
- ❌ Don't manually convert timezones
- ❌ Don't specify timezone in description

**Sharing events:**
- ✅ Share event ID: `/eventinfo event_123`
- ✅ Use Unix timestamp: `<t:1739649600:F>`
- ✅ Let Discord handle conversion
- ❌ Don't say "8 PM EST"
- ❌ Don't assume everyone's in your timezone

**For participants:**
- ✅ Trust "Your Time" field
- ✅ Use relative countdown ("in X hours")
- ✅ Set calendar reminder in your timezone
- ❌ Don't convert times manually

### Daylight Saving Time

**Fully supported!**
- Unix timestamps account for DST
- Discord handles transitions
- No manual adjustment needed

---

## Web Interface

Visual dashboard for event management at `http://localhost:3000`

### Features

**Dashboard:**
- Real-time statistics
- Total events count
- Upcoming events
- Total signups
- Preset count

**Events Tab:**
- View all events as cards
- See event details
- View signup counts
- Delete events
- Past events grayed out

**Presets Tab:**
- Browse all game presets
- Click to create event
- See roles and limits
- Visual preset cards

**Create Event Tab:**
- Visual event creation form
- Date/time picker
- Role builder
- Add unlimited roles
- Validation and feedback

### Using the Web Interface

**Create event from preset:**
1. Click "Presets" tab
2. Click any game card
3. Select date and time
4. Add custom description (optional)
5. Click "Create Event"

**Create custom event:**
1. Click "Create Event" tab
2. Fill in title, description, date/time
3. Set duration and max participants
4. Add roles:
   - Emoji
   - Role name
   - Max slots
   - Click "+" for more roles
5. Click "Create Event"

**Delete event:**
1. Go to "Events" tab
2. Find event card
3. Click "Delete" button
4. Confirm

### Data Synchronization

**How it works:**
```
Web Interface ↔ events.json ↔ Discord Bot
```

**Both share same file:**
- Events created in web → Saved to events.json
- Bot reads events.json
- Changes are immediate

**What syncs:**
- ✅ Event creation
- ✅ Event deletion
- ✅ Event details
- ✅ Role configuration

**What doesn't auto-sync:**
- ❌ Discord message updates (bot handles)
- ❌ Button interactions (Discord only)
- ❌ User signups (Discord only)

### Accessing from Other Devices

**Local network access:**
1. Find your computer's IP address
2. From other device on same network
3. Visit: `http://YOUR_IP:3000`

**Example:**
```
Your IP: 192.168.1.100
Other device: http://192.168.1.100:3000
```

**Security warning:**
- ⚠️ NO authentication by default
- Safe for: home network, development
- NOT safe for: public internet
- Consider adding auth for production

---

## Creating Custom Presets

Add your own game templates to `presets.json`

### Via Web Interface (Easy)

**Coming soon!** Custom preset creation in web UI.

### Via File Edit (Advanced)

**Edit** `data/presets.json`:

```json
{
  "your-game": {
    "name": "Your Game Name",
    "description": "Default description",
    "duration": 120,
    "maxParticipants": 4,
    "roles": [
      { "name": "Role1", "emoji": "⚔️", "maxSlots": 2 },
      { "name": "Role2", "emoji": "🛡️", "maxSlots": 2 }
    ]
  }
}
```

**Field guide:**
- `name` - Display name in events
- `description` - Default text (users can override)
- `duration` - Event length in minutes
- `maxParticipants` - Total limit (0 = unlimited)
- `roles` - Array of signup categories

**Role fields:**
- `name` - Role display name
- `emoji` - Icon (copy from Emojipedia)
- `maxSlots` - Max signups (0 or null = unlimited)

**After editing:**
```bash
# Restart bot to load new preset
npm start

# Then use it
/preset preset_name:your-game datetime:15-02-2026 20:00
```

### Examples

**Lethal Company:**
```json
{
  "lethal-company": {
    "name": "Lethal Company",
    "description": "Meet the quota or die trying",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [
      { "name": "Employee", "emoji": "👷", "maxSlots": 4 }
    ]
  }
}
```

**Hunt: Showdown:**
```json
{
  "hunt-showdown": {
    "name": "Hunt: Showdown",
    "description": "Bounty hunt in the bayou",
    "duration": 120,
    "maxParticipants": 3,
    "roles": [
      { "name": "Hunter", "emoji": "🎯", "maxSlots": 3 }
    ]
  }
}
```

**Deep Rock Galactic:**
```json
{
  "deep-rock": {
    "name": "Deep Rock Galactic",
    "description": "Rock and stone!",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [
      { "name": "Driller", "emoji": "⛏️", "maxSlots": 1 },
      { "name": "Gunner", "emoji": "🔫", "maxSlots": 1 },
      { "name": "Engineer", "emoji": "🔧", "maxSlots": 1 },
      { "name": "Scout", "emoji": "🪨", "maxSlots": 1 }
    ]
  }
}
```

**Study Group:**
```json
{
  "study-group": {
    "name": "Study Session",
    "description": "Group study session",
    "duration": 120,
    "maxParticipants": 8,
    "roles": [
      { "name": "Participant", "emoji": "📖", "maxSlots": 8 }
    ]
  }
}
```

### Best Practices

**Naming:**
- Use descriptive preset keys
- Lowercase with hyphens
- Keep short and memorable
- Example: `lethal-company`, `deep-rock`

**Configuration:**
- Match game requirements exactly
- Use relevant emojis
- Set accurate slot limits
- Keep role count reasonable

**Duration:**
- 60 min - Quick matches
- 90 min - Standard sessions
- 120 min - Extended play
- 180+ min - Marathon events (raids, D&D)

**Testing:**
```bash
# After adding preset
npm start

# Test it works
/preset preset_name:your-game datetime:15-02-2026 20:00
```

---

## Advanced Topics

### Event Persistence

Events are stored in `data/events.json`:
```json
{
  "event_1708012345678": {
    "id": "event_1708012345678",
    "title": "Raid Night",
    "dateTime": "2026-02-15T20:00:00.000Z",
    "duration": 180,
    "roles": [...],
    "participants": {...}
  }
}
```

**Backup events:**
```bash
cp data/events.json data/events.backup.json
```

### Multi-Server Support

**Each server has independent:**
- Event storage (in events.json, indexed by guild ID)
- Streaming configuration (in streaming.json)
- Notification channels

**Share presets across servers:**
- presets.json is global
- Same templates available everywhere

### Rate Limiting

**Discord limits:**
- Creating events: No hard limit
- Sending messages: 5 per 5 seconds per channel
- Button interactions: No limit

**API limits:**
- Google Calendar: 1 million requests/day (free tier)
- Twitch: Check every 60 seconds (within limits)
- YouTube: RSS has no quotas

### Database Migration

**For large servers, consider:**
- SQLite for simple database
- PostgreSQL for production
- MongoDB for flexibility

(Requires code changes - events.json is simple JSON)

---

**For more information:**
- Commands: See COMMANDS.md
- Setup: See SETUP.md
- Issues: See TROUBLESHOOTING.md
