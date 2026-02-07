# Custom Preset Creation Guide

The web interface now supports creating, managing, and deleting custom presets!

## 📋 Overview

**What are Custom Presets?**
Custom presets are reusable event templates you create for games or activities not included in the default presets. Once created, they work exactly like built-in presets.

**Why Create Custom Presets?**
- Save time when creating recurring events
- Standardize event formats for your community
- Share consistent role structures
- Reduce manual setup for common activities

---

## 🎨 Creating a Custom Preset

### Step 1: Navigate to Create Preset Tab

1. Open the web interface: `http://localhost:3000`
2. Click the **"🎨 Create Preset"** tab

### Step 2: Fill in Preset Details

#### Preset ID (Required)
- **What:** A unique identifier for commands
- **Format:** Lowercase letters, numbers, and hyphens only
- **Example:** `my-game`, `lethal-company`, `hunt-showdown`
- **Used in:** `!preset my-game 15-02-2026 20:00`

**Tips:**
- Keep it short and memorable
- Use hyphens for multiple words
- Make it descriptive

**Good Examples:**
- ✅ `lethal-company`
- ✅ `palworld`
- ✅ `deep-rock`

**Bad Examples:**
- ❌ `Lethal Company` (has spaces/capitals)
- ❌ `my_game` (uses underscores)
- ❌ `game!` (has special characters)

#### Display Name (Required)
- **What:** The name shown in Discord event embeds
- **Example:** "Lethal Company", "Hunt: Showdown", "Deep Rock Galactic"
- **Can include:** Any characters, capitals, spaces

#### Description (Optional)
- Default description for events created with this preset
- Users can override when creating events
- **Example:** "Collect scrap and meet quota"

#### Duration (Required)
- Default event length in minutes
- **Example:** `90` (1.5 hours), `120` (2 hours)
- Users can't change this when using preset (it's fixed)

#### Max Participants (Optional)
- Maximum number of players
- **Set to 0** for unlimited
- **Example:** `4` for a 4-player game, `0` for open lobbies

### Step 3: Add Roles

Roles define the signup categories for your event.

**For each role:**

1. **Emoji** - Visual icon (e.g., ⚔️, 🛡️, 👷)
   - Find emojis: https://emojipedia.org/
   - Copy and paste into field
   
2. **Role Name** - What the role is called (e.g., "Tank", "Employee", "Scout")

3. **Max Slots** - How many people can sign up
   - Set to `0` or leave blank for unlimited
   - Example: `2` for "2 Tanks max"

**Add more roles:**
- Click **"+ Add Role"** to add another
- Click **"✕"** to remove a role

### Step 4: Create the Preset

Click **"Create Preset"**

✅ Success! Your preset is now available for use.

---

## 🎮 Example: Creating "Lethal Company" Preset

Let's create a preset for Lethal Company:

### Form Values:
```
Preset ID: lethal-company
Display Name: Lethal Company
Description: Meet the quota or die trying
Duration: 90
Max Participants: 4

Roles:
  👷 Employee - Max Slots: 4
```

### Result:
You can now use this preset in Discord:
```
!preset lethal-company 15-02-2026 20:00
```

Creates event:
```
🎮 Lethal Company
Meet the quota or die trying

📅 Date & Time: Feb 15, 2026 8:00 PM
⏱️ Duration: 90 minutes
👥 Max Participants: 4

👷 Employee (0/4)
None yet
```

---

## 📝 More Examples

### Example 1: Hunt: Showdown
```
Preset ID: hunt-showdown
Display Name: Hunt: Showdown
Description: Bounty hunt in the bayou
Duration: 120
Max Participants: 3

Roles:
  🎯 Hunter - Max Slots: 3
```

### Example 2: Deep Rock Galactic
```
Preset ID: deep-rock
Display Name: Deep Rock Galactic
Description: Rock and stone!
Duration: 90
Max Participants: 4

Roles:
  ⛏️ Driller - Max Slots: 1
  🔫 Gunner - Max Slots: 1
  🔧 Engineer - Max Slots: 1
  🪨 Scout - Max Slots: 1
```

### Example 3: Palworld
```
Preset ID: palworld
Display Name: Palworld
Description: Catch and train Pals
Duration: 120
Max Participants: 0

Roles:
  🎮 Player - Max Slots: 0 (unlimited)
```

### Example 4: Study Group
```
Preset ID: study-group
Display Name: Study Session
Description: Group study session
Duration: 120
Max Participants: 8

Roles:
  📖 Participant - Max Slots: 8
```

---

## 🔧 Managing Existing Presets

### View Your Presets

Scroll down on the "Create Preset" tab to see **"Manage Existing Presets"**

**Each preset shows:**
- Display name
- Preset ID
- Description
- Duration and max participants
- All configured roles
- Delete button

