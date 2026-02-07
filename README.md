# Discord Event Management Bot

A powerful Discord bot for managing events with Google Calendar integration and customizable signup roles. Perfect for gaming communities, raid planning, tournament organization, and any group activities.

## Features

✨ **Easy Event Creation** - Create events with simple commands
📋 **Preset Templates** - 18+ game presets ready to use (Overwatch, Helldivers, WoW, etc.)
📅 **Google Calendar Sync** - Two-way sync with Google Calendar
🔄 **Calendar Import** - Import events FROM Google Calendar to Discord
⏰ **Auto-Sync** - Automatic hourly syncing from calendar
👥 **Custom Signup Roles** - Define custom roles with emojis and slot limits
🎮 **Perfect for Gaming** - Great for raids, tournaments, scrims, and game nights
🔒 **Permission Controls** - Manage events with Discord permissions
💾 **Persistent Storage** - All events saved automatically

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent (optional)
5. Copy the bot token

### 3. Invite Bot to Your Server

1. In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
   - Manage Messages
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 4. Configure the Bot

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Then edit `.env` and add your Discord bot token:

```env
DISCORD_TOKEN=your_actual_bot_token_here
```

**Important:** Never commit your `.env` file to git! It's already in `.gitignore` to protect your secrets.

### 5. Run the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Google Calendar Setup (Optional)

To enable automatic syncing with Google Calendar:

### Step 1: Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create a Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "Discord Event Bot")
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"
5. Create a key for the service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Click "Create" - a JSON file will be downloaded

### Step 2: Share Your Calendar

1. Open Google Calendar
2. Find the calendar you want to use (or create a new one)
3. Click the three dots next to it > "Settings and sharing"
4. Scroll down to "Share with specific people"
5. Click "Add people"
6. Enter the service account email (found in the JSON file as "client_email")
7. Set permission to "Make changes to events"
8. Click "Send"

### Step 3: Configure the Bot

1. Open the JSON file you downloaded
2. Copy the **entire** JSON content (it will be one long line)
3. Open your `.env` file
4. Paste the JSON into the `GOOGLE_CREDENTIALS` line:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"discord-bot@your-project.iam.gserviceaccount.com",...}
```

5. If using a specific calendar (not your primary), also set:

```env
CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

**Tip:** You can find the Calendar ID in Google Calendar settings under "Integrate calendar".

That's it! Events will now automatically sync to Google Calendar.

## Commands

### Quick Event Creation with Presets

**List available presets:**
```
!presets
```

**Create event from preset:**
```
!preset <preset-name> <date-time> [custom-description]
```

Examples:
```
!preset overwatch 15-02-2026 20:00
!preset helldivers 16-02-2026 19:00 Weekend squad up
!preset wow-raid 17-02-2026 20:00 Mythic progression
!preset dnd 18-02-2026 18:00 Chapter 5: The Dragon's Lair
```

**Available Presets:**
- `overwatch` - 5 players: Tank (1), Damage (2), Support (2)
- `helldivers` - 4 players: Helldiver (4)
- `division` - 4 players: Healer (1), DPS (2), Specialist (1)
- `wow-raid` - 20 players: Tank (2), Healer (4), DPS (14)
- `destiny-raid` - 6 players: Raider (6)
- `valorant` - 5 players: Duelist (2), Controller (1), Sentinel (1), Initiator (1)
- `apex` - 3 players: Legend (3)
- `league` - 5 players: Top, Jungle, Mid, ADC, Support
- `dnd` - 6 players: DM (1), Player (5)
- `minecraft` - Unlimited: Builder, Miner, Explorer
- `cod-warzone` - 4 players: Operator (4)
- `ffxiv-raid` - 8 players: Tank (2), Healer (2), DPS (4)
- `csgo` - 5 players: Entry Fragger, AWPer, Support, Lurker, IGL
- `phasmophobia` - 4 players: Investigator (4)
- `among-us` - 10 players: Crewmate (10)
- `sea-of-thieves` - 4 players: Captain (1), Crew (3)
- `rust` - Unlimited: Farmer, Builder, PvP
- `tarkov` - 5 players: PMC (5)

### Event Management

**Create an event:**
```
!create <title> | <date-time> | <description> | <duration-minutes> | <max-participants>
```

Example:
```
!create Raid Night | 15-02-2026 20:00 | Weekly raid progression | 120 | 20
```

**Add signup roles to an event:**
```
!addrole <eventId> <emoji> <role-name> <max-slots>
```

