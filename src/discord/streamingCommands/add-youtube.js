// src/discord/streamingCommands/add-youtube.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-youtube')
        .setDescription('Add a YouTube channel to monitor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(option =>
            option
                .setName('channel')
                .setDescription('YouTube channel URL, @handle, or channel ID (UC...)')
                .setRequired(true)
        ),
    
    async execute(interaction, context) {
        const { streamingConfig, youtubeMonitor } = context;
        const input = interaction.options.getString('channel').trim();
        
        const guildConfig = streamingConfig.getGuildConfig(interaction.guildId);
        
        if (!guildConfig.notificationChannelId) {
            return interaction.reply({
                content: '❌ Please set up a notification channel first with `/setup-streaming`',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });

        try {        
        const channelId = await youtubeMonitor.extractChannelId(input);
        
        if (!channelId) {
            return interaction.editReply('❌ Invalid YouTube channel. Please provide a channel URL, @handle, or channel ID (UC...).');
        }
        
        if (guildConfig.youtube.channels.includes(channelId)) {
            return interaction.editReply('❌ This channel is already being monitored!');
        }
        
        const channelName = await youtubeMonitor.getChannelName(channelId);
        
        streamingConfig.addYouTubeChannel(interaction.guildId, channelId);
        
        await interaction.editReply(
            `✅ Added **${channelName}** to monitoring!\n\nChannel ID: \`${channelId}\`\n\nThe bot will check for new videos every 5 minutes.`
        );
        
        console.log(`[Command] Added YouTube channel ${channelId} (${channelName}) in guild ${interaction.guildId}`);
        } catch (error) {
            console.error('[Command] Error adding YouTube channel:', error);
            await interaction.editReply('❌ An error occurred while adding the YouTube channel. Please try again.');
        }
    }
};
