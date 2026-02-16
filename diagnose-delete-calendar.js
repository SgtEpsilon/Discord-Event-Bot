#!/usr/bin/env node
// diagnose-delete-calendar.js - Check delete calendar endpoint

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing Delete Calendar Endpoint\n');

// Check if web-server.js exists
const webServerPath = './web-server.js';

if (!fs.existsSync(webServerPath)) {
  console.log('❌ web-server.js not found in current directory');
  console.log('   Please run this script from your bot project root');
  process.exit(1);
}

const content = fs.readFileSync(webServerPath, 'utf8');

// Check for delete endpoint
console.log('1️⃣  Checking for DELETE endpoint...');

const deletePatterns = [
  /app\.delete\(['"]\/api\/calendars\/:id['"]/,
  /app\.delete\(['"]\/api\/calendars\/\:id['"]/,
  /router\.delete\(['"]\/calendars\/:id['"]/,
];

let foundDelete = false;
let deleteEndpointCode = '';

for (const pattern of deletePatterns) {
  const match = content.match(pattern);
  if (match) {
    foundDelete = true;
    console.log(`   ✅ Found: ${match[0]}`);
    
    // Extract full endpoint
    const startIdx = content.indexOf(match[0]);
    let endIdx = content.indexOf('});', startIdx);
    
    // Find the correct closing brace
    let braceCount = 0;
    let inEndpoint = false;
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inEndpoint = true;
      }
      if (content[i] === '}') {
        braceCount--;
        if (inEndpoint && braceCount === 0) {
          endIdx = i + 2; // Include });
          break;
        }
      }
    }
    
    deleteEndpointCode = content.substring(startIdx, endIdx);
    break;
  }
}

if (!foundDelete) {
  console.log('   ❌ DELETE endpoint not found!');
  console.log('\n   This is the problem - the endpoint is missing.');
  console.log('   You need to add it to web-server.js');
  console.log('\n   See DELETE_CALENDAR_FIX.js for the complete endpoint code.');
  process.exit(1);
}

console.log('\n2️⃣  Analyzing endpoint code...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(deleteEndpointCode);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check for common issues
console.log('3️⃣  Checking for common issues...\n');

const issues = [];

// Check for verifySession middleware
if (!deleteEndpointCode.includes('verifySession')) {
  issues.push('⚠️  Missing verifySession middleware - endpoint might not be protected');
}

// Check for try/catch
if (!deleteEndpointCode.includes('try') || !deleteEndpointCode.includes('catch')) {
  issues.push('❌ Missing try/catch block - errors won\'t be handled properly');
}

// Check for CalendarConfig model
if (!deleteEndpointCode.includes('CalendarConfig')) {
  issues.push('❌ Missing CalendarConfig model import');
}

// Check for destroy() call
if (!deleteEndpointCode.includes('destroy')) {
  issues.push('❌ Missing destroy() call - calendar won\'t actually be deleted');
}

// Check for where clause
if (!deleteEndpointCode.includes('where')) {
  issues.push('❌ Missing where clause - might try to delete all calendars');
}

// Check for proper ID handling
if (deleteEndpointCode.includes('req.params.id') && !deleteEndpointCode.includes('parseInt') && !deleteEndpointCode.includes('Number(')) {
  issues.push('⚠️  ID might not be parsed to integer (could cause mismatch)');
}

// Check for error response
if (!deleteEndpointCode.includes('res.status(500)') && !deleteEndpointCode.includes('res.json({ success: false')) {
  issues.push('❌ Missing proper error response');
}

if (issues.length === 0) {
  console.log('   ✅ No obvious issues found in endpoint code');
} else {
  console.log('   Found potential issues:\n');
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log('\n4️⃣  Testing database model...\n');

// Test if we can load models
require('dotenv').config();

try {
  const { CalendarConfig } = require('./src/models');
  console.log('   ✅ CalendarConfig model loaded successfully');
  
  // Check if we can query
  (async () => {
    try {
      const { testConnection } = require('./src/config/database');
      await testConnection();
      
      const count = await CalendarConfig.count();
      console.log(`   ✅ Database accessible - ${count} calendar(s) in database`);
      
      // List calendars
      if (count > 0) {
        const calendars = await CalendarConfig.findAll();
        console.log('\n   Calendars in database:');
        calendars.forEach(cal => {
          console.log(`   - ID: ${cal.id}, Name: "${cal.name}"`);
        });
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DIAGNOSIS SUMMARY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (issues.length > 0) {
        console.log('⚠️  Found issues that need fixing:\n');
        issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
        console.log('\n📝 Apply the fix from DELETE_CALENDAR_FIX.js');
      } else {
        console.log('🤔 Endpoint looks correct. The issue might be:');
        console.log('   1. Frontend sending wrong calendar ID');
        console.log('   2. ID type mismatch (string vs integer)');
        console.log('   3. Web server needs restart');
        console.log('\n💡 Check browser console for exact error message');
        console.log('   Then restart web server: npm run web');
      }
      
      process.exit(0);
    } catch (error) {
      console.log(`   ❌ Database error: ${error.message}`);
      process.exit(1);
    }
  })();
  
} catch (error) {
  console.log(`   ❌ Failed to load models: ${error.message}`);
  process.exit(1);
}
