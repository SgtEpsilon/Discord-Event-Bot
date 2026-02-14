# Database Migration Guide

## Prerequisites

1. **Backup your data** (automatic, but good to have manual backup too):
```bash
   cp -r data data_backup_$(date +%Y%m%d)
```

2. **Install dependencies**:
```bash
   npm install
```

## Migration Steps

### Step 1: Stop All Services

Stop your Discord bot and web server if they're running:
```bash
# If using PM2
pm2 stop all

# If running directly, press Ctrl+C
```

### Step 2: Run Migration
```bash
npm run migrate
```

This will:
- Create SQLite database at `data/database.sqlite`
- Create all necessary tables
- Migrate all JSON data to database
- Create a timestamped backup in `data/backup_TIMESTAMP/`

### Step 3: Verify Migration

The migration script will show a summary. Example output:
```
📊 Migration Summary:
   Events:           15
   Presets:          18
   Events Configs:   1
   Streaming Configs: 1
   Auto-Sync Config:  1

💾 Backup created at: ./data/backup_1708012345678
```

### Step 4: Start Services
```bash
# Start bot
npm start

# In another terminal, start web server
npm run web
```

Or use PM2:
```bash
npm run pm2:start
```

### Step 5: Test Everything

1. **Test Event Creation**: Create a new event via Discord and Web UI
2. **Test Presets**: Use `/preset` command
3. **Test Event Channel**: Configure event channel
4. **Test Streaming**: Add/remove Twitch streamers
5. **Test Auto-Sync**: Enable/disable calendar auto-sync

### Step 6: Cleanup (After Verification)

Once everything works, you can optionally delete old JSON files:
```bash
# Keep backup directory!
rm data/events.json
rm data/presets.json
rm data/events-config.json
rm data/streaming-config.json
rm data/autosync-config.json
```

## Troubleshooting

### Migration Failed

1. Check error message
2. Restore from backup:
```bash
   cp data_backup_DATE/*.json data/
```
3. Report issue with full error log

### Database Connection Issues

1. Check file permissions:
```bash
   ls -la data/
```

2. Ensure data directory exists:
```bash
   mkdir -p data
```

3. Check SQLite installation:
```bash
   npm ls sqlite3
```

### Data Missing After Migration

1. Check migration summary output
2. Verify backup contains data:
```bash
   ls -la data/backup_*/
```

3. Re-run migration (it won't duplicate data)

## Rollback

If you need to rollback to JSON files:

1. Stop all services
2. Restore from backup:
```bash
   cp data/backup_TIMESTAMP/*.json data/
```

3. Revert code changes (use git)
4. Restart services

## Database Location

- **SQLite file**: `data/database.sqlite`
- **Backups**: `data/backup_TIMESTAMP/`

## Advanced

### Viewing Database

Use any SQLite client:
```bash
# Command line
sqlite3 data/database.sqlite

# GUI tools
# - DB Browser for SQLite
# - DBeaver
# - DataGrip
```

### Manual SQL Queries
```bash
sqlite3 data/database.sqlite "SELECT * FROM events;"
sqlite3 data/database.sqlite "SELECT * FROM presets;"
```

### Migrating to PostgreSQL (Future)

1. Update `src/config/database.js` with PostgreSQL config
2. Install `pg` package: `npm install pg`
3. Run migration script again