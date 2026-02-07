# Timezone & Cross-Platform Planning Guide

This guide explains how the bot handles timezones and helps coordinate events across different time zones.

## Overview

The bot now includes **automatic timezone conversion** using Discord's built-in timestamp features. Everyone sees event times in their **own local timezone** automatically!

## How It Works

### What You See

When an event is posted, you'll see:

```
┌─────────────────────────────────────┐
│ 🎮 Friday Night Raid                │
├─────────────────────────────────────┤
│ Weekly raid night                    │
│                                      │
│ 📅 Date & Time: 15-02-2026 8:00 PM  │ ← Original format
│ ⏱️ Duration: 180 minutes            │
│ 👥 Max Participants: 10             │
│                                      │
│ 🌍 Your Time                        │
│ Friday, February 15, 2026 3:00 PM   │ ← YOUR timezone!
│ in 3 days                            │ ← Relative time
│                                      │
│ Event ID: event_123 | Unix: 1739649600
└─────────────────────────────────────┘
```

### The Magic

- **Original Time:** Shows the time as entered (DD-MM-YYYY format)
- **Your Time:** Automatically converts to YOUR timezone (using Discord magic!)
- **Relative Time:** Shows "in X hours/days"
- **Unix Timestamp:** Universal timestamp anyone can use

## Discord Timestamps

Discord automatically converts Unix timestamps to each user's local timezone!

### Format Examples

Using `<t:1739649600:FORMAT>`:

| Format | Output | Description |
|--------|--------|-------------|
| `<t:1739649600:t>` | 3:00 PM | Short time |
| `<t:1739649600:T>` | 3:00:00 PM | Long time |
| `<t:1739649600:d>` | 02/15/2026 | Short date |
| `<t:1739649600:D>` | February 15, 2026 | Long date |
| `<t:1739649600:f>` | February 15, 2026 3:00 PM | Short date/time |
| `<t:1739649600:F>` | Friday, February 15, 2026 3:00 PM | Full date/time |
| `<t:1739649600:R>` | in 3 days | Relative |

**The bot uses:**
- `F` (full date/time) for "Your Time"
- `R` (relative) for countdown

## Cross-Timezone Planning

### Scenario: International Gaming Group

**Team members:**
- 🇺🇸 Alice (Los Angeles, PST/UTC-8)
- 🇬🇧 Bob (London, GMT/UTC+0)
- 🇯🇵 Charlie (Tokyo, JST/UTC+9)
- 🇦🇺 Diana (Sydney, AEDT/UTC+11)

**Event created:** 15-02-2026 20:00 (entered as UTC)

**What each person sees:**

```
Alice (Los Angeles):
🌍 Your Time: Friday, February 15, 2026 12:00 PM

Bob (London):
🌍 Your Time: Friday, February 15, 2026 8:00 PM

Charlie (Tokyo):
🌍 Your Time: Saturday, February 16, 2026 5:00 AM

Diana (Sydney):
🌍 Your Time: Saturday, February 16, 2026 7:00 AM
```

**Everyone automatically sees their own time!** ✨

## Using Unix Timestamps

### What is Unix Timestamp?

A Unix timestamp is the number of seconds since January 1, 1970 (UTC). It's timezone-independent!

**Example:** `1739649600`

### Why It's Useful

1. **Universal** - Same number everywhere in the world
2. **Shareable** - Send to anyone, any platform
3. **Convertable** - Works with all tools and websites

### Finding Unix Timestamp

Every event shows it in the footer:
```
Event ID: event_123 | Unix: 1739649600
                            ↑
                      Copy this!
```

### Using Unix Timestamps

**In Discord:**
```
<t:1739649600:F>
```
Displays as: Friday, February 15, 2026 3:00 PM (in YOUR timezone)

**In websites:**
- https://www.unixtimestamp.com/
- https://www.epochconverter.com/
- Paste the number to convert to any timezone

