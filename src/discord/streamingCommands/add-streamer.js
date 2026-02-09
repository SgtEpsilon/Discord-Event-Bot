// src/discord/streamingCommands/add-streamer.js
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-streamer')
        .setDescription('Add a Twitch streamer to monitor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction, context) {
        const { guildConfig } = context;
        const config = guildConfig.getGuildConfig(interaction.guildId);
        
        if (!config.notifications.channelId) {
            return interaction.reply({
                content: '❌ Please set up a notification channel first with `/setup-streaming`',
                ephemeral: true
            });
        }
        
        const modal = new ModalBuilder()
            .setCustomId('add-streamer-modal')
            .setTitle('Add Twitch Streamer');
        
        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Twitch Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., shroud, xqc, pokimane')
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(25);
        
        const messageInput = new TextInputBuilder()
            .setCustomId('custom-message')
            .setLabel('Custom Notification (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Use: {username}, {title}, {game}, {url}')
            .setRequired(false)
            .setMaxLength(500);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(usernameInput),
            new ActionRowBuilder().addComponents(messageInput)
        );
        
        await interaction.showModal(modal);
        
        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 300000,
                filter: i => i.user.id === interaction.user.id && i.customId === 'add-streamer-modal'
            });
            
            await submitted.deferReply({ ephemeral: true });
            
            const username = submitted.fields.getTextInputValue('username').toLowerCase().trim();
            const customMessage = submitted.fields.getTextInputValue('custom-message').trim() || null;
            
            if (!/^[a-zA-Z0-9_]{4,25}$/.test(username)) {
                return submitted.editReply('❌ Invalid Twitch username format. Must be 4-25 characters (letters, numbers, underscores).');
            }
            
            // Check if already added
            const streamers = guildConfig.getTwitchStreamers(interaction.guildId);
            if (streamers.includes(username)) {
                return submitted.editReply(`❌ **${username}** is already being monitored!`);
            }
            
            // Validate with Twitch API if available
            if (context.twitchMonitor && context.twitchMonitor.isEnabled && context.twitchMonitor.isEnabled()) {
                const isValid = await context.twitchMonitor.validateUsername(username);
                if (!isValid) {
                    return submitted.editReply(`❌ Twitch user **${username}** does not exist or could not be found.`);
                }
            }
            
            guildConfig.addTwitchStreamer(interaction.guildId, username, customMessage);
            
            let reply = `✅ Added **${username}** to monitoring!\n\nThe bot will check every minute if they go live.`;
            
            if (customMessage) {
                reply += `\n\n**Custom notification:**\n\`\`\`${customMessage}\`\`\``;
            }
            
            await submitted.editReply(reply);
            console.log(`[Command] Added Twitch streamer ${username} in guild ${interaction.guildId}`);
            
        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error('Error handling modal:', error);
            }
        }
    }
};
