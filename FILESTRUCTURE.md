# Discord Event Bot - File Structure Guide

Complete reference for navigating and modifying the codebase.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Directory Structure](#directory-structure)
- [Feature Location Map](#feature-location-map)
- [Common Modifications](#common-modifications)
- [File Dependencies](#file-dependencies)
- [Adding New Features](#adding-new-features)

---

## Project Overview

```
discord-event-bot/
├── src/                        # Source code
│   ├── bot.js                 # Main entry point
│   ├── config.js              # Alternative config (legacy)
│   ├── config/                # Configuration
│   ├── discord/               # Discord-specific code
│   ├── services/              # Business logic
│   └── utils/                 # Utility functions
├── data/                       # Data storage (JSON files)
├── public/                     # Web interface files
├── docs/                       # Documentation
└── [config files]             # Root config files
```

---

## Directory Structure

### `/src` - Source Code

#### **`src/bot.js`** - Main Bot Entry Point
**Purpose:** Initializes and starts the bot, registers commands, handles events

**Key Functions:**
- `loadCommands()` - Dynamically loads all slash commands
- `registerCommands()` - Registers commands with Discord API
- `startAutoSync()` / `stopAutoSync()` - Calendar auto-sync management
- `syncFromCalendar()` - Import events from Google Calendar

**Handles:**
- Bot ready event
- Slash command interactions
- Button interactions (event signups)
- Autocomplete interactions
- Guild removal cleanup

**Modify when:**
- Adding new global event handlers
- Changing command loading logic
- Adding new service initialization
- Modifying bot startup behavior

---

#### **`src/config/index.js`** - Configuration Management
**Purpose:** Centralized configuration from environment variables

**Exports:**
```javascript
{
  discord: { token, clientId },
  google: { credentials, calendarIds, calendars },
  web: { port, host },
  files: { events, presets },
  bot: { commandPrefix, autoSyncInterval }
}
```

**Functions:**
- `parseCalendarIds()` - Parse calendar ID strings
- `validateConfig()` - Validate required settings

**Modify when:**
- Adding new configuration options
- Adding new environment variables
- Changing default values

---

### `/src/discord` - Discord-Specific Code

#### **`src/discord/commands/`** - Event Management Commands
Each file is a self-contained slash command.

**Structure:**
```javascript
module.exports = {
  data: SlashCommandBuilder,  // Command definition
  execute: async (interaction, context)  // Command handler
}
```

**Files:**
- `create.js` - Create custom events
- `preset.js` - Create from preset templates
- `presets.js` - List available presets
- `addrole.js` - Add signup roles to events
- `list.js` - Show all events
- `delete.js` - Delete events
- `eventinfo.js` - Detailed event info
- `sync.js` - Manual calendar sync
- `calendars.js` - List calendars
- `autosync.js` - Auto-sync management
- `help.js` - Help information

**Modify when:**
- Adding new event-related commands
- Changing command parameters
- Updating command behavior

---

#### **`src/discord/streamingCommands/`** - Streaming Commands
Commands for Twitch/YouTube monitoring.

**Files:**
- `setup-streaming.js` - Set notification channel
- `add-streamer.js` - Add Twitch streamer
- `add-youtube.js` - Add YouTube channel
- `list-streamers.js` - Show Twitch streamers
- `list-youtube.js` - Show YouTube channels

**Modify when:**
- Adding new streaming platforms
- Adding streaming-related commands
- Changing notification behavior

---

#### **`src/discord/embedBuilder.js`** - Discord Embed Creation
**Purpose:** Create rich embeds for Discord messages

**Key Methods:**
```javascript
static createEventEmbed(event)           // Main event display
static createHelpEmbed(presetCount, calendarCount)
static createEventListEmbed(events)      // Event list
static createCalendarListEmbed(calendars)
static createEventInfoEmbed(event)       // Detailed info
```

**Modify when:**
- Changing event message appearance
- Adding new embed types
- Updating timestamp formats
- Changing embed colors/styling

---

#### **`src/discord/buttonBuilder.js`** - Interactive Buttons
**Purpose:** Create signup/leave buttons for events

**Key Methods:**
```javascript
static createSignupButtons(event)  // Generate button rows
static parseButtonId(customId)     // Parse button interactions
```

**Modify when:**
- Changing button layout
- Adding new button types
- Modifying button labels/styles
- Changing button limits

---

### `/src/services` - Business Logic Layer

#### **`src/services/eventManager.js`** - Event CRUD Operations
**Purpose:** Core event management logic

**Key Methods:**
```javascript
createEvent(eventData)                    // Create new event
createFromPreset(preset, dateTime)        // Create from template
getEvent(eventId)                         // Retrieve event
getAllEvents()                            // Get all events
getGuildEvents(guildId)                   // Guild-specific events
updateEvent(eventId, updates)             // Modify event
deleteEvent(eventId)                      // Remove event
addRole(eventId, role)                    // Add signup role
signupUser(eventId, userId, roleName)     // User signup
removeUser(eventId, userId)               // User leave
importCalendarEvent(calendarData, ...)    // Import from calendar
getStats(guildId)                         // Statistics
```

**Modify when:**
- Changing event data structure
- Adding event validation
- Modifying signup logic
- Adding event-related features

---

#### **`src/services/presetManager.js`** - Preset Templates
**Purpose:** Manage event preset templates

**Key Methods:**
```javascript
loadPresets()                      // Load all presets
getPreset(key)                     // Get specific preset
createPreset(key, presetData)      // Create new preset
updatePreset(key, updates)         // Modify preset
deletePreset(key)                  // Remove preset
searchPresets(query)               // Search by name/key
```

**Modify when:**
- Adding default presets
- Changing preset structure
- Adding preset validation
- Modifying preset search

---

#### **`src/services/calendar.js`** - Google Calendar Integration
**Purpose:** Interact with Google Calendar API

**Key Methods:**
```javascript
isEnabled()                        // Check if configured
testConnection()                   // Verify calendar access
createEvent(event)                 // Create calendar event
syncEvents(hoursAhead, filter)     // Import calendar events
getCalendars()                     // Get configured calendars
```

**Modify when:**
- Changing calendar sync logic
- Adding calendar features
- Modifying event creation
- Updating API calls

---

#### **`src/services/streamingConfig.js`** - Streaming Configuration
**Purpose:** Manage streaming settings per guild

**Key Methods:**
```javascript
getGuildConfig(guildId)            // Get guild settings
setNotificationChannel(guildId, channelId)
addTwitchStreamer(guildId, username, customMessage)
removeTwitchStreamer(guildId, username)
addYouTubeChannel(guildId, channelId)
removeYouTubeChannel(guildId, channelId)
getAllGuildConfigs()               // Get all guild configs
deleteGuildConfig(guildId)         // Cleanup on bot removal
```

**Modify when:**
- Adding new streaming platforms
- Changing config structure
- Adding guild-specific settings

---

#### **`src/services/twitchMonitor.js`** - Twitch Stream Monitoring
**Purpose:** Monitor Twitch streamers for live status

**Key Methods:**
```javascript
getAccessToken()                   // OAuth token management
checkStreams()                     // Check all streamers
processLiveStreams(streams, configs)
sendNotification(guildId, config, stream)
start()                            // Start monitoring
stop()                             // Stop monitoring
```

**Modify when:**
- Changing check interval
- Modifying notification format
- Adding Twitch features
- Updating API calls

---

#### **`src/services/youtubeMonitor.js`** - YouTube Channel Monitoring
**Purpose:** Monitor YouTube channels for new videos (RSS-based)

**Key Methods:**
```javascript
checkVideos()                      // Check all channels
sendNotification(video, guildId, config)
validateChannelId(channelId)       // Verify channel exists
extractChannelId(input)            // Parse various formats
resolveHandleToChannelId(handle)   // @handle → channel ID
getChannelName(channelId)          // Get display name
start() / stop()                   // Control monitoring
```

**Modify when:**
- Changing check interval
- Modifying notification format
- Adding video filtering
- Updating RSS parsing

---

### `/src/utils` - Utility Functions

#### **`src/utils/datetime.js`** - Date/Time Utilities
**Purpose:** Parse and format dates consistently

**Functions:**
```javascript
parseDateTime(dateTimeStr)         // DD-MM-YYYY HH:MM → Date
formatDateTime(dateTimeStr)        // Date → readable format
getUnixTimestamp(date)             // Date → Unix timestamp
isPast(dateTimeStr)                // Check if past
isUpcoming(dateTimeStr)            // Check if future
```

**Modify when:**
- Changing date format
- Adding new date utilities
- Modifying timezone handling

---

#### **`src/utils/storage.js`** - JSON File Storage
**Purpose:** Simple file-based database

**Key Methods:**
```javascript
load()                             // Read JSON file
save(data)                         // Write JSON file
get(key)                           // Get single item
set(key, value)                    // Set single item
delete(key)                        // Remove item
getAll()                           // Get all as array
getAllAsObject()                   // Get all as object
clear()                            // Clear all data
has(key)                           // Check existence
```

**Modify when:**
- Changing storage format
- Adding data validation
- Implementing database migration
- Adding caching

---

### `/data` - Data Storage Files

#### **`data/events.json`** - Events Database
**Structure:**
```json
{
  "event_1234567890": {
    "id": "event_1234567890",
    "title": "Raid Night",
    "description": "Weekly raid",
    "dateTime": "2026-02-15T20:00:00.000Z",
    "duration": 180,
    "maxParticipants": 20,
    "roles": [
      { "name": "Tank", "emoji": "🛡️", "maxSlots": 2 }
    ],
    "signups": {
      "Tank": ["user_id_1", "user_id_2"]
    },
    "createdBy": "user_id",
    "channelId": "channel_id",
    "guildId": "guild_id",
    "messageId": "message_id",
    "calendarLink": "https://...",
    "calendarEventId": "cal_event_id"
  }
}
```

**Modify when:**
- Adding event properties
- Changing data structure
- Implementing data migration

---

#### **`data/presets.json`** - Preset Templates
**Structure:**
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

**Modify when:**
- Adding new game presets
- Changing preset structure
- Updating role configurations

---

#### **`data/streaming.json`** - Streaming Configuration
**Structure:**
```json
{
  "guild_id_123": {
    "notificationChannelId": "channel_id",
    "twitch": {
      "enabled": true,
      "streamers": ["shroud", "xqc"],
      "message": "🔴 {username} is now live!",
      "customMessages": {
        "shroud": "Custom notification for shroud"
      }
    },
    "youtube": {
      "enabled": true,
      "channels": ["UC...channel_id"],
      "message": "📺 {channel} uploaded!"
    }
  }
}
```

**Modify when:**
- Adding streaming platforms
- Changing notification format
- Adding guild-specific features

---

### `/public` - Web Interface

#### **`public/index.html`** - Web Dashboard
**Purpose:** Browser-based event management

**Sections:**
- Statistics dashboard
- Events tab (view/delete)
- Presets tab (browse)
- Create event form
- Create preset form

**API Integration:**
```javascript
fetch('/api/events')              // GET events
fetch('/api/events', { POST })    // Create event
fetch('/api/events/:id', { DELETE })
fetch('/api/presets')             // GET presets
fetch('/api/stats')               // Statistics
```

**Modify when:**
- Adding new UI features
- Changing layout/styling
- Adding new API endpoints
- Implementing real-time updates

---

### Root Files

#### **`web-server.js`** - Express API Server
**Purpose:** REST API for web interface

**Endpoints:**
```javascript
GET    /api/events                // List all events
GET    /api/events/:id            // Get single event
POST   /api/events                // Create event
PUT    /api/events/:id            // Update event
DELETE /api/events/:id            // Delete event

GET    /api/presets               // List presets
POST   /api/presets               // Create preset
PUT    /api/presets/:key          // Update preset
DELETE /api/presets/:key          // Delete preset

POST   /api/events/from-preset    // Create event from preset
GET    /api/stats                 // Bot statistics
GET    /api/health                // Health check
```

**Modify when:**
- Adding new API endpoints
- Changing API responses
- Adding authentication
- Implementing WebSocket updates

---

#### **`.env`** - Environment Configuration
**Variables:**
```bash
# Required
DISCORD_TOKEN=your_token

# Optional - Google Calendar
GOOGLE_CREDENTIALS={"service_account_json"}
CALENDAR_IDS=primary,id2

# Optional - Twitch
TWITCH_CLIENT_ID=client_id
TWITCH_CLIENT_SECRET=secret

# Optional - Web
WEB_PORT=3000
```

---

#### **`package.json`** - Dependencies
**Key Scripts:**
```json
{
  "start": "node src/bot.js",
  "web": "node web-server.js",
  "start:all": "node start-all.js",
  "dev:all": "concurrently ..."
}
```

**Dependencies:**
- `discord.js` - Discord API
- `googleapis` - Google Calendar
- `express` - Web server
- `axios` - HTTP requests
- `xml2js` - YouTube RSS parsing

---

## Feature Location Map

### Adding New Event Types
1. **Create preset** → `data/presets.json`
2. **Validation** → `src/services/presetManager.js`
3. **UI** → `public/index.html` (preset cards)

### Modifying Event Display
1. **Discord embed** → `src/discord/embedBuilder.js`
2. **Buttons** → `src/discord/buttonBuilder.js`
3. **Web UI** → `public/index.html` (event cards)

### Adding New Commands
1. **Event commands** → `src/discord/commands/[name].js`
2. **Streaming commands** → `src/discord/streamingCommands/[name].js`
3. **Auto-registration** → `src/bot.js` (loadCommands)

### Calendar Integration
1. **Sync logic** → `src/services/calendar.js`
2. **Import handling** → `src/services/eventManager.js`
3. **Commands** → `src/discord/commands/sync.js`, `autosync.js`

### Streaming Features
1. **Twitch** → `src/services/twitchMonitor.js`
2. **YouTube** → `src/services/youtubeMonitor.js`
3. **Configuration** → `src/services/streamingConfig.js`
4. **Commands** → `src/discord/streamingCommands/`

### User Interactions
1. **Button clicks** → `src/bot.js` (button interaction handler)
2. **Signups** → `src/services/eventManager.js`
3. **Autocomplete** → `src/bot.js` (autocomplete handler)

### Web Interface
1. **Frontend** → `public/index.html`
2. **Backend API** → `web-server.js`
3. **Services** → `src/services/*` (shared with Discord bot)

---

## Common Modifications

### Adding a New Slash Command

**1. Create command file:**
```javascript
// src/discord/commands/mycommand.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('My new command')
    .addStringOption(option => 
      option.setName('param')
        .setDescription('A parameter')
        .setRequired(true)
    ),
  
  async execute(interaction, context) {
    const { eventManager } = context;
    const param = interaction.options.getString('param');
    
    // Your logic here
    
    await interaction.reply({
      content: 'Success!',
      ephemeral: true
    });
  }
};
```

**2. Bot auto-loads it** (no changes needed to `bot.js`)

---

### Adding a New Event Property

**1. Update event creation:**
```javascript
// src/services/eventManager.js - createEvent()
const event = {
  id: eventId,
  // ... existing properties
  newProperty: eventData.newProperty || 'default'
};
```

**2. Update embed display:**
```javascript
// src/discord/embedBuilder.js - createEventEmbed()
embed.addFields({
  name: 'New Property',
  value: event.newProperty,
  inline: true
});
```

**3. Update web API:**
```javascript
// web-server.js - POST /api/events
const { title, description, newProperty } = req.body;

const event = await eventManager.createEvent({
  title,
  description,
  newProperty: newProperty || 'default',
  // ...
});
```

**4. Update web UI:**
```html
<!-- public/index.html - create event form -->
<div class="form-group">
  <label>New Property</label>
  <input type="text" name="newProperty">
</div>
```

---

### Adding a New Preset

**1. Edit presets file:**
```json
// data/presets.json
{
  "new-game": {
    "name": "New Game",
    "description": "Game description",
    "duration": 120,
    "maxParticipants": 4,
    "roles": [
      { "name": "Player", "emoji": "🎮", "maxSlots": 4 }
    ]
  }
}
```

**2. Restart bot** (presets loaded on startup)

**3. Use with:**
```
/preset preset_name:new-game datetime:15-02-2026 20:00
```

---

### Adding a New Streaming Platform

**1. Create monitor service:**
```javascript
// src/services/newPlatformMonitor.js
class NewPlatformMonitor {
  constructor(client, config, streamingConfig) {
    this.client = client;
    this.config = config;
    this.streamingConfig = streamingConfig;
  }
  
  async checkStreams() {
    // Monitor logic
  }
  
  start() {
    // Start monitoring
  }
  
  stop() {
    // Stop monitoring
  }
}
```

**2. Update streaming config:**
```javascript
// src/services/streamingConfig.js - createDefaultConfig()
{
  newPlatform: {
    enabled: false,
    channels: [],
    message: "🔴 {username} is live!"
  }
}
```

**3. Add commands:**
```javascript
// src/discord/streamingCommands/add-newplatform.js
module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-newplatform')
    .setDescription('Add channel to monitor'),
  async execute(interaction, context) {
    // Command logic
  }
};
```

**4. Initialize in bot:**
```javascript
// src/bot.js
const NewPlatformMonitor = require('./services/newPlatformMonitor');
let newPlatformMonitor = new NewPlatformMonitor(client, config, streamingConfig);
newPlatformMonitor.start();
```

---

### Adding API Endpoint

**1. Add route to web server:**
```javascript
// web-server.js
app.get('/api/my-endpoint', (req, res) => {
  try {
    const data = eventManager.getSomeData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**2. Use in web UI:**
```javascript
// public/index.html
async function fetchMyData() {
  const response = await fetch('/api/my-endpoint');
  const data = await response.json();
  console.log(data);
}
```

---

## File Dependencies

### Dependency Graph

```
src/bot.js
├── src/config/index.js
├── src/services/eventManager.js
│   ├── src/utils/storage.js
│   ├── src/utils/datetime.js
│   └── src/services/calendar.js
├── src/services/presetManager.js
│   └── src/utils/storage.js
├── src/services/streamingConfig.js
│   └── src/utils/storage.js
├── src/services/twitchMonitor.js
│   └── src/services/streamingConfig.js
├── src/services/youtubeMonitor.js
│   └── src/services/streamingConfig.js
├── src/discord/embedBuilder.js
│   └── src/utils/datetime.js
├── src/discord/buttonBuilder.js
└── src/discord/commands/*.js
    └── context object with all services

web-server.js
├── src/config/index.js
├── src/services/eventManager.js
├── src/services/presetManager.js
└── src/services/calendar.js
```

---

## Adding New Features

### Checklist for New Feature

**1. Planning:**
- [ ] Define feature requirements
- [ ] Identify affected files
- [ ] Plan data structure changes
- [ ] Design user interface

**2. Backend:**
- [ ] Update data models (`src/services/`)
- [ ] Add storage changes (`data/*.json`)
- [ ] Create/update service methods
- [ ] Add validation logic

**3. Discord Commands:**
- [ ] Create command file (`src/discord/commands/` or `streamingCommands/`)
- [ ] Update embed builder if needed
- [ ] Update button builder if needed
- [ ] Test slash command registration

**4. Web Interface:**
- [ ] Add API endpoints (`web-server.js`)
- [ ] Update web UI (`public/index.html`)
- [ ] Add client-side JavaScript
- [ ] Test API integration

**5. Configuration:**
- [ ] Add environment variables (`.env.example`)
- [ ] Update config loading (`src/config/index.js`)
- [ ] Document new settings

**6. Documentation:**
- [ ] Update README.md
- [ ] Update COMMANDS.md
- [ ] Update FEATURES.md
- [ ] Update SETUP.md if needed

**7. Testing:**
- [ ] Test Discord commands
- [ ] Test web interface
- [ ] Test data persistence
- [ ] Test error handling

---

## Quick Reference

### Most Commonly Modified Files

**For event features:**
1. `src/services/eventManager.js` - Event logic
2. `src/discord/embedBuilder.js` - Display
3. `src/discord/commands/*.js` - Commands

**For streaming features:**
1. `src/services/twitchMonitor.js` or `youtubeMonitor.js`
2. `src/services/streamingConfig.js` - Configuration
3. `src/discord/streamingCommands/*.js` - Commands

**For web interface:**
1. `public/index.html` - Frontend
2. `web-server.js` - Backend API

**For configuration:**
1. `.env` - Environment variables
2. `src/config/index.js` - Config loading

**For presets:**
1. `data/presets.json` - Template definitions

---

## Need More Help?

**File not listed?** Check:
- `README.md` - Project overview
- `COMMANDS.md` - Command usage
- `FEATURES.md` - Feature deep-dives
- `SETUP.md` - Installation guide
- `TROUBLESHOOTING.md` - Common issues

**Still stuck?** The codebase follows these patterns:
- Services handle business logic
- Commands handle user interactions
- Utilities provide helper functions
- Storage manages data persistence