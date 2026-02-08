// src/discord/streamingCommands/list-youtube.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-youtube')
        .setDescription('Show all monitored YouTube channels'),
    
    async execute(interaction, context) {
        const { streamingConfig, youtubeMonitor } = context;
        const guildConfig = streamingConfig.getGuildConfig(interaction.guildId);
        
        if (!guildConfig.youtube.channels || guildConfig.youtube.channels.length === 0) {
            return interaction.reply({
                content: '📋 No YouTube channels are currently being monitored.\n\nAdd one with `/add-youtube`',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('📺 Monitored YouTube Channels')
            .setDescription(`Total: ${guildConfig.youtube.channels.length} channel(s)`)
            .setTimestamp();
        
        const channelDetails = [];
        
        for (const channelId of guildConfig.youtube.channels) {
            let channelName;
            try {
                channelName = await youtubeMonitor.getChannelName(channelId);
            } catch {
                channelName = 'Unknown Channel';
            }
            channelDetails.push(`• **${channelName}**\n  ID: \`${channelId}\``);
        }
 
       const fieldValue = channelDetails.join('\n\n') || 'None'; 
        embed.addFields({
            name: 'Channels',
           value: fieldValue.length > 1024 ? fieldValue.slice(0, 1021)  '...' : fieldValue
            inline: false
        });
        
        if (guildConfig.notificationChannelId) {
            embed.addFields({
                name: 'Notification Channel',
                value: `<#${guildConfig.notificationChannelId}>`,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Checked every 5 minutes • RSS-based (no API quotas!)' });
        
        await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[Command] Error listing YouTube channels:', error);
            await interaction.editReply('❌ An error occurred while fetching YouTube channels.');
        }
    }
};
