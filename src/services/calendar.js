// src/services/calendar.js
const { google } = require('googleapis');

class CalendarService {
  constructor(credentials, calendars) {
    this.calendars = calendars;
    this.calendar = null;
    
    if (credentials) {
      try {
        // Handle both string and object credentials
        const parsedCredentials = typeof credentials === 'string' 
          ? JSON.parse(credentials) 
          : credentials;
        
        const auth = new google.auth.GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        
        this.calendar = google.calendar({ version: 'v3', auth });
        console.log(`📅 Configured ${calendars.length} calendar(s): ${calendars.map(c => c.name).join(', ')}`);
      } catch (error) {
        console.error('Failed to initialize Google Calendar:', error.message);
      }
    }
  }

  /**
   * Check if calendar service is enabled
   */
  isEnabled() {
    return this.calendar !== null;
  }

  /**
   * Test connection to all configured calendars
   */
  async testConnection() {
    if (!this.isEnabled()) {
      console.log('[Calendar] Google Calendar not configured');
      return false;
    }
    
    console.log(`[Calendar] Testing connection to ${this.calendars.length} calendar(s)...`);
    
    let allSuccessful = true;
    for (const cal of this.calendars) {
      try {
        console.log(`[Calendar] Testing "${cal.name}" (${cal.id})`);
        await this.calendar.calendars.get({ calendarId: cal.id });
        console.log(`[Calendar] ✅ "${cal.name}" - Successfully connected`);
      } catch (error) {
        console.error(`[Calendar] ❌ "${cal.name}" - Failed: ${error.message}`);
        allSuccessful = false;
      }
    }
    
    return allSuccessful;
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(event) {
    if (!this.isEnabled() || this.calendars.length === 0) return null;
    
    try {
      // Validate event.dateTime upfront
      const startDate = new Date(event.dateTime);
      if (isNaN(startDate.getTime())) {
        console.error(`[Calendar] ❌ Invalid event.dateTime for "${event.title}": ${event.dateTime}`);
        throw new TypeError(`Invalid event.dateTime: ${event.dateTime}`);
      }
      
      const endTime = new Date(startDate.getTime() + (event.duration || 60) * 60000);
      
      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      };
      
      const targetCalendar = this.calendars[0];
      console.log(`[Calendar] Creating event "${event.title}" in calendar: ${targetCalendar.name}`);
      
      const response = await this.calendar.events.insert({
        calendarId: targetCalendar.id,
        resource: calendarEvent,
      });
      
      console.log(`[Calendar] ✅ Event created successfully`);
      return response.data.htmlLink;
    } catch (error) {
      console.error('[Calendar] ❌ Error creating event:', error.message);
      return null;
    }
  }

  /**
   * Sync events from Google Calendar
   */
  async syncEvents(hoursAhead = 168, calendarFilter = null) {
    if (!this.isEnabled()) {
      return {
        success: false,
        message: 'Google Calendar not configured',
        events: []
      };
    }
    
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      const importedEvents = [];
      
      let calendarsToSync = this.calendars;
      if (calendarFilter) {
        calendarsToSync = this.calendars.filter(cal => 
          cal.name.toLowerCase().includes(calendarFilter.toLowerCase()) ||
          cal.id.toLowerCase().includes(calendarFilter.toLowerCase())
        );
        
        if (calendarsToSync.length === 0) {
          return {
            success: false,
            message: `No calendar found matching "${calendarFilter}"`,
            events: []
          };
        }
      }
      
      console.log(`[Sync] Syncing from ${calendarsToSync.length} calendar(s): ${calendarsToSync.map(c => c.name).join(', ')}`);
      
      for (const cal of calendarsToSync) {
        console.log(`[Sync] Fetching events from "${cal.name}" (${cal.id})`);
        
        try {
          const response = await this.calendar.events.list({
            calendarId: cal.id,
            timeMin: now.toISOString(),
            timeMax: futureDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          });
          
          const calendarEvents = response.data.items || [];
          console.log(`[Sync] Found ${calendarEvents.length} events in "${cal.name}"`);
          
          for (const calEvent of calendarEvents) {
            if (!calEvent.start || !calEvent.start.dateTime) {
              console.log(`[Sync] Skipping all-day event: ${calEvent.summary}`);
              continue;
            }
            
            const startTime = new Date(calEvent.start.dateTime);
            const endTime = new Date(calEvent.end.dateTime);
            const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);
            
            importedEvents.push({
              calendarEvent: calEvent,
              calendarSource: cal.name,
              calendarSourceId: cal.id + '_' + calEvent.id,
              duration: durationMinutes
            });
          }
        } catch (error) {
          console.error(`[Sync] Error fetching from "${cal.name}": ${error.message}`);
        }
      }
      
      const calendarNames = calendarsToSync.length === 1
        ? calendarsToSync[0].name
        : `${calendarsToSync.length} calendars`;
      
      return {
        success: true,
        message: `Found ${importedEvents.length} events from ${calendarNames}`,
        events: importedEvents,
        calendars: calendarsToSync.map(c => c.name)
      };
    } catch (error) {
      console.error('[Sync] ❌ Error syncing from Google Calendar:', error.message);
      return {
        success: false,
        message: `Failed to sync: ${error.message}`,
        events: []
      };
    }
  }

  /**
   * Get list of configured calendars
   */
  getCalendars() {
    return this.calendars;
  }
}

module.exports = CalendarService;