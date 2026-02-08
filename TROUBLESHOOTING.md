# Troubleshooting Guide

Common issues and solutions for Discord Event + Streaming Bot.

## 📋 Quick Fixes

Try these first when something goes wrong:

1. ✅ Restart the bot (`npm start`)
2. ✅ Check `.env` file exists and has DISCORD_TOKEN
3. ✅ Verify Message Content Intent is enabled
4. ✅ Check bot has proper channel permissions
5. ✅ Wait 5 minutes for Discord to register commands
6. ✅ Check console logs for error messages

---

## Bot Issues

### Commands Not Working

**Symptoms:**
- Type `/help` - nothing happens
- Bot online but doesn't respond
- Commands don't appear in slash menu

**Solutions:**

#### 1. Enable Message Content Intent
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "Bot" section
4. Scroll to "Privileged Gateway Intents"
5. Enable **"Message Content Intent"**
6. Enable **"Server Members Intent"**
7. Click "Save Changes"
8. Restart bot

#### 2. Wait for Command Registration
Commands take up to 5 minutes to appear globally.

**Force refresh:**
- Restart Discord client
- Or wait 5 minutes
- Or kick and re-invite bot

#### 3. Check Bot Permissions
Bot needs these in the channel:
- ✅ View Channels
- ✅ Send Messages
- ✅ Embed Links
- ✅ Read Message History
- ✅ Use Slash Commands

**Verify:**
1. Right-click channel → Edit Channel
2. Go to Permissions
3. Find your bot's role
4. Check permissions are enabled

#### 4. Verify Bot Token
```bash
# Check .env exists
ls -la .env

# Verify token is set
cat .env | grep DISCORD_TOKEN
```

**If wrong:**
1. Get new token from Developer Portal
2. Update `.env`
3. Restart bot

### "Event not found" on Button Click

**Symptoms:**
- Event displays correctly
- Buttons appear
- Clicking returns "❌ Event not found"

**Causes & Solutions:**

#### 1. Bot Restarted
Events only exist in memory during bot session.

**Solution:**
- Check `data/events.json` exists
- Restart bot: `npm start`
- Events reload from file

**Prevention:**
- Don't delete `data/events.json`
- Ensure bot can write to data/ folder

#### 2. Old Event Messages
Buttons from before restart won't work.

**Solution:**
- Delete old event messages
- Create new events after restart

#### 3. File Permissions
Bot can't read/write events.json

**Check:**
```bash
# Verify file exists
ls -la data/events.json

# Check permissions (should be -rw-r--r--)
ls -l data/events.json

# Fix if needed
chmod 644 data/events.json
```

### Bot Crashes on Startup

**Common errors:**

**"Cannot find module"**
```bash
# Missing dependencies
npm install
```

**"Invalid token"**
```bash
# Check token in .env
# Get new one from Developer Portal
```

**"ENOENT: no such file"**
```bash
# Missing data directory
mkdir -p data
echo '{}' > data/events.json
echo '{}' > data/presets.json
echo '{}' > data/streaming.json
```

---

## Event Issues

### Date Format Errors

**Symptoms:**
- "❌ Invalid date format"
- Events created with wrong dates

**Required format:** `DD-MM-YYYY HH:MM`

**Valid:**
```
✅ 15-02-2026 20:00
✅ 15-02-2026 08:00 PM
✅ 01-12-2026 14:30
```

**Invalid:**
```
❌ 2026-02-15 20:00    (wrong order)
❌ 02-15-2026 20:00    (American format)
❌ 15/02/2026 20:00    (slashes not dashes)
❌ 15-2-2026 20:00     (no zero-padding)
```

**Fix:** Use DD-MM-YYYY format (day first, month second)

### Preset Not Found

**Symptoms:**
- "❌ Preset 'xyz' not found"

**Solutions:**

#### 1. Check Preset Name
View available presets:
```
/presets
```

Common mistakes:
```
❌ /preset over watch    (space)
❌ /preset Over-watch    (capitals)
✅ /preset overwatch
```

