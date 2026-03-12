/**
 * secrets.js — Cross-platform encrypted secrets store.
 *
 * Uses AES-256-GCM encryption with a key derived from a master password
 * via PBKDF2 (built-in Node crypto — zero extra dependencies).
 *
 * Secrets are stored in data/secrets.enc inside the bot directory.
 * The file is safe to keep in the directory; it is useless without the password.
 *
 * The master password is read from the SECRETS_PASSWORD environment variable
 * OR prompted interactively at startup (see setup-secrets.js for first-time setup).
 *
 * Usage:
 *   const { getSecret } = require('./src/services/secrets');
 *   const clientId = await getSecret('GOOGLE_OAUTH_CLIENT_ID');
 */

'use strict';

const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SECRETS_FILE = path.join(__dirname, '../../data/secrets.enc');
const ALGORITHM    = 'aes-256-gcm';
const KDF_ITERS    = 310_000; // OWASP recommended minimum for PBKDF2-SHA256
const KDF_DIGEST   = 'sha256';
const KEY_LEN      = 32; // 256-bit key

// In-memory cache — decrypted once per process, never written to disk
let _cache = null;

// ---------------------------------------------------------------------------
// Internal: key derivation
// ---------------------------------------------------------------------------

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, KDF_ITERS, KEY_LEN, KDF_DIGEST);
}

// ---------------------------------------------------------------------------
// Internal: encrypt
// ---------------------------------------------------------------------------

function encrypt(plaintext, password) {
  const salt     = crypto.randomBytes(32);
  const iv       = crypto.randomBytes(12); // 96-bit IV for GCM
  const key      = deriveKey(password, salt);
  const cipher   = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag  = cipher.getAuthTag(); // 128-bit GCM auth tag

  // Layout: salt(32) + iv(12) + authTag(16) + ciphertext
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

// ---------------------------------------------------------------------------
// Internal: decrypt
// ---------------------------------------------------------------------------

function decrypt(base64, password) {
  const buf     = Buffer.from(base64, 'base64');
  const salt    = buf.subarray(0, 32);
  const iv      = buf.subarray(32, 44);
  const authTag = buf.subarray(44, 60);
  const data    = buf.subarray(60);
  const key     = deriveKey(password, salt);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    throw new Error('Failed to decrypt secrets — wrong password or corrupted file.');
  }
}

// ---------------------------------------------------------------------------
// Internal: prompt for password without echoing (cross-platform)
// ---------------------------------------------------------------------------

function promptPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const canHide = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';
    if (canHide) {
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
          rl.close();
          resolve(input);
        } else if (char === '\u0003') {
          process.exit(); // Ctrl+C
        } else if (char === '\u007f') {
          input = input.slice(0, -1); // Backspace
        } else {
          input += char;
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question(prompt, (answer) => { rl.close(); resolve(answer); });
    }
  });
}

// ---------------------------------------------------------------------------
// Internal: load and cache secrets
// ---------------------------------------------------------------------------

async function loadSecrets() {
  if (_cache) return _cache;

  if (!fs.existsSync(SECRETS_FILE)) {
    throw new Error(
      `Secrets file not found at ${SECRETS_FILE}\n` +
      'Run "node setup-secrets.js" to create it.'
    );
  }

  let password = process.env.SECRETS_PASSWORD;

  if (!password) {
    if (!process.stdin.isTTY) {
      throw new Error(
        'SECRETS_PASSWORD is not set.\n' +
        'Add it to the env block in ecosystem.config.js:\n' +
        '  SECRETS_PASSWORD: "your-master-password"\n' +
        'Then restart with: pm2 restart all'
      );
    }
    password = await promptPassword('[Secrets] Master password: ');
  }

  const base64 = fs.readFileSync(SECRETS_FILE, 'utf8').trim();
  const json   = decrypt(base64, password);
  _cache       = JSON.parse(json);

  console.log('[Secrets] Secrets loaded and cached in memory.');
  return _cache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a single secret by key.
 * Falls back to process.env so existing env-var workflows still work during migration.
 * @param {string} key
 * @returns {Promise<string|undefined>}
 */
async function getSecret(key) {
  try {
    const secrets = await loadSecrets();
    return secrets[key] ?? process.env[key];
  } catch (err) {
    // Fall back to env vars if secrets file missing OR password not set yet
    // This allows the bot to still start if only some secrets are in the store
    const envVal = process.env[key];
    if (envVal) return envVal;
    throw err;
  }
}

/**
 * Get all secrets as a plain object.
 * @returns {Promise<Record<string, string>>}
 */
async function getAllSecrets() {
  return loadSecrets();
}

/** Clear the in-memory cache (useful for testing). */
function clearCache() { _cache = null; }

// Low-level helpers consumed by setup-secrets.js
module.exports = { getSecret, getAllSecrets, clearCache, encrypt, decrypt };
