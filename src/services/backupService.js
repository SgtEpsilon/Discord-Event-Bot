// src/services/backupService.js
// Weekly backup of entire /data folder, stored as timestamped zips in data/backups/
// Runs every Sunday at 12:00 AM. Keeps last 2 backups.

const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const archiver = require('archiver');

const DATA_DIR    = path.join(__dirname, '../../data');
const BACKUP_DIR  = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 2;

class BackupService {
  constructor() {
    this.checkInterval = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async start() {
    console.log('[BackupService] Starting weekly backup service...');
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await this.checkAndBackup();

    // Check once an hour; only fires when it's actually Sunday midnight
    this.checkInterval = setInterval(() => this.checkAndBackup(), 60 * 60 * 1000);
    console.log('[BackupService] ✅ Scheduled — runs every Sunday at 12:00 AM');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[BackupService] Stopped.');
    }
  }

  getStatus() {
    return {
      isRunning:      !!this.checkInterval,
      backupDirectory: BACKUP_DIR,
      dataDirectory:   DATA_DIR,
      schedule:        'Sundays at 12:00 AM',
      maxBackupsKept:  MAX_BACKUPS
    };
  }

  /** Force a backup right now (useful for manual triggers / testing) */
  async runNow() {
    return this.performBackup();
  }

  async listBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const zips = files.filter(f => f.startsWith('backup-') && f.endsWith('.zip')).sort().reverse();
      const result = [];
      for (const f of zips) {
        const stat = await fs.stat(path.join(BACKUP_DIR, f));
        result.push({ fileName: f, sizeMB: (stat.size / 1024 / 1024).toFixed(2), created: stat.mtime });
      }
      return result;
    } catch {
      return [];
    }
  }

  // ─── Core logic ───────────────────────────────────────────────────────────

  async checkAndBackup() {
    try {
      const now = new Date();
      if (now.getDay() !== 0 || now.getHours() !== 0) return; // only Sunday midnight

      const last = await this.getLastBackupTime();
      const oneHour = 60 * 60 * 1000;
      if (!last || (now - last) > oneHour) {
        console.log('[BackupService] 📅 Sunday 12:00 AM — starting weekly backup');
        await this.performBackup();
      }
    } catch (err) {
      console.error('[BackupService] Scheduler error:', err.message);
    }
  }

  async getLastBackupTime() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const zips = files.filter(f => f.startsWith('backup-') && f.endsWith('.zip')).sort().reverse();
      if (!zips.length) return null;
      const stat = await fs.stat(path.join(BACKUP_DIR, zips[0]));
      return new Date(stat.mtime);
    } catch {
      return null;
    }
  }

  async performBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]; // e.g. 2026-02-16T00-00-00
    const zipName   = `backup-${timestamp}.zip`;
    const zipPath   = path.join(BACKUP_DIR, zipName);

    console.log(`[BackupService] 💾 Creating backup: ${zipName}`);

    try {
      await this.zipDataFolder(zipPath);

      const stat   = await fs.stat(zipPath);
      const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
      console.log(`[BackupService] ✅ Backup complete — ${zipName} (${sizeMB} MB)`);

      await this.pruneOldBackups();
    } catch (err) {
      console.error('[BackupService] ❌ Backup failed:', err.message);
      // Remove partial zip if it exists
      try { await fs.unlink(zipPath); } catch { /* ignore */ }
    }
  }

  zipDataFolder(zipPath) {
    return new Promise((resolve, reject) => {
      const output  = fss.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      // Add entire /data directory, but exclude the backups subfolder to avoid recursion
      archive.glob('**/*', {
        cwd: DATA_DIR,
        ignore: ['backups/**'],
        dot: true
      });

      archive.finalize();
    });
  }

  async pruneOldBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const zips  = files.filter(f => f.startsWith('backup-') && f.endsWith('.zip')).sort().reverse();

      if (zips.length > MAX_BACKUPS) {
        const toDelete = zips.slice(MAX_BACKUPS);
        for (const f of toDelete) {
          await fs.unlink(path.join(BACKUP_DIR, f));
          console.log(`[BackupService] 🗑️  Removed old backup: ${f}`);
        }
      }
    } catch (err) {
      console.error('[BackupService] Prune error:', err.message);
    }
  }
}

module.exports = BackupService;
