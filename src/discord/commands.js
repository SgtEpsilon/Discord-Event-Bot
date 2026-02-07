// src/discord/commands.js
const { SlashCommandBuilder } = require('discord.js');

/**
 * Define all slash commands
 */
function getCommands() {
    return [
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
}

module.exports = {
    getCommands
};
