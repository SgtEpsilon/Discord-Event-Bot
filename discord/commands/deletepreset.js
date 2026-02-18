// src/discord/commands/deletepreset.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletepreset')
    .setDescription('Delete a custom preset')
    .addStringOption(option =>
      option.setName('preset_name')
        .setDescription('Name of the preset to delete')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false),

  async execute(interaction, context) {
    const { presetManager } = context;

    try {
      await interaction.deferReply({ ephemeral: true });

      const presetName = interaction.options.getString('preset_name').toLowerCase();
      const preset = await presetManager.getPreset(presetName);

      if (!preset) {
        return interaction.editReply({
          content: `❌ Preset "${presetName}" not found. Use \`/presets\` to see available presets.`,
          ephemeral: true
        });
      }

      const presetDisplayName = preset.name;
      await presetManager.deletePreset(presetName);

      await interaction.editReply({
        content: `✅ Preset "${presetDisplayName}" (${presetName}) has been deleted.\n\n⚠️ **Note:** Events already created with this preset will not be affected.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error deleting preset:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ Failed to delete preset: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Failed to delete preset: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
};