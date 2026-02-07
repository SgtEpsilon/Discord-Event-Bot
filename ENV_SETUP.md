# Environment Variables Setup Guide

This guide explains how to set up your `.env` file for the Discord Event Bot.

## What is a .env file?

A `.env` file stores sensitive configuration like API keys and tokens. It keeps your secrets safe and out of version control (git).

## Initial Setup

### 1. Create your .env file

Copy the example file:

```bash
cp .env.example .env
```

### 2. Open .env in a text editor

Use any text editor (VS Code, Notepad++, nano, etc.):

```bash
nano .env
# or
code .env
# or just open it in your text editor
```

## Required Configuration

### DISCORD_TOKEN (Required)

This is your Discord bot's authentication token.

**How to get it:**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on your application (or create a new one)
3. Go to the "Bot" section in the left sidebar
4. Under the bot's username, click "Reset Token"
5. Click "Yes, do it!" to confirm
6. Copy the token (you'll only see it once!)

**Add it to .env:**

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhXyZw.abcdefghijklmnopqrstuvwxyz1234567890AB
```

⚠️ **Important:** 
- Never share this token with anyone
- Never commit it to git (it's already in `.gitignore`)
- If exposed, immediately reset it in the Discord Developer Portal

## Optional Configuration

### GOOGLE_CREDENTIALS (Optional)

For Google Calendar integration. Leave blank to skip calendar sync.

**How to get it:**

1. Follow the Google Calendar setup steps in README.md
2. Download the JSON key file from Google Cloud Console
3. Open the JSON file in a text editor
4. Copy the **entire** JSON content (it will be one very long line)
5. Paste it as the value for GOOGLE_CREDENTIALS

**Example .env entry:**

```env
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"my-discord-bot","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n","client_email":"discord-bot@my-discord-bot.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/discord-bot%40my-discord-bot.iam.gserviceaccount.com"}
```

**Tips:**
- This should be ONE line (no line breaks)
- Keep the quotes around the JSON
- Make sure there are no extra spaces

### CALENDAR_ID (Optional)

The Google Calendar to sync events to. Default is 'primary' (your main calendar).

**Options:**

For your primary calendar (default):
```env
CALENDAR_ID=primary
```

For a specific calendar:
```env
CALENDAR_ID=abc123xyz@group.calendar.google.com
```

**How to find Calendar ID:**
1. Open Google Calendar
2. Click the three dots next to your calendar
3. Select "Settings and sharing"
4. Scroll down to "Integrate calendar"
5. Copy the "Calendar ID"

## Complete .env Example

### Minimal setup (Discord only, no calendar):

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhXyZw.abcdefghijklmnopqrstuvwxyz1234567890AB
GOOGLE_CREDENTIALS=
CALENDAR_ID=primary
```

### Full setup (with Google Calendar):

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhXyZw.abcdefghijklmnopqrstuvwxyz1234567890AB
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"my-project",...}
CALENDAR_ID=primary
```

## Testing Your Configuration

After setting up your `.env` file:

1. Save the file
2. Run the bot:
   ```bash
   npm start
   ```

3. Check the output:
   - ✅ `${BOT_NAME} is online!` - Discord token works!
   - ✅ `Google Calendar: Connected` - Calendar integration works!
   - ❌ `Google Calendar: Not configured` - Calendar is disabled (that's okay!)

## Troubleshooting

### Error: "DISCORD_TOKEN is required!"

- You didn't create a `.env` file
- You didn't add your token to `.env`
- The token line is commented out (has a # at the start)

**Fix:** Create `.env` and add your token

### Error: "Failed to initialize Google Calendar"

- Your `GOOGLE_CREDENTIALS` JSON is malformed
- You forgot to put the entire JSON on one line
- There are extra line breaks in the private key

**Fix:** Re-copy the JSON from the downloaded file, ensure it's all one line

### Bot connects but doesn't create calendar events

- Your service account isn't shared with the calendar
- Wrong calendar ID
- Google Calendar API not enabled

**Fix:** Follow the Google Calendar setup in README.md again

### Error: "Invalid token"

- Your Discord token is wrong
- The token was reset in Discord Developer Portal
- There are extra spaces around the token

**Fix:** Get a new token from Discord Developer Portal

## Security Best Practices

✅ **DO:**
- Keep your `.env` file private
- Use different tokens for development and production
- Reset your token if you accidentally expose it
- Add `.env` to `.gitignore` (already done)

❌ **DON'T:**
- Commit `.env` to git
- Share your `.env` file
- Post your token in Discord or forums
- Use the same token across multiple bots

## Need Help?

1. Check that `.env` exists in the same folder as `bot.js`
2. Verify there are no extra spaces or quotes around values
3. Make sure the file is named exactly `.env` (not `.env.txt`)
4. Try deleting `.env` and recreating it from `.env.example`

Still stuck? Double-check the README.md for detailed setup instructions.
