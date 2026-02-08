// src/utils/storage.js
const fs = require('fs');
const path = require('path');

class Storage {
    constructor(filePath) {
        this.filePath = filePath;
        this.ensureFile();
    }
    
    /**
     * Ensure the file and directory exist
     */
    ensureFile() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '{}', 'utf8');
        }
    }
    
    /**
     * Load data from file
     */
    load() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading ${this.filePath}:`, error.message);
            return {};
        }
    }
    
    /**
     * Save data to file
     */
    save(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error saving ${this.filePath}:`, error.message);
            return false;
        }
    }
    
    /**
     * Get a single item
     */
    get(key) {
        const data = this.load();
        return data[key] || null;
    }
    
    /**
     * Set a single item
     */
    set(key, value) {
        const data = this.load();
        data[key] = value;
        return this.save(data);
    }
    
    /**
     * Delete a single item
     */
    delete(key) {
        const data = this.load();
        if (data[key]) {
            delete data[key];
            return this.save(data);
        }
        return false;
    }
    
    /**
     * Get all items as array
     */
    getAll() {
        return Object.values(this.load());
    }
    
    /**
     * Get all items as object
     */
    getAllAsObject() {
        return this.load();
    }
    
    /**
     * Clear all data
     */
    clear() {
        return this.save({});
    }
    
    /**
     * Check if key exists
     */
    has(key) {
        const data = this.load();
        return key in data;
    }
}

module.exports = Storage;
