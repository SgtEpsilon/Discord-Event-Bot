// src/discord/commandHandlers.js
const { PermissionFlagsBits } = require('discord.js');

/**
 * Command handler for /create
 */
async function handleCreate(interaction, context) {
    const { eventManager, parseDateTime, EmbedBuilder, ButtonBuilder } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to create events.', 
            ephemeral: true 
        });
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

    const event = await eventManager.createEvent({
        title,
        description,
        dateTime: dateTime.toISOString(),
        duration,
        maxParticipants,
        roles: [],
        createdBy: interaction.user.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id
    });

    const eventEmbed = EmbedBuilder.createEventEmbed(event);
    const sentMessage = await interaction.channel.send({ embeds: [eventEmbed] });
    
    eventManager.updateEvent(event.id, { messageId: sentMessage.id });

    await interaction.reply({ 
        content: `✅ Event created! Use \`/addrole event_id:${event.id}\` to add signup roles.`, 
        ephemeral: true 
    });
}

/**
 * Command handler for /preset
 */
async function handlePreset(interaction, context) {
    const { eventManager, presetManager, parseDateTime, EmbedBuilder, ButtonBuilder } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to create events.', 
            ephemeral: true 
        });
    }

    const presetName = interaction.options.getString('preset_name').toLowerCase();
    const dateTimeStr = interaction.options.getString('datetime');
    const customDescription = interaction.options.getString('custom_description');

    const preset = presetManager.getPreset(presetName);
    if (!preset) {
        return interaction.reply({ 
            content: `❌ Preset "${presetName}" not found. Use \`/presets\` to see available presets.`, 
            ephemeral: true 
        });
    }

    const dateTime = parseDateTime(dateTimeStr);
    if (!dateTime) {
        return interaction.reply({ 
            content: '❌ Invalid date format. Use: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM AM/PM\nExample: 15-02-2026 20:00 or 15-02-2026 08:00 PM', 
            ephemeral: true 
        });
    }

    const event = await eventManager.createFromPreset(
        preset,
        dateTimeStr,
        customDescription
    );
    
    eventManager.updateEvent(event.id, {
        createdBy: interaction.user.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id
    });

    const eventEmbed = EmbedBuilder.createEventEmbed(event);
    const buttons = ButtonBuilder.createSignupButtons(event);
    const sentMessage = await interaction.channel.send({ 
        embeds: [eventEmbed],
        components: buttons || []
    });

    eventManager.updateEvent(event.id, { messageId: sentMessage.id });

    await interaction.reply({ 
        content: `✅ ${preset.name} event created with preset roles!`, 
        ephemeral: true 
    });
}

/**
 * Command handler for /presets
 */
