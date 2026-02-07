const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
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
function parseCalendarIds(calendarIdsString) {
    const calendars = [];
    const parts = calendarIdsString.split(',').map(s => s.trim()).filter(s => s);
    
    parts.forEach((part, index) => {
        if (part.includes(':')) {
            const [name, id] = part.split(':').map(s => s.trim());
            calendars.push({ name, id });
        } else {
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

// Start auto-sync
function startAutoSync(channelId, guildId) {
    autoSyncChannelId = channelId;
    autoSyncGuildId = guildId;
    
    syncFromGoogleCalendar(channelId, guildId).then(result => {
        console.log(`[AutoSync] Initial sync: ${result.message}`);
    });

    autoSyncInterval = setInterval(async () => {
        console.log('[AutoSync] Running scheduled sync...');
        const result = await syncFromGoogleCalendar(channelId, guildId);
        
        if (result.success && result.events.length > 0) {
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
    }, 60 * 60 * 1000);

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
    const parts = dateTimeStr.trim().split(' ');
    
    if (parts.length < 2) {
        return null;
    }
    
    const datePart = parts[0];
    const timePart = parts[1];
    const meridiem = parts[2]?.toUpperCase();
    
    const dateComponents = datePart.split('-');
    if (dateComponents.length !== 3) {
        return null;
    }
    
    const day = parseInt(dateComponents[0]);
    const month = parseInt(dateComponents[1]) - 1;
    const year = parseInt(dateComponents[2]);
    
    const timeComponents = timePart.split(':');
    if (timeComponents.length !== 2) {
        return null;
    }
    
    let hours = parseInt(timeComponents[0]);
    const minutes = parseInt(timeComponents[1]);
    
    if (meridiem) {
        if (meridiem === 'PM' && hours < 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
    }
    
    const dateTime = new Date(year, month, day, hours, minutes);
    
    if (isNaN(dateTime.getTime())) {
        return null;
    }
    
    return dateTime;
}

// Helper function to format date for display
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
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
        
        let calendarsToSync = config.calendars;
        if (calendarFilter) {
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
                    if (!calEvent.start || !calEvent.start.dateTime) {
                        console.log(`[Sync] Skipping all-day event: ${calEvent.summary}`);
                        continue;
                    }

                    const existingEvent = Object.values(events).find(e => 
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
                        calendarSourceId: cal.id + '_' + calEvent.id,
                        calendarSource: cal.name,
                        calendarLink: calEvent.htmlLink
                    };

                    events[eventId] = newEvent;
                    importedEvents.push(newEvent);
                    console.log(`[Sync] Imported from "${cal.name}": ${calEvent.summary}`);
                }
            } catch (error) {
                console.error(`[Sync] Error fetching from "${cal.name}": ${error.message}`);
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

    const discordTimestamp = `<t:${unixTimestamp}:F>`;
    const relativeTime = `<t:${unixTimestamp}:R>`;
    
    embed.addFields({
        name: '🌍 Your Time',
        value: `${discordTimestamp}\n${relativeTime}`,
        inline: false
    });

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

    if (event.calendarLink) {
        embed.addFields({ name: '🔗 Google Calendar', value: `[View in Calendar](${event.calendarLink})`, inline: false });
    }

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

        const targetCalendar = config.calendars[0];
        console.log(`[Calendar] Creating event "${event.title}" in calendar: ${targetCalendar.name}`);
        
        const response = await calendar.events.insert({
            calendarId: targetCalendar.id,
            resource: calendarEvent,
        });

        console.log(`[Calendar] ✅ Event created successfully`);
        return response.data.htmlLink;
    } catch (error) {
        console.error('[Calendar] ❌ Error creating event:', error.message);
        return null;
    }
}

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a new event')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Event title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('datetime')
                .setDescription('Date and time (DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Event description')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('max_participants')
                .setDescription('Maximum participants (0 for unlimited)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('preset')
        .setDescription('Create an event from a preset')
        .addStringOption(option =>
            option.setName('preset_name')
                .setDescription('Name of the preset')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('datetime')
                .setDescription('Date and time (DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('custom_description')
                .setDescription('Custom description (optional)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('presets')
        .setDescription('List all available event presets'),

    new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add a signup role to an event')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('Event ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Role emoji')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role_name')
                .setDescription('Role name')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_slots')
                .setDescription('Maximum slots for this role')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all events'),

    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete an event')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('Event ID to delete')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Sync events from Google Calendar')
        .addStringOption(option =>
            option.setName('calendar_filter')
                .setDescription('Filter by calendar name (optional)')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('calendars')
        .setDescription('List configured calendars'),

    new SlashCommandBuilder()
        .setName('eventinfo')
        .setDescription('Show detailed event information')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('Event ID')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('autosync')
        .setDescription('Manage automatic calendar syncing')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(false)
                .addChoices(
                    { name: 'Enable', value: 'on' },
                    { name: 'Disable', value: 'off' },
                    { name: 'Status', value: 'status' }
                )),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot commands and help'),

    new SlashCommandBuilder()
        .setName('deletepreset')
        .setDescription('Delete a custom preset')
        .addStringOption(option =>
            option.setName('preset_name')
                .setDescription('Name of the preset to delete')
                .setRequired(true)
                .setAutocomplete(true)),
];

// Register slash commands
async function registerCommands(clientId) {
    const rest = new REST({ version: '10' }).setToken(config.token);
    
    try {
        console.log('🔄 Registering slash commands...');
        
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`🔗 Google Calendar: ${calendar ? 'Connected' : 'Not configured'}`);
    
    // Register slash commands
    await registerCommands(client.user.id);
    
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
            }
        }
    }
});

// Handle autocomplete for presets
client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;
    
    if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
        const focusedValue = interaction.options.getFocused();
        const choices = Object.keys(presets).filter(choice =>
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        );
        
        await interaction.respond(
            choices.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // /create
    if (commandName === 'create') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to create events.', ephemeral: true });
        }

        const title = interaction.options.getString('title');
        const dateTimeStr = interaction.options.getString('datetime');
        const description = interaction.options.getString('description') || '';
        const duration = interaction.options.getInteger('duration') || 60;
        const maxParticipants = interaction.options.getInteger('max_participants') || 0;

        const dateTime = parseDateTime(dateTimeStr);
        
        if (!dateTime) {
            return interaction.reply({ 
                content: '❌ Invalid date format. Use: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\nExample: 15-02-2026 20:00 or 15-02-2026 08:00 PM', 
                ephemeral: true 
            });
        }

        const eventId = `event_${Date.now()}`;
        const newEvent = {
            id: eventId,
            title,
            description,
            dateTime: dateTime.toISOString(),
            duration,
            maxParticipants,
            roles: [],
            signups: {},
            createdBy: interaction.user.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id
        };

        events[eventId] = newEvent;
        saveEvents();

        if (calendar) {
            const calendarLink = await createGoogleCalendarEvent(newEvent);
            if (calendarLink) {
                newEvent.calendarLink = calendarLink;
                saveEvents();
            }
        }

        const eventEmbed = createEventEmbed(newEvent);
        const sentMessage = await interaction.channel.send({ embeds: [eventEmbed] });
        
        newEvent.messageId = sentMessage.id;
        saveEvents();

        await interaction.reply({ content: `✅ Event created! Use \`/addrole event_id:${eventId}\` to add signup roles.`, ephemeral: true });
    }

    // /preset
    if (commandName === 'preset') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to create events.', ephemeral: true });
        }

        const presetName = interaction.options.getString('preset_name').toLowerCase();
        const dateTimeStr = interaction.options.getString('datetime');
        const customDescription = interaction.options.getString('custom_description');

        if (!presets[presetName]) {
            return interaction.reply({ content: `❌ Preset "${presetName}" not found. Use \`/presets\` to see available presets.`, ephemeral: true });
        }

        const preset = presets[presetName];
        const dateTime = parseDateTime(dateTimeStr);

        if (!dateTime) {
            return interaction.reply({ 
                content: '❌ Invalid date format. Use: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\nExample: 15-02-2026 20:00 or 15-02-2026 08:00 PM', 
                ephemeral: true 
            });
        }

        const eventId = `event_${Date.now()}`;
        const newEvent = {
            id: eventId,
            title: preset.name,
            description: customDescription || preset.description,
            dateTime: dateTime.toISOString(),
            duration: preset.duration,
            maxParticipants: preset.maxParticipants,
            roles: JSON.parse(JSON.stringify(preset.roles)),
            signups: {},
            createdBy: interaction.user.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id
        };

        preset.roles.forEach(role => {
            newEvent.signups[role.name] = [];
        });

        events[eventId] = newEvent;
        saveEvents();

        if (calendar) {
            const calendarLink = await createGoogleCalendarEvent(newEvent);
            if (calendarLink) {
                newEvent.calendarLink = calendarLink;
                saveEvents();
            }
        }

        const eventEmbed = createEventEmbed(newEvent);
        const buttons = createSignupButtons(newEvent);
        const sentMessage = await interaction.channel.send({ 
            embeds: [eventEmbed],
            components: buttons || []
        });

        newEvent.messageId = sentMessage.id;
        saveEvents();

        await interaction.reply({ content: `✅ ${preset.name} event created with preset roles!`, ephemeral: true });
    }

    // /presets
    if (commandName === 'presets') {
        const embed = new EmbedBuilder()
            .setTitle('📋 Available Event Presets')
            .setDescription('Use `/preset` to create an event from a preset')
            .setColor(0x5865F2);

        const presetList = Object.entries(presets).map(([key, preset]) => {
            const rolesList = preset.roles.map(r => `${r.emoji} ${r.name} (${r.maxSlots || '∞'})`).join(', ');
            return `**${key}** - ${preset.name}\n└ Roles: ${rolesList}\n└ Duration: ${preset.duration}min | Max: ${preset.maxParticipants || 'Unlimited'}`;
        }).join('\n\n');

        if (presetList.length > 4096) {
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
                .setFooter({ text: 'Use /preset to create an event' });

            await interaction.reply({ embeds: [embed1, embed2], ephemeral: true });
        } else {
            embed.setDescription(`Use \`/preset\` to create an event from a preset\n\n${presetList}`);
            embed.setFooter({ text: `${Object.keys(presets).length} presets available` });
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // /addrole
    if (commandName === 'addrole') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to manage events.', ephemeral: true });
        }

        const eventId = interaction.options.getString('event_id');
        const emoji = interaction.options.getString('emoji');
        const roleName = interaction.options.getString('role_name');
        const maxSlots = interaction.options.getInteger('max_slots');

        if (!events[eventId]) {
            return interaction.reply({ content: '❌ Event not found. Use `/list` to see all events.', ephemeral: true });
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

        await interaction.reply({ content: `✅ Role "${emoji} ${roleName}" added to event!`, ephemeral: true });
    }

    // /list
    if (commandName === 'list') {
        const guildEvents = Object.values(events).filter(e => e.guildId === interaction.guild.id);
        
        if (guildEvents.length === 0) {
            return interaction.reply({ content: '📭 No events found. Create one with `/create`', ephemeral: true });
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /delete
    if (commandName === 'delete') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to delete events.', ephemeral: true });
        }

        const eventId = interaction.options.getString('event_id');
        
        if (!events[eventId]) {
            return interaction.reply({ content: '❌ Event not found.', ephemeral: true });
        }

        delete events[eventId];
        saveEvents();
        await interaction.reply({ content: '✅ Event deleted!', ephemeral: true });
    }

    // /sync
    if (commandName === 'sync') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to sync events.', ephemeral: true });
        }

        if (!calendar) {
            return interaction.reply({ content: '❌ Google Calendar is not configured. Events cannot be synced.', ephemeral: true });
        }

        const calendarFilter = interaction.options.getString('calendar_filter');
        
        await interaction.deferReply({ ephemeral: true });

        const result = await syncFromGoogleCalendar(interaction.channel.id, interaction.guild.id, 168, calendarFilter);

        if (!result.success) {
            return interaction.editReply(`❌ ${result.message}`);
        }

        if (result.events.length === 0) {
            const calendarsChecked = calendarFilter 
                ? `calendar "${calendarFilter}"` 
                : `${config.calendars.length} calendar(s)`;
            return interaction.editReply(`✅ No new events to import from ${calendarsChecked}. All events are already synced!`);
        }

        for (const event of result.events) {
            const eventEmbed = createEventEmbed(event);
            const buttons = createSignupButtons(event);
            
            const sentMessage = await interaction.channel.send({ 
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
        summaryParts.push('\n\nEvents have been posted to this channel.');
        
        await interaction.editReply(summaryParts.join(''));
    }

    // /calendars
    if (commandName === 'calendars') {
        if (!calendar) {
            return interaction.reply({ content: '❌ Google Calendar is not configured.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 Configured Calendars')
            .setDescription('These calendars are available for syncing:')
            .setColor(0x5865F2);

        config.calendars.forEach((cal, index) => {
            embed.addFields({
                name: `${index + 1}. ${cal.name}`,
                value: `ID: \`${cal.id}\`\nTo sync: \`/sync calendar_filter:${cal.name}\``,
                inline: false
            });
        });

        embed.setFooter({ text: `${config.calendars.length} calendar(s) configured` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /eventinfo
    if (commandName === 'eventinfo') {
        const eventId = interaction.options.getString('event_id');
        
        if (!events[eventId]) {
            return interaction.reply({ content: '❌ Event not found. Get the event ID from `/list`', ephemeral: true });
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /autosync
    if (commandName === 'autosync') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to manage auto-sync.', ephemeral: true });
        }

        if (!calendar) {
            return interaction.reply({ content: '❌ Google Calendar is not configured. Auto-sync cannot be enabled.', ephemeral: true });
        }

        const action = interaction.options.getString('action') || 'status';

        if (action === 'on') {
            if (!autoSyncInterval) {
                startAutoSync(interaction.channel.id, interaction.guild.id);
                return interaction.reply({ content: '✅ Auto-sync enabled! Events will be synced from Google Calendar every hour.', ephemeral: true });
            } else {
                return interaction.reply({ content: 'ℹ️ Auto-sync is already enabled.', ephemeral: true });
            }
        } else if (action === 'off') {
            if (autoSyncInterval) {
                stopAutoSync();
                return interaction.reply({ content: '✅ Auto-sync disabled.', ephemeral: true });
            } else {
                return interaction.reply({ content: 'ℹ️ Auto-sync is already disabled.', ephemeral: true });
            }
        } else {
            const status = autoSyncInterval ? 'enabled ✅' : 'disabled ❌';
            return interaction.reply({ content: `Auto-sync is currently **${status}**\n\nUse \`/autosync action:on\` to enable or \`/autosync action:off\` to disable.`, ephemeral: true });
        }
    }

    // /help
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
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
            .setFooter({ text: `Event Bot v3.0 (Slash Commands) • ${Object.keys(presets).length} presets • ${config.calendars.length} calendar(s)` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // /deletepreset
    if (commandName === 'deletepreset') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
            return interaction.reply({ content: '❌ You need "Manage Events" permission to delete presets.', ephemeral: true });
        }

        const presetName = interaction.options.getString('preset_name').toLowerCase();

        if (!presets[presetName]) {
            return interaction.reply({ content: `❌ Preset "${presetName}" not found.`, ephemeral: true });
        }

        const presetDisplayName = presets[presetName].name;
        delete presets[presetName];
        
        // Save updated presets
        fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
        
        // Reload presets
        presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));

        await interaction.reply({ 
            content: `✅ Preset "${presetDisplayName}" (${presetName}) has been deleted.\n\n⚠️ Note: Events already created with this preset will not be affected.`, 
            ephemeral: true 
        });
    }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    console.log(`[Button Click] CustomId: "${customId}"`);
    
    let action, eventId, roleName;
    
    if (customId.startsWith('leave_')) {
        action = 'leave';
        eventId = customId.substring(6);
        roleName = null;
    } else if (customId.startsWith('signup_')) {
        action = 'signup';
        const withoutAction = customId.substring(7);
        const lastUnderscore = withoutAction.lastIndexOf('_');
        eventId = withoutAction.substring(0, lastUnderscore);
        roleName = withoutAction.substring(lastUnderscore + 1);
    } else {
        console.error(`[ERROR] Unknown action in customId: ${customId}`);
        return interaction.reply({ 
            content: '❌ Invalid button action.', 
            ephemeral: true
        });
    }

    console.log(`[Parse] Action: "${action}" | EventId: "${eventId}" | RoleName: "${roleName}"`);

    if (!events[eventId]) {
        console.error(`[ERROR] Event "${eventId}" not found in events object`);
        return interaction.reply({ 
            content: '❌ Event not found. The event may have been deleted.', 
            ephemeral: true
        });
    }

    const event = events[eventId];
    console.log(`[Found] Event "${event.title}" (ID: ${eventId})`);

    if (action === 'signup') {
        const role = event.roles.find(r => r.name === roleName);
        if (!role) {
            return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
        }

        if (event.signups[roleName]?.includes(interaction.user.id)) {
            return interaction.reply({ content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
        }

        if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
            return interaction.reply({ content: `❌ ${role.emoji} ${roleName} is full!`, ephemeral: true });
        }

        Object.keys(event.signups).forEach(r => {
            event.signups[r] = event.signups[r].filter(id => id !== interaction.user.id);
        });

        if (!event.signups[roleName]) event.signups[roleName] = [];
        event.signups[roleName].push(interaction.user.id);
        saveEvents();

        const updatedEmbed = createEventEmbed(event);
        const buttons = createSignupButtons(event);
        await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });

        await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
    }

    if (action === 'leave') {
        let wasSignedUp = false;
        
        Object.keys(event.signups).forEach(r => {
            const initialLength = event.signups[r].length;
            event.signups[r] = event.signups[r].filter(id => id !== interaction.user.id);
            if (event.signups[r].length < initialLength) wasSignedUp = true;
        });

        if (!wasSignedUp) {
            return interaction.reply({ content: '❌ You were not signed up for this event.', ephemeral: true });
        }

        saveEvents();

        const updatedEmbed = createEventEmbed(event);
        const buttons = createSignupButtons(event);
        await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });

        await interaction.followUp({ content: '✅ You have left the event.', ephemeral: true });
    }
});

// Login
client.login(config.token).catch(error => {
    console.error('Failed to login:', error.message);
    console.log('\n⚠️  Please set your Discord bot token in the .env file');
});