Examples:
```
!addrole event_123456 ⚔️ Tank 2
!addrole event_123456 ❤️ Healer 3
!addrole event_123456 🏹 DPS 10
!addrole event_123456 🔧 Flex 5
```

**List all events:**
```
!list
```

**Delete an event:**
```
!delete <eventId>
```

**Show help:**
```
!help
```

### Calendar Sync (NEW!)

**Import events from Google Calendar:**
```
!sync
```

**Enable automatic hourly syncing:**
```
!autosync on
```

**Disable auto-sync:**
```
!autosync off
```

**Check auto-sync status:**
```
!autosync
```

See `CALENDAR_SYNC_GUIDE.md` for detailed information on syncing events from Google Calendar.

## Usage Examples

### Example 1: Using Presets (Quickest Method)

```
!preset overwatch 15-02-2026 20:00 Competitive push to Diamond
```

Done! The event is created with all roles automatically configured.

### Example 2: Creating a Custom WoW Raid

```
!create Vault of Glass | 2026-02-15 19:00 | Normal mode raid | 180 | 6

!addrole event_1707984000000 ⚔️ Tank 1
!addrole event_1707984000000 ❤️ Healer 1
!addrole event_1707984000000 🏹 DPS 4
```

### Example 3: Using Helldivers Preset

```
!preset helldivers 2026-02-16 21:00 Spread democracy on Difficulty 9
```

### Example 4: D&D Session

```
!preset dnd 20-02-2026 18:00 Session 12: Into the Underdark
```

## How Users Sign Up

1. Users click on the role buttons under the event message
2. They are automatically assigned to that role
3. If they click another role, they are moved to the new role
4. They can click "❌ Leave Event" to leave completely
5. Roles show as disabled when full

## File Structure

```
discord-event-bot/
├── bot.js              # Main bot code
├── package.json        # Dependencies
├── presets.json        # Event templates for games
├── .env                # Configuration (create from .env.example)
├── .env.example        # Example environment variables
├── events.json         # Event storage (auto-generated)
├── .gitignore          # Git ignore rules
├── README.md           # Full documentation
├── QUICKSTART.md       # Quick setup guide
└── ENV_SETUP.md        # Environment variables guide
```

## Permissions Required

The bot needs these permissions to function:
- **Manage Events** (Discord permission) - Required to create/modify events
- **Send Messages** - To send event messages
- **Embed Links** - To create rich event embeds
- **Read Message History** - To update event messages
- **Use External Emojis** - For custom role emojis

Users need "Manage Events" permission to create and manage events. Regular users can sign up for events without special permissions.

## Troubleshooting

### Bot doesn't respond to commands

- Make sure "Message Content Intent" is enabled in Discord Developer Portal
- Check that the bot has permission to read and send messages in the channel
- Verify the bot token is correct in your `.env` file
- Make sure you created `.env` from `.env.example`

### Google Calendar integration not working

- Ensure the service account email is shared with your calendar
- Check that the Google Calendar API is enabled in Google Cloud Console
- Verify the credentials JSON is correctly formatted

### Events not saving

- Check file permissions in the bot directory
- Ensure the bot has write access to create `events.json`

## Advanced Configuration

### Adding Custom Presets

You can add your own game presets by editing `presets.json`:

```json
{
  "your-game": {
    "name": "Your Game Name",
    "description": "Game description",
    "duration": 120,
    "maxParticipants": 5,
    "roles": [
      { "name": "Role1", "emoji": "⚔️", "maxSlots": 2 },
      { "name": "Role2", "emoji": "🛡️", "maxSlots": 3 }
    ]
  }
}
```

Then use it with:
```
!preset your-game 15-02-2026 20:00
```

**Preset Fields:**
- `name` - Display name for the event
- `description` - Default description (can be overridden)
- `duration` - Event duration in minutes
- `maxParticipants` - Maximum participants (0 or null = unlimited)
- `roles` - Array of roles with:
  - `name` - Role name
  - `emoji` - Role emoji
  - `maxSlots` - Max people in this role (null = unlimited)

### Custom Time Zones

The bot uses UTC by default. To change this, modify the Google Calendar event creation:

```javascript
timeZone: 'America/New_York'  // or your timezone
```

### Changing Command Prefix

Change the prefix from `!` to something else by modifying this line:

```javascript
if (!message.content.startsWith('!')) return;
```

### Adding More Fields to Events

You can extend the event object with additional fields like location, voice channel, etc.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments
3. Ensure all dependencies are installed
4. Check Discord.js documentation

## License

MIT License - feel free to modify and use for your community!

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

Made with ❤️ for Discord communities
