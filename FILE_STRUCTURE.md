# 📁 File Structure Overview

## Project Structure

```
Discord-Event-Bot/
│
├── diagnostics/                       ← Diagnostic tools folder
│   │
│   ├── README.md                      Main diagnostics guide
│   │
│   ├── Scripts/
│   │   ├── health-check.js            Complete system health check
│   │   ├── setup-diagnostic.js        Setup & installation check
│   │   ├── database-diagnostic.js     Database health check
│   │   ├── discord-diagnostic.js      Discord connection test
│   │   ├── webserver-diagnostic.js    Web server diagnostic
│   │   ├── calendar-sync-debugger.js  Calendar sync deep diagnostic
│   │   ├── fix-calendar-sync.js       Auto-fix calendar sync
│   │   ├── test-calendar-connection.js Test calendar access
│   │   └── calendar-diagnostic.js     Basic calendar check
│   │
│   └── Documentation/
│       ├── DIAGNOSTIC_TOOLS_README.md     Complete tools guide
│       ├── TROUBLESHOOTING_GUIDE.md       Step-by-step troubleshooting
│       ├── DIAGNOSTIC_QUICK_REFERENCE.md  Command cheat sheet
│       ├── ICAL_URL_SETUP.md             iCal URL setup guide
│       ├── GOOGLE_CALENDAR_API_SETUP.md   Google Calendar API setup
│       ├── CALENDAR_NOT_SYNCING_FIX.md   Calendar sync fixes
│       └── CALENDAR_TROUBLESHOOTING.md    Calendar issue guide
│
├── Root Files/
│   ├── package.json                   Updated with diagnostic scripts
│   ├── pm2-start-custom.js           Custom PM2 startup script
│   ├── update-calendar-sync-range.js  Calendar range update tool
│   ├── CALENDAR_SYNC_UPDATE.md       Calendar update documentation
│   └── README_CALENDAR_UPDATE.md     Calendar update guide
│
└── [Your existing bot files...]
```

---

## 🎯 What Goes Where

### `/diagnostics/`
**All diagnostic and troubleshooting tools**

Contains:
- ✅ Diagnostic scripts (*.js)
- ✅ Troubleshooting documentation (*.md)
- ✅ Setup guides
- ✅ Quick reference cards

**Run from bot root:**
```bash
npm run health                    # Uses: diagnostics/health-check.js
npm run diag:setup               # Uses: diagnostics/setup-diagnostic.js
npm run calendar:fix             # Uses: diagnostics/fix-calendar-sync.js
```

### Root Directory
**Core bot functionality and utilities**

Contains:
- `package.json` - NPM scripts and dependencies
- `pm2-start-custom.js` - Custom PM2 startup
- `update-calendar-sync-range.js` - Calendar update utility
- Documentation for root-level scripts
- Your bot's main files (src/, web-server.js, etc.)

---

## 🚀 Quick Start Commands

All commands run from the **bot's root directory**:

### Health & Diagnostics
```bash
npm run health              # Complete health check
npm run diag:setup          # Setup diagnostic
npm run diag:database       # Database diagnostic
npm run diag:discord        # Discord diagnostic
npm run diag:web            # Web server diagnostic
```

### Calendar Tools
```bash
npm run calendar:debug      # Calendar sync diagnostic
npm run calendar:fix        # Auto-fix calendar sync
npm run calendar:test       # Test calendar connection
```

### Bot Management
```bash
npm run pm2:start           # Start bot (custom startup)
npm run pm2:stop            # Stop bot
npm run pm2:restart         # Restart bot
npm run pm2:logs            # View logs
```

---

## 📖 Documentation Index

### Diagnostic Tools
- **`diagnostics/README.md`** - Start here for diagnostics overview
- **`diagnostics/DIAGNOSTIC_TOOLS_README.md`** - Complete guide to all tools
- **`diagnostics/TROUBLESHOOTING_GUIDE.md`** - Comprehensive troubleshooting

### Quick Reference
- **`diagnostics/DIAGNOSTIC_QUICK_REFERENCE.md`** - Command cheat sheet

### Calendar Setup
- **`diagnostics/ICAL_URL_SETUP.md`** - iCal URL setup (recommended)
- **`diagnostics/GOOGLE_CALENDAR_API_SETUP.md`** - Google Calendar API
- **`diagnostics/CALENDAR_NOT_SYNCING_FIX.md`** - Calendar sync fixes
- **`diagnostics/CALENDAR_TROUBLESHOOTING.md`** - Calendar issues

