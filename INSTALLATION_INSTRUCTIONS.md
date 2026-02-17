# 📦 Installing Diagnostics Tools

## What You're Getting

A complete `/diagnostics` folder with:
- ✅ 9 diagnostic scripts
- ✅ 8 documentation files
- ✅ Updated package.json with NPM scripts

---

## 📁 Complete File List

### Diagnostic Scripts (in `/diagnostics/`)
```
├── health-check.js                  Complete health check
├── setup-diagnostic.js              Setup & installation
├── database-diagnostic.js           Database health
├── discord-diagnostic.js            Discord connection
├── webserver-diagnostic.js          Web server
├── calendar-sync-debugger.js        Calendar deep diagnostic
├── fix-calendar-sync.js             Auto-fix calendars
├── test-calendar-connection.js      Test calendar
└── calendar-diagnostic.js           Basic calendar check
```

### Documentation (in `/diagnostics/`)
```
├── README.md                        Diagnostics overview (START HERE)
├── DIAGNOSTIC_TOOLS_README.md       Complete tools guide
├── TROUBLESHOOTING_GUIDE.md         Step-by-step troubleshooting
├── DIAGNOSTIC_QUICK_REFERENCE.md    Command cheat sheet
├── ICAL_URL_SETUP.md               iCal URL setup
├── GOOGLE_CALENDAR_API_SETUP.md     Google Calendar API
├── CALENDAR_NOT_SYNCING_FIX.md     Calendar fixes
└── CALENDAR_TROUBLESHOOTING.md      Calendar issues
```

### Root Directory Files
```
├── package.json                     Updated with diagnostic scripts
└── FILE_STRUCTURE.md               Overview of organization
```

---

## 🚀 Installation Steps

### 1. Download Files

You'll need to download the **entire `/diagnostics/` folder** to your bot's root directory.

**Your bot structure should be:**
```
Discord-Event-Bot/
├── diagnostics/              ← New folder
│   ├── *.js                  ← All diagnostic scripts
│   └── *.md                  ← All documentation
├── package.json              ← Updated with new scripts
├── src/                      ← Your existing bot code
├── web-server.js             ← Your existing files
└── ...
```

### 2. Replace package.json

**Important:** The new `package.json` has all the diagnostic scripts added.

**Option A - Merge manually:**
- Open the new `package.json`
- Copy the "scripts" section
- Add to your existing `package.json` scripts

**Option B - Replace entirely:**
- Backup your current `package.json`
- Replace with the new one
- Verify all your existing scripts are still there

**New scripts added:**
```json
{
  "scripts": {
    "health": "node diagnostics/health-check.js",
    "diag:setup": "node diagnostics/setup-diagnostic.js",
    "diag:database": "node diagnostics/database-diagnostic.js",
    "diag:discord": "node diagnostics/discord-diagnostic.js",
    "diag:web": "node diagnostics/webserver-diagnostic.js",
    "diag:all": "node diagnostics/health-check.js",
    "calendar:debug": "node diagnostics/calendar-sync-debugger.js",
    "calendar:fix": "node diagnostics/fix-calendar-sync.js",
    "calendar:test": "node diagnostics/test-calendar-connection.js",
    "calendar:diagnostic": "node diagnostics/calendar-diagnostic.js"
  }
}
```

### 3. Make Scripts Executable (Linux/Mac only)

```bash
chmod +x diagnostics/*.js
```

Windows users can skip this step.

### 4. Verify Installation

```bash
# Check files are in place
ls diagnostics/

# Should show all 17 files (9 .js + 8 .md)
```

### 5. Test It Works

```bash
# Run health check
npm run health

# Should run without errors
```

---

## 📋 Quick Download Checklist

- [ ] Download entire `/diagnostics/` folder
- [ ] Place in bot's root directory
- [ ] Update `package.json` with new scripts
- [ ] Make scripts executable (Linux/Mac)
- [ ] Test: `npm run health`

---

## 🎯 After Installation

### First Run
```bash
npm run health
```

This will:
1. Check your entire setup
2. Identify any issues
3. Provide fixes for each issue
4. Give you a health status report

### Read Documentation

Start here:
1. `diagnostics/README.md` - Overview
2. `diagnostics/DIAGNOSTIC_QUICK_REFERENCE.md` - Command cheat sheet
3. `diagnostics/TROUBLESHOOTING_GUIDE.md` - When you have issues

---

## 🆘 If Installation Has Issues

### Scripts Don't Run

**Problem:** `npm run health` doesn't work

**Fix:**
```bash
# Check package.json has the scripts
cat package.json | grep "health"

# If not there, add the scripts manually
# See "New scripts added" section above
```

### Permission Denied (Linux/Mac)

**Problem:** `Permission denied` when running scripts

**Fix:**
```bash
chmod +x diagnostics/*.js
```

### Module Not Found

**Problem:** `Cannot find module` errors

**Fix:**
```bash
# Install dependencies
npm install

# Run from bot root directory
cd Discord-Event-Bot
npm run health
```

---

## 💡 Pro Tips

1. **Always run from bot's root directory**
   ```bash
   cd Discord-Event-Bot
   npm run health
   ```

2. **Don't modify diagnostic scripts**
   - They're designed to work out-of-the-box
   - If you need custom checks, create separate scripts

3. **Keep documentation updated**
   - When you update the bot, check if diagnostics need updates
   - Document any custom configurations

4. **Use version control**
   ```bash
   git add diagnostics/
   git commit -m "Add diagnostic tools"
   ```

---

## 🔄 Updating Diagnostics

When new versions are released:

1. **Backup your current diagnostics:**
   ```bash
   cp -r diagnostics diagnostics.backup
   ```

2. **Download new versions**

3. **Replace files:**
   ```bash
   # Remove old
   rm -rf diagnostics/
   
   # Add new
   # (place new diagnostics folder here)
   ```

4. **Test:**
   ```bash
   npm run health
   ```

---

## ✅ Verification

Your installation is complete when:

- [ ] `/diagnostics/` folder exists in bot root
- [ ] Contains 9 .js files
- [ ] Contains 8 .md files (including README.md)
- [ ] `package.json` has diagnostic scripts
- [ ] `npm run health` executes successfully
- [ ] Other npm scripts still work

---

## 📞 Getting Help

If you have installation issues:

1. **Check file structure:**
   ```bash
   ls -la diagnostics/
   ```

2. **Verify package.json:**
   ```bash
   cat package.json | grep "diag:"
   ```

3. **Test directly:**
   ```bash
   node diagnostics/health-check.js
   ```

4. **Include this info when asking for help:**
   - Operating system
   - Node.js version
   - Error messages
   - Output of `ls diagnostics/`

---

## 🎉 Success!

Once installed, you can:

✅ Run `npm run health` anytime for a complete system check
✅ Use specific diagnostics for targeted troubleshooting
✅ Access comprehensive documentation
✅ Quickly fix common issues
✅ Share diagnostic output when reporting bugs

---

**Happy troubleshooting!** 🔧

For usage instructions, see `diagnostics/README.md`
