# Google Calendar API Setup Guide

## 🎯 What You Need

To use Google Calendar API instead of iCal URLs, you need:
1. A Google Cloud Project
2. Calendar API enabled
3. A service account with credentials
4. Your calendar shared with the service account

---

## 📋 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Discord Event Bot`
4. Click **Create**

### Step 2: Enable Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "**Google Calendar API**"
3. Click on it
4. Click **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Enter:
   - **Name**: `discord-bot-calendar`
   - **Description**: `Service account for Discord bot calendar sync`
4. Click **Create and Continue**
5. **Skip** the optional steps (Grant access, Grant users access)
6. Click **Done**

### Step 4: Create Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. A JSON file will download - **save this file**

### Step 5: Save Credentials File

1. **Rename** the downloaded file to: `calendar-credentials.json`
2. **Move** it to your bot's `data` folder:
   ```
   Discord-Event-Bot/
   └── data/
       └── calendar-credentials.json  ← Put it here
   ```

The file should look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "discord-bot-calendar@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 6: Share Calendar with Service Account

**This is the most important step!**

1. Copy the **client_email** from your `calendar-credentials.json`
   - It looks like: `discord-bot-calendar@your-project.iam.gserviceaccount.com`

2. Go to [Google Calendar](https://calendar.google.com)

3. Find your calendar in the left sidebar

4. Click the **three dots** next to it → **Settings and sharing**

5. Scroll to "**Share with specific people or groups**"

6. Click **Add people and groups**

7. **Paste the service account email** you copied

8. Set permission: **"See all event details"**

9. Click **Send**

### Step 7: Get Calendar ID

1. Still in Calendar Settings, scroll to "**Integrate calendar**"

2. Copy the **Calendar ID**
   - It looks like: `yourname@gmail.com` or `abc123...@group.calendar.google.com`

3. **Save this** - you'll need it for the bot

### Step 8: Configure in Bot

1. Go to `http://localhost:3000`

2. Navigate to **Google Calendar** tab

3. Delete old calendar if it exists

4. Click **Add Calendar**

5. **Paste the Calendar ID** (from Step 7)

6. Give it a name

7. Click **Save**

### Step 9: Restart Bot

```bash
pm2 restart discord-event-bot
```

### Step 10: Test

```bash
npm run calendar:test
```

You should now see:
```
✅ Connection successful
Result: ✅ Calendar sync successful
Events found: X
```

---

## 🔍 Troubleshooting

### "No API credentials" error

**Check:**
```bash
# File exists?
ls -la data/calendar-credentials.json

# Valid JSON?
cat data/calendar-credentials.json | jq .type
# Should output: "service_account"
```

**Fix:**
- Ensure file is in `data/` folder
- Ensure it's valid JSON
- Ensure it's a service account key (not OAuth credentials)

### "Permission denied" or "Not found" error

**Problem:** Calendar not shared with service account

**Fix:**
1. Copy the `client_email` from `calendar-credentials.json`
2. Share your calendar with this email
3. Give it "See all event details" permission

### "Calendar ID is wrong"

**Fix:**
1. Go to Calendar Settings
2. Copy the **Calendar ID** from "Integrate calendar" section
3. Use this exact ID in the bot

---

## 📊 Verify Setup

Run these checks:

```bash
# 1. Credentials file exists
ls data/calendar-credentials.json

# 2. It's a service account
cat data/calendar-credentials.json | grep "service_account"

# 3. Get service account email
cat data/calendar-credentials.json | grep "client_email"

# 4. Test connection
npm run calendar:test
```

---

## ⚖️ iCal URL vs Google Calendar API

### Use iCal URL if:
- ✅ You want simplicity
- ✅ You don't need real-time updates
- ✅ You're okay with public calendar URLs

### Use Google Calendar API if:
- ✅ You need more control
- ✅ You want faster sync
- ✅ You have multiple calendars to manage
- ✅ You're comfortable with Google Cloud setup

---

## 🆘 Still Having Issues?

1. **Verify credentials file:**
   ```bash
   cat data/calendar-credentials.json | jq .
   ```

2. **Check bot logs:**
   ```bash
   pm2 logs discord-event-bot | grep Calendar
   ```

3. **Run test:**
   ```bash
   npm run calendar:test
   ```

4. **Common mistakes:**
   - ❌ Using OAuth credentials instead of service account
   - ❌ Not sharing calendar with service account email
   - ❌ Wrong calendar ID
   - ❌ Credentials file in wrong location

---

**Remember:** iCal URL is much easier if you don't specifically need API features!
