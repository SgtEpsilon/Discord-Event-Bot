# Troubleshooting Guide

This guide helps you fix common issues with the Discord Event Bot.

## Common Issues

### 1. "Event not found" when clicking signup buttons

**Symptoms:**
- Event displays correctly
- Buttons show up
- Clicking any button returns "❌ Event not found"

**Causes & Solutions:**

#### Cause 1: Bot Restarted
When the bot restarts, it loses all events from memory unless they're saved.

**Solution:**
- Check that `events.json` file exists
- Restart the bot: `npm start`
- Events should reload from `events.json`

**Prevention:**
- Make sure the bot has write permissions to create `events.json`
- Don't delete `events.json` while bot is running

#### Cause 2: Events Not Being Saved
The `saveEvents()` function might not be working.

**How to check:**
1. Create an event
2. Check if `events.json` file was created/updated
3. Look at the file contents

**If `events.json` is empty or missing:**
```javascript
// Check file permissions
ls -la events.json

// Make sure bot can write
chmod 644 events.json
```

#### Cause 3: Old Event Messages
Buttons from before the bot restarted won't work.

**Solution:**
- Delete old event messages
- Create new events after bot restart
- Or: Add event persistence (see Advanced section)

#### Cause 4: CustomId Parsing Issue
Role names with special characters might break parsing.

**Check the logs:**
```
[Button Click] CustomId: "signup_event_123456_Tank"
[Parse] Action: "signup" | EventId: "event_123456" | RoleName: "Tank"
[Events] Available IDs: event_123456, event_789012
[Found] Event "Overwatch" (ID: event_123456)
```

**If you see:**
```
[ERROR] Event "123456" not found in events object
```

The eventId is being parsed incorrectly.

**Check logs for:**
- Wrong action parsing
- Wrong eventId parsing
- EventId doesn't match what's in events.json

#### Cause 5: File System Issues
The bot can't read/write `events.json`.

**Solution:**
```bash
# Check if file exists
ls -la events.json

# Check permissions
# Should show: -rw-r--r--
ls -l events.json

# Fix permissions if needed
chmod 644 events.json

# Make sure directory is writable
chmod 755 .
```

### 2. Bot doesn't respond to commands

**Symptoms:**
- Type `!help` - nothing happens
- Bot is online but silent

**Solutions:**

#### Check Message Content Intent
1. Go to Discord Developer Portal
2. Navigate to your bot application
3. Go to "Bot" section
4. Scroll to "Privileged Gateway Intents"
5. Enable "Message Content Intent"
6. Save changes
7. Restart bot

#### Check Bot Permissions
The bot needs these permissions in the channel:
- Read Messages
- Send Messages
- Embed Links
- Read Message History
- Use External Emojis

**How to check:**
1. Right-click the channel
2. Edit Channel > Permissions
3. Find your bot role
4. Check the permissions above are green

#### Check Bot Token
```bash
# Verify .env file exists
ls -la .env

# Check token is set
cat .env | grep DISCORD_TOKEN

# Should show: DISCORD_TOKEN=your_token_here
```

If token is wrong or missing:
1. Get new token from Discord Developer Portal
2. Update `.env` file
3. Restart bot

### 3. Google Calendar not syncing

**Symptoms:**
- Events create in Discord
- No calendar link appears
- Console shows "Google Calendar: Not configured"

**Solutions:**

See `GOOGLE_CALENDAR_GUIDE.md` for detailed setup.

**Quick checks:**
1. Is `GOOGLE_CREDENTIALS` set in `.env`?
2. Is the JSON valid (no line breaks)?
3. Is the calendar shared with the service account?
4. Is Google Calendar API enabled?

### 4. Buttons don't appear on events

**Symptoms:**
- Event message appears
- No signup buttons below it

**Causes:**

#### No Roles Added
Events created with `!create` don't have roles by default.

**Solution:**
```
!addrole event_123456 ⚔️ Tank 2
!addrole event_123456 ❤️ Healer 2
```

Or use presets which include roles:
```
!preset overwatch 15-02-2026 20:00
```

#### Too Many Roles
Discord limits to 5 buttons per row, 5 rows max (25 buttons total).

**Solution:**
- Keep roles under 24 (leaving room for Leave button)
- Combine similar roles if needed

### 5. Date format errors

**Symptoms:**
- "❌ Invalid date format" error
- Events created with wrong dates

**Solution:**
Use the correct format: `DD-MM-YYYY HH:MM`

See `DATE_FORMAT_GUIDE.md` for details.

**Examples:**
```
✓ 15-02-2026 20:00
✓ 15-02-2026 08:00 PM
✗ 2026-02-15 20:00  (wrong order)
✗ 02-15-2026 20:00  (American format)
✗ 15/02/2026 20:00  (wrong separator)
```

### 6. Preset not found

**Symptoms:**
- "❌ Preset 'xyz' not found"

**Solutions:**

#### Check Preset Name
Preset names are case-insensitive but must match exactly.

**View all presets:**
```
!presets
```