async function handlePresets(interaction, context) {
    const { presetManager, EmbedBuilder } = context;
    
    const presets = presetManager.loadPresets();
    const embed = EmbedBuilder.createEventEmbed.constructor === Function 
        ? new (require('discord.js').EmbedBuilder)()
        : new EmbedBuilder();
    
    embed.setTitle('📋 Available Event Presets')
        .setDescription('Use `/preset` to create an event from a preset')
        .setColor(0x5865F2);

    const presetList = Object.entries(presets).map(([key, preset]) => {
        const rolesList = preset.roles.map(r => `${r.emoji} ${r.name} (${r.maxSlots || '∞'})`).join(', ');
        return `**${key}** - ${preset.name}\n└ Roles: ${rolesList}\n└ Duration: ${preset.duration}min | Max: ${preset.maxParticipants || 'Unlimited'}`;
    }).join('\n\n');

    if (presetList.length > 4096) {
        // Split into multiple embeds
        const presetKeys = Object.keys(presets);
        const midpoint = Math.ceil(presetKeys.length / 2);
        
        const { EmbedBuilder: EB } = require('discord.js');
        const embed1 = new EB()
            .setTitle('📋 Available Event Presets (Part 1)')
            .setDescription(presetList.substring(0, 2000))
            .setColor(0x5865F2);

        const embed2 = new EB()
            .setTitle('📋 Available Event Presets (Part 2)')
            .setDescription(presetList.substring(2000))
            .setColor(0x5865F2)
            .setFooter({ text: 'Use /preset to create an event' });

        await interaction.reply({ embeds: [embed1, embed2], ephemeral: true });
    } else {
        embed.setDescription(`Use \`/preset\` to create an event from a preset\n\n${presetList}`);
        embed.setFooter({ text: `${Object.keys(presets).length} presets available` });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

/**
 * Command handler for /addrole
 */
async function handleAddRole(interaction, context) {
    const { eventManager, EmbedBuilder, ButtonBuilder } = context;
    const client = interaction.client;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to manage events.', 
            ephemeral: true 
        });
    }

    const eventId = interaction.options.getString('event_id');
    const emoji = interaction.options.getString('emoji');
    const roleName = interaction.options.getString('role_name');
    const maxSlots = interaction.options.getInteger('max_slots');

    const event = eventManager.getEvent(eventId);
    if (!event) {
        return interaction.reply({ 
            content: '❌ Event not found. Use `/list` to see all events.', 
            ephemeral: true 
        });
    }

    eventManager.addRole(eventId, {
        name: roleName,
        emoji: emoji,
        maxSlots: maxSlots || null
    });

    const updatedEvent = eventManager.getEvent(eventId);
    const channel = await client.channels.fetch(event.channelId);
    
    if (channel && event.messageId) {
        const eventMessage = await channel.messages.fetch(event.messageId);
        const updatedEmbed = EmbedBuilder.createEventEmbed(updatedEvent);
        const buttons = ButtonBuilder.createSignupButtons(updatedEvent);
        
        await eventMessage.edit({ 
            embeds: [updatedEmbed], 
            components: buttons || [] 
        });
    }

    await interaction.reply({ 
        content: `✅ Role "${emoji} ${roleName}" added to event!`, 
        ephemeral: true 
    });
}

/**
 * Command handler for /list
 */
async function handleList(interaction, context) {
    const { eventManager, EmbedBuilder } = context;
    
    const guildEvents = eventManager.getGuildEvents(interaction.guild.id);
    
    if (guildEvents.length === 0) {
        return interaction.reply({ 
            content: '📭 No events found. Create one with `/create`', 
            ephemeral: true 
        });
    }

    const embed = EmbedBuilder.createEventListEmbed(guildEvents);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Command handler for /delete
 */
async function handleDelete(interaction, context) {
    const { eventManager } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to delete events.', 
            ephemeral: true 
        });
    }

    const eventId = interaction.options.getString('event_id');
    
    if (!eventManager.getEvent(eventId)) {
        return interaction.reply({ 
            content: '❌ Event not found.', 
            ephemeral: true 
        });
    }

    eventManager.deleteEvent(eventId);
    await interaction.reply({ 
        content: '✅ Event deleted!', 
        ephemeral: true 
    });
}

/**
 * Command handler for /sync
 */
async function handleSync(interaction, context) {
    const { calendarService, syncFromCalendar } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to sync events.', 
            ephemeral: true 
        });
    }

    if (!calendarService.isEnabled()) {
        return interaction.reply({ 
            content: '❌ Google Calendar is not configured. Events cannot be synced.', 
            ephemeral: true 
        });
    }

    const calendarFilter = interaction.options.getString('calendar_filter');
    
    await interaction.deferReply({ ephemeral: true });

    const result = await syncFromCalendar(
        interaction.channel.id, 
        interaction.guild.id, 
        calendarFilter
    );

    if (!result.success) {
        return interaction.editReply(`❌ ${result.message}`);
    }

    if (result.events.length === 0) {
        const calendarsChecked = calendarFilter 
            ? `calendar "${calendarFilter}"` 
            : `${calendarService.getCalendars().length} calendar(s)`;
        return interaction.editReply(
            `✅ No new events to import from ${calendarsChecked}. All events are already synced!`
        );
    }

    const summaryParts = [`✅ ${result.message}`];
    if (result.calendars && result.calendars.length > 0) {
        summaryParts.push(`\n📅 Calendars: ${result.calendars.join(', ')}`);
    }
    summaryParts.push('\n\nEvents have been posted to this channel.');
    
    await interaction.editReply(summaryParts.join(''));
}

