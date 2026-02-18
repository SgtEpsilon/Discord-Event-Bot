// ============================================================================
// FILE: src/services/webEventPoster.js
// UPDATED VERSION - Replace entire file with this
// Now includes event tracking and restart protection
// ============================================================================

const EmbedBuilder = require('../discord/embedBuilder');
const ButtonBuilder = require('../discord/buttonBuilder');

class WebEventPoster {
  constructor(client, eventManager, eventTracker) {
    this.client = client;
    this.eventManager = eventManager;
    this.eventTracker = eventTracker; // NEW: Event tracker for duplicate prevention
    this.checkInterval = null;
    this.isChecking = false;
  }

  /**
   * Check for events that need posting to Discord
   * Handles events from: Web UI, Calendar imports, and Discord commands
   * NOW WITH: Duplicate prevention and restart protection
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
          // NEW: Check if we've already posted this event (restart protection)
          if (this.eventTracker.hasBeenPosted(event.id)) {
            const postInfo = this.eventTracker.getPostingInfo(event.id);
            console.log(`[WebEventPoster] ⏭️  Event ${event.id} already posted (message ${postInfo.messageId}), updating database`);
            
            // Update database with tracked info
            await event.update({
              messageId: postInfo.messageId,
              channelId: postInfo.channelId
            });
            continue;
          }
          
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
        channelId: targetChannelId
      });

      // NEW: Track this posting to prevent duplicates
      await this.eventTracker.markAsPosted(
        event.id,
        message.id,
        targetChannelId,
        event.guildId
      );

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
   * Verify posted events still exist (restart protection)
   * Reconciles tracker with actual Discord messages
   */
  async verifyPostedEvents() {
    console.log('[WebEventPoster] 🔍 Verifying posted events...');
    
    try {
      const { Event } = require('../models');
      const { Op } = require('sequelize');
      
      // Get all events that claim to be posted
      const postedEvents = await Event.findAll({
        where: {
          messageId: { [Op.not]: null },
          dateTime: { [Op.gte]: new Date() } // Only check upcoming events
        }
      });

      let verified = 0;
      let missing = 0;

      for (const event of postedEvents) {
        try {
          // Try to fetch the message
          const channel = await this.client.channels.fetch(event.channelId).catch(() => null);
          
          if (!channel) {
            console.log(`[WebEventPoster] ⚠️  Channel ${event.channelId} not found for event ${event.id}`);
            missing++;
            continue;
          }

          const message = await channel.messages.fetch(event.messageId).catch(() => null);
          
          if (message) {
            // Message exists, track it
            await this.eventTracker.markAsPosted(
              event.id,
              event.messageId,
              event.channelId,
              event.guildId
            );
            verified++;
          } else {
            // Message was deleted, clear messageId so it can be reposted
            console.log(`[WebEventPoster] ⚠️  Message ${event.messageId} not found, will repost event ${event.id}`);
            await event.update({ messageId: null });
            await this.eventTracker.untrack(event.id);
            missing++;
          }
        } catch (error) {
          console.error(`[WebEventPoster] Error verifying event ${event.id}:`, error.message);
        }
      }

      console.log(`[WebEventPoster] ✅ Verification complete: ${verified} verified, ${missing} missing/will repost`);
    } catch (error) {
      console.error('[WebEventPoster] Error during verification:', error);
    }
  }

  /**
   * Start monitoring for new events
   */
  async start() {
    console.log('[WebEventPoster] Starting event poster with restart protection...');
    
    // NEW: Wait for event tracker to load
    if (!this.eventTracker.isLoaded) {
      console.log('[WebEventPoster] Waiting for event tracker to load...');
      await this.eventTracker.load();
    }
    
    // NEW: Sync tracker with database (restart protection)
    await this.eventTracker.syncWithDatabase();
    
    // NEW: Verify all posted events still exist
    setTimeout(() => {
      this.verifyPostedEvents();
    }, 5000);
    
    // Initial check after 10 seconds
    setTimeout(() => this.checkAndPostEvents(), 10000);
    
    // Check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndPostEvents();
    }, 10000);
    
    // Verify posted events every hour
    setInterval(() => {
      this.verifyPostedEvents();
    }, 60 * 60 * 1000);
    
    console.log('[WebEventPoster] ✅ Service started');
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

  /**
   * Get status information
   */
  getStatus() {
    const trackerStats = this.eventTracker.getStats();
    
    return {
      isRunning: !!this.checkInterval,
      trackerLoaded: this.eventTracker.isLoaded,
      trackedEvents: trackerStats.totalTracked,
      oldestTracked: trackerStats.oldestPosted,
      newestTracked: trackerStats.newestPosted
    };
  }
}

module.exports = WebEventPoster;