#### 2. Verify presets.json
```bash
# Check file exists
ls -la data/presets.json

# Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('data/presets.json')))"
```

**If corrupted:**
```bash
# Restore from backup or reinstall
cp data/presets.backup.json data/presets.json
```

### Buttons Don't Appear

**Symptoms:**
- Event message appears
- No signup buttons

**Causes:**

#### No Roles Added
Events from `/create` don't have roles by default.

**Solution:**
```
/addrole event_id:event_123 emoji:⚔️ role_name:DPS max_slots:6
```

Or use presets which include roles:
```
/preset preset_name:overwatch datetime:15-02-2026 20:00
```

#### Too Many Roles
Discord limits: 5 buttons per row, 5 rows max (25 total)

**Solution:**
- Keep under 24 roles (1 reserved for Leave button)
- Combine similar roles if needed

### Users Can't Sign Up

**Symptoms:**
- Buttons grayed out
- "Role is full" message
- No response on click

**Solutions:**

#### Role is Full
Check event - if showing "2/2", role is full.

**Solution:**
- Wait for someone to leave
- Event creator adds more slots
- Sign up for different role

#### Old Event Message
Event created before bot restart.

**Solution:**
- Delete old message
- Recreate event

---

## Calendar Issues

### Google Calendar Not Syncing

**Symptoms:**
- Events create in Discord
- No calendar link appears
- Console: "Google Calendar: Not configured"

**Solutions:**

#### 1. Verify Configuration
Check `.env` has:
```env
GOOGLE_CREDENTIALS={"type":"service_account",...}
CALENDAR_IDS=primary
```

#### 2. Validate JSON
```bash
# Check credentials are valid JSON
node -e "JSON.parse(process.env.GOOGLE_CREDENTIALS)"
```

**If error:** Re-copy JSON from downloaded file as ONE line

#### 3. Check Calendar Sharing
1. Google Calendar → Your calendar → Settings
2. "Share with specific people"
3. Verify service account email is listed
4. Permission: "Make changes to events"

**Service account email:**
- Found in credentials JSON
- `client_email` field
- Example: `bot@project.iam.gserviceaccount.com`

#### 4. Verify API is Enabled
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Library
3. Search "Google Calendar API"
4. Should show "Manage" (not "Enable")

### "Not Found" Error

**Error:** "Calendar event creation failed: Not Found"

**Causes:**
- Wrong calendar ID
- Calendar not shared
- Using non-existent calendar

**Solutions:**

#### Get Correct Calendar ID
1. Google Calendar → Your calendar
2. Three dots → Settings and sharing
3. Scroll to "Integrate calendar"
4. Copy "Calendar ID"

**Update .env:**
```env
CALENDAR_IDS=your_actual_calendar_id@group.calendar.google.com
# or
CALENDAR_IDS=primary
```

#### Verify Sharing
1. Calendar Settings → Share with specific people
2. Add service account email
3. Permission: "Make changes to events"
4. Click "Send"

### Events Don't Import

**Symptoms:**
- `/sync` says "No new events"
- Events exist in calendar

**Causes:**

#### Events Outside Window
Sync only imports next 7 days.

**Solution:**
- Check event dates
- Events must be in future
- Within next 168 hours

#### All-Day Events
These are skipped.

**Solution:**
- Set specific time in calendar
- Not all-day event

#### Already Imported
Events track `calendarEventId` to prevent duplicates.

**Check:**
- Look for event in Discord
- May have been imported earlier

---

## Streaming Issues

### Twitch Not Working

**Symptoms:**
- "/add-streamer" returns error
- No notifications when streams go live
- Console: "Twitch: Not configured"

**Solutions:**

#### 1. Configure Credentials
Add to `.env`:
```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
```

