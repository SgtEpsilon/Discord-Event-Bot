// src/services/eventManager.js
const { Event } = require('../models');
const { Op } = require('sequelize');
const { GoogleCalendarService } = require('./googleCalendar');

class EventManager {
  constructor(eventsFilePath = null, calendarService = null) {
    this.eventsFilePath = eventsFilePath;
    this.googleCalendar = calendarService || new GoogleCalendarService();
  }

  async createEvent(eventData) {
    const event = await Event.create({
      id: eventData.id,
      title: eventData.title,
      description: eventData.description || '',
      dateTime: new Date(eventData.dateTime),
      duration: eventData.duration || 60,
      maxParticipants: eventData.maxParticipants || 0,
      roles: eventData.roles || [],
      signups: {},
      createdBy: eventData.createdBy || 'unknown',
      channelId: eventData.channelId,
      guildId: eventData.guildId,
      messageId: eventData.messageId
    });

    // Add to Google Calendar if specified
    if (eventData.addToCalendar && eventData.calendarId) {
      try {
        const calendarResult = await this.googleCalendar.createEvent(eventData.calendarId, {
          title: eventData.title,
          description: eventData.description,
          dateTime: eventData.dateTime,
          duration: eventData.duration
        });

        await event.update({
          calendarEventId: calendarResult.eventId,
          calendarLink: calendarResult.htmlLink,
          calendarSource: eventData.calendarId
        });
      } catch (error) {
        console.error('Failed to add event to Google Calendar:', error.message);
        // Don't fail the event creation, just log the error
      }
    }

    return event.toJSON();
  }

  async getEvent(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      return null;
    }
    return event.toJSON();
  }

  async getAllEvents() {
    const events = await Event.findAll({
      order: [['dateTime', 'ASC']]
    });
    return events.map(event => event.toJSON());
  }

  async getGuildEvents(guildId) {
    const events = await Event.findAll({
      where: { guildId },
      order: [['dateTime', 'ASC']]
    });
    return events.map(event => event.toJSON());
  }

  async getUpcomingEvents(guildId = null, limit = 10) {
    const where = {
      dateTime: {
        [Op.gte]: new Date()
      }
    };

    if (guildId) {
      where.guildId = guildId;
    }

    const events = await Event.findAll({
      where,
      order: [['dateTime', 'ASC']],
      limit
    });
    
    return events.map(event => event.toJSON());
  }

  async updateEvent(eventId, updates) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    await event.update(updates);

    // Update Google Calendar event if it exists
    if (event.calendarEventId && event.calendarSource) {
      try {
        await this.googleCalendar.updateEvent(event.calendarSource, event.calendarEventId, {
          title: event.title,
          description: event.description,
          dateTime: event.dateTime,
          duration: event.duration
        });
      } catch (error) {
        console.error('Failed to update Google Calendar event:', error.message);
      }
    }

    return event.toJSON();
  }

  async deleteEvent(eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      return false;
    }

    // Delete from Google Calendar if it exists
    if (event.calendarEventId && event.calendarSource) {
      try {
        await this.googleCalendar.deleteEvent(event.calendarSource, event.calendarEventId);
      } catch (error) {
        console.error('Failed to delete Google Calendar event:', error.message);
      }
    }

    await event.destroy();
    return true;
  }

  async signupUser(eventId, userId, role = null) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const signups = event.signups || {};
    
    // Check if user is already signed up
    if (signups[userId]) {
      throw new Error('User already signed up for this event');
    }

    // Check max participants limit
    const currentSignups = Object.keys(signups).length;
    if (event.maxParticipants > 0 && currentSignups >= event.maxParticipants) {
      throw new Error('Event is full');
    }

    // Add user signup
    signups[userId] = {
      role: role,
      signedUpAt: new Date().toISOString()
    };

    await event.update({ signups });
    return event.toJSON();
  }

  async removeUser(eventId, userId) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const signups = event.signups || {};
    
    if (!signups[userId]) {
      throw new Error('User not signed up for this event');
    }

    delete signups[userId];
    await event.update({ signups });
    return event.toJSON();
  }

  async importCalendarEvent(calendarId, calendarEventId, additionalData = {}) {
    try {
      // Fetch event from Google Calendar
      const calendarEvent = await this.googleCalendar.getEvent(calendarId, calendarEventId);
      
      // Create event in database
      const eventData = {
        id: additionalData.id || `gcal_${calendarEventId}`,
        title: calendarEvent.summary,
        description: calendarEvent.description || '',
        dateTime: new Date(calendarEvent.start.dateTime || calendarEvent.start.date),
        duration: calendarEvent.duration || 60,
        calendarEventId: calendarEventId,
        calendarLink: calendarEvent.htmlLink,
        calendarSource: calendarId,
        ...additionalData
      };

      const event = await this.createEvent(eventData);
      return event;
    } catch (error) {
      console.error('Failed to import calendar event:', error.message);
      throw error;
    }
  }

  toJSON(event) {
    if (!event) return null;
    
    // If it's already a plain object, return it
    if (typeof event.toJSON === 'function') {
      return event.toJSON();
    }
    
    return event;
  }
}

module.exports = EventManager;