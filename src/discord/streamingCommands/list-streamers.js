// src/discord/streamingCommands/list-streamers.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-streamers')
        .setDescription('Show all monitored Twitch streamers'),
    
    async execute(interaction, context) {
        const { guildConfig } = context;
        const config = guildConfig.getGuildConfig(interaction.guildId);
        
        if (!config.twitch.streamers || config.twitch.streamers.length === 0) {
            return interaction.reply({
                content: '📋 No Twitch streamers are currently being monitored.\n\nAdd one with `/add-streamer`',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('🎮 Monitored Twitch Streamers')
            .setDescription(`Total: ${config.twitch.streamers.length} streamer(s)`)
            .setTimestamp();
        
        const streamerList = config.twitch.streamers.map((username, index) => {
            const hasCustom = config.twitch.customMessages && config.twitch.customMessages[username];
            return `${index + 1}. **${username}** ${hasCustom ? '✨ (Custom notification)' : ''}`;
        }).join('\n');
        
        embed.addFields({
            name: 'Streamers',
            value: streamerList,
            inline: false
        });
        
        if (config.notifications.channelId) {
            embed.addFields({
                name: 'Notification Channel',
                value: `<#${config.notifications.channelId}>`,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Checked every 60 seconds' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
