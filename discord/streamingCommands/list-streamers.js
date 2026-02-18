// src/discord/streamingCommands/list-streamers.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-streamers')
        .setDescription('Show all monitored Twitch streamers'),
    
    async execute(interaction, context) {
        const { streamingConfig } = context;
        const guildConfig = streamingConfig.getGuildConfig(interaction.guildId);
        
        if (!guildConfig.twitch.streamers || guildConfig.twitch.streamers.length === 0) {
            return interaction.reply({
                content: '📋 No Twitch streamers are currently being monitored.\n\nAdd one with `/add-streamer`',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('🎮 Monitored Twitch Streamers')
            .setDescription(`Total: ${guildConfig.twitch.streamers.length} streamer(s)`)
            .setTimestamp();
        
        const streamerList = guildConfig.twitch.streamers.map((username, index) => {
            const hasCustom = guildConfig.twitch.customMessages && guildConfig.twitch.customMessages[username];
            return `${index + 1}. **${username}** ${hasCustom ? '✨ (Custom notification)' : ''}`;
        }).join('\n');
        
        embed.addFields({
            name: 'Streamers',
            value: streamerList,
            inline: false
        });
        
        if (guildConfig.notificationChannelId) {
            embed.addFields({
                name: 'Notification Channel',
                value: `<#${guildConfig.notificationChannelId}>`,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Checked every 60 seconds' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
