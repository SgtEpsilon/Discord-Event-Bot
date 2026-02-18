// src/services/youtubeMonitor.js
const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');

const parseXML = util.promisify(parseString);

class YouTubeMonitor {
    constructor(client, config, streamingConfigManager) {
        this.client = client;
        this.config = config;
        this.streamingConfig = streamingConfigManager;
        this.lastVideoIds = new Map(); // guildId -> channelId -> videoId
        this.checkInterval = null;
    }
    
    /**
     * Check all monitored YouTube channels
     */
    async checkVideos() {
        const allConfigs = this.streamingConfig.getAllGuildConfigs();
        
        for (const [guildId, guildConfig] of Object.entries(allConfigs)) {
            if (!guildConfig.youtube.enabled || !guildConfig.notificationChannelId) {
                continue;
            }
            
            if (!this.lastVideoIds.has(guildId)) {
                this.lastVideoIds.set(guildId, new Map());
            }
            
            const guildLastVideoIds = this.lastVideoIds.get(guildId);
            
            for (const channelId of guildConfig.youtube.channels) {
                try {
                    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
                    const response = await axios.get(rssUrl, { timeout: 5000 });
                    const result = await parseXML(response.data);
                    
                    if (result.feed && result.feed.entry && result.feed.entry.length > 0) {
                        const latestVideo = result.feed.entry[0];
                        const videoId = latestVideo['yt:videoId'][0];
                        const title = latestVideo.title[0];
                        const channelTitle = latestVideo.author[0].name[0];
                        const publishedAt = latestVideo.published[0];
                        
                        const lastKnownId = guildLastVideoIds.get(channelId);
                        
                        if (!lastKnownId) {
                            // First time checking, just store
                            guildLastVideoIds.set(channelId, videoId);
                            console.log(`[YouTube] Initialized tracking for ${channelTitle}`);
                        } else if (videoId !== lastKnownId) {
                            // New video detected
                            guildLastVideoIds.set(channelId, videoId);
                            
                            const videoData = {
                                id: { videoId },
                                snippet: { title, channelTitle, publishedAt }
                            };
                            
                            await this.sendNotification(videoData, guildId, guildConfig);
                            console.log(`[YouTube] New video from ${channelTitle}: ${title}`);
                        }
                    }
                } catch (error) {
                    console.error(`[YouTube] Error checking channel ${channelId}:`, error.message);
                }
            }
        }
    }
    
    /**
     * Send video notification
     */
    async sendNotification(video, guildId, guildConfig) {
        try {
            const channel = await this.client.channels.fetch(guildConfig.notificationChannelId);
            if (!channel) return;
            
            const message = guildConfig.youtube.message
                .replace(/{channel}/g, video.snippet.channelTitle)
                .replace(/{title}/g, video.snippet.title);
            
            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
            
            await channel.send(`${message}\n${videoUrl}`);
            console.log(`[YouTube] Notification sent for "${video.snippet.title}" in guild ${guildId}`);
        } catch (error) {
            console.error(`[YouTube] Error sending notification:`, error.message);
        }
    }
    
    /**
     * Check specific channels (for manual check command)
     */
    async checkSpecificChannels(channelIds) {
        const latestVideos = [];
        
        for (const channelId of channelIds) {
            try {
                const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
                const response = await axios.get(rssUrl, { timeout: 5000 });
                const result = await parseXML(response.data);
                
                if (result.feed && result.feed.entry && result.feed.entry.length > 0) {
                    const latestVideo = result.feed.entry[0];
                    
                    const videoData = {
                        id: { videoId: latestVideo['yt:videoId'][0] },
                        snippet: {
                            title: latestVideo.title[0],
                            channelTitle: latestVideo.author[0].name[0],
                            publishedAt: latestVideo.published[0]
                        }
                    };
                    
                    latestVideos.push(videoData);
                }
            } catch (error) {
                console.error(`[YouTube] Error checking channel ${channelId}:`, error.message);
            }
        }
        
        return latestVideos;
    }
    
    /**
     * Validate YouTube channel ID
     */
    async validateChannelId(channelId) {
        try {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            const response = await axios.get(rssUrl, { timeout: 5000 });
            const result = await parseXML(response.data);
            return result && result.feed;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Extract channel ID from various formats
     */
    async extractChannelId(input) {
        input = input.trim();
        
        // Direct channel ID
        if (input.startsWith('UC') && input.length === 24) {
            const isValid = await this.validateChannelId(input);
            return isValid ? input : null;
        }
        
        // Full URL with channel ID
        const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
        if (channelIdMatch) {
            const channelId = channelIdMatch[1];
            const isValid = await this.validateChannelId(channelId);
            return isValid ? channelId : null;
        }
        
        // @handle format
        let handle = input;
        const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
        if (handleMatch) {
            handle = handleMatch[1];
        } else if (input.startsWith('@')) {
            handle = input.substring(1);
        }
        
        if (handle && handle !== input) {
            const channelId = await this.resolveHandleToChannelId(handle);
            if (channelId) {
                const isValid = await this.validateChannelId(channelId);
                return isValid ? channelId : null;
            }
        }
        
        return null;
    }
    
    /**
     * Resolve @handle to channel ID
     */
    async resolveHandleToChannelId(handle) {
        try {
            const url = `https://www.youtube.com/@${handle}`;
            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const channelIdMatch = response.data.match(/"channelId":"(UC[\w-]{22})"/);
            if (channelIdMatch) {
                return channelIdMatch[1];
            }
            
            const externalIdMatch = response.data.match(/"externalId":"(UC[\w-]{22})"/);
            if (externalIdMatch) {
                return externalIdMatch[1];
            }
            
            return null;
        } catch (error) {
            console.error(`[YouTube] Failed to resolve handle ${handle}:`, error.message);
            return null;
        }
    }
    
    /**
     * Get channel name from ID
     */
    async getChannelName(channelId) {
        try {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            const response = await axios.get(rssUrl, { timeout: 5000 });
            const result = await parseXML(response.data);
            
            if (result.feed && result.feed.author && result.feed.author[0]) {
                return result.feed.author[0].name[0];
            }
            
            return 'Unknown Channel';
        } catch (error) {
            return 'Unknown Channel';
        }
    }
    
    /**
     * Start monitoring
     */
    start() {
        console.log('[YouTube] Starting YouTube monitor (RSS-based, no API quota)...');
        this.checkVideos();
        this.checkInterval = setInterval(() => this.checkVideos(), this.config.bot.youtubeCheckInterval);
        console.log('[YouTube] Monitor started (checking every 5 minutes)');
    }
    
    /**
     * Stop monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[YouTube] Monitor stopped');
        }
    }
    
    /**
     * Check if enabled
     */
    isEnabled() {
        return this.config.youtube.enabled;
    }
}

module.exports = YouTubeMonitor;
