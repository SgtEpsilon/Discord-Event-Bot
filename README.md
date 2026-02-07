# Discord Event Management Bot

A powerful Discord bot for managing events with Google Calendar integration, a web interface, and customizable signup roles. Perfect for gaming communities, raid planning, tournament organization, and any group activities.

## Features

✨ **Easy Event Creation** - Create events with simple commands or web interface  
📋 **Preset Templates** - 18+ game presets ready to use (Overwatch, Helldivers, WoW, etc.)  
📅 **Google Calendar Sync** - Two-way sync with multiple Google Calendars  
🔄 **Calendar Import** - Import events FROM Google Calendar to Discord  
⏰ **Auto-Sync** - Automatic hourly syncing from calendar  
👥 **Custom Signup Roles** - Define custom roles with emojis and slot limits  
🌐 **Web Interface** - Modern web dashboard for managing events and presets  
🌍 **Remote Access** - Access from anywhere with Cloudflare Tunnel  
🎮 **Perfect for Gaming** - Great for raids, tournaments, scrims, and game nights  
🔒 **Permission Controls** - Manage events with Discord permissions  
💾 **Persistent Storage** - All events saved automatically  
🕐 **Timezone Support** - Automatic timezone conversion for all users

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
   - Manage Events
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
WEB_PORT=3000
```

**Important:** Never commit your `.env` file to git! It's already in `.gitignore` to protect your secrets.

### 5. Run the Bot

**Start the Discord bot:**
```bash
node bot.js
```

**Start the web interface (in a new terminal):**
```bash
node web-server.js
```

**Or start both (if you have PM2 installed):**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 6. Access the Web Interface

Open your browser to:
```
http://localhost:3000
```

You'll see a modern dashboard where you can:
- View all events with live statistics
- Create events with a visual form
- Manage presets with an intuitive interface
- See signup counts and event details

## Remote Access Setup

Want to access your bot manager from anywhere? See our detailed guides:

📘 **[Cloudflare Tunnel Setup Guide](CLOUDFLARE_SETUP.md)** - Access from anywhere for FREE  
📗 **[GitHub Setup Guide](GITHUB_GUIDE.md)** - Backup and version control your bot

**Quick Remote Access (30 seconds):**

1. Start your web server:
   ```bash
   node web-server.js
   ```

2. In a new terminal:
   ```bash
   # Windows
   ssh -R 80:localhost:3000 nokey@localhost.run
   
   # Mac/Linux (same command)
   ssh -R 80:localhost:3000 nokey@localhost.run
   ```

3. Copy the URL shown and access your bot from anywhere!

For permanent URLs, see [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md).

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

### Step 2: Share Your Calendar(s)

1. Open Google Calendar
2. Find the calendar you want to use (or create a new one)
3. Click the three dots next to it > "Settings and sharing"
4. Scroll down to "Share with specific people"
5. Click "Add people"
6. Enter the service account email (found in the JSON file as `client_email`)
7. Set permission to **"Make changes to events"**
8. Click "Send"

**For multiple calendars:** Repeat step 2 for each calendar you want to sync.

### Step 3: Configure the Bot

1. Open the JSON file you downloaded
2. Copy the **entire** JSON content (it will be one long line)
3. Open your `.env` file
4. Paste the JSON into the `GOOGLE_CREDENTIALS` line:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"discord-bot@your-project.iam.gserviceaccount.com",...}
```

5. Configure calendar IDs:

**Single calendar (primary):**
```env
CALENDAR_IDS=primary
```

**Single calendar (specific ID):**
```env
CALENDAR_IDS=your_calendar_id@group.calendar.google.com
```

**Multiple calendars with names:**
```env
CALENDAR_IDS=Work:work@group.calendar.google.com,Gaming:gaming@group.calendar.google.com,Personal:primary
```

**Multiple calendars without names:**
```env
CALENDAR_IDS=calendar1@group.calendar.google.com,calendar2@group.calendar.google.com
```

**Tip:** Find Calendar IDs in Google Calendar settings under "Integrate calendar".

That's it! Events will now automatically sync with Google Calendar.

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

**Date format:** `DD-MM-YYYY HH:MM` or `DD-MM-YYYY HH:MM AM/PM`

Examples:
```
!preset overwatch 15-02-2026 20:00
!preset helldivers 16-02-2026 19:00 Weekend squad up
!preset helldivers 16-02-2026 07:00 PM Weekend squad up
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

**Show detailed event info with timezone conversions:**
```
!eventinfo <eventId>
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

**Import from specific calendar:**
```
!sync Work
!sync Gaming
```

**List configured calendars:**
```
!calendars
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

## Web Interface Features

Access at `http://localhost:3000` (or your Cloudflare Tunnel URL):

