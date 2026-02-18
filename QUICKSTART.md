# Quickstart Guide

Get the Discord Event Bot running in under 10 minutes.

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/SgtEpsilon/Discord-Event-Bot.git
cd Discord-Event-Bot
npm install
```

## Step 2 — Create Your Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Give it a name, then navigate to the **Bot** tab.
3. Click **Reset Token** and copy your bot token — you'll need it in the next step.
4. Under **Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent**.
5. Go to **OAuth2 → URL Generator**, select the `bot` and `applications.commands` scopes, grant the permissions your bot needs (at minimum: Send Messages, Read Messages, Manage Events), and use the generated URL to invite the bot to your server.

## Step 3 — Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in at least the following:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_discord_server_id   # optional: for guild-scoped commands
```

If you want Google Calendar integration, also add:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Step 4 — (Optional) Google Calendar Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Calendar API**.
3. Go to **APIs & Services → Credentials**, click **Create Credentials → OAuth client ID**, and choose **Web Application**.
4. Add `http://localhost:3000/oauth/callback` (or your production domain) as an authorized redirect URI.
5. Copy the Client ID and Secret into your `.env`.

## Step 5 — Start the Bot

**Quick start (development):**
```bash
node bot.js
```

**Production start with PM2:**
```bash
npm install -g pm2
npm run pm2:start
```

## Step 6 — Authorize Google (if enabled)

On first launch, the console will print a Google OAuth URL. Open it in your browser and grant calendar access. The bot will store the token for future use.

## Step 7 — Verify Everything Works

- The bot should appear **online** in your Discord server.
- The web dashboard should be reachable at `http://localhost:3000` (or your configured port).
- Run a test command in Discord (e.g., `/event` or whatever is registered) to confirm slash commands are working.

---

## What's Next?

- Review `config.json` to customize bot behavior (channels, roles, prefixes, etc.).
- Check the [Troubleshooting Guide](TROUBLESHOOTING.md) if something isn't working.
- Use `pm2 logs` to monitor bot output in production.
