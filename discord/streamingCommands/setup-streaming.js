// src/discord/streamingCommands/setup-streaming.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-streaming')
        .setDescription('Set the notification channel for stream and video alerts')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel for stream/video notifications')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),
    
    async execute(interaction, context) {
        const { streamingConfig } = context;
        const channel = interaction.options.getChannel('channel');
        
        streamingConfig.setNotificationChannel(interaction.guildId, channel.id);
        
        await interaction.reply({
            content: `✅ Stream and video notifications will be sent to ${channel}\n\nNext steps:\n• Add Twitch streamers: \`/add-streamer\`\n• Add YouTube channels: \`/add-youtube\``,
            ephemeral: true
        });
    }
};
