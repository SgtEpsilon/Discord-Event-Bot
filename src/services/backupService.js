// ============================================================================
// FILE: src/services/backupService.js
// NEW FILE - Create this file in src/services/
// ============================================================================
// Backup Service - Weekly database backups on Sundays at 12:00 AM local time

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../data/backups');
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
    this.checkInterval = null;
    this.maxBackups = 8; // Keep last 8 weeks of backups
  }

  /**
   * Start the backup service
   */
  async start() {
    console.log('[BackupService] Starting weekly backup service');
    
    // Ensure backup directory exists
    await this.ensureBackupDirectory();
    
    // Check immediately if a backup is due
    await this.checkAndBackup();
    
    // Check every hour if it's time for a backup
    this.checkInterval = setInterval(() => {
      this.checkAndBackup();
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('[BackupService] ✅ Service started - Backups run Sundays at 12:00 AM');
  }

  /**
   * Stop the backup service
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[BackupService] Service stopped');
    }
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('[BackupService] Error creating backup directory:', error.message);
    }
  }

  /**
   * Check if it's time for a backup and perform if needed
   */
  async checkAndBackup() {
    try {
      const now = new Date();
      
      // Check if it's Sunday (0) and between 12:00 AM and 1:00 AM
      if (now.getDay() === 0 && now.getHours() === 0) {
        const lastBackup = await this.getLastBackupTime();
        
        // Check if we haven't backed up in the last hour
        if (!lastBackup || (now - lastBackup) > 60 * 60 * 1000) {
          console.log('[BackupService] 📅 Sunday 12:00 AM - Starting weekly backup');
          await this.performBackup();
        }
      }
    } catch (error) {
      console.error('[BackupService] Error checking backup schedule:', error.message);
    }
  }

  /**
   * Get the timestamp of the last backup
   */
  async getLastBackupTime() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'));
      
      if (backupFiles.length === 0) {
        return null;
      }
      
      // Sort by filename (which includes timestamp) and get the latest
      backupFiles.sort().reverse();
      const latestBackup = backupFiles[0];
      
      const stats = await fs.stat(path.join(this.backupDir, latestBackup));
      return new Date(stats.mtime);
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform a full backup
   */
  async performBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupFileName = `backup-${timestamp}.sqlite`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      console.log('[BackupService] 💾 Creating backup...');
      
      // Copy database file
      await fs.copyFile(this.dbPath, backupPath);
      
      // Also backup event tracker
      const trackerPath = path.join(__dirname, '../../data/event-tracker.json');
      const trackerBackupPath = path.join(this.backupDir, `tracker-${timestamp}.json`);
      
      try {
        await fs.copyFile(trackerPath, trackerBackupPath);
        console.log('[BackupService] ✅ Event tracker backed up');
      } catch (error) {
        console.log('[BackupService] ⚠️  Event tracker backup skipped (file may not exist)');
      }
      
      // Also backup important config files
      await this.backupConfigFiles(timestamp);
      
      // Verify backup
      const stats = await fs.stat(backupPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log('[BackupService] ✅ Backup complete!');
      console.log(`[BackupService]    File: ${backupFileName}`);
      console.log(`[BackupService]    Size: ${sizeMB} MB`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      // Create backup summary
      await this.createBackupSummary(timestamp);
      
    } catch (error) {
      console.error('[BackupService] ❌ Backup failed:', error.message);
    }
  }

  /**
   * Backup important configuration files
   */
  async backupConfigFiles(timestamp) {
    const configDir = path.join(this.backupDir, `config-${timestamp}`);
    
    try {
      await fs.mkdir(configDir, { recursive: true });
      
      const filesToBackup = [
        'data/calendar-config.json',
        'data/autosync-config.json',
        'data/events-config.json',
        'data/streaming-config.json',
        'data/presets.json',
        '.env'
      ];
      
      let backedUp = 0;
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(__dirname, '../../', file);
        const fileName = path.basename(file);
        const destPath = path.join(configDir, fileName);
        
        try {
          await fs.copyFile(sourcePath, destPath);
          backedUp++;
        } catch (error) {
          // File might not exist, skip
        }
      }
      
      console.log(`[BackupService] ✅ Backed up ${backedUp} config file(s)`);
    } catch (error) {
      console.log('[BackupService] ⚠️  Config backup failed:', error.message);
    }
  }

  /**
   * Clean up old backups (keep only last 8 weeks)
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
        .sort()
        .reverse();
      
      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          const filePath = path.join(this.backupDir, file);
          await fs.unlink(filePath);
          
          // Also delete associated tracker and config backups
          const timestamp = file.replace('backup-', '').replace('.sqlite', '');
          const trackerFile = path.join(this.backupDir, `tracker-${timestamp}.json`);
          const configDir = path.join(this.backupDir, `config-${timestamp}`);
          
          try {
            await fs.unlink(trackerFile);
          } catch (e) { /* ignore */ }
          
          try {
            await fs.rm(configDir, { recursive: true, force: true });
          } catch (e) { /* ignore */ }
        }
        
        console.log(`[BackupService] 🗑️  Cleaned up ${filesToDelete.length} old backup(s)`);
      }
    } catch (error) {
      console.error('[BackupService] Error cleaning up backups:', error.message);
    }
  }

  /**
   * Create a backup summary file
   */
  async createBackupSummary(timestamp) {
    try {
      const { Event, Preset, CalendarConfig, AutoSyncConfig } = require('../models');
      
      const [
        totalEvents,
        upcomingEvents,
        totalPresets,
        totalCalendars,
        autoSyncConfig
      ] = await Promise.all([
        Event.count(),
        Event.count({ where: { dateTime: { [require('sequelize').Op.gte]: new Date() } } }),
        Preset.count(),
        CalendarConfig.count(),
        AutoSyncConfig.findAll()
      ]);
      
      const summary = {
        backupDate: new Date().toISOString(),
        timestamp: timestamp,
        statistics: {
          totalEvents,
          upcomingEvents,
          totalPresets,
          totalCalendars,
          autoSyncEnabled: autoSyncConfig.some(c => c.enabled)
        },
        nodeVersion: process.version,
        platform: process.platform
      };
      
      const summaryPath = path.join(this.backupDir, `summary-${timestamp}.json`);
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('[BackupService] 📊 Backup summary created');
    } catch (error) {
      console.log('[BackupService] ⚠️  Summary creation failed:', error.message);
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
        .sort()
        .reverse();
      
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          fileName: file,
          size: stats.size,
          created: stats.mtime,
          path: filePath
        });
      }
      
      return backups;
    } catch (error) {
      console.error('[BackupService] Error listing backups:', error.message);
      return [];
    }
  }

  /**
   * Restore from a backup (manual operation)
   */
  async restoreFromBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Verify backup exists
      await fs.access(backupPath);
      
      console.log('[BackupService] ⚠️  RESTORE OPERATION - Creating safety backup first...');
      
      // Create a safety backup of current database
      const safetyBackupPath = path.join(this.backupDir, `pre-restore-${Date.now()}.sqlite`);
      await fs.copyFile(this.dbPath, safetyBackupPath);
      
      console.log('[BackupService] 💾 Restoring database...');
      
      // Restore the backup
      await fs.copyFile(backupPath, this.dbPath);
      
      console.log('[BackupService] ✅ Database restored successfully!');
      console.log('[BackupService] ⚠️  Please restart the bot for changes to take effect');
      console.log(`[BackupService] 📁 Safety backup saved at: ${safetyBackupPath}`);
      
      return true;
    } catch (error) {
      console.error('[BackupService] ❌ Restore failed:', error.message);
      return false;
    }
  }

  /**
   * Get backup service status
   */
  getStatus() {
    return {
      isRunning: !!this.checkInterval,
      backupDirectory: this.backupDir,
      databasePath: this.dbPath,
      schedule: 'Sundays at 12:00 AM',
      maxBackupsKept: this.maxBackups
    };
  }
}

module.exports = BackupService;
