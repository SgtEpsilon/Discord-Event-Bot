// src/services/presetManager.js
const Storage = require('../utils/storage');

class PresetManager {
    constructor(filePath) {
        this.storage = new Storage(filePath);
    }
    
    /**
     * Load all presets
     */
    loadPresets() {
        return this.storage.getAllAsObject();
    }
    
    /**
     * Get preset by key
     */
    getPreset(key) {
        return this.storage.get(key);
    }
    
    /**
     * Create new preset
     */
    createPreset(key, presetData) {
        // Validate key format
        if (!/^[a-z0-9-]+$/.test(key)) {
            throw new Error('Key must be lowercase letters, numbers, and hyphens only');
        }
        
        // Check if already exists
        if (this.storage.has(key)) {
            throw new Error('Preset already exists');
        }
        
        const preset = {
            name: presetData.name,
            description: presetData.description || '',
            duration: presetData.duration,
            maxParticipants: presetData.maxParticipants || 0,
            roles: presetData.roles || []
        };
        
        this.storage.set(key, preset);
        return preset;
    }
    
    /**
     * Update preset
     */
    updatePreset(key, updates) {
        const preset = this.getPreset(key);
        if (!preset) {
            throw new Error('Preset not found');
        }
        
        const updatedPreset = { ...preset, ...updates };
        this.storage.set(key, updatedPreset);
        return updatedPreset;
    }
    
    /**
     * Delete preset
     */
    deletePreset(key) {
        if (!this.storage.has(key)) {
            throw new Error('Preset not found');
        }
        
        return this.storage.delete(key);
    }
    
    /**
     * Get all preset keys
     */
    getPresetKeys() {
        return Object.keys(this.loadPresets());
    }
    
    /**
     * Get preset count
     */
    getPresetCount() {
        return this.getPresetKeys().length;
    }
    
    /**
     * Search presets by name or key
     */
    searchPresets(query) {
        const allPresets = this.loadPresets();
        const lowerQuery = query.toLowerCase();
        
        return Object.entries(allPresets)
            .filter(([key, preset]) => 
                key.toLowerCase().includes(lowerQuery) ||
                preset.name.toLowerCase().includes(lowerQuery)
            )
            .map(([key, preset]) => ({ key, ...preset }));
    }
}

module.exports = PresetManager;