#### 2. Get Credentials
1. [Twitch Developer Console](https://dev.twitch.tv/console)
2. Register Your Application
3. Copy Client ID
4. Generate Client Secret

#### 3. Restart Bot
```bash
npm start
```

Should see: `[Twitch] Connected`

#### 4. Test
```
/add-streamer
```

If modal appears, Twitch is working!

### YouTube Not Detecting Videos

**Symptoms:**
- New videos uploaded
- No Discord notification

**Causes:**

#### First Run Initialization
First time monitoring only initializes - doesn't notify.

**Solution:**
- Wait for NEXT video
- Or wait 5 minutes for first check

#### Check Interval
Bot checks every 5 minutes.

**Timeline:**
- Video uploaded: 12:00 PM
- Bot checks: 12:00, 12:05, 12:10
- Notification: Between 12:00-12:05 PM

#### Wrong Channel Format
```
❌ youtube.com/c/LinusTechTips
✅ @LinusTechTips
✅ youtube.com/@LinusTechTips
✅ UCX6OQ3DkcsbYNE6H8uQQuVA (channel ID)
```

### No Stream Notification Channel

**Error:** "Setup streaming channel first"

**Solution:**
```
/setup-streaming channel:#announcements
```

Then add streamers:
```
/add-streamer
```

---

## Web Interface Issues

### Can't Access Web Interface

**Symptoms:**
- `http://localhost:3000` doesn't load
- Connection refused
- Page not found

**Solutions:**

#### 1. Web Server Not Running
Check if started:
```bash
npm run start:all
# or
npm run web
```

Should see: `🌐 Web interface running on http://localhost:3000`

#### 2. Port Already in Use
**Error:** "EADDRINUSE: address already in use :::3000"

**Solution:**
Change port in `.env`:
```env
WEB_PORT=8080
```

Then access: `http://localhost:8080`

#### 3. Firewall Blocking
**Windows:**
- Allow Node.js through firewall

**Mac:**
- System Preferences → Security → Firewall
- Allow incoming connections

#### 4. Wrong URL
Make sure using:
```
✅ http://localhost:3000
❌ https://localhost:3000 (no HTTPS)
❌ localhost:3000 (missing http://)
```

### Web Page Blank

**Symptoms:**
- Page loads
- Shows blank/white screen

**Solutions:**

#### 1. Check Browser Console
Press F12 → Console tab

Look for errors:
- 404 errors → Missing files
- CORS errors → Port mismatch
- JavaScript errors → Check console

#### 2. Verify Files Exist
```bash
ls -la public/index.html
```

Should show the file.

#### 3. Clear Browser Cache
- Ctrl+Shift+R (hard refresh)
- Or clear browser cache
- Try incognito mode

### Web Shows No Data

**Symptoms:**
- Interface loads
- No events shown
- Statistics show 0

**Solutions:**

#### 1. Events Exist?
Check file:
```bash
cat data/events.json
```

Should show event data.

#### 2. Refresh Data
Click "🔄 Refresh" button in web interface.

#### 3. Create Test Event
```
/preset preset_name:apex datetime:15-02-2026 20:00
```

Then refresh web page.

---

## Permission Issues

### "You need Manage Events permission"

**Symptoms:**
- User tries `/create`
- Error: "You need 'Manage Events' permission"

**Solution:**

#### Grant Permission
1. Server Settings → Roles
2. Find user's role
3. Enable "Manage Events"
4. Or give Administrator

**Note:** Regular users can signup without this permission.

### Bot Can't Send Messages

**Symptoms:**
- Commands work
- No bot responses
- No events posted

**Solutions:**

#### Check Channel Permissions
1. Right-click channel → Edit Channel
2. Permissions → Find bot role
3. Enable:
   - ✅ View Channel
   - ✅ Send Messages
   - ✅ Embed Links

#### Check Server Permissions
1. Server Settings → Roles
2. Find bot role
3. Enable required permissions

---

## Advanced Troubleshooting

### Enable Debug Logging

**Check console output:**
```bash
npm start
```

**Look for:**
```
✅ Bot Name is online!
🔗 Google Calendar: Connected
📋 Loaded 18 event presets
[Twitch] Connected
```

**Errors appear as:**
```
[ERROR] ...
Error: ...
```

### Check events.json

**View file:**
```bash
cat data/events.json
```

**Should look like:**
```json
{
  "event_1708012345678": {
    "id": "event_1708012345678",
    "title": "Raid Night",
    ...
  }
}
```

**If corrupted:**
```bash
# Backup and reset
cp data/events.json data/events.backup.json
echo '{}' > data/events.json
```

### Fresh Install

**If nothing works:**

```bash
# Stop bot
# Backup data
cp -r data data.backup

# Delete node_modules
rm -rf node_modules

# Delete lock file
rm package-lock.json

# Reinstall
npm install

# Restart
npm start
```

### File Permissions

**Linux/Mac:**
```bash
# Check permissions
ls -la data/

# Fix if needed
chmod 755 data/
chmod 644 data/*.json
```

**Windows:**
- Right-click folder → Properties
- Security tab
- Ensure user has Read/Write

---

## Common Error Messages

### "Missing Access"

**Full error:** "DiscordAPIError: Missing Access"

**Cause:** Bot lacks permissions

**Solution:**
1. Check bot has proper permissions
2. Re-invite with correct permissions
3. Verify role hierarchy

### "Unknown Interaction"

**Full error:** "Unknown Interaction"

**Cause:** Discord didn't receive response in time

**Solutions:**
- Bot might be slow/overloaded
- Network issues
- Try command again

### "ECONNREFUSED"

**Full error:** "Error: connect ECONNREFUSED"

**Cause:** Can't connect to service

**Solutions:**
- Check internet connection
- Verify API credentials
- Service might be down

### "Rate Limited"

**Full error:** "429 Too Many Requests"

**Cause:** Too many API calls

**Solutions:**
- Wait a few minutes
- Don't spam commands
- Check for loops in code

---

## Prevention Tips

### Regular Maintenance

**Weekly:**
- Check data/ folder size
- Verify bot is running
- Test key commands

**Monthly:**
- Clear old events
- Backup events.json
- Update dependencies: `npm update`

### Monitoring

**Watch for:**
- Console errors
- Failed API calls
- Missing responses
- Slow performance

**Keep logs:**
```bash
npm start > bot.log 2>&1
```

### Backups

**Backup events:**
```bash
# Daily backup script
cp data/events.json backups/events-$(date +%Y%m%d).json
```

**Backup .env:**
```bash
# Store securely (not in git!)
cp .env .env.backup
```

---

## Getting More Help

### Check Documentation

1. **README.md** - Overview and quick start
2. **SETUP.md** - Installation and configuration
3. **COMMANDS.md** - Command reference
4. **FEATURES.md** - Feature guides

### Diagnostic Checklist

Before asking for help, check:

- [ ] Node.js version (v16+)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file exists and configured
- [ ] Message Content Intent enabled
- [ ] Bot has channel permissions
- [ ] Console shows errors
- [ ] Events.json exists and valid
- [ ] Tried restarting bot
- [ ] Waited 5 minutes for commands

### Useful Information to Provide

When reporting issues:

1. **Error message** (full text from console)
2. **What you tried** (exact command used)
3. **Expected result** (what should happen)
4. **Actual result** (what actually happened)
5. **Console output** (any errors or warnings)
6. **Environment** (OS, Node version)

---

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Commands not working | Enable Message Content Intent |
| Event not found | Restart bot, delete old messages |
| Calendar not syncing | Check .env credentials, verify sharing |
| Twitch not working | Add credentials to .env |
| Web interface blank | Check console, verify files exist |
| Buttons grayed out | Role full or old message |
| Date format error | Use DD-MM-YYYY HH:MM |
| Permission denied | Grant Manage Events permission |
| Port already in use | Change WEB_PORT in .env |
| No new events to sync | Check calendar date range |

---

**Still stuck?**

1. Check all documentation files
2. Review console logs carefully
3. Try fresh install
4. Verify all environment variables
5. Check Discord.js documentation

Most issues are solved by restarting the bot, checking file permissions, and verifying environment variables!
