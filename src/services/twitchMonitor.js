// src/services/twitchMonitor.js
const axios = require('axios');

class TwitchMonitor {
    constructor(client, config, guildConfig) {
        this.client = client;
        this.config = config;
        this.guildConfig = guildConfig;  // Changed from streamingConfig to guildConfig
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.liveStreamers = new Map(); // Track which streamers are currently live
        this.checkInterval = null;
        this.isCheckingStreams = false; // Prevent concurrent checks
        this.lastTokenRequest = 0; // Track last token request time
        this.minTokenRequestInterval = 60000; // Minimum 1 minute between token requests
    }

    /**
     * Get or refresh access token with rate limiting
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        // Rate limit token requests
        const timeSinceLastRequest = Date.now() - this.lastTokenRequest;
        if (timeSinceLastRequest < this.minTokenRequestInterval) {
            const waitTime = this.minTokenRequestInterval - timeSinceLastRequest;
            console.log(`[Twitch] Rate limit protection: waiting ${Math.ceil(waitTime / 1000)}s before requesting new token`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        try {
            this.lastTokenRequest = Date.now();
            
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: this.config.twitch.clientId,
                    client_secret: this.config.twitch.clientSecret,
                    grant_type: 'client_credentials'
                }
            });

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiresAt = Date.now() + ((response.data.expires_in - 300) * 1000);
            
            console.log('[Twitch] ✅ Access token obtained');
            return this.accessToken;
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 60;
                console.error(`[Twitch] ⚠️  Rate limited! Retry after ${retryAfter} seconds`);
                throw new Error(`Rate limited. Please wait ${retryAfter} seconds.`);
            }
            
            console.error('[Twitch] Error getting access token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Check if streamers are live
     */
    async checkStreams() {
        // Prevent concurrent checks
        if (this.isCheckingStreams) {
            console.log('[Twitch] Skipping check - previous check still in progress');
            return;
        }

        this.isCheckingStreams = true;

        try {
            const allConfigs = this.guildConfig.getAllGuildConfigs();
            const allStreamers = new Set();

            // Collect all unique streamers across all guilds
            for (const [guildId, config] of Object.entries(allConfigs)) {
                if (config.twitch?.enabled && config.twitch.streamers?.length > 0) {
                    config.twitch.streamers.forEach(streamer => allStreamers.add(streamer.toLowerCase()));
                }
            }

            if (allStreamers.size === 0) {
                return;
            }

            const token = await this.getAccessToken();
            const streamersArray = Array.from(allStreamers);
            
            // Twitch API allows up to 100 streamers per request
            const batchSize = 100;
            const liveStreams = [];

            for (let i = 0; i < streamersArray.length; i += batchSize) {
                const batch = streamersArray.slice(i, i + batchSize);
                
                try {
                    const response = await axios.get('https://api.twitch.tv/helix/streams', {
                        headers: {
                            'Client-ID': this.config.twitch.clientId,
                            'Authorization': `Bearer ${token}`
                        },
                        params: {
                            user_login: batch
                        }
                    });

                    liveStreams.push(...response.data.data);
                    
                    // Add delay between batches to avoid rate limiting
                    if (i + batchSize < streamersArray.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    if (error.response?.status === 429) {
                        console.error('[Twitch] ⚠️  Rate limited while checking streams');
                        // Clear token to force refresh on next attempt
                        this.accessToken = null;
                        this.tokenExpiresAt = null;
                        break;
                    }
                    throw error;
                }
            }

            // Process live streams and send notifications
            await this.processLiveStreams(liveStreams, allConfigs);

        } catch (error) {
            if (error.response?.status === 401) {
                // Token expired or invalid
                console.log('[Twitch] Token invalid, will refresh on next check');
                this.accessToken = null;
                this.tokenExpiresAt = null;
            } else {
                console.error('[Twitch] Error checking streams:', error.message);
            }
        } finally {
            this.isCheckingStreams = false;
        }
    }

    /**
     * Process live streams and send notifications
     */
    async processLiveStreams(liveStreams, allConfigs) {
        const currentlyLive = new Set(liveStreams.map(s => s.user_login.toLowerCase()));

        // Check for new live streams
        for (const stream of liveStreams) {
            const username = stream.user_login.toLowerCase();
            const streamKey = `${username}-${stream.id}`;

            // Skip if we've already notified about this stream
            if (this.liveStreamers.has(streamKey)) {
                continue;
            }

            // Mark as live
            this.liveStreamers.set(streamKey, {
                username: stream.user_login,
                startedAt: stream.started_at,
                streamId: stream.id
            });

            // Send notifications to all guilds tracking this streamer
            for (const [guildId, config] of Object.entries(allConfigs)) {
                if (!config.twitch?.enabled || !config.notifications?.channelId) {
                    continue;
                }

                const trackedStreamers = (config.twitch.streamers || []).map(s => s.toLowerCase());
                if (!trackedStreamers.includes(username)) {
                    continue;
                }

                await this.sendNotification(guildId, config, stream);
            }
        }

        // Clean up streamers who went offline
        const toRemove = [];
        for (const [key, data] of this.liveStreamers.entries()) {
            if (!currentlyLive.has(data.username.toLowerCase())) {
                toRemove.push(key);
            }
        }
        toRemove.forEach(key => this.liveStreamers.delete(key));
    }

    /**
     * Send stream notification
     */
    async sendNotification(guildId, config, stream) {
        try {
            const channel = await this.client.channels.fetch(config.notifications.channelId);
            if (!channel) return;

            const username = stream.user_login;
            const customMessage = config.twitch.customMessages?.[username];
            const messageTemplate = customMessage || '🔴 {username} is now live!\n**{title}**\nPlaying: {game}';

            const message = messageTemplate
                .replace(/{username}/g, stream.user_name)
                .replace(/{title}/g, stream.title)
                .replace(/{game}/g, stream.game_name || 'Unknown')
                .replace(/{url}/g, `https://twitch.tv/${username}`);

            await channel.send({
                content: message,
                embeds: [{
                    color: 0x9146FF, // Twitch purple
                    title: stream.title,
                    url: `https://twitch.tv/${username}`,
                    author: {
                        name: `${stream.user_name} is now live on Twitch!`,
                        icon_url: stream.thumbnail_url?.replace('{width}', '50').replace('{height}', '50')
                    },
                    fields: [
                        {
                            name: '🎮 Game',
                            value: stream.game_name || 'Unknown',
                            inline: true
                        },
                        {
                            name: '👥 Viewers',
                            value: stream.viewer_count.toString(),
                            inline: true
                        }
                    ],
                    thumbnail: {
                        url: stream.thumbnail_url?.replace('{width}', '440').replace('{height}', '248')
                    },
                    timestamp: new Date(stream.started_at)
                }]
            });

            console.log(`[Twitch] 📢 Sent notification for ${username} in guild ${guildId}`);
        } catch (error) {
            console.error(`[Twitch] Error sending notification:`, error.message);
        }
    }

    /**
     * Validate Twitch username
     */
    async validateUsername(username) {
        try {
            const token = await this.getAccessToken();
            const response = await axios.get('https://api.twitch.tv/helix/users', {
                headers: {
                    'Client-ID': this.config.twitch.clientId,
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    login: username
                }
            });
            
            return response.data.data && response.data.data.length > 0;
        } catch (error) {
            console.error('[Twitch] Error validating username:', error.message);
            return false;
        }
    }

    /**
     * Check if monitor is enabled
     */
    isEnabled() {
        return this.config.twitch?.enabled;
    }

    /**
     * Start monitoring
     */
    start() {
        if (!this.config.twitch?.enabled) {
            console.log('[Twitch] Monitor not started - no credentials configured');
            return;
        }

        const interval = this.config.bot?.twitchCheckInterval || 60000;
        
        console.log(`[Twitch] 🎮 Starting monitor (checking every ${interval / 1000}s)`);
        
        // Initial check after 10 seconds
        setTimeout(() => this.checkStreams(), 10000);
        
        // Set up interval
        this.checkInterval = setInterval(() => {
            this.checkStreams();
        }, interval);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[Twitch] Monitor stopped');
        }
    }
}

module.exports = TwitchMonitor;
