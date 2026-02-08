# Commands & Usage Reference

Complete guide to all bot commands with examples and best practices.

## 📋 Table of Contents

- [Event Commands](#event-commands)
- [Streaming Commands](#streaming-commands)
- [Date Format](#date-format)
- [Using Presets](#using-presets)
- [Custom Events](#custom-events)
- [User Interactions](#user-interactions)

---

## Event Commands

### /preset - Create Event from Template

**Fastest way to create events!** Uses pre-configured game templates.

**Syntax:**
```
/preset preset_name:<game> datetime:<DD-MM-YYYY HH:MM> [description:<text>]
```

**Examples:**
```
/preset preset_name:overwatch datetime:15-02-2026 20:00

/preset preset_name:valorant datetime:16-02-2026 19:00 description:Ranked grind

/preset preset_name:dnd datetime:18-02-2026 18:00 description:Chapter 5: The Lost City
```

**Available Presets:**

| Preset | Game | Players | Roles |
|--------|------|---------|-------|
| `overwatch` | Overwatch | 5 | Tank (1), Damage (2), Support (2) |
| `valorant` | Valorant | 5 | Duelist (2), Controller (1), Sentinel (1), Initiator (1) |
| `csgo` | Counter-Strike | 5 | Entry, AWPer, Support, Lurker, IGL |
| `apex` | Apex Legends | 3 | Legend (3) |
| `helldivers` | Helldivers 2 | 4 | Helldiver (4) |
| `wow-raid` | WoW Raid | 20 | Tank (2), Healer (4), DPS (14) |
| `ffxiv-raid` | FFXIV | 8 | Tank (2), Healer (2), DPS (4) |
| `league` | League of Legends | 5 | Top, Jungle, Mid, ADC, Support |
| `minecraft` | Minecraft | ∞ | Builder, Miner, Explorer |
| `dnd` | D&D | 6 | DM (1), Player (5) |
| `among-us` | Among Us | 10 | Crewmate (10) |

**See all presets:** `/presets`

---

### /create - Create Custom Event

For events not covered by presets.

**Syntax:**
```
/create title:<name> datetime:<DD-MM-YYYY HH:MM> duration:<minutes> 
        [description:<text>] [max_participants:<number>]
```

**Parameters:**

- `title` - Event name (Required)
- `datetime` - When it starts in DD-MM-YYYY HH:MM format (Required)
- `duration` - Length in minutes (Required)
- `description` - Event details (Optional)
- `max_participants` - Total player limit, 0 = unlimited (Optional)

**Examples:**
```
/create title:Raid Night datetime:15-02-2026 20:00 duration:180

/create title:Tournament datetime:16-02-2026 14:00 duration:240 
        description:Monthly 1v1 tournament max_participants:32

/create title:Study Session datetime:20-02-2026 15:00 duration:120
        description:Math exam prep
```

**Default values:**
- `description` = empty
- `max_participants` = 0 (unlimited)

---

### /addrole - Add Signup Role

Add a signup category to an event.

**Syntax:**
```
/addrole event_id:<id> emoji:<emoji> role_name:<name> [max_slots:<number>]
```

**Parameters:**

- `event_id` - Event ID from event message (Required)
- `emoji` - Icon for the role (Required)
- `role_name` - Display name (Required)
- `max_slots` - Maximum signups, 0 = unlimited (Optional)

**Examples:**
```
/addrole event_id:event_123 emoji:⚔️ role_name:DPS max_slots:6

/addrole event_id:event_123 emoji:🛡️ role_name:Tank max_slots:2

/addrole event_id:event_123 emoji:❤️ role_name:Healer max_slots:2
```

**Emoji tips:**
- Use any emoji: ⚔️ 🛡️ ❤️ 🎮 📚 🎯
- Copy from [Emojipedia](https://emojipedia.org/)
- Discord custom emojis work too

**Role limits:**
- Maximum 24 roles per event (Discord button limit)
- 1 role reserved for "Leave Event" button
- Set `max_slots:0` for unlimited

---

### /list - View All Events

Show all upcoming and recent events.

**Syntax:**
```
/list
```

**Output:**
- Event title, date, and time
- Signup counts per role
- Event ID for management
- Calendar sync status

**Example output:**
```
📅 Upcoming Events

🎮 Valorant Ranked
Friday, 16-02-2026 7:00 PM
Duelist: 2/2 | Controller: 1/1 | Sentinel: 1/1
Event ID: event_456

⚔️ Raid Night
Saturday, 17-02-2026 8:00 PM
Tank: 2/2 | Healer: 2/2 | DPS: 4/6
Event ID: event_789
🔗 Synced to Calendar
```

---

### /delete - Remove Event

Delete an event and its calendar entry.

**Syntax:**
```
/delete event_id:<id>
```

**Example:**
```
/delete event_id:event_123
```

**What gets deleted:**
- Event from Discord
- Event from events.json
- Calendar event (if synced)
- Original event message

**Note:** Users will see "Event not found" on old signup buttons.

---

### /eventinfo - Detailed Event Info

View comprehensive event details including timezone information.

**Syntax:**
```
/eventinfo event_id:<id>
```

**Example:**
```
/eventinfo event_id:event_123
```

**Shows:**
- Full event details
- Your local time (auto-converted)
- Relative time (in X hours)
- Unix timestamp
- All signup roles
- Current participants
- Calendar link (if synced)

**Perfect for sharing:**
- Copy event ID for teammates
- See event in your timezone
- Check who's signed up

---

### /sync - Import from Google Calendar

Manually import events from Google Calendar.

**Requires:** Google Calendar configured in .env

**Syntax:**
```
/sync
```

**What it does:**
1. Fetches upcoming events (next 7 days)
2. Imports new events to Discord
3. Skips already-imported events
4. Posts in current channel

**Example:**
```
/sync

Bot: 🔄 Syncing events from Google Calendar...
Bot: ✅ Imported 3 events
     [Posts 3 event embeds]
```

**Use when:**
- Created events in Google Calendar
- Starting to use bot with existing calendar
- Want to refresh event list

---

### /autosync - Enable Auto-Import

Automatically import calendar events every hour.

**Requires:** Google Calendar configured

**Enable:**
```
/autosync enabled:true
```

**Disable:**
```
/autosync enabled:false
```

**Check status:**
```
/autosync
```

**How it works:**
- Runs immediately when enabled
- Checks every hour
- Only imports NEW events
- Posts to channel where enabled
- One channel per server

**Example:**
```
/autosync enabled:true

Bot: ✅ Auto-sync enabled! Events will be synced every hour.

[1 hour later - bot posts any new calendar events]
```

---

### /presets - List Available Templates

View all game presets with details.

**Syntax:**
```
/presets
```

**Shows:**
- Preset name/ID
- Game title
- Duration
- Max participants
- All roles with slots

**Use this to:**
- Find preset names for /preset command
- See what games are available
- Check role configurations

---

## Streaming Commands

### /setup-streaming - Configure Notifications

Set where stream/video notifications are posted.

**Syntax:**
```
/setup-streaming channel:<#channel>
```

**Example:**
```
/setup-streaming channel:#stream-announcements
```

**What it does:**
- Sets notification channel for server
- Enables both Twitch and YouTube
- One channel per server
- Can change anytime

**Required:** Run this before adding streamers/channels!

---

### /add-streamer - Monitor Twitch Streamer

Add a Twitch streamer to monitor.

**Requires:** 
- Twitch configured in .env
- /setup-streaming already run

**Syntax:**
```
/add-streamer
```

**Interactive modal:**
1. Twitch username (required)
2. Custom message (optional)

**Username format:**
- Just the username: `shroud`
- Not full URL
- Case-insensitive

**Custom message placeholders:**
- `{username}` - Streamer display name
- `{title}` - Stream title
- `{game}` - Game/category
- `{url}` - Stream URL

**Example custom message:**
```
🎯 {username} is live!
Playing: {game}
{url}
```

**Default message:**
```
🔴 {username} is now live!
**{title}**
Playing: {game}
```

**What happens:**
- Bot checks every 60 seconds
- Posts when streamer goes live
- Includes thumbnail, viewer count
- "Watch Now" button
- Updates message if game changes

---

### /add-youtube - Monitor YouTube Channel

Add YouTube channel for new video notifications.

**No API key required!** Uses RSS feeds.

**Syntax:**
```
/add-youtube channel:<channel_handle_or_id>
```

**Supported formats:**
```
/add-youtube channel:@LinusTechTips
/add-youtube channel:https://youtube.com/@MrBeast
/add-youtube channel:UCX6OQ3DkcsbYNE6H8uQQuVA
```

**What it does:**
- Validates channel exists
- Starts monitoring RSS feed
- Checks every 5 minutes
- Posts when new video uploaded

**Note:** First run only initializes - won't send notifications for existing videos.

---

### /list-streamers - Show Monitored Streamers

View all Twitch streamers being monitored.

**Syntax:**
```
/list-streamers
```

**Shows:**
- Streamer username
- Custom message (if set)
- Current live status
- Notification channel

**Use to:**
- Verify streamers are added
- Check who's being monitored
- See custom messages

---

### /list-youtube - Show Monitored Channels

View all YouTube channels being monitored.

**Syntax:**
```
/list-youtube
```

**Shows:**
- Channel name
- Channel ID
- Last check time
- Notification channel

---

## Date Format

**Required format:** `DD-MM-YYYY HH:MM`

### Valid Examples

**24-hour format:**
```
15-02-2026 20:00   ← 8:00 PM
01-12-2026 14:30   ← 2:30 PM
25-03-2026 00:00   ← Midnight
```

**12-hour format (also works):**
```
15-02-2026 08:00 PM
15-02-2026 02:30 PM
25-03-2026 12:00 AM
```

### Invalid Examples

```
❌ 2026-02-15 20:00    (wrong order - YYYY-MM-DD)
❌ 02-15-2026 20:00    (American format)
❌ 15/02/2026 20:00    (slashes instead of dashes)
❌ 15-2-2026 20:00     (month not zero-padded)
❌ 15-02-26 20:00      (2-digit year)
```

### Quick Reference

```
DD = Day (01-31)
MM = Month (01-12)
YYYY = Year (4 digits)
HH = Hour (00-23)
MM = Minutes (00-59)
```

**Remember:** Day first, month second (European format)

---

## Using Presets

### Quick Event Creation

**Fastest workflow:**
```
/preset preset_name:overwatch datetime:15-02-2026 20:00
```

Done! Event created with:
- ✅ Title: "Overwatch"
- ✅ Roles: Tank (1), Damage (2), Support (2)
- ✅ Duration: 90 minutes
- ✅ Max participants: 5
- ✅ Signup buttons

### Customizing Preset Events

**Add custom description:**
```
/preset preset_name:valorant datetime:16-02-2026 19:00 
        description:Push to Immortal!
```

**After creation, you can:**
- Add more roles with /addrole
- Users can signup immediately
- Delete if needed with /delete

### When to Use Presets

**Use presets when:**
- ✅ Playing popular games
- ✅ Want standard role setup
- ✅ Need quick event creation
- ✅ Hosting recurring activities

**Create custom when:**
- ❌ Game not in presets
- ❌ Need different roles
- ❌ Unique event structure

---

## Custom Events

### Basic Custom Event

**Minimal example:**
```
/create title:Gaming Night datetime:15-02-2026 20:00 duration:120
```

Then add roles:
```
/addrole event_id:event_123 emoji:🎮 role_name:Player max_slots:8
```

### Advanced Custom Event

**Full example:**
```
/create title:Speedrun Tournament datetime:20-02-2026 14:00 duration:240
        description:Any% glitchless - $100 prize pool
        max_participants:16
```

Add categories:
```
/addrole event_id:event_789 emoji:🏃 role_name:Runner max_slots:8
/addrole event_id:event_789 emoji:👁️ role_name:Judge max_slots:3
/addrole event_id:event_789 emoji:📺 role_name:Spectator max_slots:0
```

### Study/Work Groups

```
/create title:Study Session datetime:18-02-2026 15:00 duration:120
        description:Calculus final exam prep

/addrole event_id:event_456 emoji:📚 role_name:Participant max_slots:0
```

### Tournament Structure

```
/create title:Championship Finals datetime:25-02-2026 16:00 duration:180
        max_participants:32

/addrole event_id:event_999 emoji:🎮 role_name:Player max_slots:32
/addrole event_id:event_999 emoji:📋 role_name:Substitute max_slots:8
/addrole event_id:event_999 emoji:🎙️ role_name:Caster max_slots:2
```

---

## User Interactions

### Signing Up

**Users click buttons on event message:**

```
┌─────────────────────────────┐
│ 🎮 Valorant Ranked          │
├─────────────────────────────┤
│ [🎯 Duelist (0/2)]          │  ← Click to sign up
│ [🛡️ Sentinel (0/1)]         │
│ [💨 Initiator (0/1)]        │
│ [💨 Controller (0/1)]       │
│                             │
│ [❌ Leave Event]            │  ← Click to leave
└─────────────────────────────┘
```

**What happens:**
1. User clicks role button
2. Bot adds them to that role
3. Button updates with their name
4. Count increases (e.g., 0/2 → 1/2)

### Leaving Events

**Users click "Leave Event" button:**

- Removes from ALL roles
- Frees up their slot
- Updates counts

### Full Roles

**When role is full:**
- Button grayed out
- Shows "FULL" badge
- Can't sign up
- Users can join other roles

**Example:**
```
[🎯 Duelist (2/2)] FULL ← Grayed out
[🛡️ Sentinel (0/1)]     ← Still available
```

### Changing Roles

**To switch roles:**
1. Click "Leave Event"
2. Click new role button

(No direct role switching - must leave first)

---

## Best Practices

### Event Creation

✅ **DO:**
- Use presets for standard games
- Add clear descriptions
- Set realistic durations
- Test date format first

❌ **DON'T:**
- Create duplicate events
- Use vague titles
- Forget to add roles
- Use wrong date format

### Role Configuration

✅ **DO:**
- Match game requirements
- Use relevant emojis
- Set appropriate limits
- Keep under 24 roles

❌ **DON'T:**
- Create too many roles
- Use confusing names
- Set incorrect limits
- Forget unlimited option (0)

### Calendar Sync

✅ **DO:**
- Enable auto-sync for busy calendars
- Sync after creating calendar events
- Add roles after importing
- Use descriptive titles

❌ **DON'T:**
- Sync constantly (hourly is enough)
- Expect auto-updates (manual delete/recreate)
- Duplicate events in both places

### Streaming

✅ **DO:**
- Set up notification channel first
- Use custom messages for variety
- Monitor popular streamers
- Test with one streamer first

❌ **DON'T:**
- Add too many streamers (spam)
- Forget to configure Twitch API
- Enable in multiple channels

---

## Quick Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `/preset` | Quick event from template | `/preset preset_name:overwatch datetime:15-02-2026 20:00` |
| `/create` | Custom event | `/create title:Raid datetime:15-02-2026 20:00 duration:180` |
| `/addrole` | Add signup role | `/addrole event_id:event_123 emoji:⚔️ role_name:DPS max_slots:6` |
| `/list` | View events | `/list` |
| `/delete` | Remove event | `/delete event_id:event_123` |
| `/eventinfo` | Event details | `/eventinfo event_id:event_123` |
| `/sync` | Import calendar | `/sync` |
| `/autosync` | Auto-import | `/autosync enabled:true` |
| `/presets` | List templates | `/presets` |
| `/setup-streaming` | Set notification channel | `/setup-streaming channel:#announcements` |
| `/add-streamer` | Monitor Twitch | `/add-streamer` (opens modal) |
| `/add-youtube` | Monitor YouTube | `/add-youtube channel:@LinusTechTips` |

---

## Examples by Use Case

### Weekly Raid
```
/preset preset_name:wow-raid datetime:15-02-2026 20:00 
        description:Mythic Sepulcher progression
```

### Casual Gaming
```
/preset preset_name:apex datetime:16-02-2026 19:00
        description:Ranked grind - any skill level welcome
```

### Tournament
```
/create title:1v1 Tournament datetime:20-02-2026 14:00 duration:240
        max_participants:32

/addrole event_id:event_123 emoji:🎮 role_name:Player max_slots:32
/addrole event_id:event_123 emoji:📋 role_name:Substitute max_slots:8
```

### D&D Session
```
/preset preset_name:dnd datetime:18-02-2026 18:00
        description:Campaign: Lost Mines - Level 5 characters
```

### Stream Notification
```
/setup-streaming channel:#stream-announcements
/add-streamer
Username: shroud
Custom message: 🎯 The legend is live! {url}
```
