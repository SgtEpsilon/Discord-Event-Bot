// ============================================================================
// FILE: src/services/webEventPoster.js
// INSTRUCTIONS: Replace the ENTIRE contents of this file with the code below
// ============================================================================
// src/services/webEventPoster.js - COMPLETE REPLACEMENT
// Posts ALL events (web, calendar, Discord) to the configured event channel

const EmbedBuilder = require('../discord/embedBuilder');
const ButtonBuilder = require('../discord/buttonBuilder');

class WebEventPoster {
  constructor(client, eventManager) {
    this.client = client;
    this.eventManager = eventManager;
    this.checkInterval = null;
    this.isChecking = false;
    this.processedEventIds = new Set(); // Track events we've already processed
  }

  /**
   * Check for events that need posting to Discord
   * Handles events from: Web UI, Calendar imports, and Discord commands
   */
  async checkAndPostEvents() {
    if (this.isChecking) {
      console.log('[WebEventPoster] Skipping check - already in progress');
      return;
    }

    this.isChecking = true;

    try {
      const { Event, EventsConfig } = require('../models');
      const { Op } = require('sequelize');
      
      // Find all events that:
      // 1. Have NOT been posted yet (messageId is null)
      // 2. Have a guildId (are associated with a Discord server)
      // 3. Are upcoming (not in the past)
      const eventsToPost = await Event.findAll({
        where: {
          messageId: null,
          guildId: { [Op.not]: null },
          dateTime: { [Op.gte]: new Date() }
        }
      });

      if (eventsToPost.length === 0) {
        return;
      }

      console.log(`[WebEventPoster] Found ${eventsToPost.length} event(s) to post`);

      for (const event of eventsToPost) {
        try {
          // Skip if we've already tried to process this event in this session
          if (this.processedEventIds.has(event.id)) {
            continue;
          }
          
          this.processedEventIds.add(event.id);
          
          await this.postEventToDiscord(event);
        } catch (error) {
          console.error(`[WebEventPoster] Failed to post event ${event.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[WebEventPoster] Error checking events:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Post a single event to Discord in the configured event channel
   */
  async postEventToDiscord(event) {
    try {
      const { EventsConfig } = require('../models');
      
      // Get the configured event channel for this guild
      const guildConfig = await EventsConfig.findByPk(event.guildId);
      
      // Determine target channel:
      // 1. Use configured event channel if available
      // 2. Fall back to event.channelId if set
      // 3. Skip if neither is available
      let targetChannelId = null;
      
      if (guildConfig && guildConfig.eventChannelId) {
        targetChannelId = guildConfig.eventChannelId;
        console.log(`[WebEventPoster] Using configured event channel: ${targetChannelId}`);
      } else if (event.channelId) {
        targetChannelId = event.channelId;
        console.log(`[WebEventPoster] Using event's channel: ${targetChannelId}`);
      } else {
        console.log(`[WebEventPoster] ⚠️  No channel configured for guild ${event.guildId}, skipping event ${event.id}`);
        return;
      }

      // Fetch the channel
      const channel = await this.client.channels.fetch(targetChannelId).catch(() => null);
      
      if (!channel) {
        console.error(`[WebEventPoster] Channel ${targetChannelId} not found or inaccessible for event ${event.id}`);
        return;
      }

      // Verify it's the correct guild
      if (channel.guildId !== event.guildId) {
        console.error(`[WebEventPoster] Channel guild mismatch for event ${event.id}`);
        return;
      }

      // Create embed and buttons
      const eventJson = event.toJSON();
      const embed = EmbedBuilder.createEventEmbed(eventJson);
      const buttons = ButtonBuilder.createSignupButtons(eventJson);

      // Post to Discord
      const message = await channel.send({
        embeds: [embed],
        components: buttons || []
      });

      // Update event with message ID and channel ID
      await event.update({ 
        messageId: message.id,
        channelId: targetChannelId // Ensure channelId is set
      });

      const sourceType = event.createdBy === 'web_interface' ? 'Web UI' 
                       : event.calendarSource ? `Calendar (${event.calendarSource})`
                       : 'Discord';
      
      console.log(`[WebEventPoster] ✅ Posted ${sourceType} event "${event.title}" to ${channel.name} (${channel.guild.name})`);
    } catch (error) {
      console.error(`[WebEventPoster] Error posting event ${event.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up old processed event IDs to prevent memory leak
   */
  cleanupProcessedIds() {
    if (this.processedEventIds.size > 1000) {
      console.log('[WebEventPoster] Clearing processed event IDs cache');
      this.processedEventIds.clear();
    }
  }

  /**
   * Start monitoring for new events
   */
  start() {
    console.log('[WebEventPoster] Starting event poster (checking every 10 seconds)');
    
    // Initial check after 5 seconds
    setTimeout(() => this.checkAndPostEvents(), 5000);
    
    // Check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndPostEvents();
    }, 10000);
    
    // Clean up processed IDs every hour
    setInterval(() => {
      this.cleanupProcessedIds();
    }, 3600000);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[WebEventPoster] Stopped');
    }
  }
}

module.exports = WebEventPoster;