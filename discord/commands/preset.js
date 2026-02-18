// src/discord/commands/presets.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('presets')
    .setDescription('List all available event presets')
    .setDMPermission(false),

  async execute(interaction, context) {
    const { presetManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const presets = await presetManager.loadPresets();
      const presetEntries = Object.entries(presets);

      if (presetEntries.length === 0) {
        return interaction.editReply({
          content: '📋 No presets available.\n\nPresets can be added via the web interface or imported from JSON.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Available Event Presets')
        .setDescription(`Use \`/preset\` to create an event from these templates\n\n**${presetEntries.length} preset${presetEntries.length !== 1 ? 's' : ''} available**`)
        .setTimestamp();

      presetEntries.forEach(([key, preset]) => {
        const rolesList = preset.roles
          .map(r => `${r.emoji || '👤'} ${r.name} (${r.maxSlots || '∞'})`)
          .join(', ');

        embed.addFields({
          name: `${preset.name}`,
          value: `**Key:** \`${key}\`\n` +
                 `**Description:** ${preset.description || 'No description'}\n` +
                 `**Roles:** ${rolesList}\n` +
                 `**Duration:** ${preset.duration} min | **Max:** ${preset.maxParticipants || 'Unlimited'}`,
          inline: false
        });
      });

      embed.setFooter({ text: 'Use /preset preset_name:<key> to create an event' });

      await interaction.editReply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error listing presets:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to list presets: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to list presets: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};