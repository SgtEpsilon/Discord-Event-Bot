// src/services/presetManager.js
const { Preset } = require('../models');

class PresetManager {
  constructor(filePath) {
    // filePath parameter kept for backward compatibility but not used
  }

  /**
   * Load all presets
   */
  async loadPresets() {
    const presets = await Preset.findAll();
    const presetsObj = {};
    
    presets.forEach(preset => {
      presetsObj[preset.key] = {
        name: preset.name,
        description: preset.description,
        duration: preset.duration,
        maxParticipants: preset.maxParticipants,
        roles: preset.roles
      };
    });
    
    return presetsObj;
  }

  /**
   * Get preset by key
   */
  async getPreset(key) {
    const preset = await Preset.findByPk(key);
    if (!preset) return null;
    
    return {
      name: preset.name,
      description: preset.description,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles
    };
  }

  /**
   * Create new preset
   */
  async createPreset(key, presetData) {
    // Validate key format
    if (!/^[a-z0-9-]+$/.test(key)) {
      throw new Error('Key must be lowercase letters, numbers, and hyphens only');
    }

    // Check if already exists
    const existing = await Preset.findByPk(key);
    if (existing) {
      throw new Error('Preset already exists');
    }

    const preset = await Preset.create({
      key,
      name: presetData.name,
      description: presetData.description || '',
      duration: presetData.duration,
      maxParticipants: presetData.maxParticipants || 0,
      roles: presetData.roles || []
    });

    return {
      name: preset.name,
      description: preset.description,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles
    };
  }

  /**
   * Update preset
   */
  async updatePreset(key, updates) {
    const preset = await Preset.findByPk(key);
    if (!preset) {
      throw new Error('Preset not found');
    }

    await preset.update(updates);
    
    return {
      name: preset.name,
      description: preset.description,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles
    };
  }

  /**
   * Delete preset
   */
  async deletePreset(key) {
    const preset = await Preset.findByPk(key);
    if (!preset) {
      throw new Error('Preset not found');
    }

    await preset.destroy();
    return true;
  }

  /**
   * Get all preset keys
   */
  async getPresetKeys() {
    const presets = await Preset.findAll({
      attributes: ['key']
    });
    return presets.map(p => p.key);
  }

  /**
   * Get preset count
   */
  async getPresetCount() {
    return await Preset.count();
  }

  /**
   * Search presets by name or key
   */
  async searchPresets(query) {
    const { Op } = require('sequelize');
    const lowerQuery = query.toLowerCase();

    const presets = await Preset.findAll({
      where: {
        [Op.or]: [
          { key: { [Op.like]: `%${lowerQuery}%` } },
          { name: { [Op.like]: `%${lowerQuery}%` } }
        ]
      }
    });

    return presets.map(preset => ({
      key: preset.key,
      name: preset.name,
      description: preset.description,
      duration: preset.duration,
      maxParticipants: preset.maxParticipants,
      roles: preset.roles
    }));
  }
}

module.exports = PresetManager;