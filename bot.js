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
    calendarId: process.env.CALENDAR_ID || 'primary'
};

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
    const embed = new EmbedBuilder()
        .setTitle(event.title)
        .setDescription(event.description || 'No description provided')
        .setColor(0x5865F2)
        .addFields(
            { name: '📅 Date & Time', value: formatDateTime(event.dateTime), inline: true },
            { name: '⏱️ Duration', value: `${event.duration || 60} minutes`, inline: true },
            { name: '👥 Max Participants', value: event.maxParticipants ? event.maxParticipants.toString() : 'Unlimited', inline: true }
        );

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

    embed.setFooter({ text: `Event ID: ${event.id}` });
    
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

        const response = await calendar.events.insert({
            calendarId: config.calendarId,
            resource: calendarEvent,
        });

        return response.data.htmlLink;
    } catch (error) {
        console.error('Error creating Google Calendar event:', error.message);
        return null;
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`🔗 Google Calendar: ${calendar ? 'Connected' : 'Not configured'}`);
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

    // !help - Show help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Event Bot Commands')
            .setDescription('Manage events with Google Calendar integration')
            .setColor(0x5865F2)
            .addFields(
                { name: '!create', value: 'Create a new event\n`!create <title> | <date-time> | <description> | <duration> | <max-participants>`', inline: false },
                { name: '!preset', value: 'Create event from preset template\n`!preset <preset-name> <date-time> [description]`\nExample: `!preset overwatch 2026-02-15 20:00`', inline: false },
                { name: '!presets', value: 'List all available preset templates', inline: false },
                { name: '!addrole', value: 'Add a signup role to an event\n`!addrole <eventId> <emoji> <role-name> <max-slots>`', inline: false },
                { name: '!list', value: 'List all upcoming events', inline: false },
                { name: '!delete', value: 'Delete an event\n`!delete <eventId>`', inline: false },
                { name: '!help', value: 'Show this help message', inline: false }
            )
            .setFooter({ text: `Event Bot v2.0 • ${Object.keys(presets).length} presets available` });

        message.reply({ embeds: [embed] });
    }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, eventId, roleName] = interaction.customId.split('_');

    if (!events[eventId]) {
        return interaction.reply({ content: '❌ Event not found.', ephemeral: true });
    }

    const event = events[eventId];

    if (action === 'signup') {
        const role = event.roles.find(r => r.name === roleName);
        if (!role) {
            return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
        }

        // Check if user is already signed up for this role
        if (event.signups[roleName]?.includes(interaction.user.id)) {
            return interaction.reply({ content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
        }

        // Check if role is full
        if (role.maxSlots && event.signups[roleName]?.length >= role.maxSlots) {
            return interaction.reply({ content: `❌ ${role.emoji} ${roleName} is full!`, ephemeral: true });
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

        await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
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
            return interaction.reply({ content: '❌ You were not signed up for this event.', ephemeral: true });
        }

        saveEvents();

        // Update the message
        const updatedEmbed = createEventEmbed(event);
        const buttons = createSignupButtons(event);
        await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });

        await interaction.followUp({ content: '✅ You have left the event.', ephemeral: true });
    }
});

// Login
client.login(config.token).catch(error => {
    console.error('Failed to login:', error.message);
    console.log('\n⚠️  Please set your Discord bot token in the config.json file or DISCORD_TOKEN environment variable');
});
