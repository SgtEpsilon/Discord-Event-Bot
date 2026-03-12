#!/usr/bin/env node
/**
 * setup-secrets.js — Interactive CLI to create or update the encrypted secrets file.
 *
 * Run once (or any time you need to add/change a secret):
 *   node setup-secrets.js
 *
 * No arguments needed — it will prompt you for everything.
 * The output is written to data/secrets.enc (AES-256-GCM encrypted).
 */

'use strict';

const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const { encrypt, decrypt } = require('./src/services/secrets');

const SECRETS_FILE = path.join(__dirname, 'data/secrets.enc');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function askPassword(prompt) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdout.write(prompt);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      let input = '';
      const onData = (char) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question(prompt, resolve);
    }
  });
}

async function main() {
  console.log('\n=== Discord Bot — Secrets Setup ===\n');
  console.log('This will create/update data/secrets.enc with your encrypted credentials.');
  console.log('The file is safe to keep in the bot directory — it cannot be read without the password.\n');

  // Load existing secrets if file exists
  let existing = {};
  if (fs.existsSync(SECRETS_FILE)) {
    console.log('Existing secrets.enc found. Enter your current password to load and edit it.');
    console.log('(Press Enter to skip loading and overwrite with fresh secrets.)\n');
    const currentPw = await askPassword('Current master password (blank to overwrite): ');
    if (currentPw) {
      try {
        const base64 = fs.readFileSync(SECRETS_FILE, 'utf8').trim();
        existing = JSON.parse(decrypt(base64, currentPw));
        console.log(`\nLoaded ${Object.keys(existing).length} existing secret(s): ${Object.keys(existing).join(', ')}\n`);
      } catch (err) {
        console.error('\n❌ ' + err.message + '\n');
        process.exit(1);
      }
    } else {
      console.log('\nStarting fresh — existing secrets will be overwritten.\n');
    }
  }

  // Collect secrets to set
  const secrets = { ...existing };
  const KNOWN_KEYS = [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI',
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
  ];

  console.log('Enter values for each secret. Press Enter to keep the existing value (shown in brackets).\n');

  for (const key of KNOWN_KEYS) {
    const current = secrets[key] ? `[current: ${secrets[key].slice(0, 6)}…]` : '[not set]';
    const val = await ask(`  ${key} ${current}: `);
    if (val.trim()) secrets[key] = val.trim();
  }

  // Allow adding custom keys
  while (true) {
    const extra = await ask('\nAdd another secret key? (Enter name or blank to finish): ');
    if (!extra.trim()) break;
    const val = await ask(`  Value for ${extra.trim()}: `);
    if (val.trim()) secrets[extra.trim()] = val.trim();
  }

  // Set new master password
  console.log('\nSet a master password for the encrypted file.');
  console.log('This must be entered each time the bot starts (or set as SECRETS_PASSWORD env var).\n');

  const pw1 = await askPassword('New master password: ');
  const pw2 = await askPassword('Confirm master password: ');

  if (pw1 !== pw2) {
    console.error('\n❌ Passwords do not match. Aborting.\n');
    process.exit(1);
  }
  if (pw1.length < 8) {
    console.error('\n❌ Password must be at least 8 characters.\n');
    process.exit(1);
  }

  // Encrypt and write
  fs.mkdirSync(path.dirname(SECRETS_FILE), { recursive: true });
  const encrypted = encrypt(JSON.stringify(secrets), pw1);
  fs.writeFileSync(SECRETS_FILE, encrypted, 'utf8');

  console.log(`\n✅ ${Object.keys(secrets).length} secret(s) saved to data/secrets.enc`);
  console.log('\nTo start the bot without being prompted for a password each time,');
  console.log('set the SECRETS_PASSWORD environment variable or add it to your PM2 ecosystem config:');
  console.log('\n  # In ecosystem.config.js env section:');
  console.log('  SECRETS_PASSWORD: "your-master-password"\n');
  console.log('Remember: do NOT commit secrets.enc to version control if the password is weak.\n');

  rl.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
