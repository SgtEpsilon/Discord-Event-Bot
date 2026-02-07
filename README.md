# Discord Event Bot - Modular Architecture

A fully modular Discord bot for managing events with Google Calendar integration, custom signup roles, and a web interface.

## 🎯 Features

- **Event Management**: Create, manage, and track Discord events
- **Google Calendar Integration**: Sync events to/from Google Calendar
- **Custom Signup Roles**: Define roles with emoji and participant limits
- **Preset Templates**: Reusable templates for common event types
- **Web Interface**: Manage events through a browser
- **Auto-Sync**: Automatically import calendar events
- **Timezone Support**: Discord timestamps adjust to user timezone

## 📂 Modular Architecture

```
discord-event-bot-modular/
├── src/
│   ├── config/           # Configuration management
│   │   └── index.js      # Environment & settings
│   ├── utils/            # Utility functions
│   │   ├── storage.js    # File operations
│   │   └── datetime.js   # Date/time parsing
│   ├── services/         # Business logic
│   │   ├── calendar.js   # Google Calendar API
│   │   ├── eventManager.js      # Event CRUD operations
│   │   ├── presetManager.js     # Preset templates
│   │   └── syncService.js       # Calendar sync logic
│   ├── discord/          # Discord-specific modules
│   │   ├── embedBuilder.js      # Discord embed creation
│   │   ├── buttonBuilder.js     # Interactive buttons
│   │   ├── commands.js          # Slash command definitions
│   │   ├── commandHandlers.js   # Command logic
│   │   └── interactionHandlers.js # Button/autocomplete
│   └── bot.js            # Main bot coordinator
├── public/               # Web interface files
│   └── index.html        # Event management UI
├── web-server.js         # Express API server
├── start-all.js          # Launch both servers
├── package.json          # Dependencies & scripts
├── .env.example          # Environment template
└── presets.json          # Event templates

```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
GOOGLE_CREDENTIALS={"type":"service_account",...}
CALENDAR_IDS=Work:calendar_id_1,Gaming:calendar_id_2
WEB_PORT=3000
```

### 3. Run the Bot
```bash
# Discord bot only
npm start

# Web interface only
npm run web

# Both servers
npm run start:all
```

## 📚 Module Documentation

### Configuration Module
**File**: `src/config/index.js`
- Parses environment variables
- Validates required settings
- Manages file paths

### Storage Module
**File**: `src/utils/storage.js`
**Methods**:
- `load()` - Load JSON from file
- `save(data)` - Save JSON to file
- `get(key)` - Get value by key
- `set(key, value)` - Set key-value pair
- `delete(key)` - Remove entry
- `clear()` - Clear all data

### DateTime Module
**File**: `src/utils/datetime.js`
**Functions**:
- `parseDateTime(str)` - Parse DD-MM-YYYY HH:MM
- `formatDateTime(iso)` - Format for display
- `getUnixTimestamp(iso)` - Get Unix timestamp
- `isPast(iso)` - Check if date is past
- `isUpcoming(iso)` - Check if date is upcoming

### CalendarService
**File**: `src/services/calendar.js`
**Methods**:
- `isEnabled()` - Check if configured
- `testConnection()` - Verify API access
- `createEvent(event)` - Create calendar event
- `syncEvents(calId, start, end)` - Fetch events
- `getCalendars()` - List configured calendars

### EventManager
**File**: `src/services/eventManager.js`
**Methods**:
- `createEvent(data)` - Create new event
- `createFromPreset(preset, dateTime, desc)` - Use template
- `getEvent(id)` - Retrieve event
- `getAllEvents()` - Get all events
- `getGuildEvents(guildId)` - Filter by guild
- `getUpcomingEvents()` - Future events only
- `updateEvent(id, updates)` - Modify event
- `deleteEvent(id)` - Remove event
- `addRole(eventId, role)` - Add signup role
- `signupUser(eventId, roleName, userId)` - Register user
- `removeUser(eventId, userId)` - Remove user
- `importCalendarEvent(data)` - Import from calendar
- `getStats()` - Get statistics

### PresetManager
**File**: `src/services/presetManager.js`
**Methods**:
- `loadPresets()` - Load all presets
- `getPreset(key)` - Get specific preset
- `createPreset(key, data)` - Create new preset
- `updatePreset(key, data)` - Modify preset
- `deletePreset(key)` - Remove preset
- `searchPresets(query)` - Find presets
- `getPresetCount()` - Count presets

### EmbedBuilder
**File**: `src/discord/embedBuilder.js`
**Static Methods**:
- `createEventEmbed(event)` - Event display
- `createHelpEmbed(presetCount, calCount)` - Help message
- `createEventListEmbed(events)` - List all events
- `createCalendarListEmbed(calendars)` - Calendar list
- `createEventInfoEmbed(event)` - Detailed info

### ButtonBuilder
**File**: `src/discord/buttonBuilder.js`
**Static Methods**:
- `createSignupButtons(event)` - Generate signup UI
- `parseButtonId(customId)` - Extract button data

## 🎮 Discord Commands

| Command | Description |
|---------|-------------|
| `/create` | Create new event |
| `/preset` | Use event template |
| `/presets` | List all templates |
| `/addrole` | Add signup role |
| `/list` | Show all events |
| `/eventinfo` | Detailed event info |
| `/delete` | Remove event |
| `/deletepreset` | Remove template |
| `/sync` | Import calendar events |
| `/calendars` | List calendars |
| `/autosync` | Manage auto-sync |
| `/help` | Show help |

## 🌐 Web API Endpoints

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/from-preset` - Create from preset

### Presets
- `GET /api/presets` - List presets
- `POST /api/presets` - Create preset
- `PUT /api/presets/:key` - Update preset
- `DELETE /api/presets/:key` - Delete preset

### Stats
- `GET /api/stats` - Bot statistics
- `GET /api/health` - Health check

## 🔧 Development

### Run in Development Mode
```bash
# With auto-reload
npm run dev:all
```

### Module Testing
```javascript
// Test EventManager independently
const EventManager = require('./src/services/eventManager');
const manager = new EventManager('./events.json');

const event = await manager.createEvent({
    title: 'Test Event',
    dateTime: new Date().toISOString(),
    duration: 60
});

console.log(event);
```

## 📝 Creating Custom Modules

1. Create file in appropriate directory
2. Export class or functions
3. Import in `src/bot.js`
4. Add to context object

Example:
```javascript
// src/services/myService.js
class MyService {
    constructor() {
        // Initialize
    }
    
    myMethod() {
        // Implementation
    }
}

module.exports = MyService;
```

## 🎨 Preset Format

```json
{
  "preset-key": {
    "name": "Event Name",
    "description": "Description",
    "duration": 60,
    "maxParticipants": 10,
    "roles": [
      {
        "name": "Role Name",
        "emoji": "⚔️",
        "maxSlots": 5
      }
    ]
  }
}
```

## 📦 Dependencies

- **discord.js** - Discord API wrapper
- **googleapis** - Google Calendar API
- **express** - Web server
- **cors** - Cross-origin requests
- **dotenv** - Environment variables

## 🤝 Contributing

1. Add new modules in appropriate `src/` subdirectory
2. Follow existing patterns
3. Update documentation
4. Export public API

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- Check `/help` command in Discord
- Review module documentation above
- Examine example code in each module

## 🔄 Migration from Monolithic

See `MODULAR_CONVERSION_SUMMARY.md` for detailed migration guide.
