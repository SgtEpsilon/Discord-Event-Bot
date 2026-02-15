# Google Calendar Setup Guide (Web UI)

## Overview
All Google Calendar configuration is now managed through the web interface. No need to edit `.env` files!

## Prerequisites
1. Google Cloud Project with Calendar API enabled
2. Service account with JSON credentials file
3. Calendars shared with the service account

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**

### 2. Create Service Account
1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Give it a name (e.g., "Discord Event Bot")
4. Grant **Editor** role (or Calendar-specific permissions)
5. Click **Create Key** and download the JSON file

### 3. Configure Bot
1. Save the downloaded JSON file as `data/calendar-credentials.json`
2. Make sure `.env` has this line:
   ```
   GOOGLE_CALENDAR_CREDENTIALS=./data/calendar-credentials.json
   ```
3. Restart both the Discord bot and web server

### 4. Share Your Calendars
1. Open [Google Calendar](https://calendar.google.com)
2. Go to your calendar's **Settings**
3. Click **Share with specific people**
4. Add the service account email (found in the JSON file, looks like: `name@project-id.iam.gserviceaccount.com`)
5. Grant **Make changes to events** permission
6. Repeat for each calendar you want to use

### 5. Add Calendars via Web UI
1. Open the web interface: `http://localhost:3000`
2. Login with your credentials
3. Click the **Settings icon (⚙️)** in the sidebar
4. Navigate to **Google Calendar** tab
5. You have two options:

   **Option A: Browse Your Calendars**
   - Click **Browse My Google Calendars**
   - Select calendars from the list
   - Click **Add This Calendar** for each one

   **Option B: Add Manually**
   - Click **Add Manually**
   - Enter a friendly name (e.g., "Guild Events")
   - Enter the Calendar ID (found in calendar settings)
   - Click **Add Calendar**

### 6. Use Calendars in Events
1. When creating events (via **Create Event** or **From Preset**):
   - Check **Add to Google Calendar**
   - Select which calendar to add it to
   - The event will sync automatically!

## Troubleshooting

### "Google Calendar Not Configured" Error
- Check that `data/calendar-credentials.json` exists
- Verify the file path in `.env` is correct
- Restart the web server

### "Failed to fetch available calendars"
- Ensure calendars are shared with the service account email
- Check that the service account has "Make changes to events" permission
- Verify the Calendar API is enabled in Google Cloud

### Calendar not appearing in browse list
- The calendar must be shared with the service account
- Wait a few minutes after sharing (caching)
- Try adding manually using the Calendar ID

## Finding Calendar ID
1. Open Google Calendar
2. Click the three dots next to your calendar
3. Select **Settings and sharing**
4. Scroll to **Integrate calendar**
5. Copy the **Calendar ID** (looks like: `abc123@group.calendar.google.com`)

## Features
- ✅ Add unlimited calendars
- ✅ Edit calendar names and IDs
- ✅ Remove calendars you no longer need
- ✅ Events automatically sync to selected calendar
- ✅ View calendar link directly from Discord events
- ✅ No .env editing required!

## Migration from .env Configuration
If you previously configured calendars in `.env` (using `CALENDAR_IDS`), you can now:
1. Add them via the web UI instead
2. Remove the `CALENDAR_IDS` line from `.env`
3. Keep only `GOOGLE_CALENDAR_CREDENTIALS=./data/calendar-credentials.json`

The web UI provides much more flexibility and easier management!
