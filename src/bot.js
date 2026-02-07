// src/bot.js
const { Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits } = require('discord.js');
const { config, validateConfig } = require('./config');
const CalendarService = require('./services/calendar');
const EventManager = require('./services/eventManager');
const PresetManager = require('./services/presetManager');
const EmbedBuilder = require('./discord/embedBuilder');
const ButtonBuilder = require('./discord/buttonBuilder');
const { getCommands } = require('./discord/commands');
const { parseDateTime } = require('./utils/datetime');

// Validate configuration
validateConfig();

// Initialize services
const calendarService = new CalendarService(
    config.google.credentials,
    config.google.calendars
);

const eventManager = new EventManager(config.files.events, calendarService);
const presetManager = new PresetManager(config.files.presets);

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Auto-sync state
let autoSyncInterval = null;
let autoSyncChannelId = null;
let autoSyncGuildId = null;

/**
 * Register slash commands
 */
async function registerCommands(clientId) {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    try {
        console.log('🔄 Registering slash commands...');
        
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: getCommands() },
        );
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

/**
 * Start auto-sync
 */
function startAutoSync(channelId, guildId) {
    autoSyncChannelId = channelId;
    autoSyncGuildId = guildId;
    
    // Run initial sync
    syncFromCalendar(channelId, guildId).catch(console.error);
    
    // Set up interval
    autoSyncInterval = setInterval(async () => {
        console.log('[AutoSync] Running scheduled sync...');
        await syncFromCalendar(channelId, guildId);
    }, config.bot.autoSyncInterval);
    
    console.log('[AutoSync] ✅ Auto-sync enabled');
}

/**
 * Stop auto-sync
 */
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        autoSyncChannelId = null;
        autoSyncGuildId = null;
        console.log('[AutoSync] ❌ Auto-sync disabled');
    }
}

/**
 * Sync events from Google Calendar
 */
async function syncFromCalendar(channelId, guildId, calendarFilter = null) {
    const result = await calendarService.syncEvents(168, calendarFilter);
    
    if (result.success && result.events.length > 0) {
        const channel = await client.channels.fetch(channelId);
        
        for (const eventData of result.events) {
            const event = eventManager.importCalendarEvent(eventData, channelId, guildId);
            
            if (event) {
                const eventEmbed = EmbedBuilder.createEventEmbed(event);
                const buttons = ButtonBuilder.createSignupButtons(event);
                
                const sentMessage = await channel.send({ 
                    embeds: [eventEmbed],
                    components: buttons || []
                });
                
                eventManager.updateEvent(event.id, { messageId: sentMessage.id });
            }
        }
        
        console.log(`[AutoSync] ✅ Posted ${result.events.length} new events`);
    }
    
    return result;
}

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`🔗 Google Calendar: ${calendarService.isEnabled() ? 'Connected' : 'Not configured'}`);
    console.log(`📋 Loaded ${presetManager.getPresetCount()} event presets`);
    
    // Set client ID
    config.discord.clientId = client.user.id;
    
    // Register slash commands
    await registerCommands(client.user.id);
    
    // Test calendar connection
    if (calendarService.isEnabled()) {
        await calendarService.testConnection();
    }
});

// Handle autocomplete
client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;
    
    if (interaction.commandName === 'preset' || interaction.commandName === 'deletepreset') {
        const focusedValue = interaction.options.getFocused();
        const presets = presetManager.searchPresets(focusedValue);
        
        await interaction.respond(
            presets.slice(0, 25).map(preset => ({ 
                name: preset.name, 
                value: preset.key 
            }))
        );
    }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const commandHandlers = require('./discord/commandHandlers');
    const handler = commandHandlers[interaction.commandName];
    
    if (handler) {
        try {
            await handler(interaction, {
                eventManager,
                presetManager,
                calendarService,
                parseDateTime,
                startAutoSync,
                stopAutoSync,
                syncFromCalendar,
                autoSyncInterval,
                EmbedBuilder,
                ButtonBuilder
            });
        } catch (error) {
            console.error(`Error handling command ${interaction.commandName}:`, error);
            const reply = { content: `❌ Error: ${error.message}`, ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    try {
        const { action, eventId, roleName } = ButtonBuilder.parseButtonId(interaction.customId);
        const event = eventManager.getEvent(eventId);
        
        if (!event) {
            return interaction.reply({ 
                content: '❌ Event not found. The event may have been deleted.', 
                ephemeral: true
            });
        }
        
        if (action === 'signup') {
            const role = event.roles.find(r => r.name === roleName);
            if (!role) {
                return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
            }
            
            if (event.signups[roleName]?.includes(interaction.user.id)) {
                return interaction.reply({ content: `✅ You're already signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
            }
            
            eventManager.signupUser(eventId, interaction.user.id, roleName);
            
            const updatedEvent = eventManager.getEvent(eventId);
            const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
            const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
            
            await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
            await interaction.followUp({ content: `✅ Signed up as ${role.emoji} ${roleName}!`, ephemeral: true });
        }
        
        if (action === 'leave') {
            const { removed } = eventManager.removeUser(eventId, interaction.user.id);
            
            if (!removed) {
                return interaction.reply({ content: '❌ You were not signed up for this event.', ephemeral: true });
            }
            
            const updatedEvent = eventManager.getEvent(eventId);
            const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
            const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
            
            await interaction.update({ embeds: [updatedEmbed], components: buttons || [] });
            await interaction.followUp({ content: '✅ You have left the event.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling button interaction:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
});

// Login
client.login(config.discord.token).catch(error => {
    console.error('Failed to login:', error.message);
    console.log('\n⚠️  Please set your Discord bot token in the .env file');
    process.exit(1);
});

// Export for testing
module.exports = {
    client,
    eventManager,
    presetManager,
    calendarService
};