### Calendar Updates
- **`CALENDAR_SYNC_UPDATE.md`** - How to update sync range
- **`README_CALENDAR_UPDATE.md`** - Calendar update verification

---

## 💡 Usage Examples

### First-Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Check setup
npm run diag:setup

# 3. Fix any issues found

# 4. Run health check
npm run health

# 5. Start bot
npm run pm2:start
```

### Troubleshooting Unknown Issue
```bash
# 1. Run complete diagnostic
npm run health

# 2. Run specific diagnostic based on results
npm run diag:[specific]

# 3. Follow fix instructions

# 4. Verify with health check
npm run health
```

### Calendar Not Syncing
```bash
# 1. Quick automated fix
npm run calendar:fix

# 2. If that doesn't work, deep diagnostic
npm run calendar:debug

# 3. Test connection
npm run calendar:test

# 4. Check documentation
# Read: diagnostics/CALENDAR_NOT_SYNCING_FIX.md
```

---

## ✅ Installation Checklist

After cloning the repository:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run Setup Diagnostic**
   ```bash
   npm run diag:setup
   ```

4. **Fix Any Issues**
   - Follow the diagnostic output

5. **Verify with Health Check**
   ```bash
   npm run health
   ```

6. **Start Bot**
   ```bash
   npm run pm2:start
   ```

---

## 🔧 Maintenance

### Weekly
```bash
npm run health
```

### Monthly
```bash
node diagnostics/database-diagnostic.js --vacuum
npm run health
```

### After Updates
```bash
npm install
npm run health
pm2 restart discord-event-bot
```

---

## 🆘 Getting Help

### If Diagnostics Don't Solve Your Issue

1. **Save diagnostic output:**
   ```bash
   npm run health > diagnostic-output.txt
   ```

2. **Save logs:**
   ```bash
   pm2 logs discord-event-bot --lines 100 > bot-logs.txt
   ```

3. **When reporting issues, include:**
   - Diagnostic output
   - Bot logs
   - OS & Node.js version
   - Exact error message

### Where to Look for Help

1. **Check diagnostics folder:**
   - `diagnostics/README.md` - Overview
   - `diagnostics/TROUBLESHOOTING_GUIDE.md` - Detailed guide

2. **Run specific diagnostic:**
   - Problem area → specific diagnostic tool

3. **Read relevant documentation:**
   - Setup issues → Setup guide
   - Calendar issues → Calendar guides

---

## 📝 Files Summary

### Diagnostic Scripts (9)
| File | Purpose |
|------|---------|
| `health-check.js` | Complete system check |
| `setup-diagnostic.js` | Installation check |
| `database-diagnostic.js` | Database health |
| `discord-diagnostic.js` | Discord connection |
| `webserver-diagnostic.js` | Web server status |
| `calendar-sync-debugger.js` | Calendar deep diagnostic |
| `fix-calendar-sync.js` | Auto-fix calendars |
| `test-calendar-connection.js` | Test calendar |
| `calendar-diagnostic.js` | Basic calendar check |

### Documentation (8)
| File | Purpose |
|------|---------|
| `README.md` | Diagnostics overview |
| `DIAGNOSTIC_TOOLS_README.md` | Complete tools guide |
| `TROUBLESHOOTING_GUIDE.md` | Troubleshooting workflows |
| `DIAGNOSTIC_QUICK_REFERENCE.md` | Command cheat sheet |
| `ICAL_URL_SETUP.md` | iCal setup |
| `GOOGLE_CALENDAR_API_SETUP.md` | API setup |
| `CALENDAR_NOT_SYNCING_FIX.md` | Calendar fixes |
| `CALENDAR_TROUBLESHOOTING.md` | Calendar issues |

### Root Utilities (4)
| File | Purpose |
|------|---------|
| `package.json` | NPM scripts & deps |
| `pm2-start-custom.js` | Custom startup |
| `update-calendar-sync-range.js` | Calendar update |
| `CALENDAR_SYNC_UPDATE.md` | Update docs |

---

## ⭐ Key Points

1. **All diagnostics are in `/diagnostics/` folder**
2. **Run from bot root directory** using npm scripts
3. **Start with `npm run health`** for unknown issues
4. **Documentation is organized by topic** in diagnostics folder
5. **Root directory has core utilities** and main bot files

---

**Need help?** Start with `diagnostics/README.md` or run `npm run health`!