/**
 * Command handler for /calendars
 */
async function handleCalendars(interaction, context) {
    const { calendarService, EmbedBuilder } = context;
    
    if (!calendarService.isEnabled()) {
        return interaction.reply({ 
            content: '❌ Google Calendar is not configured.', 
            ephemeral: true 
        });
    }

    const calendars = calendarService.getCalendars();
    const embed = EmbedBuilder.createCalendarListEmbed(calendars);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Command handler for /eventinfo
 */
async function handleEventInfo(interaction, context) {
    const { eventManager, EmbedBuilder } = context;
    
    const eventId = interaction.options.getString('event_id');
    const event = eventManager.getEvent(eventId);
    
    if (!event) {
        return interaction.reply({ 
            content: '❌ Event not found. Get the event ID from `/list`', 
            ephemeral: true 
        });
    }

    const embed = EmbedBuilder.createEventInfoEmbed(event);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Command handler for /autosync
 */
async function handleAutoSync(interaction, context) {
    const { calendarService, startAutoSync, stopAutoSync, autoSyncInterval } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to manage auto-sync.', 
            ephemeral: true 
        });
    }

    if (!calendarService.isEnabled()) {
        return interaction.reply({ 
            content: '❌ Google Calendar is not configured. Auto-sync cannot be enabled.', 
            ephemeral: true 
        });
    }

    const action = interaction.options.getString('action') || 'status';

    if (action === 'on') {
        if (!autoSyncInterval) {
            startAutoSync(interaction.channel.id, interaction.guild.id);
            return interaction.reply({ 
                content: '✅ Auto-sync enabled! Events will be synced from Google Calendar every hour.', 
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: 'ℹ️ Auto-sync is already enabled.', 
                ephemeral: true 
            });
        }
    } else if (action === 'off') {
        if (autoSyncInterval) {
            stopAutoSync();
            return interaction.reply({ 
                content: '✅ Auto-sync disabled.', 
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: 'ℹ️ Auto-sync is already disabled.', 
                ephemeral: true 
            });
        }
    } else {
        const status = autoSyncInterval ? 'enabled ✅' : 'disabled ❌';
        return interaction.reply({ 
            content: `Auto-sync is currently **${status}**\n\nUse \`/autosync action:on\` to enable or \`/autosync action:off\` to disable.`, 
            ephemeral: true 
        });
    }
}

/**
 * Command handler for /help
 */
async function handleHelp(interaction, context) {
    const { presetManager, calendarService, EmbedBuilder } = context;
    
    const presetCount = presetManager.getPresetCount();
    const calendarCount = calendarService.getCalendars().length;
    
    const embed = EmbedBuilder.createHelpEmbed(presetCount, calendarCount);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Command handler for /deletepreset
 */
async function handleDeletePreset(interaction, context) {
    const { presetManager } = context;
    
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.reply({ 
            content: '❌ You need "Manage Events" permission to delete presets.', 
            ephemeral: true 
        });
    }

    const presetName = interaction.options.getString('preset_name').toLowerCase();
    const preset = presetManager.getPreset(presetName);

    if (!preset) {
        return interaction.reply({ 
            content: `❌ Preset "${presetName}" not found.`, 
            ephemeral: true 
        });
    }

    const presetDisplayName = preset.name;
    presetManager.deletePreset(presetName);

    await interaction.reply({ 
        content: `✅ Preset "${presetDisplayName}" (${presetName}) has been deleted.\n\n⚠️ Note: Events already created with this preset will not be affected.`, 
        ephemeral: true 
    });
}

// Export all handlers
module.exports = {
    create: handleCreate,
    preset: handlePreset,
    presets: handlePresets,
    addrole: handleAddRole,
    list: handleList,
    delete: handleDelete,
    sync: handleSync,
    calendars: handleCalendars,
    eventinfo: handleEventInfo,
    autosync: handleAutoSync,
    help: handleHelp,
    deletepreset: handleDeletePreset
};
