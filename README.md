# Discord Event Bot

A general-purpose event management bot for Discord with Google Calendar integration. Create, manage, and track community events directly from your Discord server.

---

## Features

- Create and manage events from Discord slash commands
- Google Calendar integration via OAuth
- Web dashboard (`public/`) for event browsing
- Persistent event data storage
- Diagnostics and monitoring tools
- PM2-based process management for reliable uptime

## Tech Stack

- **Runtime:** Node.js
- **Discord Library:** discord.js
- **Web Server:** Express (via `web-server.js`)
- **Auth:** Google OAuth 2.0 (`googleOAuth.js`)
- **Process Manager:** PM2 (`ecosystem.config.js`)

## Project Structure

```
Discord-Event-Bot/
├── bot.js                  # Main bot entry point
├── web-server.js           # Express web server & dashboard backend
├── googleOAuth.js          # Google OAuth flow
├── oauth-routes.js         # OAuth callback routes
├── ecosystem.config.js     # PM2 process config
├── config.json             # Bot configuration
├── .env.example            # Environment variable template
├── config/                 # Additional config files
├── data/                   # Persistent event/guild data
├── diagnostics/            # Health check & diagnostics utilities
├── discord/                # Discord command & event handlers
├── models/                 # Data models
├── public/                 # Web dashboard frontend
├── scripts/                # Utility/maintenance scripts
├── services/               # Business logic & integrations
├── src/                    # Core source modules
└── utils/                  # Shared utility functions
```

## Prerequisites

- Node.js v18 or higher
- A Discord application and bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Google Cloud project with the Google Calendar API enabled
- PM2 (optional, recommended for production): `npm install -g pm2`

## Installation

```bash
git clone https://github.com/SgtEpsilon/Discord-Event-Bot.git
cd Discord-Event-Bot
npm install
```

## Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values in `.env`. Required variables include your Discord bot token, client ID, Google OAuth credentials, and any other keys listed in `.env.example`.

3. Review `config.json` for additional bot-level settings such as prefix, guild IDs, or feature flags.

## Running the Bot

**Development:**
```bash
node bot.js
```

**Production (with PM2):**
```bash
npm run pm2:start
```

The web server runs alongside the bot and serves the event dashboard.

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Calendar API**.
3. Create OAuth 2.0 credentials (Web Application type).
4. Add your redirect URI (e.g., `http://localhost:3000/oauth/callback` or your domain).
5. Copy the Client ID and Client Secret into your `.env` file.

On first run, navigate to the OAuth URL printed in the console to authorize the bot with your Google account.

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes.

## License

MIT — see [LICENSE](LICENSE) for details.

## Support

- Open an issue on [GitHub](https://github.com/SgtEpsilon/Discord-Event-Bot/issues)
- Support the developer on [Patreon](https://patreon.com/RogueMandoGaming) or [Ko-fi](https://ko-fi.com/epsiloniner)