### Dashboard
- **Live Statistics** - Total events, upcoming events, signups, and presets
- **Event Overview** - See all events with signup counts and details
- **Visual Timeline** - Past and upcoming events clearly marked

### Event Management
- **Visual Event Creator** - No need to remember command syntax
- **Role Builder** - Add custom roles with emojis and slot limits
- **Event Editing** - Modify events after creation
- **Quick Delete** - Remove events with confirmation

### Preset Management
- **Browse Presets** - See all available game templates
- **Create Custom Presets** - Build your own reusable templates
- **Quick Event Creation** - Click a preset to create an event instantly
- **Preset Editor** - Modify existing presets

### Responsive Design
- Works on desktop, tablet, and mobile
- Dark theme matching Discord's design
- Intuitive interface for non-technical users

## Usage Examples

### Example 1: Using Presets (Quickest Method)

**Via Discord:**
```
!preset overwatch 15-02-2026 20:00 Competitive push to Diamond
```

**Via Web Interface:**
1. Go to "Presets" tab
2. Click on "Overwatch" preset
3. Enter date/time: `15-02-2026 20:00`
4. Add custom description (optional)
5. Click "Create Event"

Done! The event is created with all roles automatically configured.

### Example 2: Creating a Custom Raid

**Via Discord:**
```
!create Vault of Glass | 15-02-2026 19:00 | Normal mode raid | 180 | 6

!addrole event_1707984000000 ⚔️ Tank 1
!addrole event_1707984000000 ❤️ Healer 1
!addrole event_1707984000000 🏹 DPS 4
```

**Via Web Interface:**
1. Go to "Create Event" tab
2. Fill in the form:
   - Title: "Vault of Glass"
   - Date & Time: Select from calendar picker
   - Duration: 180 minutes
   - Max Participants: 6
3. Add roles using the role builder
4. Click "Create Event"

### Example 3: Managing from Phone

1. Set up Cloudflare Tunnel (see [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md))
2. Access your bot from your phone browser
3. Create and manage events on the go
4. Users still sign up via Discord buttons

## How Users Sign Up

1. Users click on the role buttons under the event message in Discord
2. They are automatically assigned to that role
3. If they click another role, they are moved to the new role
4. They can click "❌ Leave Event" to leave completely
5. Roles show as disabled when full
6. All signups are visible in both Discord and the web interface

## File Structure

```
discord-event-bot/
├── bot.js                    # Main Discord bot code
├── web-server.js             # Web interface server
├── package.json              # Dependencies
├── presets.json              # Event templates for games
├── .env                      # Configuration (create from .env.example)
├── .env.example              # Example environment variables
├── events.json               # Event storage (auto-generated)
├── .gitignore                # Git ignore rules
├── public/
│   └── index.html           # Web interface frontend
├── README.md                 # This file
├── CLOUDFLARE_SETUP.md      # Remote access guide
├── GITHUB_GUIDE.md          # GitHub setup guide
├── QUICKSTART.md            # Quick setup guide
└── CALENDAR_SYNC_GUIDE.md   # Calendar sync documentation
```

## Permissions Required

### Bot Permissions
The bot needs these Discord permissions:
- **Manage Events** - To create/modify Discord events
- **Send Messages** - To send event messages
- **Embed Links** - To create rich event embeds
- **Read Message History** - To update event messages
- **Use External Emojis** - For custom role emojis

### User Permissions
- **Manage Events** permission required to create and manage events
- Regular users can sign up for events without special permissions

### Web Interface
- No authentication required by default (runs on localhost)
- When using Cloudflare Tunnel, consider adding authentication
- Only use remote access on trusted networks

## Troubleshooting

### Bot doesn't respond to commands

- Make sure "Message Content Intent" is enabled in Discord Developer Portal
- Check that the bot has permission to read and send messages in the channel
- Verify the bot token is correct in your `.env` file
- Make sure you created `.env` from `.env.example`
- Check the console for error messages

### Web interface won't load

- Ensure `web-server.js` is running
- Check that port 3000 isn't being used by another application
- Try accessing `http://127.0.0.1:3000` instead of `localhost`
- Check your firewall settings
- Look at console output for error messages

### Google Calendar integration not working

- Ensure the service account email is shared with your calendar
- Check that the Google Calendar API is enabled in Google Cloud Console
- Verify the credentials JSON is correctly formatted (one line, no line breaks)
- Make sure the calendar has "Make changes to events" permission
- Check the calendar ID format is correct
- Look for error messages when running `!sync`

### Events not saving

- Check file permissions in the bot directory
- Ensure the bot has write access to create `events.json`
- Make sure the directory isn't read-only

### Cloudflare Tunnel issues