### Delete a Preset

1. Find the preset in the management section
2. Click **"Delete"**
3. Confirm deletion

**Important:**
- ⚠️ Deletion cannot be undone
- ✅ Events already created with this preset are NOT affected
- ✅ Only the template is removed

---

## 🚀 Using Your Custom Presets

### In Discord

Once created, use them like any other preset:

```
!preset lethal-company 15-02-2026 20:00
!preset hunt-showdown 16-02-2026 21:00 Trio bounty hunt
!preset deep-rock 17-02-2026 19:00 Elite Deep Dive
```

### In Web Interface

1. Go to **"📋 Presets"** tab
2. Your custom presets appear alongside default ones
3. Click any preset to create an event

---

## 📊 Preset vs Event: What's the Difference?

**Presets:**
- Templates for events
- Reusable
- Define default settings
- Saved in `presets.json`

**Events:**
- Actual scheduled activities
- One-time or recurring (you create multiple)
- Created from presets or custom
- Saved in `events.json`

**Workflow:**
```
Create Preset → Use Preset → Create Event → Users Sign Up
   (once)      (many times)    (scheduled)    (in Discord)
```

---

## 🎯 Best Practices

### Naming Presets

✅ **DO:**
- Use descriptive preset IDs
- Keep IDs short and memorable
- Use consistent naming conventions
- Make display names clear

❌ **DON'T:**
- Use generic names like `game1`
- Make IDs too long
- Use confusing abbreviations
- Duplicate existing preset names

### Configuring Roles

✅ **DO:**
- Match game requirements exactly
- Use relevant emojis
- Set accurate slot limits
- Keep role names consistent

❌ **DON'T:**
- Create too many roles (keep it simple)
- Use misleading role names
- Set incorrect slot limits
- Forget to add any roles

### Duration Settings

**Common Durations:**
- 60 min - Quick matches (Among Us, quick games)
- 90 min - Standard sessions (most FPS, survival)
- 120 min - Extended play (raids, long sessions)
- 180+ min - Marathon events (MMO raids, D&D)

---

## 🔄 Preset File Location

Custom presets are saved to:
```
Discord-Event-Bot/presets.json
```

**This file contains:**
- All default presets (overwatch, helldivers, etc.)
- Your custom presets

**⚠️ Important:**
- Editing `presets.json` directly works but requires bot restart
- Web interface updates are instant
- Backup this file before major changes

---

## 🛠️ Troubleshooting

### Error: "Preset already exists"

**Cause:** A preset with that ID already exists

**Solution:**
- Use a different preset ID
- Or delete the existing preset first

### Error: "Key must be lowercase letters, numbers, and hyphens only"

**Cause:** Invalid characters in preset ID

**Solution:**
- Remove spaces, capitals, underscores, special characters
- Example: Change `My_Game!` to `my-game`

### Preset doesn't appear in Discord

**Cause:** Bot hasn't reloaded presets

**Solution:**
- Restart the Discord bot
- Or wait - web changes are instant, but bot loads on startup

### Can't delete preset

**Cause:** File permission issues

**Solution:**
- Check file permissions on `presets.json`
- Ensure web server can write to the file

---

## 🎨 Advanced: Editing presets.json Directly

If you prefer, you can edit `presets.json` manually:

```json
{
  "lethal-company": {
    "name": "Lethal Company",
    "description": "Meet the quota or die trying",
    "duration": 90,
    "maxParticipants": 4,
    "roles": [
      { "name": "Employee", "emoji": "👷", "maxSlots": 4 }
    ]
  }
}
```

**After editing:**
```bash
# Restart the bot to load changes
npm start
```

---

## 📋 Quick Reference

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| Preset ID | Yes | lowercase-with-hyphens | `my-game` |
| Display Name | Yes | Any text | `My Awesome Game` |
| Description | No | Any text | `Default description` |
| Duration | Yes | Number (minutes) | `90` |
| Max Participants | No | Number (0 = unlimited) | `4` |
| Role Emoji | No | Single emoji | `⚔️` |
| Role Name | Yes | Any text | `Tank` |
| Role Max Slots | No | Number (0 = unlimited) | `2` |

---

## ✅ Success Checklist

Your preset is working when:

- [ ] Created without errors
- [ ] Appears in "Manage Existing Presets" section
- [ ] Visible in "📋 Presets" tab
- [ ] Can create events from it in web interface
- [ ] Works with Discord `!preset` command
- [ ] Roles appear correctly in events

---

## 🎉 You're Done!

You can now create unlimited custom presets for any game or activity!

**What's Next?**
- Create presets for your favorite games
- Share preset IDs with your community
- Use presets to quickly schedule events
- Delete old presets you no longer need

Happy gaming! 🎮
