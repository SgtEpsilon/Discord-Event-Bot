# Discord Event + Streaming Bot

A powerful modular Discord bot combining event management with Twitch/YouTube monitoring, Google Calendar integration, custom signup roles, and a web interface.

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure
Copy `.env.example` to `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_discord_bot_token_here
```

**Get your token:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → Bot tab → Add Bot
3. Enable "Message Content Intent"
4. Copy the token

### 3. Run
```bash
# Discord bot only
npm start

# With web interface
npm run start:all
```

### 4. Create Your First Event
Use a preset template:
```
/preset overwatch 15-02-2026 20:00
```

Or create custom:
```
/create title:Raid Night datetime:15-02-2026 20:00 duration:120
/addrole event_id:event_123 emoji:⚔️ role_name:DPS max_slots:6
```

Done! Users can now click buttons to sign up.

## 📋 Core Features

### 🎮 Event Management
- **Create events** with custom signup roles and limits
- **18+ game presets** (Overwatch, Valorant, WoW, D&D, etc.)
- **Google Calendar sync** (optional) - two-way integration
- **Auto-sync** - import calendar events hourly
- **Web dashboard** - manage events visually
- **Timezone support** - everyone sees their local time

### 📺 Stream Monitoring
- **Twitch** - live stream notifications with thumbnails
- **YouTube** - new video alerts (RSS-based, no API quota!)
- **Smart updates** - edits messages on game changes (no spam)
- **Custom notifications** - personalize per streamer/channel
- **"Watch Now" buttons** on all notifications

### 🌐 Web Interface
- Visual event dashboard at `http://localhost:3000`
- Create/delete events via browser
- Browse and use presets
- View statistics

## 📖 Essential Commands

### Events
| Command | Description |
|---------|-------------|
| `/create` | Create custom event |
| `/preset` | Create from template (fastest!) |
| `/addrole` | Add signup role to event |
| `/list` | Show all upcoming events |
| `/delete` | Remove event |
| `/eventinfo` | Detailed event info with timezone |
| `/sync` | Import from Google Calendar |

### Streaming
| Command | Description |
|---------|-------------|
| `/setup-streaming` | Set notification channel |
| `/add-streamer` | Monitor Twitch streamer |
| `/add-youtube` | Monitor YouTube channel |
| `/list-streamers` | Show monitored streamers |

## 🔧 Configuration

### Required
```env
DISCORD_TOKEN=your_bot_token
```

### Optional
```env
# Google Calendar (two-way sync)
GOOGLE_CREDENTIALS={"type":"service_account",...}
CALENDAR_IDS=primary

# Twitch (stream monitoring)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# Web interface
WEB_PORT=3000
```

## 📚 Documentation Files

- **SETUP.md** - Complete installation and configuration guide
- **COMMANDS.md** - Detailed command reference with examples
- **FEATURES.md** - In-depth feature guides (calendar sync, streaming, presets)
- **TROUBLESHOOTING.md** - Common issues and solutions

## 💡 Common Use Cases

### Weekly Gaming Sessions
```
/preset valorant 15-02-2026 20:00
```
Instant 5v5 event with proper roles (Duelist, Controller, etc.)

### D&D Campaign Night
```
/preset dnd 18-02-2026 18:00 Chapter 5: The Lost City
```
Creates 4-hour session with DM + 5 player slots

### Stream Notifications
```
/setup-streaming channel:#stream-announcements
/add-streamer
[Enter: shroud]
```
Auto-posts when shroud goes live with rich embed + watch button

### Calendar Integration
```
/autosync on
```
Events created in Google Calendar → automatically appear in Discord

## 🎯 Date Format

**Use:** `DD-MM-YYYY HH:MM`

Examples:
- ✅ `15-02-2026 20:00` (8:00 PM)
- ✅ `15-02-2026 08:00 PM` (also works)
- ❌ `2026-02-15 20:00` (wrong order)
- ❌ `02-15-2026 20:00` (American format not supported)

## 🏗️ Project Structure

```
discord-event-bot/
├── src/
│   ├── bot.js                  # Main entry point
│   ├── config/                 # Configuration
│   ├── services/               # Business logic
│   │   ├── eventManager.js     # Event CRUD
│   │   ├── calendar.js         # Google Calendar
│   │   ├── twitchMonitor.js    # Twitch monitoring
│   │   └── youtubeMonitor.js   # YouTube monitoring
│   ├── discord/
│   │   ├── commands/           # Event commands
│   │   └── streamingCommands/  # Stream commands
│   └── utils/                  # Helpers
├── data/
│   ├── events.json            # Event storage
│   ├── presets.json           # Game templates
│   └── streaming.json         # Stream config
├── public/
│   └── index.html             # Web interface
└── web-server.js              # Web API
```

## 🛠️ Bot Permissions

Your bot needs:
- ✅ Send Messages
- ✅ View Channels
- ✅ Use Slash Commands
- ✅ Embed Links
- ✅ Read Message History
- ✅ Message Content Intent (in Developer Portal)

## 🎨 Available Presets

**FPS Games:** overwatch, valorant, csgo, apex, cod-warzone, tarkov

**Co-op:** helldivers, division, phasmophobia

**MMO Raids:** wow-raid, ffxiv-raid, destiny-raid

**MOBA:** league

**Survival:** minecraft, rust, sea-of-thieves

**Social:** among-us

**Tabletop:** dnd

See full list with `/presets` command.

## 🚨 Troubleshooting Quick Fixes

**Commands not working?**
- Enable "Message Content Intent" in Developer Portal
- Wait 5 minutes for Discord to register commands

**Twitch not working?**
- Add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to `.env`

**YouTube not detecting videos?**
- First run only initializes - wait 5 minutes for next check
- Checks every 5 minutes for new uploads

**"Event not found" on button click?**
- Bot restarted - delete old messages and create new events

See TROUBLESHOOTING.md for detailed solutions.

## 📊 Performance

- **Twitch checks:** Every 60 seconds
- **YouTube checks:** Every 5 minutes  
- **Calendar sync:** Every hour (when auto-sync enabled)
- **Memory:** ~50-70MB
- **Disk:** Events stored as JSON

## 🔐 Security Notes

**Web Interface:**
- Default setup has NO authentication
- Safe for: local development, home network
- NOT safe for: public internet
- Access at `http://localhost:3000`

**API Keys:**
- Keep `.env` file private
- Never commit to git (already in `.gitignore`)
- Reset tokens if accidentally exposed

## 📝 License

MIT License - See LICENSE file for details

## 🆘 Need Help?

1. Check TROUBLESHOOTING.md for common issues
2. Review SETUP.md for detailed configuration
3. Verify all dependencies are installed
4. Check console logs for error messages

---

**Quick Links:**
- [Full Setup Guide](SETUP.md)
- [Command Reference](COMMANDS.md)
- [Feature Documentation](FEATURES.md)
- [Troubleshooting](TROUBLESHOOTING.md)
