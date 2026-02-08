# Setup & Configuration Guide

Complete guide for installing and configuring your Discord Event + Streaming Bot.

## 📦 Installation

### Prerequisites

**Required:**
- Node.js v16 or higher ([Download](https://nodejs.org/))
- npm (comes with Node.js)

**Check your versions:**
```bash
node --version  # Should be v16.0.0 or higher
npm --version
```

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `discord.js` - Discord API wrapper
- `@google-cloud/calendar` - Google Calendar integration
- `axios` - HTTP requests (Twitch)
- `xml2js` - XML parsing (YouTube RSS)
- `express` - Web server
- `cors` - Cross-origin support

### Step 2: Create Data Directory

```bash
mkdir -p data
echo '{}' > data/events.json
echo '{}' > data/presets.json
echo '{}' > data/streaming.json
```

The bot will also create these automatically on first run.

## 🔑 Discord Bot Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name your bot (e.g., "Event Manager")
4. Click **"Create"**

### 2. Create Bot User

1. Navigate to **"Bot"** section (left sidebar)
2. Click **"Add Bot"** → Confirm
3. **Copy the token** (you'll only see it once!)

### 3. Enable Required Intents

**CRITICAL:** Enable these intents or commands won't work!

In the Bot section:
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

Click **"Save Changes"**

### 4. Configure Bot Permissions

1. Go to **OAuth2 → URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ View Channels
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use External Emojis
   - ✅ Manage Events (optional)
   - ✅ Manage Roles (for live role feature)

### 5. Invite Bot to Server

1. Copy the generated URL from OAuth2 URL Generator
2. Open the URL in your browser
3. Select your server
4. Click **"Authorize"**

### 6. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your bot token:
```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhXyZw.abcdefghijklmnopqrstuvwxyz1234567890AB
```

⚠️ **Never share this token or commit it to git!**

## 📅 Google Calendar Setup (Optional)

Calendar integration enables two-way sync between Discord and Google Calendar.

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name: `discord-event-bot`
4. Click **"Create"**

### 2. Enable Calendar API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click it → Click **"Enable"**

### 3. Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Name: `discord-bot`
4. Click **"Create and Continue"**
5. Skip optional steps → Click **"Done"**

### 4. Generate Key File

1. Click on your new service account
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Click **"Create"**
6. **Save the downloaded JSON file!**

### 5. Share Calendar with Bot

1. Open [Google Calendar](https://calendar.google.com/)
2. Find your calendar (left sidebar)
3. Click **⋮** (three dots) → **"Settings and sharing"**
4. Scroll to **"Share with specific people"**
5. Click **"Add people"**
6. **Paste the service account email** from your JSON file
   - Example: `discord-bot@your-project.iam.gserviceaccount.com`
7. Permission: **"Make changes to events"**
8. Click **"Send"**

### 6. Configure in .env

1. Open the downloaded JSON file
2. **Copy the ENTIRE JSON** (it's one long line)
3. Add to `.env`:

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your-project",...entire JSON here...}
```

**Important:**
- Paste as ONE line (no line breaks)
- Keep all the quotes and braces
- Don't add extra spaces

**Get Calendar ID:**
1. Google Calendar → Your calendar → Settings
2. Scroll to **"Integrate calendar"**
3. Copy the **"Calendar ID"**
4. Add to `.env`:

```env
CALENDAR_IDS=primary
# Or use specific calendar:
CALENDAR_IDS=abc123xyz@group.calendar.google.com
```

**Multiple calendars:**
```env
CALENDAR_IDS=primary,abc@group.calendar.google.com
```

### Test Calendar Connection

Start the bot and look for:
```
✅ Google Calendar: Connected
```

If you see this, calendar integration is working!

## 📺 Twitch Setup (Optional)

Monitor Twitch streamers for live notifications.

### 1. Create Twitch Application

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **"Register Your Application"**
3. Fill in:
   - **Name:** `Discord Event Bot`
   - **OAuth Redirect URLs:** `http://localhost`
   - **Category:** `Application Integration`
4. Click **"Create"**

### 2. Get Credentials

1. Click **"Manage"** on your application
2. **Copy Client ID**
3. Click **"New Secret"** → **Copy Client Secret**

⚠️ **Save the secret immediately - you can't see it again!**

### 3. Configure in .env

```env
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```

### Test Twitch Integration

Start the bot and use:
```
/add-streamer
```

If it works, Twitch is configured correctly!

## 📺 YouTube Setup (Optional)

Monitor YouTube channels for new videos. **No API key needed!**

YouTube monitoring uses RSS feeds, so:
- ✅ No API key required
- ✅ No quota limits
- ✅ Works out of the box

Just use the command:
```
/add-youtube channel:@LinusTechTips
```

## 🌐 Web Interface Setup (Optional)

Enable the web dashboard at `http://localhost:3000`

### Configure Port

Add to `.env`:
```env
WEB_PORT=3000
```

### Start Web Server

**With bot:**
```bash
npm run start:all
```

**Web only:**
```bash
npm run web
```

**Separate terminals:**
```bash
# Terminal 1 - Bot
npm start

# Terminal 2 - Web
npm run web
```

### Access Dashboard

Open browser: `http://localhost:3000`

**Features:**
- View all events
- Create events from presets
- Create custom events
- Delete events
- View statistics

## 🔧 Environment Variables Reference

### Complete .env Template

```env
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REQUIRED
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISCORD_TOKEN=your_discord_bot_token

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OPTIONAL - Google Calendar
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOOGLE_CREDENTIALS={"type":"service_account"...}
CALENDAR_IDS=primary

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OPTIONAL - Twitch Monitoring
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OPTIONAL - Web Interface
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEB_PORT=3000
```

### Variable Details

**DISCORD_TOKEN** (Required)
- Discord bot authentication token
- Get from: Discord Developer Portal → Bot → Token
- Format: Long alphanumeric string with dots
- Example: `MTIzNDU2Nzg5.GhXyZw.abc123...`

**GOOGLE_CREDENTIALS** (Optional)
- Service account JSON key
- Get from: Google Cloud Console → Service Account → Keys
- Format: Entire JSON file as one line
- Leave blank to disable calendar features

**CALENDAR_IDS** (Optional)
- Which calendar(s) to sync with
- Default: `primary` (your main calendar)
- Multiple: Comma-separated
- Example: `primary,abc@group.calendar.google.com`

**TWITCH_CLIENT_ID** (Optional)
- Twitch application client ID
- Get from: Twitch Developer Console
- Leave blank to disable Twitch monitoring

**TWITCH_CLIENT_SECRET** (Optional)
- Twitch application client secret
- Get from: Twitch Developer Console
- Leave blank to disable Twitch monitoring

**WEB_PORT** (Optional)
- Port for web interface
- Default: 3000
- Change if port is in use

## 🚀 Running the Bot

### Start Options

**Bot Only:**
```bash
npm start
```
Runs just the Discord bot.

**Bot + Web Interface:**
```bash
npm run start:all
```
Runs both bot and web server together.

**Development Mode:**
```bash
npm run dev:all
```
Auto-restarts on file changes.

### Verify Startup

**Successful startup looks like:**
```
✅ [Bot Name] is online!
🔗 Google Calendar: Connected
📋 Loaded 18 event presets
🌐 Web interface running on http://localhost:3000
```

**With Twitch:**
```
[Twitch] Connected
[Twitch] Starting monitoring for 0 streamers
```

**Without optional features:**
```
✅ [Bot Name] is online!
🔗 Google Calendar: Not configured (optional)
📋 Loaded 18 event presets
[Twitch] Not configured (optional)
```

## 🎮 First Time Setup in Discord

### 1. Check Bot is Online

Look for your bot in the member list - it should have a green dot.

### 2. Register Commands

Commands register automatically, but may take **up to 5 minutes** to appear globally.

**Force refresh:**
- Restart Discord
- Or wait 5 minutes

### 3. Create Test Event

```
/preset apex 15-02-2026 20:00
```

Should create an event with signup buttons!

### 4. Test Calendar (if enabled)

```
/sync
```

Should import events from Google Calendar.

### 5. Test Streaming (if enabled)

```
/setup-streaming channel:#announcements
/add-streamer
```

Enter a popular streamer to test.

## 🔄 Updating the Bot

### Update Dependencies

```bash
npm install
```

### Update Code

```bash
git pull origin main
npm install
```

### Migrate Data

Data files are forward-compatible. No migration needed for:
- `events.json`
- `presets.json`
- `streaming.json`

## 🗂️ File Structure After Setup

```
discord-event-bot/
├── .env                    # Your configuration (DO NOT COMMIT!)
├── .env.example            # Template
├── package.json            # Dependencies
├── node_modules/           # Installed packages
├── src/                    # Source code
├── data/                   # Data storage
│   ├── events.json        # Events database
│   ├── presets.json       # Game templates
│   └── streaming.json     # Stream config
├── public/                 # Web interface
│   └── index.html
└── web-server.js          # Web API server
```

## ✅ Setup Checklist

Complete this checklist to ensure everything is configured:

### Discord Bot
- [ ] Created Discord application
- [ ] Created bot user
- [ ] Enabled Message Content Intent
- [ ] Enabled Server Members Intent
- [ ] Copied bot token
- [ ] Invited bot to server
- [ ] Added token to .env
- [ ] Bot shows online in Discord

### Google Calendar (Optional)
- [ ] Created Google Cloud project
- [ ] Enabled Calendar API
- [ ] Created service account
- [ ] Downloaded JSON key
- [ ] Shared calendar with service account
- [ ] Added credentials to .env
- [ ] Added calendar ID to .env
- [ ] Bot shows "Calendar: Connected"

### Twitch (Optional)
- [ ] Created Twitch application
- [ ] Got Client ID
- [ ] Generated Client Secret
- [ ] Added both to .env
- [ ] Bot shows "Twitch: Connected"

### Web Interface (Optional)
- [ ] Set WEB_PORT in .env
- [ ] Created public/ folder
- [ ] Added index.html
- [ ] Web server starts successfully
- [ ] Can access http://localhost:3000

### Testing
- [ ] Created test event with /preset
- [ ] Clicked signup buttons (they work)
- [ ] Ran /list (shows events)
- [ ] Calendar sync works (if enabled)
- [ ] Streaming notifications work (if enabled)

## 🚨 Common Setup Issues

### "Cannot find module"

**Problem:** Missing dependencies

**Solution:**
```bash
npm install
```

### "Invalid token"

**Problem:** Wrong Discord token or extra spaces

**Solutions:**
1. Get a fresh token from Developer Portal
2. Make sure no spaces before/after in .env
3. Verify token is correct

### "Missing Intents"

**Problem:** Message Content Intent not enabled

**Solution:**
1. Discord Developer Portal → Your App → Bot
2. Enable "Message Content Intent"
3. Save changes
4. Restart bot

### "Calendar: Not Found"

**Problem:** Calendar not shared or wrong ID

**Solutions:**
1. Verify calendar is shared with service account email
2. Check CALENDAR_IDS in .env matches calendar ID
3. Use "primary" for your main calendar

### "Commands not appearing"

**Problem:** Discord hasn't registered commands yet

**Solutions:**
1. Wait 5 minutes
2. Restart Discord client
3. Check bot has proper permissions
4. Verify bot is in the server

### "Port already in use"

**Problem:** Another process using port 3000

**Solutions:**
1. Change WEB_PORT in .env to different port (e.g., 8080)
2. Or kill the process using port 3000

## 📞 Getting Help

If you're still stuck:

1. Check the console output for errors
2. Review TROUBLESHOOTING.md
3. Verify all environment variables are set correctly
4. Ensure file permissions are correct
5. Check Discord.js documentation

## 🎉 You're Ready!

Once the checklist is complete, you're ready to use your bot!

**Next steps:**
- Read COMMANDS.md for all available commands
- Check FEATURES.md for feature guides
- Customize presets.json for your games
- Share your event channel with friends!
