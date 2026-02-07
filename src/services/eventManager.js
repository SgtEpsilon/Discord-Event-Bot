// src/services/eventManager.js
const Storage = require('../utils/storage');
const { parseDateTime, isUpcoming } = require('../utils/datetime');

class EventManager {
    constructor(filePath, calendarService) {
        this.storage = new Storage(filePath);
        this.calendarService = calendarService;
    }
    
    /**
     * Create a new event
     */
    async createEvent(eventData) {
        const eventId = `event_${Date.now()}`;
        
        const event = {
            id: eventId,
            title: eventData.title,
            description: eventData.description || '',
            dateTime: eventData.dateTime,
            duration: eventData.duration || 60,
            maxParticipants: eventData.maxParticipants || 0,
            roles: eventData.roles || [],
            signups: {},
            createdBy: eventData.createdBy || 'unknown',
            channelId: eventData.channelId || null,
            guildId: eventData.guildId || null,
            messageId: eventData.messageId || null,
            calendarLink: null,
            calendarEventId: null,
            calendarSource: null,
            calendarSourceId: null
        };
        
        // Initialize signups for each role
        event.roles.forEach(role => {
            event.signups[role.name] = [];
        });
        
        // Try to create in Google Calendar
        if (this.calendarService && this.calendarService.isEnabled()) {
            const calendarLink = await this.calendarService.createEvent(event);
            if (calendarLink) {
                event.calendarLink = calendarLink;
            }
        }
        
        this.storage.set(eventId, event);
        return event;
    }
    
    /**
     * Create event from preset
     */
    async createFromPreset(preset, dateTime, customDescription = null) {
        const parsedDateTime = parseDateTime(dateTime);
        
        if (!parsedDateTime) {
            throw new Error('Invalid date format');
        }
        
        const eventData = {
            title: preset.name,
            description: customDescription || preset.description,
            dateTime: parsedDateTime.toISOString(),
            duration: preset.duration,
            maxParticipants: preset.maxParticipants,
            roles: JSON.parse(JSON.stringify(preset.roles)) // Deep copy
        };
        
        return await this.createEvent(eventData);
    }
    
    /**
     * Get event by ID
     */
    getEvent(eventId) {
        return this.storage.get(eventId);
    }
    
    /**
     * Get all events
     */
    getAllEvents() {
        return this.storage.getAllAsObject();
    }
    
    /**
     * Get events for a specific guild
     */
    getGuildEvents(guildId) {
        const allEvents = this.storage.getAllAsObject();
        return Object.values(allEvents).filter(e => e.guildId === guildId);
    }
    
    /**
     * Get upcoming events
     */
    getUpcomingEvents(guildId = null) {
        const events = guildId ? this.getGuildEvents(guildId) : this.storage.getAll();
        return events.filter(e => isUpcoming(e.dateTime));
    }
    
    /**
     * Update event
     */
    updateEvent(eventId, updates) {
        const event = this.getEvent(eventId);
        if (!event) {
            throw new Error('Event not found');
        }
        
        const updatedEvent = { ...event, ...updates };
        this.storage.set(eventId, updatedEvent);
        return updatedEvent;
    }
    
    /**
     * Delete event
     */
    deleteEvent(eventId) {
        return this.storage.delete(eventId);
    }
    
    /**
     * Add role to event
     */
    addRole(eventId, role) {
        const event = this.getEvent(eventId);
        if (!event) {
            throw new Error('Event not found');
        }
        
        if (!event.roles) event.roles = [];
        if (!event.signups) event.signups = {};
        
        event.roles.push(role);
        event.signups[role.name] = [];
        
        this.storage.set(eventId, event);
        return event;
    }
    
    /**
     * Sign up user for role
     */
    signupUser(eventId, userId, roleName) {
        const event = this.getEvent(eventId);
        if (!event) {
            throw new Error('Event not found');
        }
        
        const role = event.roles.find(r => r.name === roleName);
        if (!role) {
            throw new Error('Role not found');
        }
        
        // Check if role is full
        if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
            throw new Error('Role is full');
        }
        
        // Remove user from all other roles
        Object.keys(event.signups).forEach(r => {
            event.signups[r] = event.signups[r].filter(id => id !== userId);
        });
        
        // Add user to new role
        if (!event.signups[roleName]) event.signups[roleName] = [];
        event.signups[roleName].push(userId);
        
        this.storage.set(eventId, event);
        return event;
    }
    
    /**
     * Remove user from event
     */
    removeUser(eventId, userId) {
        const event = this.getEvent(eventId);
        if (!event) {
            throw new Error('Event not found');
        }
        
        let removed = false;
        Object.keys(event.signups).forEach(r => {
            const initialLength = event.signups[r].length;
            event.signups[r] = event.signups[r].filter(id => id !== userId);
            if (event.signups[r].length < initialLength) removed = true;
        });
        
        if (removed) {
            this.storage.set(eventId, event);
        }
        
        return { event, removed };
    }
    
    /**
     * Import event from Google Calendar
     */
    importCalendarEvent(calendarData, channelId, guildId) {
        const { calendarEvent, calendarSource, calendarSourceId, duration } = calendarData;
        
        // Check if already imported
        const allEvents = this.storage.getAllAsObject();
        const existing = Object.values(allEvents).find(e => 
            e.calendarEventId === calendarEvent.id ||
            e.calendarSourceId === calendarSourceId
        );
        
        if (existing) {
            return null; // Already imported
        }
        
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const event = {
            id: eventId,
            title: calendarEvent.summary || 'Imported Event',
            description: calendarEvent.description || `Imported from ${calendarSource}`,
            dateTime: new Date(calendarEvent.start.dateTime).toISOString(),
            duration: duration,
            maxParticipants: 0,
            roles: [],
            signups: {},
            createdBy: 'google_calendar',
            channelId: channelId,
            guildId: guildId,
            messageId: null,
            calendarEventId: calendarEvent.id,
            calendarSourceId: calendarSourceId,
            calendarSource: calendarSource,
            calendarLink: calendarEvent.htmlLink
        };
        
        this.storage.set(eventId, event);
        return event;
    }
    
    /**
     * Get statistics
     */
    getStats(guildId = null) {
        const events = guildId ? this.getGuildEvents(guildId) : this.storage.getAll();
        
        const totalSignups = events.reduce((sum, event) => {
            return sum + Object.values(event.signups || {}).reduce((s, arr) => s + arr.length, 0);
        }, 0);
        
        return {
            totalEvents: events.length,
            upcomingEvents: events.filter(e => isUpcoming(e.dateTime)).length,
            totalSignups: totalSignups,
            eventsWithCalendar: events.filter(e => e.calendarLink).length
        };
    }
}

module.exports = EventManager;
