// src/lib/security/encryption.ts
//
// Low-level cryptographic primitives.
// Consumers should import from dataProtection.ts, not from here directly.
// This file is the single source of truth for:
//   • AES-256-CBC (fixed-IV searchable + random-IV field)
//   • AES-256-GCM (authenticated secure)
//   • SHA-512 search-hash generation
//   • Biometric encryption (128-bit face descriptors)

import { env } from '$env/dynamic/private';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// ENV VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function mustHexEnv(name: string, raw: string | undefined, bytes: number): Buffer {
  if (!raw) throw new Error(`${name} is missing`);
  if (raw.length !== bytes * 2) throw new Error(`${name} must be ${bytes * 2} hex chars (${bytes} bytes)`);
  if (!/^[0-9a-fA-F]+$/.test(raw)) throw new Error(`${name} must be valid hex`);
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== bytes) throw new Error(`${name} decoded length mismatch`);
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYS
// ─────────────────────────────────────────────────────────────────────────────

const ENCRYPTION_KEY = mustHexEnv('ENCRYPTION_KEY', env.ENCRYPTION_KEY, 32);

const FIXED_IV = {
  email:        mustHexEnv('FIXED_IV_EMAIL',        env.FIXED_IV_EMAIL,        16),
  phone:        mustHexEnv('FIXED_IV_PHONE',        env.FIXED_IV_PHONE,        16),
  username:     mustHexEnv('FIXED_IV_USERNAME',     env.FIXED_IV_USERNAME,     16),
  nin:          mustHexEnv('FIXED_IV_NIN',          env.FIXED_IV_NIN,          16),
  bvn:          mustHexEnv('FIXED_IV_BVN',          env.FIXED_IV_BVN,          16),
  passportNo:   mustHexEnv('FIXED_IV_PASSPORT',     env.FIXED_IV_PASSPORT,     16),
  driverLicense: mustHexEnv('FIXED_IV_DRIVER_LICENSE', env.FIXED_IV_DRIVER_LICENSE, 16),
  voterId:      mustHexEnv('FIXED_IV_VOTER_ID',     env.FIXED_IV_VOTER_ID,     16),
  matricNo:     mustHexEnv('FIXED_IV_MATRIC',       env.FIXED_IV_MATRIC,       16),
  staffNo:      mustHexEnv('FIXED_IV_STAFF',        env.FIXED_IV_STAFF,        16),
  studentNo:    mustHexEnv('FIXED_IV_STUDENT',      env.FIXED_IV_STUDENT,      16),
  receiptRef:   mustHexEnv('FIXED_IV_RECEIPT_REF',  env.FIXED_IV_RECEIPT_REF,  16),
  transactionRef: mustHexEnv('FIXED_IV_TRANSACTION_REF', env.FIXED_IV_TRANSACTION_REF, 16),
  applicationRef: mustHexEnv('FIXED_IV_APPLICATION_REF', env.FIXED_IV_APPLICATION_REF, 16),
  name:         mustHexEnv('FIXED_IV_NAME',         env.FIXED_IV_NAME,         16),
  maidenName:   mustHexEnv('FIXED_IV_MAIDEN_NAME',  env.FIXED_IV_MAIDEN_NAME,  16),
};

const SEARCH_HASH_PEPPER = (() => {
  const val = env.SEARCH_HASH_PEPPER;
  if (!val || val.length < 32) throw new Error('SEARCH_HASH_PEPPER must be >= 32 characters');
  return val;
})();

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function assertValidHex(str: string, field: string): void {
  if (!str || str.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(str)) {
    throw new Error(
      `Corrupted encrypted data [${field}] -- expected valid hex, ` +
      `got "${str?.slice(0, 50)}..." (len: ${str?.length ?? 0})`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Searchable Deterministic Encryption (AES-256-CBC + Fixed IV)
// ─────────────────────────────────────────────────────────────────────────────

export type SearchableField =
  | 'email' | 'phone' | 'username'
  | 'nin' | 'bvn' | 'passportNo' | 'driverLicense' | 'voterId'
  | 'matricNo' | 'staffNo' | 'studentNo'
  | 'receiptRef' | 'transactionRef' | 'applicationRef'
  | 'name' | 'maidenName';

export function encryptSearchable(data: string, field: SearchableField): string {
  if (!data) throw new Error(`Cannot encrypt empty ${field}`);
  if (!FIXED_IV[field]) throw new Error(`No FIXED_IV defined for field: ${field}`);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, FIXED_IV[field]);
  const encrypted = Buffer.concat([cipher.update(data.trim(), 'utf8'), cipher.final()]);
  return encrypted.toString('hex');
}

export function decryptSearchable(encryptedData: string, field: SearchableField): string {
  assertValidHex(encryptedData, field);
  if (!FIXED_IV[field]) throw new Error(`No FIXED_IV defined for field: ${field}`);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, FIXED_IV[field]);
  return decipher.update(Buffer.from(encryptedData, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: Random-IV Encryption (AES-256-CBC)
// ─────────────────────────────────────────────────────────────────────────────

export function encryptField(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty field');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(encryptedData: string): string {
  const sep = encryptedData.indexOf(':');
  if (sep === -1) throw new Error('Invalid encrypted field format (missing colon separator)');
  const ivHex = encryptedData.slice(0, sep);
  const encHex = encryptedData.slice(sep + 1);
  assertValidHex(ivHex, 'IV');
  assertValidHex(encHex, 'Encrypted');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: AES-256-GCM -- Authenticated Encryption
// ─────────────────────────────────────────────────────────────────────────────

export function encryptSecure(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty secure payload');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecure(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid GCM format: expected "iv:authTag:encrypted"');
  const [ivHex, authTagHex, encHex] = parts;
  assertValidHex(ivHex, 'GCM IV');
  assertValidHex(authTagHex, 'GCM AuthTag');
  assertValidHex(encHex, 'GCM Encrypted');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4: Biometric Encryption (128-bit face descriptors)
// ─────────────────────────────────────────────────────────────────────────────
//
// Face descriptors are 128-element Float32 arrays (512 bytes raw).
// We encrypt them with AES-256-GCM for both confidentiality and integrity.
// The descriptor is serialised as a compact JSON array before encryption.

export function encryptBiometric(descriptor: Float32Array): string {
  if (!descriptor || descriptor.length !== 128) {
    throw new Error('Face descriptor must be a 128-element Float32Array');
  }
  const json = JSON.stringify(Array.from(descriptor));
  return encryptSecure(json);
}

export function decryptBiometric(encryptedData: string): Float32Array {
  const json = decryptSecure(encryptedData);
  const arr = JSON.parse(json) as number[];
  if (arr.length !== 128) throw new Error('Decrypted face descriptor must have 128 elements');
  return new Float32Array(arr);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HASH (SHA-512 + pepper)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSearchHash(input: string, context: SearchableField): Promise<string> {
  if (!input) throw new Error('Cannot hash empty input');
  const encoder = new TextEncoder();
  const data = encoder.encode(`${context.toLowerCase()}::${input.trim()}::${SEARCH_HASH_PEPPER}`);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}