// src/discord/embedBuilder.js
const { EmbedBuilder } = require('discord.js');
const { formatDateTime, getUnixTimestamp } = require('../utils/datetime');

class DiscordEmbedBuilder {
    /**
     * Create event embed
     */
    static createEventEmbed(event) {
        const eventDate = new Date(event.dateTime);
        const unixTimestamp = getUnixTimestamp(eventDate);
        
        const embed = new EmbedBuilder()
            .setTitle(event.title)
            .setDescription(event.description || 'No description provided')
            .setColor(0x5865F2)
            .addFields(
                { name: '📅 Date & Time', value: formatDateTime(event.dateTime), inline: true },
                { name: '⏱️ Duration', value: `${event.duration || 60} minutes`, inline: true },
                { 
                    name: '👥 Max Participants', 
                    value: event.maxParticipants ? event.maxParticipants.toString() : 'Unlimited', 
                    inline: true 
                }
            );
        
        // Add timezone-aware timestamp
        const discordTimestamp = `<t:${unixTimestamp}:F>`;
        const relativeTime = `<t:${unixTimestamp}:R>`;
        
        embed.addFields({
            name: '🌍 Your Time',
            value: `${discordTimestamp}\n${relativeTime}`,
            inline: false
        });
        
        // Add roles if present
        if (event.roles && event.roles.length > 0) {
            event.roles.forEach(role => {
                const signedUp = event.signups[role.name] || [];
                const userList = signedUp.length > 0 
                    ? signedUp.map(userId => `<@${userId}>`).join(', ')
                    : 'None yet';
                
                embed.addFields({
                    name: `${role.emoji || '👤'} ${role.name} (${signedUp.length}/${role.maxSlots || '∞'})`,
                    value: userList,
                    inline: false
                });
            });
        }
        
        // Add calendar link if present
        if (event.calendarLink) {
            embed.addFields({ 
                name: '🔗 Google Calendar', 
                value: `[View in Calendar](${event.calendarLink})`, 
                inline: false 
            });
        }
        
        // Add footer with metadata
        let footerText = `Event ID: ${event.id}`;
        if (event.calendarSource) {
            footerText += ` | From: ${event.calendarSource}`;
        }
        footerText += ` | Unix: ${unixTimestamp}`;
        
        embed.setFooter({ text: footerText });
        
        return embed;
    }
    
    /**
     * Create help embed
     */
    static createHelpEmbed(presetCount, calendarCount) {
        return new EmbedBuilder()
            .setTitle('🤖 Event Bot Commands')
            .setDescription('Manage events with Google Calendar integration')
            .setColor(0x5865F2)
            .addFields(
                { name: '/create', value: 'Create a new event with custom details', inline: false },
                { name: '/preset', value: 'Create event from a preset template', inline: false },
                { name: '/presets', value: 'List all available preset templates', inline: false },
                { name: '/deletepreset', value: 'Delete a custom preset', inline: false },
                { name: '/addrole', value: 'Add a signup role to an event', inline: false },
                { name: '/list', value: 'List all upcoming events', inline: false },
                { name: '/eventinfo', value: 'Show detailed event information with timezones', inline: false },
                { name: '/delete', value: 'Delete an event', inline: false },
                { name: '/sync', value: 'Import events from Google Calendar', inline: false },
                { name: '/calendars', value: 'List all configured calendars', inline: false },
                { name: '/autosync', value: 'Manage automatic calendar syncing', inline: false },
                { name: '/help', value: 'Show this help message', inline: false }
            )
            .setFooter({ text: `Event Bot v3.0 • ${presetCount} presets • ${calendarCount} calendar(s)` });
    }
    
    /**
     * Create event list embed
     */
    static createEventListEmbed(events) {
        const embed = new EmbedBuilder()
            .setTitle('📅 Upcoming Events')
            .setColor(0x5865F2);
        
        events.forEach(event => {
            const totalSignups = Object.values(event.signups || {}).reduce((sum, arr) => sum + arr.length, 0);
            embed.addFields({
                name: event.title,
                value: `ID: \`${event.id}\`\n📅 ${formatDateTime(event.dateTime)}\n👥 ${totalSignups} signed up`,
                inline: true
            });
        });
        
        return embed;
    }
    
    /**
     * Create calendar list embed
     */
    static createCalendarListEmbed(calendars) {
        const embed = new EmbedBuilder()
            .setTitle('📅 Configured Calendars')
            .setDescription('These calendars are available for syncing:')
            .setColor(0x5865F2);
        
        calendars.forEach((cal, index) => {
            embed.addFields({
                name: `${index + 1}. ${cal.name}`,
                value: `ID: \`${cal.id}\`\nTo sync: \`/sync calendar_filter:${cal.name}\``,
                inline: false
            });
        });
        
        embed.setFooter({ text: `${calendars.length} calendar(s) configured` });
        
        return embed;
    }
    
    /**
     * Create event info embed
     */
    static createEventInfoEmbed(event) {
        const eventDate = new Date(event.dateTime);
        const unixTimestamp = getUnixTimestamp(eventDate);
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Event Info: ${event.title}`)
            .setDescription(event.description || 'No description')
            .setColor(0x5865F2)
            .addFields(
                { name: '📅 Original Format', value: formatDateTime(event.dateTime), inline: false },
                { 
                    name: '🌍 Discord Timestamps', 
                    value: `**Full:** <t:${unixTimestamp}:F>\n**Date:** <t:${unixTimestamp}:D>\n**Time:** <t:${unixTimestamp}:t>\n**Relative:** <t:${unixTimestamp}:R>`, 
                    inline: false 
                },
                { name: '🔢 Unix Timestamp', value: `\`${unixTimestamp}\``, inline: false }
            );
        
        const totalSignups = Object.values(event.signups || {}).reduce((sum, arr) => sum + arr.length, 0);
        embed.addFields(
            { name: '👥 Signups', value: `${totalSignups} player(s) signed up`, inline: true },
            { name: '⏱️ Duration', value: `${event.duration || 60} minutes`, inline: true },
            { name: '📊 Max Participants', value: event.maxParticipants ? event.maxParticipants.toString() : 'Unlimited', inline: true }
        );
        
        if (event.calendarLink) {
            embed.addFields({ name: '🔗 Google Calendar', value: `[View in Calendar](${event.calendarLink})`, inline: false });
        }
        
        if (event.calendarSource) {
            embed.addFields({ name: '📅 Source', value: event.calendarSource, inline: true });
        }
        
        embed.setFooter({ text: `Created by: ${event.createdBy === 'google_calendar' ? 'Google Calendar Import' : 'Discord User'}` });
        
        return embed;
    }
}

module.exports = DiscordEmbedBuilder;