**Common mistakes:**
```
✗ !preset over watch    (space in name)
✗ !preset Overwatch     (works, but use lowercase)
✓ !preset overwatch
```

#### Check presets.json
Make sure `presets.json` exists and is valid JSON.

```bash
# Check file exists
ls -la presets.json

# Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('presets.json')))"
```

### 7. "Permission denied" errors

**Symptoms:**
- "❌ You need 'Manage Events' permission"

**Solution:**

Users creating events need Discord permission to Manage Events.

**To grant permission:**
1. Server Settings > Roles
2. Find the user's role
3. Enable "Manage Events" permission
4. Or give them Administrator

**Note:** Regular users can sign up without special permissions.

### 8. Users can't sign up

**Symptoms:**
- Buttons are grayed out
- "This role is full" message
- No response when clicking

**Solutions:**

#### Role is Full
Check the event embed - if it shows "2/2" the role is full.

**Solution:**
- Event creator can add more slots with `!addrole`
- Or users can sign up for different role

#### Button is Disabled
Disabled buttons appear gray and don't respond.

**This is normal when:**
- Role has reached max capacity
- Event has been deleted

**Solution:**
- Sign up for a different role
- Wait for a spot to open
- Event creator can increase slots

#### Old Event Message
If the event is from before bot restart, buttons won't work.

**Solution:**
- Event creator should delete and recreate
- Or use `!list` to see current events

## Debugging Tips

### Enable Console Logging

The bot logs helpful information:

```
✅ Claude's Event Bot is online!
🔗 Google Calendar: Connected
📋 Loaded 18 event presets

[Button Click] CustomId: "signup_event_123_Tank"
[Parse] Action: "signup" | EventId: "event_123" | RoleName: "Tank"
[Events] Available IDs: event_123
[Found] Event "Overwatch" (ID: event_123)
```

**Watch for errors:**
```
[ERROR] Event "event_123" not found in events object
```

### Check events.json

Look at the events file to see what's stored:

```bash
cat events.json
```

Should look like:
```json
{
  "event_1708012345678": {
    "id": "event_1708012345678",
    "title": "Overwatch",
    "dateTime": "2026-02-15T20:00:00.000Z",
    ...
  }
}
```

### Test Basic Commands

```
!help          # Should show command list
!presets       # Should show available presets
!list          # Should show current events
```

If none work:
1. Bot not receiving messages (check Message Content Intent)
2. Bot not in the server
3. Bot token is wrong

### Restart the Bot

Many issues are fixed by simply restarting:

```bash
# Stop the bot (Ctrl+C)
# Start it again
npm start
```

## Getting More Help

### Check the Logs

Run the bot and watch the console output:

```bash
npm start
```

Look for:
- Error messages
- Warning messages
- Failed API calls

### File Permissions

Make sure the bot can read/write files:

```bash
# Check directory permissions
ls -la

# events.json should be readable/writable
# .env should be readable
# presets.json should be readable
```

### Verify Setup

Run through the setup checklist:

- [ ] Node.js installed (v16+)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created
- [ ] `DISCORD_TOKEN` set in `.env`
- [ ] Bot invited to server
- [ ] Message Content Intent enabled
- [ ] Bot has necessary permissions
- [ ] `presets.json` exists

### Test in Isolation

Create a test event to narrow down the issue:

```
!preset apex 15-02-2026 12:00
```

This tests:
- Command parsing
- Preset loading
- Event creation
- Button generation
- File saving

If this works, the issue is with specific commands/presets.

## Advanced Troubleshooting

### Event Persistence Across Restarts

The bot saves events to `events.json` automatically. Old event messages won't work after restart.

**Option 1: Delete old events**
- Remove old event messages
- Create new ones after restart

**Option 2: Store messageId and auto-update**
(Requires code modification - see Advanced Configuration in README)

### Rate Limiting

If creating many events quickly:
- Discord may rate limit the bot
- Wait a few seconds between commands
- Or create events in batches

### Memory Issues

If the bot crashes with many events:
- Clear old events from `events.json`
- Use `!delete` to remove past events
- Keep only upcoming events

### Database Migration

For large servers, consider moving to a real database:
- SQLite for simple setup
- PostgreSQL for production
- MongoDB for flexibility

(This requires code changes)

## Quick Fixes Checklist

When something goes wrong, try these in order:

1. ✅ Restart the bot
2. ✅ Check `events.json` exists
3. ✅ Verify `.env` file is correct
4. ✅ Check bot has Message Content Intent
5. ✅ Check bot has channel permissions
6. ✅ Delete old event messages
7. ✅ Create fresh test event
8. ✅ Check console logs for errors
9. ✅ Verify date format is DD-MM-YYYY
10. ✅ Check preset name is correct

## Still Stuck?

1. Check all documentation files (README, guides)
2. Review the example commands
3. Compare your setup to the examples
4. Check Discord.js documentation
5. Verify Node.js version (should be 16+)

---

Most issues are solved by:
- Restarting the bot
- Checking file permissions  
- Verifying environment variables
- Using correct date format
- Deleting old event messages

Good luck! 🎮
