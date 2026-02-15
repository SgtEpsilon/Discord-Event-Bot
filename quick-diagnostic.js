#!/usr/bin/env node
// quick-diagnostic.js - Fast issue detection

console.log('🔍 Discord Event Bot - Quick Diagnostic\n');

const fs = require('fs');
const path = require('path');

let issuesFound = 0;

// 1. Check .env file
console.log('1️⃣  Checking .env file...');
if (!fs.existsSync('.env')) {
  console.log('   ❌ .env file is MISSING!');
  console.log('   💡 Create it: cp .env.example .env');
  issuesFound++;
} else {
  const envContent = fs.readFileSync('.env', 'utf8');
  if (!envContent.includes('DISCORD_TOKEN=') || envContent.includes('DISCORD_TOKEN=your_')) {
    console.log('   ❌ DISCORD_TOKEN not configured in .env!');
    console.log('   💡 Add your Discord bot token to .env');
    issuesFound++;
  } else {
    console.log('   ✅ .env file exists with DISCORD_TOKEN');
  }
}

// 2. Check node_modules
console.log('\n2️⃣  Checking node_modules...');
if (!fs.existsSync('node_modules')) {
  console.log('   ❌ node_modules is MISSING!');
  console.log('   💡 Run: npm install');
  issuesFound++;
} else {
  console.log('   ✅ node_modules exists');
}

// 3. Check critical files
console.log('\n3️⃣  Checking critical files...');
const criticalFiles = ['index.js', 'src/bot.js', 'package.json'];
criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`   ❌ ${file} is MISSING!`);
    issuesFound++;
  } else {
    console.log(`   ✅ ${file}`);
  }
});

// 4. Check data directory
console.log('\n4️⃣  Checking data directory...');
if (!fs.existsSync('data')) {
  console.log('   ❌ data/ directory is MISSING!');
  console.log('   💡 Creating it...');
  fs.mkdirSync('data', { recursive: true });
  console.log('   ✅ Created data/ directory');
} else {
  console.log('   ✅ data/ directory exists');
}

// 5. Check database
console.log('\n5️⃣  Checking database...');
if (!fs.existsSync('data/database.sqlite')) {
  console.log('   ⚠️  database.sqlite not found');
  console.log('   💡 Run: node scripts/migrate-to-database.js');
  console.log('   (Database will be created on first run)');
} else {
  console.log('   ✅ database.sqlite exists');
}

// 6. Test loading config
console.log('\n6️⃣  Testing configuration...');
try {
  require('dotenv').config();
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.log('   ❌ DISCORD_TOKEN is not set!');
    issuesFound++;
  } else if (token.includes('your_')) {
    console.log('   ❌ DISCORD_TOKEN is still the placeholder!');
    issuesFound++;
  } else {
    console.log('   ✅ DISCORD_TOKEN is configured');
  }
} catch (error) {
  console.log(`   ❌ Error loading config: ${error.message}`);
  issuesFound++;
}

// Summary
console.log('\n' + '═'.repeat(60));
if (issuesFound === 0) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\n💡 Your bot should be ready to start:');
  console.log('   npm start              (start bot only)');
  console.log('   npm run pm2:start      (start with PM2)');
  console.log('   npm run start:all      (start bot + web)');
} else {
  console.log(`❌ Found ${issuesFound} issue(s) that need fixing!`);
  console.log('\n📝 Fix the issues above, then run:');
  console.log('   node quick-diagnostic.js');
  console.log('\nTo verify everything is working.');
}
console.log('═'.repeat(60) + '\n');

process.exit(issuesFound);