# Troubleshooting Guide

Solutions to the most common issues with the Discord Event Bot.

---

## Bot Is Offline / Won't Start

**Symptoms:** The bot never appears online, or the process exits immediately.

**Check the logs first:**
```bash
node bot.js          # run directly to see errors in real time
pm2 logs             # if using PM2
```

**Common causes:**

- **Invalid bot token** — Double-check `DISCORD_TOKEN` in your `.env`. Re-generate from the Discord Developer Portal if needed.
- **Missing `.env` file** — Make sure you ran `cp .env.example .env` and filled in all required fields.
- **Node.js version too old** — Run `node -v` and confirm it's v18 or higher.
- **Missing dependencies** — Run `npm install` again to ensure all packages are present.

---

## Slash Commands Not Showing Up

**Symptoms:** Commands don't appear in Discord after typing `/`.

**Causes & fixes:**

- **Commands haven't been registered** — There may be a registration script in `scripts/`. Run it once:
  ```bash
  node scripts/deploy-commands.js   # filename may vary — check the scripts/ folder
  ```
- **Wrong `CLIENT_ID` or `GUILD_ID`** — Verify these match your application and server in the [Developer Portal](https://discord.com/developers/applications).
- **Global commands have a delay** — Global slash commands can take up to an hour to propagate. Use guild-scoped commands during development by setting `GUILD_ID` in your `.env`.
- **Missing `applications.commands` scope** — Re-invite the bot using an OAuth URL that includes both `bot` and `applications.commands` scopes.

---

## Google Calendar Integration Not Working

**Symptoms:** Events aren't syncing, OAuth errors in the console, or the OAuth URL never appears.

**Check these first:**

- **Missing Google credentials** — Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are all set in `.env`.
- **Redirect URI mismatch** — The `GOOGLE_REDIRECT_URI` in your `.env` must exactly match the redirect URI registered in the Google Cloud Console (including protocol and port).
- **Token not authorized** — Delete any cached token file in `data/` and restart the bot to trigger a fresh OAuth flow. Visit the printed URL in your browser and complete authorization.
- **API not enabled** — In the [Google Cloud Console](https://console.cloud.google.com/), confirm the **Google Calendar API** is enabled for your project.
- **OAuth consent screen not published** — If your app is in "Testing" mode, only whitelisted Google accounts can authorize it. Add your account as a test user or publish the app.

---

## Web Dashboard Not Loading

**Symptoms:** `http://localhost:3000` returns an error or times out.

- **Wrong port** — Check `config.json` or your `.env` for the configured port and use that in the URL.
- **Web server not running** — The `web-server.js` process may have crashed separately from the bot. If using PM2, check `pm2 status` and restart if needed: `pm2 restart all`.
- **Firewall / port blocked** — On a VPS or server, make sure the port is open and allowed through your firewall.

---

## PM2 Process Keeps Restarting

**Symptoms:** `pm2 status` shows the bot in a restart loop with many restarts.

```bash
pm2 logs --lines 100   # view recent logs for the crash cause
```

- A startup crash (bad token, missing env vars, syntax error) will cause PM2 to loop. Fix the underlying error first, then: `pm2 restart all`.
- If you suspect a memory leak or runaway process, adjust `max_memory_restart` in `ecosystem.config.js`.

---

## Events Not Being Saved

**Symptoms:** Events disappear after a restart, or changes aren't persisted.

- Check that the `data/` directory exists and the bot process has write permissions to it.
- Look for any error messages related to file I/O or database writes in the logs.
- Ensure you aren't running two instances of the bot simultaneously, which can cause write conflicts.

---

## Permissions Errors in Discord

**Symptoms:** The bot responds with "Missing Permissions" or doesn't post in channels.

- Confirm the bot role has the necessary permissions in the server and in the specific channel (Send Messages, Embed Links, Manage Events, etc.).
- Channel-level permission overrides can block bot actions even if the server-level role has access — check the channel's permission settings.

---

## Running Diagnostics

The `diagnostics/` folder contains health check utilities. Run them to get a status overview:

```bash
node diagnostics/<script-name>.js   # check the diagnostics/ folder for available scripts
```

---

## Still Stuck?

- Check existing [GitHub Issues](https://github.com/SgtEpsilon/Discord-Event-Bot/issues) — your problem may already have a solution.
- Open a new issue with your Node.js version, OS, and the full error message from the logs.
- Support the developer on [Patreon](https://patreon.com/RogueMandoGaming) or [Ko-fi](https://ko-fi.com/epsiloniner).
