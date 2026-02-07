const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const EVENTS_FILE = path.join(__dirname, 'events.json');
const PRESETS_FILE = path.join(__dirname, 'presets.json');

// Load configuration from environment variables
const config = {
    token: process.env.DISCORD_TOKEN,
    googleCredentials: process.env.GOOGLE_CREDENTIALS || null,
    calendarIds: process.env.CALENDAR_IDS || 'primary'
};

// Parse calendar IDs (supports multiple calendars)
// Format: "Name1:id1,Name2:id2" or "id1,id2" or "primary"
function parseCalendarIds(calendarIdsString) {
    const calendars = [];
    const parts = calendarIdsString.split(',').map(s => s.trim()).filter(s => s);
    
    parts.forEach((part, index) => {
        if (part.includes(':')) {
            // Format: "Name:calendar_id"
            const [name, id] = part.split(':').map(s => s.trim());
            calendars.push({ name, id });
        } else {
            // Format: "calendar_id" (no name provided)
            calendars.push({ 
                name: parts.length === 1 ? 'Calendar' : `Calendar ${index + 1}`, 
                id: part 
            });
        }
    });
    
    return calendars.length > 0 ? calendars : [{ name: 'Calendar', id: 'primary' }];
}

config.calendars = parseCalendarIds(config.calendarIds);

console.log(`📅 Configured ${config.calendars.length} calendar(s): ${config.calendars.map(c => c.name).join(', ')}`);

// Validate required configuration
if (!config.token) {
    console.error('❌ ERROR: DISCORD_TOKEN is required!');
    console.log('Please create a .env file with your Discord bot token.');
    console.log('See .env.example for reference.');
    process.exit(1);
}

// Load presets
let presets = {};
if (fs.existsSync(PRESETS_FILE)) {
    presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    console.log(`📋 Loaded ${Object.keys(presets).length} event presets`);
}

// Auto-sync tracking
let autoSyncInterval = null;
let autoSyncChannelId = null;
let autoSyncGuildId = null;

// Start auto-sync (runs every hour)
function startAutoSync(channelId, guildId) {
    autoSyncChannelId = channelId;
    autoSyncGuildId = guildId;
    
    // Run immediately
    syncFromGoogleCalendar(channelId, guildId).then(result => {
        console.log(`[AutoSync] Initial sync: ${result.message}`);
    });

    // Then every hour
    autoSyncInterval = setInterval(async () => {
        console.log('[AutoSync] Running scheduled sync...');
        const result = await syncFromGoogleCalendar(channelId, guildId);
        
        if (result.success && result.events.length > 0) {
            // Post new events to Discord
            const channel = await client.channels.fetch(channelId);
            for (const event of result.events) {
                const eventEmbed = createEventEmbed(event);
                const buttons = createSignupButtons(event);
                
                const sentMessage = await channel.send({ 
                    embeds: [eventEmbed],
                    components: buttons || []
                });

                event.messageId = sentMessage.id;
            }
            saveEvents();
            console.log(`[AutoSync] ✅ Posted ${result.events.length} new events`);
        }
    }, 60 * 60 * 1000); // Every hour

    console.log('[AutoSync] ✅ Auto-sync enabled');
}

// Stop auto-sync
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        autoSyncChannelId = null;
        autoSyncGuildId = null;
        console.log('[AutoSync] ❌ Auto-sync disabled');
    }
}

// Load or create events storage
let events = {};
if (fs.existsSync(EVENTS_FILE)) {
    events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
}

