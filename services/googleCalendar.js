// src/services/googleCalendar.js - Google Calendar API integration
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { CalendarConfig } = require('../models');

class GoogleCalendarService {
  constructor() {
    this.credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS || './data/calendar-credentials.json';
    this.auth = null;
  }

  async initialize() {
    try {
      const credentialsContent = await fs.readFile(this.credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error.message);
      return false;
    }
  }

  async isConfigured() {
    if (!this.auth) {
      return await this.initialize();
    }
    return true;
  }

  async createEvent(calendarId, eventData) {
    if (!await this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.auth });
    
    const startDateTime = new Date(eventData.dateTime);
    const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: process.env.TZ || 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: process.env.TZ || 'UTC'
      }
    };

    try {
      const response = await calendar.events.insert({
        calendarId,
        resource: event
      });

      return {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('Error creating calendar event:', error.message);
      throw error;
    }
  }

  async updateEvent(calendarId, eventId, eventData) {
    if (!await this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.auth });
    
    const startDateTime = new Date(eventData.dateTime);
    const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: process.env.TZ || 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: process.env.TZ || 'UTC'
      }
    };

    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        resource: event
      });

      return {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('Error updating calendar event:', error.message);
      throw error;
    }
  }

  async deleteEvent(calendarId, eventId) {
    if (!await this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.auth });

    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error.message);
      throw error;
    }
  }

  async listCalendars() {
    if (!await this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.auth });

    try {
      const response = await calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error listing calendars:', error.message);
      throw error;
    }
  }

  async getCalendarInfo(calendarId) {
    if (!await this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.auth });

    try {
      const response = await calendar.calendars.get({ calendarId });
      return response.data;
    } catch (error) {
      console.error('Error getting calendar info:', error.message);
      throw error;
    }
  }
}

// Calendar Config Management
async function getAllCalendarConfigs() {
  const configs = await CalendarConfig.findAll({
    order: [['name', 'ASC']]
  });
  return configs.map(c => c.toJSON());
}

async function getCalendarConfig(id) {
  const config = await CalendarConfig.findByPk(id);
  return config ? config.toJSON() : null;
}

async function getCalendarConfigByCalendarId(calendarId) {
  const config = await CalendarConfig.findOne({ where: { calendarId } });
  return config ? config.toJSON() : null;
}

async function createCalendarConfig(name, calendarId) {
  const existing = await CalendarConfig.findOne({ where: { calendarId } });
  if (existing) {
    throw new Error('Calendar already configured');
  }

  const config = await CalendarConfig.create({
    name,
    calendarId
  });

  return config.toJSON();
}

async function updateCalendarConfig(id, name, calendarId) {
  const config = await CalendarConfig.findByPk(id);
  if (!config) {
    throw new Error('Calendar config not found');
  }

  // Check if new calendarId conflicts with another config
  if (calendarId !== config.calendarId) {
    const existing = await CalendarConfig.findOne({ where: { calendarId } });
    if (existing) {
      throw new Error('Calendar ID already in use');
    }
  }

  await config.update({ name, calendarId });
  return config.toJSON();
}

async function deleteCalendarConfig(id) {
  const config = await CalendarConfig.findByPk(id);
  if (!config) {
    throw new Error('Calendar config not found');
  }

  await config.destroy();
  return true;
}

module.exports = {
  GoogleCalendarService,
  getAllCalendarConfigs,
  getCalendarConfig,
  getCalendarConfigByCalendarId,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig
};