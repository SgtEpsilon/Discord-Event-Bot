#!/usr/bin/env node
// health-check.js - Complete system health check

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

function section(title) {
  console.log('');
  console.log(colors.cyan + colors.bright + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.cyan + colors.bright + '  ' + title + colors.reset);
  console.log(colors.cyan + colors.bright + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log('');
}

async function runDiagnostic(name, script) {
  console.log(colors.cyan + `Running ${name} diagnostic...` + colors.reset);
  console.log('');
  
  try {
    const { stdout, stderr } = await execAsync(`node "${script}"`, {
      cwd: PROJECT_ROOT,
      timeout: 60000
    });
    
    console.log(stdout);
    if (stderr && !stderr.includes('DeprecationWarning') && !stderr.includes('ExperimentalWarning')) {
      console.log(colors.yellow + stderr + colors.reset);
    }
    
    return { success: true };
  } catch (err) {
    // Exit code 1 means issues were found (not a crash)
    if (err.code === 1 && err.stdout) {
      console.log(err.stdout);
      return { success: false, hasIssues: true };
    }
    
    // Actual error running the script
    if (err.stdout) console.log(err.stdout);
    console.log(colors.red + `Failed to run ${name}: ${err.message}` + colors.reset);
    console.log('');
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('');
  console.log(colors.cyan + colors.bright + '╔═══════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + colors.bright + '║                                                       ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '║     🏥 DISCORD EVENT BOT - HEALTH CHECK              ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '║                                                       ║' + colors.reset);
  console.log(colors.cyan + colors.bright + '╚═══════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
  console.log(colors.dim + '  Running comprehensive diagnostics...' + colors.reset);
  console.log(colors.dim + '  This may take 30-60 seconds' + colors.reset);
  console.log('');
  
  const diagnostics = [
    { name: 'Setup',             script: path.join(__dirname, 'setup-diagnostic.js'),        critical: true  },
    { name: 'Database',          script: path.join(__dirname, 'database-diagnostic.js'),      critical: true  },
    { name: 'Discord Connection',script: path.join(__dirname, 'discord-diagnostic.js'),       critical: true  },
    { name: 'Web Server',        script: path.join(__dirname, 'webserver-diagnostic.js'),     critical: false },
    { name: 'Calendar Sync',     script: path.join(__dirname, 'calendar-sync-debugger.js'),   critical: false }
  ];
  
  const results = {};
  
  for (const diag of diagnostics) {
    section(diag.name);
    
    if (!fs.existsSync(diag.script)) {
      console.log(colors.yellow + `⚠️  ${path.basename(diag.script)} not found, skipping...` + colors.reset);
      console.log('');
      results[diag.name] = { ...diag, skipped: true };
      continue;
    }
    
    const result = await runDiagnostic(diag.name, diag.script);
    results[diag.name] = { ...diag, ...result };
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final Summary
  section('OVERALL HEALTH SUMMARY');
  
  const allResults   = Object.values(results);
  const passed       = allResults.filter(r => r.success && !r.skipped);
  const criticalFail = allResults.filter(r => r.critical && !r.success && !r.skipped);
  const warnings     = allResults.filter(r => !r.critical && r.hasIssues && !r.skipped);
  const skipped      = allResults.filter(r => r.skipped);
  
  console.log(colors.bright + 'Results:' + colors.reset);
  console.log('');
  
  if (passed.length > 0) {
    console.log(colors.green + `✅ Passed: ${passed.length}` + colors.reset);
    passed.forEach(r => console.log(`   • ${r.name}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(colors.yellow + `⚠️  Warnings: ${warnings.length}` + colors.reset);
    warnings.forEach(r => console.log(`   • ${r.name} has non-critical issues`));
    console.log('');
  }
  
  if (criticalFail.length > 0) {
    console.log(colors.red + `❌ Critical Issues: ${criticalFail.length}` + colors.reset);
    criticalFail.forEach(r => console.log(`   • ${r.name} has critical issues`));
    console.log('');
  }
  
  if (skipped.length > 0) {
    console.log(colors.dim + `⏭️  Skipped: ${skipped.length}` + colors.reset);
    console.log('');
  }
  
  console.log(colors.cyan + '─────────────────────────────────────────────────────' + colors.reset);
  console.log('');
  
  if (criticalFail.length === 0 && warnings.length === 0) {
    console.log(colors.green + colors.bright + '🎉 ALL SYSTEMS HEALTHY! 🎉' + colors.reset);
    console.log('');
    console.log('Your bot is ready to use!');
    console.log('');
    require('dotenv').config({ path: path.join(PROJECT_ROOT, '.env') });
    const port = process.env.WEB_PORT || 3000;
    console.log('1. Bot Status:  ' + colors.cyan + 'pm2 status' + colors.reset);
    console.log('2. View Logs:   ' + colors.cyan + 'pm2 logs discord-event-bot' + colors.reset);
    console.log('3. Web UI:      ' + colors.cyan + `http://localhost:${port}` + colors.reset);
    console.log('4. Discord:     ' + colors.cyan + '/create  /list  /eventinfo' + colors.reset);
    console.log('');
  } else if (criticalFail.length === 0) {
    console.log(colors.yellow + '⚠️  System has warnings but is functional' + colors.reset);
    console.log('');
    console.log('The bot should work — review the warnings above for optimal performance.');
    console.log('');
  } else {
    console.log(colors.red + '❌ Critical issues detected' + colors.reset);
    console.log('');
    console.log('Fix the critical issues listed above before running the bot.');
    console.log('');
    console.log('Run individual diagnostics for detailed fixes:');
    criticalFail.forEach(r => console.log(`  node "${r.script}"`));
    console.log('');
  }
  
  console.log(colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log('');
  console.log(colors.dim + 'Need help? Check: diagnostics/TROUBLESHOOTING_GUIDE.md' + colors.reset);
  console.log('');
  
  process.exit(criticalFail.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('');
  console.error(colors.red + '❌ Health check failed: ' + err.message + colors.reset);
  console.error('');
  console.error(err.stack);
  process.exit(1);
});
