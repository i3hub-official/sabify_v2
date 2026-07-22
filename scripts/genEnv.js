#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────────
// Sabify — ENV key generator
// Usage: node generate-env-keys.js
//        node generate-env-keys.js --write   (writes output to .env.generated)
// ─────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import fs     from 'fs';
import path   from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const WRITE_MODE = process.argv.includes('--write');

const randHex    = (bytes) => crypto.randomBytes(bytes).toString('hex');
const randBase64 = (bytes) => crypto.randomBytes(bytes).toString('base64');

const keys = [
  // ─── Master encryption key ──────────────────────────────────────────────
  {
    comment: '── Master encryption key (AES-256) ──────────────────────────',
    name:  'ENCRYPTION_KEY',
    value: randHex(32),       // 64 hex chars = 32 bytes
    note:  '64 hex chars',
  },

  // ─── Search hash pepper ────────────────────────────────────────────────
  {
    comment: '── Search hash pepper ───────────────────────────────────────',
    name:  'SEARCH_HASH_PEPPER',
    value: randBase64(32),    // 44 base64 chars — well above the 32-char minimum
    note:  '≥32 chars (base64)',
  },

  // ─── Fixed IVs (deterministic encryption) ─────────────────────────────
  {
    comment: '── Fixed IVs (deterministic encryption) ─────────────────────',
    name:  'FIXED_IV_EMAIL',
    value: randHex(16),       // 32 hex chars = 16 bytes
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_PHONE',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_USERNAME',
    value: randHex(16),
    note:  '32 hex chars',
  },
  
  // Government IDs
  {
    comment: '── Government IDs ────────────────────────────────────────────',
    name:  'FIXED_IV_NIN',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_BVN',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_PASSPORT',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_DRIVER_LICENSE',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_VOTER_ID',
    value: randHex(16),
    note:  '32 hex chars',
  },

  // Academic IDs
  {
    comment: '── Academic IDs ──────────────────────────────────────────────',
    name:  'FIXED_IV_MATRIC',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_STAFF',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_STUDENT',
    value: randHex(16),
    note:  '32 hex chars',
  },

  // Reference Numbers
  {
    comment: '── Reference Numbers ─────────────────────────────────────────',
    name:  'FIXED_IV_RECEIPT_REF',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_TRANSACTION_REF',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_APPLICATION_REF',
    value: randHex(16),
    note:  '32 hex chars',
  },

  // Personal Identifiers
  {
    comment: '── Personal Identifiers ──────────────────────────────────────',
    name:  'FIXED_IV_NAME',
    value: randHex(16),
    note:  '32 hex chars',
  },
  {
    name:  'FIXED_IV_MAIDEN_NAME',
    value: randHex(16),
    note:  '32 hex chars',
  },

  // ─── Session & JWT Secrets ─────────────────────────────────────────────
  {
    comment: '── Session secret (for cookie signing) ───────────────────────',
    name:  'SESSION_SECRET',
    value: randHex(32),       // 64 hex chars — well above the 32-char minimum
    note:  '≥32 chars (hex)',
  },
  {
    comment: '── JWT secret (for signing auth tokens) ─────────────────────',
    name:  'JWT_SECRET',
    value: randHex(32),       // 64 hex chars — well above the 32-char minimum
    note:  '≥32 chars (hex)',
  },
];

const lines = [
  '# ================================================================',
  '# Sabify — generated encryption keys',
  `# Generated: ${new Date().toISOString()}`,
  '#',
  '# !! IMPORTANT !!',
  '# 1. Copy these into your .env file.',
  '# 2. NEVER regenerate after your first user signs up —',
  '#    the FIXED_IVs are baked into every encrypted DB row.',
  '# 3. Back these up in a password manager or secrets vault.',
  '# ================================================================',
  '',
];

for (const k of keys) {
  if (k.comment) lines.push(`# ${k.comment}`);
  lines.push(`${k.name}="${k.value}"  # ${k.note}`);
}

lines.push('');

const output = lines.join('\n');

console.log('\n' + output);

if (WRITE_MODE) {
  const outPath = path.resolve(__dirname, '.env.generated');
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`✓ Written to: ${outPath}`);
  console.log('  Merge into your .env manually.\n');
} else {
  console.log('Tip: run with --write to also save as .env.generated\n');
}