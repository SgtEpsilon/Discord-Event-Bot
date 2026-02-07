# Web Interface - Complete Setup Guide

## 📋 Quick Setup (5 Minutes)

### Step 1: Update package.json

Replace your `package.json` with the new version that includes web dependencies.

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `cors` - Cross-origin support
- `concurrently` - Run multiple processes (optional, for dev mode)

### Step 3: Create Required Files

You need these new files:
1. `web-server.js` - The web server
2. `start-all.js` - Script to run both servers
3. `public/index.html` - The web interface

Create the `public` folder:
```bash
mkdir public
```

### Step 4: Update .env

Add this line to your `.env` file:
```env
WEB_PORT=3000
```

### Step 5: Start Everything!

**Windows/Mac/Linux - All platforms:**
```bash
npm run start:all
```

**Alternative (if above doesn't work):**

Open **two** separate terminals:

**Terminal 1 - Discord Bot:**
```bash
npm start
```

**Terminal 2 - Web Server:**
```bash
npm run web
```

### Step 6: Open in Browser

Navigate to: **http://localhost:3000**

---

## 🎯 What You Get

### Dashboard Features
- **Real-time Statistics**: See total events, upcoming events, signups, and presets
- **Three Tabs**:
  - 📅 **Events** - View and manage all events
  - 📋 **Presets** - Browse and use game templates
  - ➕ **Create Event** - Visual form to create custom events

### Event Management
- ✅ Create events with visual forms
- ✅ Delete events with one click
- ✅ View all event details
- ✅ See real-time signup counts
- ✅ Filter by upcoming/past events
- ✅ Use preset templates instantly

---

## 📁 File Structure

After setup, your project should look like this:

```
Discord-Event-Bot/
├── bot.js                    # Discord bot (existing)
├── web-server.js            # Web server (NEW)
├── start-all.js             # Startup script (NEW)
├── package.json             # Updated with new scripts
├── public/                  # NEW folder
│   └── index.html          # Web interface
├── events.json              # Event storage (auto-generated)
├── presets.json             # Game templates (existing)
├── .env                     # Your configuration
├── .env.example             # Updated template
└── (all other files)
```

---

## 🔧 Troubleshooting

### Error: "Cannot find module 'express'"

**Solution:**
```bash
npm install express cors
```

### Error: "Port 3000 already in use"

**Solution 1 - Use different port:**

Edit `.env`:
```env
WEB_PORT=8080
```

**Solution 2 - Kill process on port 3000:**

Windows PowerShell:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

Windows Command Prompt:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "ENOENT: no such file or directory, open 'public/index.html'"

**Solution:**

Make sure you:
1. Created the `public` folder
2. Put `index.html` inside it
3. File is named exactly `index.html`

### Web page shows blank

**Check:**
1. Is the server running? Look for: `🌐 Web interface running on http://localhost:3000`
2. Open browser console (F12) and check for errors
3. Try: `http://localhost:3000/index.html`
4. Make sure `public/index.html` exists

### Bot starts but web server doesn't

**Check:**
1. Did you create `web-server.js`?
2. Is it in the same folder as `bot.js`?
3. Check console for error messages

---

## ✨ Features Explained

### Events Tab
- **View All Events**: See every event in a card-based layout
- **Event Details**: Title, description, date/time, duration, participant count
- **Role Display**: Visual badges showing roles and signup counts
- **Delete Button**: Remove events instantly
- **Calendar Sync**: See which events are synced to Google Calendar
- **Past Events**: Grayed out for easy identification

### Presets Tab
- **Browse Templates**: See all 18+ game presets
- **Quick Create**: Click any preset to create an event
- **Preset Details**: See roles, duration, and participant limits
- **Visual Cards**: Easy-to-scan preset information

### Create Event Tab
- **Custom Events**: Build events from scratch
- **Visual Form**: Easy-to-use form with date/time picker
- **Role Builder**: Add unlimited roles with emojis
- **Validation**: Automatic error checking
- **Success Feedback**: Clear confirmation when event is created

---

## 🚀 Using the Web Interface

### Create an Event from Preset

1. Click the **"Presets"** tab
2. Click on any game (e.g., "Overwatch")
3. Select date and time
4. Add custom description (optional)
5. Click **"Create Event"**

✅ Event instantly appears in Discord!

### Create a Custom Event

1. Click the **"Create Event"** tab
2. Fill in:
   - Event Title (e.g., "Raid Night")
   - Description
   - Date & Time (use the picker)
   - Duration in minutes
   - Max participants (0 = unlimited)
3. Add roles:
   - Emoji (e.g., ⚔️)
   - Role name (e.g., "Tank")
   - Max slots
   - Click "+" to add more roles
4. Click **"Create Event"**

### Delete an Event

1. Go to **"Events"** tab
2. Find the event you want to delete
3. Click the **"Delete"** button
4. Confirm the deletion

✅ Event removed from both web and Discord!

---

## 🔄 How It Works

### Data Synchronization

```
Web Interface  ←→  events.json  ←→  Discord Bot
```

**Both share the same file:**
- Events created in web appear instantly in `events.json`
- Bot reads from `events.json` when needed
- Changes are immediately visible to both

**What syncs:**
- ✅ Event creation
- ✅ Event deletion
- ✅ Event details
- ✅ Role configuration

**What doesn't sync automatically:**
- ❌ Discord message updates (bot handles this)
- ❌ Button interactions (Discord only)
- ❌ User signups (Discord only)

### Workflow Example

**Creating an Event:**
1. You fill out form in web interface
2. Web server saves to `events.json`
3. Success message appears
4. Next time bot runs `!list`, it sees the new event

**Viewing Events:**
1. Web server reads `events.json`
2. Displays all events with statistics
3. Shows signup counts, roles, etc.

---

## 🌐 Accessing from Other Devices

### On Your Local Network

1. Find your computer's IP address:

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" (e.g., 192.168.1.100)

2. From another device on the same network, visit:
```
http://192.168.1.100:3000
```
(Replace with your actual IP)

### Security Warning

⚠️ **This setup has NO authentication!**

**Safe for:**
- Local development
- Trusted home network
- Personal use only

**NOT safe for:**
- Public internet
- Untrusted networks
- Production use

**To secure it, you'd need to add:**
- Password authentication
- HTTPS/SSL
- Firewall rules

---

## 📊 API Reference

The web server provides a REST API you can use:

### Get All Events
```
GET http://localhost:3000/api/events
```

### Get Single Event
```
GET http://localhost:3000/api/events/event_123
```

### Create Event
```
POST http://localhost:3000/api/events
Content-Type: application/json

{
  "title": "Raid Night",
  "description": "Weekly raid",
  "dateTime": "2026-02-15T20:00:00Z",
  "duration": 120,
  "maxParticipants": 10,
  "roles": [
    { "name": "Tank", "emoji": "🛡️", "maxSlots": 2 }
  ]
}
```

### Delete Event
```
DELETE http://localhost:3000/api/events/event_123
```

### Get Statistics
```
GET http://localhost:3000/api/stats
```

### Get Presets
```
GET http://localhost:3000/api/presets
```

---

## 🎨 Customization

### Change Port

Edit `.env`:
```env
WEB_PORT=8080
```

### Change Theme Colors

Edit `public/index.html` CSS variables:
```css
:root {
    --discord-bg: #36393f;        /* Main background */
    --discord-sidebar: #2f3136;   /* Card background */
    --discord-blurple: #5865F2;   /* Primary color */
    --discord-green: #3ba55d;     /* Success color */
    --discord-red: #ed4245;       /* Danger color */
}
```

---

## 📱 Mobile Support

The web interface is fully responsive:
- ✅ Works on phones
- ✅ Works on tablets
- ✅ Touch-friendly buttons
- ✅ Adaptive layout

**Best experience:**
- Chrome/Safari on iOS
- Chrome on Android
- Use landscape mode for more space

---

## 🆘 Still Having Issues?

### Check the Basics

1. ✅ Node.js installed (v16+)
2. ✅ `npm install` completed
3. ✅ `public` folder exists
4. ✅ `index.html` is inside `public` folder
5. ✅ `web-server.js` is in root folder
6. ✅ `.env` file has `WEB_PORT=3000`

### Test Each Part

**Test 1 - Bot Only:**
```bash
npm start
```
Should see: `✅ [Bot Name] is online!`

**Test 2 - Web Only:**
```bash
npm run web
```
Should see: `🌐 Web interface running on http://localhost:3000`

**Test 3 - Both Together:**
```bash
npm run start:all
```
Should see both messages

### Fresh Start

If nothing works:

```bash
# Delete node_modules
rm -rf node_modules

# Delete package-lock.json
rm package-lock.json

# Reinstall everything
npm install

# Try again
npm run start:all
```

---

## ✅ Success Checklist

When everything is working, you should see:

**Terminal Output:**
```
🚀 Starting Discord Event Bot with Web Interface...

📡 Starting Discord bot...
🌐 Starting web server...

✅ Both servers started!
📡 Discord bot: Running
🌐 Web interface: http://localhost:3000

💡 Press Ctrl+C to stop both servers

✅ [Bot Name] is online!
🔗 Google Calendar: Connected (or Not configured)
📋 Loaded 18 event presets
🌐 Web interface running on http://localhost:3000
📊 API available at http://localhost:3000/api
```

**Browser (http://localhost:3000):**
- Discord-themed dashboard loads
- Statistics show correct counts
- Can navigate between tabs
- No errors in console (F12)

**Functionality:**
- Can create events from presets
- Can create custom events
- Can delete events
- Events appear in `events.json`
- Can view all events

---

## 🎉 You're Done!

Now you have a fully functional web interface for managing your Discord events!

**Next steps:**
- Try creating an event from the web
- Check that it appears in `events.json`
- Use Discord bot commands to verify
- Explore the different tabs

**Need more help?**
- Check `TROUBLESHOOTING.md`
- Review `WEB_INTERFACE_GUIDE.md`
- Check `WEB_ARCHITECTURE.md` for technical details

Happy event managing! 🎮
