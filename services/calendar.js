// src/services/calendar.js - FIXED VERSION
// This version properly handles relative credential paths

const { google } = require('googleapis');
const ical = require('node-ical');
const path = require('path');

class CalendarService {
  constructor(credentialsPath, calendars = []) {
    this.calendars = calendars;
    this.events = [];
    
    if (credentialsPath) {
      try {
        // ✅ FIX: Resolve path relative to project root (where bot runs from)
        const fullPath = path.resolve(process.cwd(), credentialsPath);
        
        // ✅ FIX: Use keyFilename so Google Auth reads the file
        this.auth = new google.auth.GoogleAuth({
          keyFilename: fullPath,  // Google Auth will read and parse the file
          scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        });
        
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        console.log(`[Calendar] ✅ Google Calendar API initialized with credentials from: ${credentialsPath}`);
      } catch (error) {
        console.error('[Calendar] Failed to initialize Google Calendar:', error.message);
        this.calendar = null;
      }
    } else {
      console.log('[Calendar] Google Calendar not configured');
      this.calendar = null;
    }
  }

  isEnabled() {
    return this.calendars.length > 0;
  }

  async testConnection() {
    if (!this.isEnabled()) {
      console.log('[Calendar] No calendars configured');
      return false;
    }

    let allSuccess = true;

    for (const calendar of this.calendars) {
      try {
        if (calendar.id.startsWith('http')) {
          // Test iCal URL
          const response = await fetch(calendar.id);
          if (!response.ok) {
            console.log(`[Calendar] ❌ Failed to connect to iCal: ${calendar.name}`);
            allSuccess = false;
          } else {
            console.log(`[Calendar] ✅ Connected to iCal: ${calendar.name}`);
          }
        } else if (this.calendar) {
          // Test Google Calendar
          await this.calendar.events.list({
            calendarId: calendar.id,
            maxResults: 1,
            singleEvents: true,
            orderBy: 'startTime',
          });
          console.log(`[Calendar] ✅ Connected to Google Calendar: ${calendar.name}`);
        } else {
          console.log(`[Calendar] ⚠️  Skipping ${calendar.name} - no API credentials`);
        }
      } catch (error) {
        console.log(`[Calendar] ❌ Failed to connect to ${calendar.name}:`, error.message);
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  async syncEvents(hoursAhead = 168, calendarFilter = null) {
    console.log(`[Sync] Syncing from ${this.calendars.length} calendar(s): ${this.calendars.map(c => c.name).join(', ')}`);
    
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000).toISOString();
    
    this.events = [];
    const calendarsToSync = calendarFilter 
      ? this.calendars.filter(cal => cal.name === calendarFilter)
      : this.calendars;

    for (const calendar of calendarsToSync) {
      try {
        console.log(`[Sync] Fetching events from "${calendar.name}" (${calendar.id})`);
        
        if (calendar.id.startsWith('http')) {
          // iCal URL
          await this.fetchICalEvents(calendar, timeMin, timeMax);
        } else if (this.calendar) {
          // Google Calendar
          await this.fetchGoogleCalendarEvents(calendar, timeMin, timeMax);
        } else {
          console.log(`[Sync] Skipping Google Calendar "${calendar.name}" - no API credentials`);
        }
      } catch (error) {
        console.error(`[Sync] Error fetching from ${calendar.name}:`, error.message);
      }
    }

    return {
      success: true,
      events: this.events,
      message: `Found ${this.events.length} events from ${calendarsToSync.length} calendar(s)`,
      calendars: calendarsToSync.map(c => c.name)
    };
  }

  async fetchGoogleCalendarEvents(calendar, timeMin, timeMax) {
    if (!this.calendar) {
      console.log('[Sync] Google Calendar API not initialized');
      return;
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: calendar.id,
        timeMin,
        timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      console.log(`[Sync] Found ${events.length} events in "${calendar.name}"`);

      for (const event of events) {
        // Skip all-day events (no specific time)
        if (!event.start.dateTime) {
          continue;
        }

        const duration = this.calculateDuration(event.start.dateTime, event.end.dateTime);
        
        this.events.push({
          calendarEvent: event,
          calendarSource: calendar.name,
          calendarSourceId: `${calendar.id}::${event.id}`,
          duration
        });
      }
    } catch (error) {
      console.error(`[Sync] Error fetching Google Calendar events from ${calendar.name}:`, error.message);
      throw error;
    }
  }

  async fetchICalEvents(calendar, timeMin, timeMax) {
    try {
      console.log(`[Calendar] Fetching iCal from: ${calendar.id}`);
      const response = await fetch(calendar.id);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const icalData = await response.text();
      const events = await ical.async.parseICS(icalData);
      
      const timeMinDate = new Date(timeMin);
      const timeMaxDate = new Date(timeMax);
      let count = 0;

      for (const event of Object.values(events)) {
        if (event.type !== 'VEVENT') continue;

        const startDate = new Date(event.start);
        
        // Skip all-day events
        if (!event.start.dateTime && event.start.date) {
          continue;
        }

        // Only include events in time range
        if (startDate >= timeMinDate && startDate <= timeMaxDate) {
          const endDate = new Date(event.end);
          const duration = this.calculateDuration(event.start, event.end);

          this.events.push({
            calendarEvent: {
              id: event.uid,
              summary: event.summary,
              description: event.description || '',
              start: { dateTime: event.start.toISOString() },
              end: { dateTime: event.end.toISOString() },
              htmlLink: calendar.id
            },
            calendarSource: calendar.name,
            calendarSourceId: `${calendar.id}::${event.uid}`,
            duration
          });
          count++;
        }
      }

      console.log(`[Calendar] Fetched ${count} events from iCal`);
    } catch (error) {
      console.error(`[Calendar] Error fetching iCal from ${calendar.name}:`, error.message);
      throw error;
    }
  }

  calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60));
  }
}

module.exports = CalendarService;
