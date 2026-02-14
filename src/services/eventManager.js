// src/services/eventManager.js
const { Event } = require('../models');
const { Op } = require('sequelize');
const { GoogleCalendarService } = require('./googleCalendar');

const googleCalendar = new GoogleCalendarService();

// ... existing code ...

async function createEvent(eventData) {
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
      const calendarResult = await googleCalendar.createEvent(eventData.calendarId, {
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

async function updateEvent(eventId, updates) {
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const oldData = event.toJSON();
  await event.update(updates);

  // Update Google Calendar event if it exists
  if (event.calendarEventId && event.calendarSource) {
    try {
      await googleCalendar.updateEvent(event.calendarSource, event.calendarEventId, {
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

async function deleteEvent(eventId) {
  const event = await Event.findByPk(eventId);
  if (!event) {
    return false;
  }

  // Delete from Google Calendar if it exists
  if (event.calendarEventId && event.calendarSource) {
    try {
      await googleCalendar.deleteEvent(event.calendarSource, event.calendarEventId);
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error.message);
    }
  }

  await event.destroy();
  return true;
}

// ... rest of existing code ...

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getAllEvents,
  getGuildEvents,
  getUpcomingEvents,
  signupUser,
  removeUser,
  importCalendarEvent,
  toJSON
};