// src/services/webEventPoster.js
const EmbedBuilder = require('../discord/embedBuilder');
const ButtonBuilder = require('../discord/buttonBuilder');

class WebEventPoster {
  constructor(client, eventManager) {
    this.client = client;
    this.eventManager = eventManager;
    this.checkInterval = null;
    this.isChecking = false;
  }

  /**
   * Check for events created in web UI that need posting to Discord
   */
  async checkAndPostEvents() {
    if (this.isChecking) {
      console.log('[WebEventPoster] Skipping check - already in progress');
      return;
    }

    this.isChecking = true;

    try {
      const allEvents = this.eventManager.getAllEvents();
      const eventsToPost = Object.values(allEvents).filter(event => 
        event.channelId &&        // Has a target channel
        event.guildId &&          // Has a target guild
        !event.messageId &&       // Not yet posted
        event.createdBy === 'web_interface' // Created from web
      );

      if (eventsToPost.length === 0) {
        return;
      }

      console.log(`[WebEventPoster] Found ${eventsToPost.length} event(s) to post`);

      for (const event of eventsToPost) {
        try {
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
   * Post a single event to Discord
   */
  async postEventToDiscord(event) {
    try {
      // Fetch the channel
      const channel = await this.client.channels.fetch(event.channelId);
      if (!channel) {
        console.error(`[WebEventPoster] Channel ${event.channelId} not found for event ${event.id}`);
        return;
      }

      // Verify it's the correct guild
      if (channel.guildId !== event.guildId) {
        console.error(`[WebEventPoster] Channel guild mismatch for event ${event.id}`);
        return;
      }

      // Create embed and buttons
      const embed = EmbedBuilder.createEventEmbed(event);
      const buttons = ButtonBuilder.createSignupButtons(event);

      // Post to Discord
      const message = await channel.send({
        embeds: [embed],
        components: buttons || []
      });

      // Update event with message ID
      this.eventManager.updateEvent(event.id, { messageId: message.id });

      console.log(`[WebEventPoster] ✅ Posted event "${event.title}" to ${channel.name} (${channel.guild.name})`);
    } catch (error) {
      console.error(`[WebEventPoster] Error posting event ${event.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Start monitoring for new web events
   */
  start() {
    console.log('[WebEventPoster] Starting web event poster (checking every 10 seconds)');
    
    // Initial check after 5 seconds
    setTimeout(() => this.checkAndPostEvents(), 5000);
    
    // Check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndPostEvents();
    }, 10000);
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