// Save events to file
function saveEvents() {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Helper function to parse DD-MM-YYYY HH:MM format
function parseDateTime(dateTimeStr) {
    // Expected format: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM
    const parts = dateTimeStr.trim().split(' ');
    
    if (parts.length < 2) {
        return null;
    }
    
    const datePart = parts[0]; // DD-MM-YYYY
    const timePart = parts[1]; // HH:MM
    const meridiem = parts[2]?.toUpperCase(); // AM/PM (optional)
    
    // Split date: DD-MM-YYYY
    const dateComponents = datePart.split('-');
    if (dateComponents.length !== 3) {
        return null;
    }
    
    const day = parseInt(dateComponents[0]);
    const month = parseInt(dateComponents[1]) - 1; // Months are 0-indexed
    const year = parseInt(dateComponents[2]);
    
    // Split time: HH:MM
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) {
        return null;
    }
    
    let hours = parseInt(timeComponents[0]);
    const minutes = parseInt(timeComponents[1]);
    
    // Handle AM/PM
    if (meridiem) {
        if (meridiem === 'PM' && hours < 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
    }
    
    // Create date object
    const dateTime = new Date(year, month, day, hours, minutes);
    
    // Validate the date
    if (isNaN(dateTime.getTime())) {
        return null;
    }
    
    return dateTime;
}

// Helper function to format date for display (DD-MM-YYYY HH:MM AM/PM)
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${day}-${month}-${year} ${hours}:${minutes} ${meridiem}`;
}

// Sync events FROM Google Calendar to Discord
async function syncFromGoogleCalendar(channelId, guildId, hoursAhead = 168, calendarFilter = null) {
    if (!calendar) {
        console.error('[Sync] Google Calendar not configured');
        return { success: false, message: 'Google Calendar not configured', events: [] };
    }

    try {
        const now = new Date();
        const futureDate = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

        const importedEvents = [];
        
        // Determine which calendars to sync from
        let calendarsToSync = config.calendars;
        if (calendarFilter) {
            // Filter by calendar name or ID
            calendarsToSync = config.calendars.filter(cal => 
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
        console.log(`[Sync] Time range: ${now.toISOString()} to ${futureDate.toISOString()}`);

        // Fetch events from each calendar
        for (const cal of calendarsToSync) {
            console.log(`[Sync] Fetching events from "${cal.name}" (${cal.id})`);
            
            try {
                const response = await calendar.events.list({
                    calendarId: cal.id,
                    timeMin: now.toISOString(),
                    timeMax: futureDate.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const calendarEvents = response.data.items || [];
                console.log(`[Sync] Found ${calendarEvents.length} events in "${cal.name}"`);

                for (const calEvent of calendarEvents) {
                    // Skip events that don't have a start time
                    if (!calEvent.start || !calEvent.start.dateTime) {
                        console.log(`[Sync] Skipping all-day event: ${calEvent.summary}`);
                        continue;
                    }

                    // Check if event already exists
                    const existingEvent = Object.values(events).find(e => 
                        e.calendarEventId === calEvent.id ||
                        e.calendarSourceId === cal.id + '_' + calEvent.id
                    );
                    
                    if (existingEvent) {
                        console.log(`[Sync] Event already exists: ${calEvent.summary}`);
                        continue;
                    }

                    // Calculate duration
                    const startTime = new Date(calEvent.start.dateTime);
                    const endTime = new Date(calEvent.end.dateTime);
                    const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

                    // Create Discord event
                    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const newEvent = {
                        id: eventId,
                        title: calEvent.summary || 'Imported Event',
                        description: calEvent.description || `Imported from ${cal.name}`,
                        dateTime: startTime.toISOString(),
                        duration: durationMinutes,
                        maxParticipants: 0,
                        roles: [],
                        signups: {},
                        createdBy: 'google_calendar',
                        channelId: channelId,
                        guildId: guildId,
                        calendarEventId: calEvent.id,
                        calendarSourceId: cal.id + '_' + calEvent.id, // Unique ID per calendar
                        calendarSource: cal.name, // Store which calendar it came from
                        calendarLink: calEvent.htmlLink
                    };

                    events[eventId] = newEvent;
                    importedEvents.push(newEvent);
                    console.log(`[Sync] Imported from "${cal.name}": ${calEvent.summary}`);
                }
            } catch (error) {
                console.error(`[Sync] Error fetching from "${cal.name}": ${error.message}`);
                // Continue with other calendars even if one fails
            }
        }

        saveEvents();
        
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

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Initialize Google Calendar API
let calendar = null;
if (config.googleCredentials) {
    try {
        const credentials = JSON.parse(config.googleCredentials);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });
        calendar = google.calendar({ version: 'v3', auth });
    } catch (error) {
        console.error('Failed to initialize Google Calendar:', error.message);
    }
}

// Helper function to create event embed
function createEventEmbed(event) {
    const eventDate = new Date(event.dateTime);
    const unixTimestamp = Math.floor(eventDate.getTime() / 1000);
    
    const embed = new EmbedBuilder()
        .setTitle(event.title)
        .setDescription(event.description || 'No description provided')
        .setColor(0x5865F2)
        .addFields(
            { name: '📅 Date & Time', value: formatDateTime(event.dateTime), inline: true },
            { name: '⏱️ Duration', value: `${event.duration || 60} minutes`, inline: true },
            { name: '👥 Max Participants', value: event.maxParticipants ? event.maxParticipants.toString() : 'Unlimited', inline: true }
        );

    // Add Discord timestamp (automatically converts to user's timezone)
    const discordTimestamp = `<t:${unixTimestamp}:F>`; // Full date/time
    const relativeTime = `<t:${unixTimestamp}:R>`; // Relative (e.g., "in 2 hours")
    
    embed.addFields({
        name: '🌍 Your Time',
        value: `${discordTimestamp}\n${relativeTime}`,
        inline: false
    });

    // Add roles section
    if (event.roles && event.roles.length > 0) {
        event.roles.forEach(role => {
            const signedUp = event.signups[role.name] || [];
            const spotsLeft = role.maxSlots ? role.maxSlots - signedUp.length : '∞';
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

    if (event.calendarLink) {
        embed.addFields({ name: '🔗 Google Calendar', value: `[View in Calendar](${event.calendarLink})`, inline: false });
    }

    // Footer with event ID and Unix timestamp
    let footerText = `Event ID: ${event.id}`;
    if (event.calendarSource) {
        footerText += ` | From: ${event.calendarSource}`;
    }
    footerText += ` | Unix: ${unixTimestamp}`;
    
    embed.setFooter({ text: footerText });
    
    return embed;
}

// Helper function to create signup buttons
function createSignupButtons(event) {
    if (!event.roles || event.roles.length === 0) return null;

    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonsInRow = 0;

    event.roles.forEach((role, index) => {
        const signedUp = event.signups[role.name] || [];
        const isFull = role.maxSlots && signedUp.length >= role.maxSlots;

        const button = new ButtonBuilder()
            .setCustomId(`signup_${event.id}_${role.name}`)
            .setLabel(`${role.emoji || '👤'} ${role.name}`)
            .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(isFull);

        currentRow.addComponents(button);
        buttonsInRow++;

        if (buttonsInRow === 5 || index === event.roles.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonsInRow = 0;
        }
    });

    // Add leave button
    const leaveButton = new ButtonBuilder()
        .setCustomId(`leave_${event.id}`)
        .setLabel('❌ Leave Event')
        .setStyle(ButtonStyle.Danger);

    if (buttonsInRow === 0) {
        currentRow.addComponents(leaveButton);
        rows.push(currentRow);
    } else {
        rows[rows.length - 1].addComponents(leaveButton);
    }

    return rows;
}

// Create event in Google Calendar
async function createGoogleCalendarEvent(event) {
    if (!calendar) return null;

    try {
        const endTime = new Date(new Date(event.dateTime).getTime() + (event.duration || 60) * 60000);
        
        const calendarEvent = {
            summary: event.title,
            description: event.description,
            start: {
                dateTime: new Date(event.dateTime).toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC',
            },
        };

        // Use the first calendar for Discord → Calendar sync
        const targetCalendar = config.calendars[0];
        console.log(`[Calendar] Creating event "${event.title}" in calendar: ${targetCalendar.name} (${targetCalendar.id})`);
        
        const response = await calendar.events.insert({
            calendarId: targetCalendar.id,
            resource: calendarEvent,
        });

        console.log(`[Calendar] ✅ Event created successfully`);
        return response.data.htmlLink;
    } catch (error) {
        console.error('[Calendar] ❌ Error creating event:', error.message);
        if (error.message.includes('Not Found')) {
            console.error('[Calendar] Check: 1) Calendar ID is correct, 2) Calendar is shared with service account');
            console.error(`[Calendar] Current calendar ID: ${config.calendars[0].id}`);
        } else if (error.message.includes('Forbidden') || error.message.includes('Permission')) {
            console.error('[Calendar] Check: Service account has "Make changes to events" permission');
        }
        return null;
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`🔗 Google Calendar: ${calendar ? 'Connected' : 'Not configured'}`);
    
    // Test calendar connection if configured
    if (calendar) {
        console.log(`[Calendar] Testing connection to ${config.calendars.length} calendar(s)...`);
        
        for (const cal of config.calendars) {
            try {
                console.log(`[Calendar] Testing "${cal.name}" (${cal.id})`);
                await calendar.calendars.get({ calendarId: cal.id });
                console.log(`[Calendar] ✅ "${cal.name}" - Successfully connected`);
            } catch (error) {
                console.error(`[Calendar] ❌ "${cal.name}" - Failed: ${error.message}`);
                if (error.message.includes('Not Found')) {
                    console.error(`[Calendar] Calendar "${cal.id}" not found or not shared with service account`);
                    console.error(`[Calendar] To fix:`);
                    console.error(`[Calendar]   1. Check CALENDAR_IDS in .env is correct`);
                    console.error(`[Calendar]   2. Share calendar with: ${config.googleCredentials ? JSON.parse(config.googleCredentials).client_email : 'service account email'}`);
                }
            }
        }
    }
});

// Message command handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !create - Create a new event
    if (command === 'create') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to create events.');
        }

        const eventId = `event_${Date.now()}`;
        const embed = new EmbedBuilder()
            .setTitle('📝 Create New Event')
            .setDescription('Use the following format to create an event:\n\n`!create <title> | <date-time> | <description> | <duration-minutes> | <max-participants>`\n\nExample:\n`!create Raid Night | 15-02-2026 20:00 | Weekly raid | 120 | 20`\n\nDate format: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\n\nOr use: `!preset <preset-name> <date-time>` for quick setup\nSee `!presets` for available templates')
            .setColor(0x5865F2);

        if (args.length >= 2) {
            const parts = args.join(' ').split('|').map(p => p.trim());
            
            if (parts.length < 2) {
                return message.reply({ embeds: [embed] });
            }

            const [title, dateTimeStr, description = '', durationStr = '60', maxParticipantsStr = '0'] = parts;
            const dateTime = parseDateTime(dateTimeStr);
            
            if (!dateTime) {
                return message.reply('❌ Invalid date format. Use: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\nExample: 15-02-2026 20:00 or 15-02-2026 08:00 PM');
            }

            const newEvent = {
                id: eventId,
                title,
                description,
                dateTime: dateTime.toISOString(),
                duration: parseInt(durationStr) || 60,
                maxParticipants: parseInt(maxParticipantsStr) || 0,
                roles: [],
                signups: {},
                createdBy: message.author.id,
                channelId: message.channel.id,
                guildId: message.guild.id
            };

            events[eventId] = newEvent;
            saveEvents();

            // Create in Google Calendar
            if (calendar) {
                const calendarLink = await createGoogleCalendarEvent(newEvent);
                if (calendarLink) {
                    newEvent.calendarLink = calendarLink;
                    saveEvents();
                }
            }

            const eventEmbed = createEventEmbed(newEvent);
            const sentMessage = await message.channel.send({ embeds: [eventEmbed] });
            
            newEvent.messageId = sentMessage.id;
            saveEvents();

            message.reply(`✅ Event created! Use \`!addrole ${eventId} <emoji> <role-name> <max-slots>\` to add signup roles.`);
        } else {
            message.reply({ embeds: [embed] });
        }
    }

    // !preset - Create an event from a preset template
    if (command === 'preset') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to create events.');
        }

        if (args.length < 2) {
            return message.reply('Usage: `!preset <preset-name> <date-time> [custom-description]`\nExample: `!preset overwatch 15-02-2026 20:00 Competitive night`\nDate format: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\n\nUse `!presets` to see all available presets.');
        }

        const presetName = args[0].toLowerCase();
        
        // Find where the date starts (could be args[1] or args[1] + args[2] if it has AM/PM)
        let dateTimeStr = '';
        let descriptionStartIndex = 2;
        
        // Check if args[3] is AM or PM (meaning time is in args[2])
        if (args[3] && (args[3].toUpperCase() === 'AM' || args[3].toUpperCase() === 'PM')) {
            dateTimeStr = `${args[1]} ${args[2]} ${args[3]}`;
            descriptionStartIndex = 4;
        } else if (args[2] && (args[2].toUpperCase() === 'AM' || args[2].toUpperCase() === 'PM')) {
            dateTimeStr = `${args[1]} ${args[2]}`;
            descriptionStartIndex = 3;
        } else {
            dateTimeStr = `${args[1]} ${args[2] || ''}`;
            descriptionStartIndex = 3;
        }
        
        const customDescription = args.slice(descriptionStartIndex).join(' ');

        if (!presets[presetName]) {
            return message.reply(`❌ Preset "${presetName}" not found. Use \`!presets\` to see available presets.`);
        }

        const preset = presets[presetName];
        const dateTime = parseDateTime(dateTimeStr);

        if (!dateTime) {
            return message.reply('❌ Invalid date format. Use: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\nExample: `!preset overwatch 15-02-2026 20:00` or `!preset overwatch 15-02-2026 08:00 PM`');
        }

        const eventId = `event_${Date.now()}`;
        const newEvent = {
            id: eventId,
            title: preset.name,
            description: customDescription || preset.description,
            dateTime: dateTime.toISOString(),
            duration: preset.duration,
            maxParticipants: preset.maxParticipants,
            roles: JSON.parse(JSON.stringify(preset.roles)), // Deep copy
            signups: {},
            createdBy: message.author.id,
            channelId: message.channel.id,
            guildId: message.guild.id
        };

        // Initialize signups for each role
        preset.roles.forEach(role => {
            newEvent.signups[role.name] = [];
        });

        events[eventId] = newEvent;
        saveEvents();

        // Create in Google Calendar
        if (calendar) {
            const calendarLink = await createGoogleCalendarEvent(newEvent);
            if (calendarLink) {
                newEvent.calendarLink = calendarLink;
                saveEvents();
            }
        }

        const eventEmbed = createEventEmbed(newEvent);
        const buttons = createSignupButtons(newEvent);
        const sentMessage = await message.channel.send({ 
            embeds: [eventEmbed],
            components: buttons || []
        });

        newEvent.messageId = sentMessage.id;
        saveEvents();

        message.reply(`✅ ${preset.name} event created with preset roles!`);
    }

    // !presets - List all available presets
    if (command === 'presets') {
        const embed = new EmbedBuilder()
            .setTitle('📋 Available Event Presets')
            .setDescription('Use `!preset <name> <date-time>` to create an event from a preset')
            .setColor(0x5865F2);

        const presetList = Object.entries(presets).map(([key, preset]) => {
            const rolesList = preset.roles.map(r => `${r.emoji} ${r.name} (${r.maxSlots || '∞'})`).join(', ');
            return `**${key}** - ${preset.name}\n└ Roles: ${rolesList}\n└ Duration: ${preset.duration}min | Max: ${preset.maxParticipants || 'Unlimited'}`;
        }).join('\n\n');

        if (presetList.length > 4096) {
            // Split into multiple embeds if too long
            const presetKeys = Object.keys(presets);
            const midpoint = Math.ceil(presetKeys.length / 2);
            
            const firstHalf = presetKeys.slice(0, midpoint).map(key => {
                const preset = presets[key];
                const rolesList = preset.roles.map(r => `${r.emoji} ${r.name} (${r.maxSlots || '∞'})`).join(', ');
                return `**${key}** - ${preset.name}\n└ Roles: ${rolesList}`;
            }).join('\n\n');

            const secondHalf = presetKeys.slice(midpoint).map(key => {
                const preset = presets[key];
                const rolesList = preset.roles.map(r => `${r.emoji} ${r.name} (${r.maxSlots || '∞'})`).join(', ');
                return `**${key}** - ${preset.name}\n└ Roles: ${rolesList}`;
            }).join('\n\n');

            const embed1 = new EmbedBuilder()
                .setTitle('📋 Available Event Presets (Part 1)')
                .setDescription(firstHalf)
                .setColor(0x5865F2);

            const embed2 = new EmbedBuilder()
                .setTitle('📋 Available Event Presets (Part 2)')
                .setDescription(secondHalf)
                .setColor(0x5865F2)
                .setFooter({ text: 'Use !preset <name> <date-time> to create an event' });

            message.reply({ embeds: [embed1, embed2] });
        } else {
            embed.setDescription(`Use \`!preset <name> <date-time>\` to create an event from a preset\n\n${presetList}`);
            embed.setFooter({ text: `${Object.keys(presets).length} presets available` });
            message.reply({ embeds: [embed] });
        }
    }

    // !addrole - Add a role to an event
    if (command === 'addrole') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to manage events.');
        }

        // Format: !addrole <eventId> <emoji> <roleName> <maxSlots>
        if (args.length < 3) {
            return message.reply('Usage: `!addrole <eventId> <emoji> <role-name> <max-slots>`\nExample: `!addrole event_123 ⚔️ Tank 2`');
        }

        const [eventId, emoji, ...roleNameParts] = args;
        const lastPart = roleNameParts[roleNameParts.length - 1];
        const maxSlots = parseInt(lastPart);
        const roleName = maxSlots ? roleNameParts.slice(0, -1).join(' ') : roleNameParts.join(' ');

        if (!events[eventId]) {
            return message.reply('❌ Event not found. Use `!list` to see all events.');
        }

        const event = events[eventId];
        
        if (!event.roles) event.roles = [];
        if (!event.signups) event.signups = {};

        event.roles.push({
            name: roleName,
            emoji: emoji,
            maxSlots: maxSlots || null
        });

        event.signups[roleName] = [];
        saveEvents();

        // Update the message
        const channel = await client.channels.fetch(event.channelId);
        if (channel && event.messageId) {
            const eventMessage = await channel.messages.fetch(event.messageId);
            const updatedEmbed = createEventEmbed(event);
            const buttons = createSignupButtons(event);
            
            await eventMessage.edit({ 
                embeds: [updatedEmbed], 
                components: buttons || [] 
            });
        }

        message.reply(`✅ Role "${emoji} ${roleName}" added to event!`);
    }

    // !list - List all events
    if (command === 'list') {
        const guildEvents = Object.values(events).filter(e => e.guildId === message.guild.id);
        
        if (guildEvents.length === 0) {
            return message.reply('📭 No events found. Create one with `!create`');
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 Upcoming Events')
            .setColor(0x5865F2);

        guildEvents.forEach(event => {
            const totalSignups = Object.values(event.signups).reduce((sum, arr) => sum + arr.length, 0);
            embed.addFields({
                name: event.title,
                value: `ID: \`${event.id}\`\n📅 ${formatDateTime(event.dateTime)}\n👥 ${totalSignups} signed up`,
                inline: true
            });
        });

        message.reply({ embeds: [embed] });
    }

    // !delete - Delete an event
    if (command === 'delete') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to delete events.');
        }

        const eventId = args[0];
        if (!eventId || !events[eventId]) {
            return message.reply('❌ Event not found. Usage: `!delete <eventId>`');
        }

        delete events[eventId];
        saveEvents();
        message.reply('✅ Event deleted!');
    }

    // !sync - Sync events FROM Google Calendar
    if (command === 'sync') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to sync events.');
        }

        if (!calendar) {
            return message.reply('❌ Google Calendar is not configured. Events cannot be synced.');
        }

        // Optional: filter by calendar name/ID
        const calendarFilter = args.join(' ') || null;
        
        let syncMessage = '🔄 Syncing events from Google Calendar';
        if (calendarFilter) {
            syncMessage += ` (filtering: "${calendarFilter}")`;
        }
        syncMessage += '...';
        
        const loadingMsg = await message.reply(syncMessage);

        const result = await syncFromGoogleCalendar(message.channel.id, message.guild.id, 168, calendarFilter);

        if (!result.success) {
            return loadingMsg.edit(`❌ ${result.message}`);
        }

        if (result.events.length === 0) {
            const calendarsChecked = calendarFilter 
                ? `calendar "${calendarFilter}"` 
                : `${config.calendars.length} calendar(s)`;
            return loadingMsg.edit(`✅ No new events to import from ${calendarsChecked}. All events are already synced!`);
        }

        // Post imported events to Discord
        for (const event of result.events) {
            const eventEmbed = createEventEmbed(event);
            
            // Add calendar source to embed
            if (event.calendarSource) {
                eventEmbed.setFooter({ text: `Event ID: ${event.id} | From: ${event.calendarSource}` });
            }
            
            const buttons = createSignupButtons(event);
            
            const sentMessage = await message.channel.send({ 
                embeds: [eventEmbed],
                components: buttons || []
            });

            event.messageId = sentMessage.id;
        }

        saveEvents();
        
        const summaryParts = [`✅ ${result.message}`];
        if (result.calendars && result.calendars.length > 0) {
            summaryParts.push(`\n📅 Calendars: ${result.calendars.join(', ')}`);
        }
        summaryParts.push('\n\nEvents have been posted to this channel. Use `!addrole` to add signup roles if needed.');
        
        loadingMsg.edit(summaryParts.join(''));
    }

    // !calendars - List configured calendars
    if (command === 'calendars') {
        if (!calendar) {
            return message.reply('❌ Google Calendar is not configured.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 Configured Calendars')
            .setDescription('These calendars are available for syncing:')
            .setColor(0x5865F2);

        config.calendars.forEach((cal, index) => {
            embed.addFields({
                name: `${index + 1}. ${cal.name}`,
                value: `ID: \`${cal.id}\`\nTo sync only this calendar: \`!sync ${cal.name}\``,
                inline: false
            });
        });

        embed.setFooter({ text: `${config.calendars.length} calendar(s) configured` });

        message.reply({ embeds: [embed] });
    }

    // !eventinfo - Show detailed event information with timezone conversions
    if (command === 'eventinfo') {
        const eventId = args[0];
        
        if (!eventId || !events[eventId]) {
            return message.reply('❌ Event not found. Usage: `!eventinfo <eventId>`\n\nGet the event ID from the event embed footer or use `!list`');
        }

        const event = events[eventId];
        const eventDate = new Date(event.dateTime);
        const unixTimestamp = Math.floor(eventDate.getTime() / 1000);
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Event Info: ${event.title}`)
            .setDescription(event.description || 'No description')
            .setColor(0x5865F2)
            .addFields(
                { name: '📅 Original Format', value: formatDateTime(event.dateTime), inline: false },
                { name: '🌍 Discord Timestamps', value: `**Full:** <t:${unixTimestamp}:F>\n**Date:** <t:${unixTimestamp}:D>\n**Time:** <t:${unixTimestamp}:t>\n**Relative:** <t:${unixTimestamp}:R>`, inline: false },
                { name: '🔢 Unix Timestamp', value: `\`${unixTimestamp}\`\n[Copyable for sharing]`, inline: false },
                { name: '🔗 Share This Event', value: `Send this to anyone:\n\`Event at <t:${unixTimestamp}:F>\`\n\nOr use: \`!eventinfo ${eventId}\``, inline: false }
            );

        // Add signup info
        const totalSignups = Object.values(event.signups || {}).reduce((sum, arr) => sum + arr.length, 0);
        embed.addFields({
            name: '👥 Signups',
            value: `${totalSignups} player(s) signed up`,
            inline: true
        });

        // Add duration and max participants
        embed.addFields(
            { name: '⏱️ Duration', value: `${event.duration || 60} minutes`, inline: true },
            { name: '📊 Max Participants', value: event.maxParticipants ? event.maxParticipants.toString() : 'Unlimited', inline: true }
        );

        // Add calendar info if available
        if (event.calendarLink) {
            embed.addFields({ name: '🔗 Google Calendar', value: `[View in Calendar](${event.calendarLink})`, inline: false });
        }

        if (event.calendarSource) {
            embed.addFields({ name: '📅 Source', value: event.calendarSource, inline: true });
        }

        embed.setFooter({ text: `Created by: ${event.createdBy === 'google_calendar' ? 'Google Calendar Import' : 'Discord User'}` });

        message.reply({ embeds: [embed] });
    }

    // !autosync - Toggle automatic sync from Google Calendar
    if (command === 'autosync') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
            return message.reply('❌ You need "Manage Events" permission to manage auto-sync.');
        }

        if (!calendar) {
            return message.reply('❌ Google Calendar is not configured. Auto-sync cannot be enabled.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'on' || subcommand === 'enable') {
            // Enable auto-sync
            if (!autoSyncInterval) {
                startAutoSync(message.channel.id, message.guild.id);
                return message.reply('✅ Auto-sync enabled! Events will be synced from Google Calendar every hour.');
            } else {
                return message.reply('ℹ️ Auto-sync is already enabled.');
            }
        } else if (subcommand === 'off' || subcommand === 'disable') {
            // Disable auto-sync
            if (autoSyncInterval) {
                stopAutoSync();
                return message.reply('✅ Auto-sync disabled.');
            } else {
                return message.reply('ℹ️ Auto-sync is already disabled.');
            }
        } else {
            // Show status
            const status = autoSyncInterval ? 'enabled ✅' : 'disabled ❌';
            return message.reply(`Auto-sync is currently **${status}**\n\nUsage:\n\`!autosync on\` - Enable automatic syncing\n\`!autosync off\` - Disable automatic syncing`);
        }
    }

    // !help - Show help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Event Bot Commands')
            .setDescription('Manage events with Google Calendar integration')
            .setColor(0x5865F2)
            .addFields(
                { name: '!create', value: 'Create a new event\n`!create <title> | <date-time> | <description> | <duration> | <max-participants>`', inline: false },
                { name: '!preset', value: 'Create event from preset template\n`!preset <preset-name> <date-time> [description]`\nExample: `!preset overwatch 15-02-2026 20:00`', inline: false },
                { name: '!presets', value: 'List all available preset templates', inline: false },
                { name: '!addrole', value: 'Add a signup role to an event\n`!addrole <eventId> <emoji> <role-name> <max-slots>`', inline: false },
                { name: '!list', value: 'List all upcoming events', inline: false },
                { name: '!eventinfo', value: 'Show detailed event info with timezones\n`!eventinfo <eventId>`', inline: false },
                { name: '!delete', value: 'Delete an event\n`!delete <eventId>`', inline: false },
                { name: '!sync', value: 'Import events from Google Calendar\n`!sync` - Sync all calendars\n`!sync <calendar-name>` - Sync specific calendar', inline: false },
                { name: '!calendars', value: 'List all configured calendars', inline: false },
                { name: '!autosync', value: 'Manage automatic calendar syncing\n`!autosync on` - Enable hourly sync\n`!autosync off` - Disable auto-sync\n`!autosync` - Check status', inline: false },
                { name: '!help', value: 'Show this help message', inline: false }
            )
            .setFooter({ text: `Event Bot v2.3 • ${Object.keys(presets).length} presets • ${config.calendars.length} calendar(s)` });

        message.reply({ embeds: [embed] });
    }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    console.log(`[Button Click] CustomId: "${customId}"`);
    
    // Parse the customId properly
    // Format: action_eventId_roleName
    // Event IDs are like: event_1770470049678
    // So customId looks like: signup_event_1770470049678_Tank
    // Or: leave_event_1770470049678
    
    let action, eventId, roleName;
    
    if (customId.startsWith('leave_')) {
        // Format: leave_event_1770470049678
        action = 'leave';
        eventId = customId.substring(6); // Remove "leave_"
        roleName = null;
    } else if (customId.startsWith('signup_')) {
        // Format: signup_event_1770470049678_RoleName
        action = 'signup';
        const withoutAction = customId.substring(7); // Remove "signup_"
        
        // Now we have: event_1770470049678_RoleName
        // Find the last underscore (which separates eventId from roleName)
        const lastUnderscore = withoutAction.lastIndexOf('_');
        eventId = withoutAction.substring(0, lastUnderscore); // event_1770470049678
        roleName = withoutAction.substring(lastUnderscore + 1); // RoleName
    } else {
        console.error(`[ERROR] Unknown action in customId: ${customId}`);
        return interaction.reply({ 
            content: '❌ Invalid button action.', 
            flags: 64 // EPHEMERAL flag
        });
    }

    console.log(`[Parse] Action: "${action}" | EventId: "${eventId}" | RoleName: "${roleName}"`);
    console.log(`[Events] Available IDs: ${Object.keys(events).join(', ') || 'None'}`);

    if (!events[eventId]) {
        console.error(`[ERROR] Event "${eventId}" not found in events object`);
        return interaction.reply({ 
            content: '❌ Event not found. The event may have been deleted.', 
            flags: 64 // EPHEMERAL flag
        });
    }

    const event = events[eventId];
    console.log(`[Found] Event "${event.title}" (ID: ${eventId})`);

    if (action === 'signup') {
        const role = event.roles.find(r => r.name === roleName);
        if (!role) {
            return interaction.reply({ content: '❌ Role not found.', flags: 64 });
        }

        // Check if user is already signed up for this role
        if (event.signups[roleName]?.includes(interaction.user.id)) {
            return interaction.reply({ content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, flags: 64 });
        }

        // Check if role is full
        if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
            return interaction.reply({ content: `❌ ${role.emoji} ${roleName} is full!`, flags: 64 });
        }

        // Remove user from other roles
        Object.keys(event.signups).forEach(r => {
            event.signups[r] = event.signups[r].filter(id => id !== interaction.user.id);
        });

        // Add user to role
        if (!event.signups[roleName]) event.signups[roleName] = [];
        event.signups[roleName].push(interaction.user.id);
        saveEvents();

        // Update the message
        const updatedEmbed = createEventEmbed(event);
        const buttons = createSignupButtons(event);
        await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });

        await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, flags: 64 });
    }

    if (action === 'leave') {
        let wasSignedUp = false;
        
        // Remove user from all roles
        Object.keys(event.signups).forEach(r => {
            const initialLength = event.signups[r].length;
            event.signups[r] = event.signups[r].filter(id => id !== interaction.user.id);
            if (event.signups[r].length < initialLength) wasSignedUp = true;
        });

        if (!wasSignedUp) {
            return interaction.reply({ content: '❌ You were not signed up for this event.', flags: 64 });
        }

        saveEvents();

        // Update the message
        const updatedEmbed = createEventEmbed(event);
        const buttons = createSignupButtons(event);
        await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });

        await interaction.followUp({ content: '✅ You have left the event.', flags: 64 });
    }
});

// Login
client.login(config.token).catch(error => {
    console.error('Failed to login:', error.message);
    console.log('\n⚠️  Please set your Discord bot token in the config.json file or DISCORD_TOKEN environment variable');
});