- Verify `cloudflared` is installed correctly
- Make sure web server is running on port 3000
- Check that both terminals are open (web server + tunnel)
- See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for detailed troubleshooting

### Button interactions not working

- Check the event ID in the button's `customId`
- Verify the event still exists in `events.json`
- Make sure the bot has permission to edit messages
- Look for parsing errors in the console

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

**Or create presets via the web interface:**
1. Go to "Create Preset" tab
2. Fill in the form
3. Add roles with the role builder
4. Click "Create Preset"

**Preset Fields:**
- `name` - Display name for the event
- `description` - Default description (can be overridden)
- `duration` - Event duration in minutes
- `maxParticipants` - Maximum participants (0 = unlimited)
- `roles` - Array of roles with:
  - `name` - Role name
  - `emoji` - Role emoji
  - `maxSlots` - Max people in this role (null = unlimited)

### Multiple Calendar Support

Configure multiple calendars in `.env`:

```env
CALENDAR_IDS=Work:work@group.calendar.google.com,Gaming:gaming@group.calendar.google.com,Personal:primary
```

Then sync from specific calendars:
```
!sync Work
!sync Gaming
!calendars  # List all configured calendars
```

### Custom Web Interface Port

Change the port in `.env`:

```env
WEB_PORT=8080
```

Then access at `http://localhost:8080`

### Changing Command Prefix

Change the prefix from `!` to something else by modifying this line in `bot.js`:

```javascript
if (!message.content.startsWith('!')) return;
```

### Adding Authentication to Web Interface

For production use, consider adding authentication:

1. Use `express-basic-auth` package
2. Set username/password in `.env`
3. Protect API routes
4. Use HTTPS with Cloudflare Tunnel

### Running as a Service

**Windows (with PM2):**
```bash
npm install -g pm2
pm2 start bot.js --name discord-bot
pm2 start web-server.js --name web-interface
pm2 startup
pm2 save
```

**Linux (systemd):**
Create `/etc/systemd/system/discord-bot.service`:
```ini
[Unit]
Description=Discord Event Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/bot
ExecStart=/usr/bin/node bot.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable discord-bot
sudo systemctl start discord-bot
```

## Deployment Options

### Option 1: Run on Local Computer
- Easiest setup
- Free
- Use Cloudflare Tunnel for remote access
- Computer must stay on

### Option 2: VPS Hosting (DigitalOcean, Linode, etc.)
- 24/7 uptime
- $5-10/month
- Full control
- Permanent public IP

### Option 3: Free Cloud Hosting
- **Railway.app** - Free tier available
- **Render.com** - Free tier with cold starts
- **Oracle Cloud** - Generous free tier
- See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for more options

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Never share your Discord token** - Anyone with it can control your bot
3. **Keep Google credentials private** - They provide calendar access
4. **Use Cloudflare Tunnel** instead of port forwarding when possible
5. **Add authentication** to web interface for production use
6. **Use HTTPS** for remote access (Cloudflare Tunnel provides this)
7. **Limit bot permissions** to only what's needed
8. **Regularly update dependencies** - Run `npm update`

## Support & Documentation

📘 **[Cloudflare Tunnel Setup](CLOUDFLARE_SETUP.md)** - Access from anywhere  
📗 **[GitHub Setup Guide](GITHUB_GUIDE.md)** - Version control and backup  
📙 **[Calendar Sync Guide](CALENDAR_SYNC_GUIDE.md)** - Google Calendar integration  
📕 **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check console output for error messages
4. Verify all environment variables are set correctly
5. Ensure all dependencies are installed: `npm install`

## Changelog

### v2.3 (Latest)
- ✨ Added web interface for event management
- 🌍 Added Cloudflare Tunnel support
- 📅 Multiple calendar support
- ⏰ Auto-sync functionality
- 🕐 Timezone conversion support
- 📊 Live statistics dashboard
- 🎨 Preset creation via web interface

### v2.2
- Added `!eventinfo` command with timezone details
- Improved date parsing (supports AM/PM)
- Fixed button interaction parsing

### v2.1
- Added Google Calendar sync FROM calendar
- Added `!sync` and `!calendars` commands
- Multiple calendar support

### v2.0
- Added preset system with 18+ game templates
- Google Calendar integration
- Improved event embeds

## License

MIT License - feel free to modify and use for your community!

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [GITHUB_GUIDE.md](GITHUB_GUIDE.md) for setup instructions.

## Credits

Built with:
- [Discord.js](https://discord.js.org/) - Discord bot framework
- [Express](https://expressjs.com/) - Web server
- [Google Calendar API](https://developers.google.com/calendar) - Calendar integration
- [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) - Remote access

---

Made with ❤️ for Discord communities

**Star this project on GitHub if you find it useful!** ⭐