**In Google Sheets:**
```
=EPOCHTODATE(1739649600, 2)
```

**In programming:**
```javascript
new Date(1739649600 * 1000)
```

## Event Info Command

### Command: `!eventinfo <eventId>`

Get detailed timezone information for any event.

**Usage:**
```
!eventinfo event_1739649600123
```

**Response:**
```
📊 Event Info: Friday Night Raid

📅 Original Format
15-02-2026 8:00 PM

🌍 Discord Timestamps
Full: Friday, February 15, 2026 8:00 PM
Date: February 15, 2026
Time: 8:00 PM
Relative: in 3 days

🔢 Unix Timestamp
1739649600
[Copyable for sharing]

🔗 Share This Event
Send this to anyone:
Event at <t:1739649600:F>

Or use: !eventinfo event_1739649600123
```

## Sharing Events

### Method 1: Share Event ID

```
Hey team! Join the raid:
!eventinfo event_1739649600123
```

Anyone can run this command to see the event in their timezone.

### Method 2: Share Unix Timestamp

```
Raid starts at <t:1739649600:F>
Sign up: [discord link]
```

When they view this message, they see it in THEIR timezone!

### Method 3: Share Multiple Formats

```
📅 Friday Night Raid

Your time: <t:1739649600:F>
Countdown: <t:1739649600:R>

Sign up in #events!
```

## Best Practices

### For Event Creators

✅ **DO:**
1. Use consistent timezone when creating events (UTC recommended)
2. Include Unix timestamp in announcements
3. Use `!eventinfo` to share detailed info
4. Let Discord handle the timezone conversion
5. Test by checking what time YOU see

❌ **DON'T:**
1. Convert timezones manually (Discord does it!)
2. Say "8 PM EST" (not everyone knows EST)
3. Forget timezone-challenged players
4. Assume everyone knows your timezone

### For Event Participants

✅ **DO:**
1. Trust the "Your Time" field
2. Check the relative countdown ("in X hours")
3. Use `!eventinfo` if confused
4. Set calendar reminders in your own timezone

