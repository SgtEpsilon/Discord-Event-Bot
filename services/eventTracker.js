// ============================================================================
// FILE: src/services/eventTracker.js
// NEW FILE - Create this file in src/services/
// ============================================================================
// Event Tracker - Prevents duplicate posts and provides restart protection

const fs = require('fs').promises;
const path = require('path');

class EventTracker {
  constructor() {
    this.trackerPath = path.join(__dirname, '../../data/event-tracker.json');
    this.postedEvents = new Map(); // eventId -> { messageId, channelId, guildId, postedAt }
    this.isLoaded = false;
  }

  /**
   * Load tracking data from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.trackerPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert object back to Map
      this.postedEvents = new Map(Object.entries(parsed.events || {}));
      
      console.log(`[EventTracker] ✅ Loaded ${this.postedEvents.size} tracked events`);
      this.isLoaded = true;
      
      // Clean old entries on load
      await this.cleanup();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[EventTracker] No tracking file found, starting fresh');
        this.postedEvents = new Map();
        this.isLoaded = true;
        await this.save();
      } else {
        console.error('[EventTracker] Error loading tracker:', error.message);
        this.postedEvents = new Map();
        this.isLoaded = true;
      }
    }
  }

  /**
   * Save tracking data to file
   */
  async save() {
    try {
      // Convert Map to object for JSON serialization
      const data = {
        events: Object.fromEntries(this.postedEvents),
        lastUpdated: new Date().toISOString(),
        totalTracked: this.postedEvents.size
      };
      
      await fs.writeFile(this.trackerPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[EventTracker] Error saving tracker:', error.message);
    }
  }

  /**
   * Check if an event has been posted
   */
  hasBeenPosted(eventId) {
    return this.postedEvents.has(eventId);
  }

  /**
   * Get posting info for an event
   */
  getPostingInfo(eventId) {
    return this.postedEvents.get(eventId) || null;
  }

  /**
   * Mark an event as posted
   */
  async markAsPosted(eventId, messageId, channelId, guildId) {
    this.postedEvents.set(eventId, {
      messageId,
      channelId,
      guildId,
      postedAt: new Date().toISOString()
    });
    
    await this.save();
    console.log(`[EventTracker] Tracked event ${eventId} -> message ${messageId}`);
  }

  /**
   * Remove tracking for an event
   */
  async untrack(eventId) {
    if (this.postedEvents.has(eventId)) {
      this.postedEvents.delete(eventId);
      await this.save();
      console.log(`[EventTracker] Untracked event ${eventId}`);
    }
  }

  /**
   * Clean up old posted events (older than 60 days)
   */
  async cleanup() {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    let cleaned = 0;
    
    for (const [eventId, info] of this.postedEvents.entries()) {
      const postedDate = new Date(info.postedAt);
      if (postedDate < sixtyDaysAgo) {
        this.postedEvents.delete(eventId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[EventTracker] Cleaned ${cleaned} old event(s) from tracker`);
      await this.save();
    }
  }

  /**
   * Sync tracker with database (startup reconciliation)
   */
  async syncWithDatabase() {
    try {
      const { Event } = require('../models');
      const { Op } = require('sequelize');
      
      // Get all events with messageIds from database
      const postedEvents = await Event.findAll({
        where: {
          messageId: { [Op.not]: null }
        },
        attributes: ['id', 'messageId', 'channelId', 'guildId', 'updatedAt']
      });
      
      let synced = 0;
      
      for (const event of postedEvents) {
        if (!this.postedEvents.has(event.id)) {
          this.postedEvents.set(event.id, {
            messageId: event.messageId,
            channelId: event.channelId,
            guildId: event.guildId,
            postedAt: event.updatedAt?.toISOString() || new Date().toISOString()
          });
          synced++;
        }
      }
      
      if (synced > 0) {
        console.log(`[EventTracker] Synced ${synced} event(s) from database`);
        await this.save();
      }
    } catch (error) {
      console.error('[EventTracker] Error syncing with database:', error.message);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTracked: this.postedEvents.size,
      oldestPosted: this.getOldestPostedDate(),
      newestPosted: this.getNewestPostedDate()
    };
  }

  getOldestPostedDate() {
    let oldest = null;
    for (const info of this.postedEvents.values()) {
      const date = new Date(info.postedAt);
      if (!oldest || date < oldest) {
        oldest = date;
      }
    }
    return oldest;
  }

  getNewestPostedDate() {
    let newest = null;
    for (const info of this.postedEvents.values()) {
      const date = new Date(info.postedAt);
      if (!newest || date > newest) {
        newest = date;
      }
    }
    return newest;
  }
}

module.exports = EventTracker;
