// src/services/calendar.js
const { google } = require('googleapis');
const axios = require('axios');
const ical = require('node-ical');

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
        
        // Check if it's an iCal URL
        if (cal.id.startsWith('http://') || cal.id.startsWith('https://')) {
          const response = await axios.head(cal.id, { timeout: 5000 });
          if (response.status === 200) {
            console.log(`[Calendar] ✅ "${cal.name}" - iCal URL accessible`);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } else {
          // Google Calendar ID
          await this.calendar.calendars.get({ calendarId: cal.id });
          console.log(`[Calendar] ✅ "${cal.name}" - Successfully connected`);
        }
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
    
    // Only create in actual Google Calendar, not iCal URLs
    const googleCalendars = this.calendars.filter(cal => 
      !cal.id.startsWith('http://') && !cal.id.startsWith('https://')
    );
    
    if (googleCalendars.length === 0) {
      console.log('[Calendar] No writable Google Calendars configured (only iCal URLs)');
      return null;
    }
    
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
      
      const targetCalendar = googleCalendars[0];
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
   * Fetch events from iCal URL
   */
  async fetchICalEvents(icalUrl, hoursAhead = 168) {
    try {
      console.log(`[Calendar] Fetching iCal from: ${icalUrl}`);
      
      const response = await axios.get(icalUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Discord-Event-Bot/1.0'
        }
      });
      
      const events = await ical.async.parseICS(response.data);
      const now = new Date();
      const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      const importedEvents = [];
      
      for (const event of Object.values(events)) {
        if (event.type !== 'VEVENT') continue;
        
        // Handle both single events and recurring events
        const startDate = event.start ? new Date(event.start) : null;
        const endDate = event.end ? new Date(event.end) : null;
        
        if (!startDate || !endDate) {
          console.log(`[Calendar] Skipping event without dates: ${event.summary || 'Unknown'}`);
          continue;
        }
        
        // Only include future events
        if (startDate < now || startDate > futureDate) {
          continue;
        }
        
        const durationMinutes = Math.round((endDate - startDate) / 1000 / 60);
        
        importedEvents.push({
          calendarEvent: {
            id: event.uid || `ical_${Date.now()}_${Math.random()}`,
            summary: event.summary || 'Untitled Event',
            description: event.description || '',
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
            htmlLink: event.url || icalUrl,
            location: event.location || ''
          },
          duration: durationMinutes
        });
      }
      
      console.log(`[Calendar] Fetched ${importedEvents.length} events from iCal`);
      return importedEvents;
      
    } catch (error) {
      console.error(`[Calendar] Error fetching iCal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync events from Google Calendar (including iCal URLs)
   */
  async syncEvents(hoursAhead = 168, calendarFilter = null) {
    if (!this.isEnabled() && this.calendars.every(cal => !cal.id.startsWith('http'))) {
      return {
        success: false,
        message: 'No calendars configured',
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
          let calendarEvents = [];
          
          // Check if it's an iCal URL
          if (cal.id.startsWith('http://') || cal.id.startsWith('https://')) {
            // Fetch from iCal URL
            const icalEvents = await this.fetchICalEvents(cal.id, hoursAhead);
            calendarEvents = icalEvents.map(e => ({
              ...e.calendarEvent,
              duration: e.duration
            }));
          } else {
            // Fetch from Google Calendar API
            if (!this.calendar) {
              console.log(`[Sync] Skipping Google Calendar "${cal.name}" - no API credentials`);
              continue;
            }
            
            const response = await this.calendar.events.list({
              calendarId: cal.id,
              timeMin: now.toISOString(),
              timeMax: futureDate.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
            });
            
            calendarEvents = response.data.items || [];
          }
          
          console.log(`[Sync] Found ${calendarEvents.length} events in "${cal.name}"`);
          
          for (const calEvent of calendarEvents) {
            // Guard both start and end dateTime to prevent runtime errors
            if (!calEvent.start || !calEvent.start.dateTime) {
              console.log(`[Sync] Skipping all-day event (missing start): ${calEvent.summary || 'Unknown'}`);
              continue;
            }
            
            if (!calEvent.end || !calEvent.end.dateTime) {
              console.log(`[Sync] Skipping malformed event (missing end): ${calEvent.summary || 'Unknown'}`);
              continue;
            }
            
            const startTime = new Date(calEvent.start.dateTime);
            const endTime = new Date(calEvent.end.dateTime);
            const durationMinutes = calEvent.duration || Math.round((endTime - startTime) / 1000 / 60);
            
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
      console.error('[Sync] ❌ Error syncing from calendars:', error.message);
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