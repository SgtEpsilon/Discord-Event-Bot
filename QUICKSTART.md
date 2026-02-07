# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Node.js
Make sure you have Node.js installed (v16 or higher)
Check with: `node --version`

### Step 2: Install Bot
```bash
cd discord-event-bot
npm install
```

### Step 3: Create Discord Bot
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" tab → "Add Bot"
4. Enable "Message Content Intent"
5. Copy the token

### Step 4: Configure
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and paste your bot token:
```env
DISCORD_TOKEN=your_actual_bot_token_here
```

### Step 5: Invite Bot
1. Go to OAuth2 → URL Generator
2. Select: `bot`
3. Select permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
4. Copy and open the URL
5. Add to your server

### Step 6: Run!
```bash
npm start
```

## First Event

The quickest way is to use a preset:

```
!preset overwatch 15-02-2026 20:00
```

Or create a custom event:

```
!create Raid Night | 15-02-2026 20:00 | Weekly raid | 120 | 10
```

The bot will respond with an event ID. Then add roles:

```
!addrole event_XXXXX ⚔️ Tank 2
!addrole event_XXXXX ❤️ Healer 2
!addrole event_XXXXX 🏹 DPS 6
```

Done! Users can now click buttons to sign up!

## Common Commands

- `!help` - Show all commands
- `!presets` - See all game templates
- `!preset <name> <date-time>` - Quick event creation
- `!list` - See all events
- `!create` - Make custom event
- `!addrole` - Add signup roles
- `!delete` - Remove event

## Popular Presets

```
!preset overwatch 15-02-2026 20:00
!preset helldivers 16-02-2026 19:00
!preset wow-raid 17-02-2026 20:00
!preset dnd 18-02-2026 18:00
!preset valorant 19-02-2026 21:00
```

## Need Google Calendar?

Follow the full README for Google Calendar setup. It's optional but adds automatic calendar syncing!
