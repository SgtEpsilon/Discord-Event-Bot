// src/services/syncService.js

class SyncService {
    constructor(eventManager, calendarService) {
        this.eventManager = eventManager;
        this.calendarService = calendarService;
        this.autoSyncInterval = null;
        this.autoSyncChannelId = null;
        this.autoSyncGuildId = null;
    }

    /**
     * Sync events from Google Calendar to Discord
     * @param {string} channelId - Discord channel ID
     * @param {string} guildId - Discord guild ID
     * @param {string} calendarFilter - Optional calendar name filter
     * @param {number} hoursAhead - How many hours ahead to fetch events (default: 168 = 7 days)
     * @returns {Promise<{success: boolean, message: string, events: Array, calendars?: Array}>}
     */
    async syncFromCalendar(channelId, guildId, calendarFilter = null, hoursAhead = 168) {
        if (!this.calendarService.isEnabled()) {
            console.error('[Sync] Google Calendar not configured');
            return { 
                success: false, 
                message: 'Google Calendar not configured', 
                events: [] 
            };
        }

        try {
            const now = new Date();
            const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

            const importedEvents = [];
            const calendars = this.calendarService.getCalendars();
            
            let calendarsToSync = calendars;
            if (calendarFilter) {
                calendarsToSync = calendars.filter(cal => 
                    cal.name.toLowerCase().includes(calendarFilter.toLowerCase()) ||
                    cal.id.toLowerCase().includes(calendarFilter.toLowerCase())
                );
                
                if (calendarsToSync.length === 0) {
                    return { 
                        success: false, 
                        message: `No calendar found matching "${calendarFilter}"`, 
                        events: [] 
                    };
                }
            }

            console.log(`[Sync] Syncing from ${calendarsToSync.length} calendar(s): ${calendarsToSync.map(c => c.name).join(', ')}`);

            for (const cal of calendarsToSync) {
                console.log(`[Sync] Fetching events from "${cal.name}" (${cal.id})`);
                
                try {
                    const calendarEvents = await this.calendarService.syncEvents(
                        cal.id,
                        now.toISOString(),
                        futureDate.toISOString()
                    );

                    console.log(`[Sync] Found ${calendarEvents.length} events in "${cal.name}"`);

                    for (const calEvent of calendarEvents) {
                        if (!calEvent.start || !calEvent.start.dateTime) {
                            console.log(`[Sync] Skipping all-day event: ${calEvent.summary}`);
                            continue;
                        }

                        // Check if event already imported
                        const allEvents = this.eventManager.getAllEvents();
                        const existingEvent = Object.values(allEvents).find(e => 
                            e.calendarEventId === calEvent.id ||
                            e.calendarSourceId === cal.id + '_' + calEvent.id
                        );
                        
                        if (existingEvent) {
                            console.log(`[Sync] Event already exists: ${calEvent.summary}`);
                            continue;
                        }

                        const startTime = new Date(calEvent.start.dateTime);
                        const endTime = new Date(calEvent.end.dateTime);
                        const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

                        const event = this.eventManager.importCalendarEvent({
                            title: calEvent.summary || 'Imported Event',
                            description: calEvent.description || `Imported from ${cal.name}`,
                            dateTime: startTime.toISOString(),
                            duration: durationMinutes,
                            calendarEventId: calEvent.id,
                            calendarSourceId: cal.id + '_' + calEvent.id,
                            calendarSource: cal.name,
                            calendarLink: calEvent.htmlLink,
                            channelId,
                            guildId
                        });

                        importedEvents.push(event);
                        console.log(`[Sync] Imported from "${cal.name}": ${calEvent.summary}`);
                    }
                } catch (error) {
                    console.error(`[Sync] Error fetching from "${cal.name}": ${error.message}`);
                }
            }

            const calendarNames = calendarsToSync.length === 1 
                ? calendarsToSync[0].name 
                : `${calendarsToSync.length} calendars`;
                
            console.log(`[Sync] ✅ Imported ${importedEvents.length} new events from ${calendarNames}`);

            return {
                success: true,
                message: `Imported ${importedEvents.length} events from ${calendarNames}`,
                events: importedEvents,
                calendars: calendarsToSync.map(c => c.name)
            };

        } catch (error) {
            console.error('[Sync] ❌ Error syncing from Google Calendar:', error.message);
            return {
                success: false,
                message: `Failed to sync: ${error.message}`,
                events: []
            };
        }
    }

    /**
     * Start automatic synchronization
     * @param {string} channelId - Discord channel ID
     * @param {string} guildId - Discord guild ID
     */
    startAutoSync(channelId, guildId, callback) {
        this.autoSyncChannelId = channelId;
        this.autoSyncGuildId = guildId;
        
        // Initial sync
        this.syncFromCalendar(channelId, guildId).then(result => {
            console.log(`[AutoSync] Initial sync: ${result.message}`);
            if (callback && result.success && result.events.length > 0) {
                callback(result.events);
            }
        });

        // Set up interval (every hour)
        this.autoSyncInterval = setInterval(async () => {
            console.log('[AutoSync] Running scheduled sync...');
            const result = await this.syncFromCalendar(channelId, guildId);
            
            if (result.success && result.events.length > 0 && callback) {
                callback(result.events);
                console.log(`[AutoSync] ✅ Posted ${result.events.length} new events`);
            }
        }, 60 * 60 * 1000); // 1 hour

        console.log('[AutoSync] ✅ Auto-sync enabled');
    }

    /**
     * Stop automatic synchronization
     */
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            this.autoSyncChannelId = null;
            this.autoSyncGuildId = null;
            console.log('[AutoSync] ❌ Auto-sync disabled');
        }
    }

    /**
     * Get auto-sync status
     * @returns {boolean}
     */
    isAutoSyncEnabled() {
        return this.autoSyncInterval !== null;
    }

    /**
     * Get auto-sync interval reference
     * @returns {NodeJS.Timeout|null}
     */
    getAutoSyncInterval() {
        return this.autoSyncInterval;
    }
}

module.exports = SyncService;