❌ **DON'T:**
1. Convert times manually (you'll mess up!)
2. Ignore the timezone-converted time
3. Assume everyone's on the same schedule

## Common Scenarios

### Scenario 1: Weekly Raid Schedule

**Goal:** Schedule same time every week for international team.

**Solution:**
```
!preset wow-raid 15-02-2026 20:00 Weekly Mythic+
!preset wow-raid 22-02-2026 20:00 Weekly Mythic+
!preset wow-raid 01-03-2026 20:00 Weekly Mythic+
```

Each team member sees consistent time in their timezone.

### Scenario 2: One-Time Tournament

**Goal:** Everyone joins at exactly the same moment.

**Solution:**
```
!create Tournament Finals | 15-02-2026 18:00 | Grand Finals | 240 | 32

Share: Tournament starts <t:1739642400:F> (<t:1739642400:R>)
```

Everyone sees countdown in their timezone.

### Scenario 3: Flexible Casual Games

**Goal:** "Around 8 PM my time, whoever's online"

**Solution:**
Create event in your timezone, but note it's flexible:
```
!preset apex 15-02-2026 20:00 Casual trios - flexible start time

Description: "Starting around <t:1739649600:t>, join when you can!"
```

### Scenario 4: Multi-Region Event

**Goal:** Event runs at good times for different regions.

**Solution:**
Create multiple events:
```
!preset valorant 15-02-2026 14:00 NA Region - Afternoon
!preset valorant 15-02-2026 20:00 EU Region - Evening
!preset valorant 16-02-2026 08:00 APAC Region - Morning
```

Each region gets optimal time.

## Troubleshooting

### "The time shown is wrong"

**Check:**
1. Is your Discord app up to date?
2. Is your system timezone set correctly?
3. Are you reading "Your Time" or the original format?

**The original format (DD-MM-YYYY HH:MM) is reference only!**
**Trust the "Your Time" field!**

### "Event shows tomorrow for me"

**This is normal if you're in a different timezone!**

Example:
- Event: 15-02-2026 02:00 (UTC)
- If you're in Los Angeles (UTC-8), you see: 14-02-2026 6:00 PM
- If you're in Tokyo (UTC+9), you see: 15-02-2026 11:00 AM

### "I need to coordinate with someone"

**Use Unix timestamp:**

1. Copy from event footer: `Unix: 1739649600`
2. Share with them: "Event at <t:1739649600:F>"
3. They see it in THEIR timezone automatically

Or use `!eventinfo event_xxx` and share that.

### "Daylight Saving Time?"

Discord handles this automatically! The Unix timestamp accounts for DST changes.

## Advanced: Creating Events in Specific Timezones

### The Challenge

When you create an event with `15-02-2026 20:00`, what timezone is that?

**Current behavior:** Treated as your local time, converted to UTC internally.

### Workaround: Use UTC

1. Convert your desired time to UTC
2. Create event in UTC
3. Bot converts for everyone

**Example:**
- Want: 8:00 PM EST (UTC-5)
- Create: `15-02-2026 01:00` (8 PM + 5 hours = 1 AM UTC next day)

### Online Converter

Use https://www.worldtimebuddy.com/
1. Enter your time and timezone
2. See UTC equivalent
3. Create event with UTC time

## Integration with Google Calendar

### Google Calendar Timezone Handling

Google Calendar stores events with timezone info. When synced to Discord:

1. Bot reads the event time
2. Converts to UTC
3. Generates Unix timestamp
4. Discord shows in user's timezone

**This means:**
- Create events in Google Calendar in any timezone
- Bot handles conversion automatically
- Everyone sees correct local time

### Example Workflow

**In Google Calendar:**
- Create "Raid Night" at 8:00 PM PST
- Location: Los Angeles

**Bot imports:**
- Converts to UTC (4:00 AM next day)
- Generates Unix timestamp
- Posts to Discord

**Users see:**
- PST user: 8:00 PM
- GMT user: 4:00 AM next day
- JST user: 1:00 PM next day

## Quick Reference

### Key Concepts

| Concept | Explanation |
|---------|-------------|
| Original Time | DD-MM-YYYY HH:MM format (for reference) |
| Your Time | Auto-converted to YOUR timezone |
| Unix Timestamp | Universal, timezone-independent number |
| Relative Time | "in X hours" countdown |

### Commands

| Command | Purpose |
|---------|---------|
| `!eventinfo <id>` | Show detailed timezone info |
| `!list` | See all events with your times |
| `!create` | Create event (uses your timezone) |
| `!sync` | Import from Google Calendar |

### Sharing

| Method | When to Use |
|--------|-------------|
| Event ID | In Discord server |
| Unix timestamp | Cross-platform, websites |
| `<t:UNIX:F>` | Discord messages |
| `!eventinfo` | Detailed sharing |

## FAQ

**Q: What timezone should I use when creating events?**
A: Use whatever is natural for you. The bot converts automatically.

**Q: How do I know what time others see?**
A: They see their own local time automatically. Use `!eventinfo` to check.

**Q: Can I create events in UTC?**
A: Yes! Create it in your local time, bot handles UTC internally.

**Q: Does this work on mobile?**
A: Yes! Discord mobile apps support timezone conversion.

**Q: What about daylight saving time?**
A: Fully supported. Unix timestamps account for DST automatically.

**Q: Can I change the timezone of an existing event?**
A: Delete and recreate the event with new time.

**Q: How far ahead can I schedule?**
A: No limit! Plan months or years ahead.

**Q: Do old events update for timezone changes?**
A: Yes, Discord timestamps dynamically update.

---

**Summary:** The bot uses Unix timestamps and Discord's built-in timezone conversion so everyone sees event times in their own local timezone automatically. No manual conversion needed! Just create events and let Discord handle the rest! 🌍
