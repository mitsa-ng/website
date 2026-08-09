import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PREFIX = 'pw';

// scrypt parameters — N=2^15 (cost), r=8 (block size), p=1 (parallelism).
// These are the values recommended by the OWASP password storage cheat
// sheet for interactive logins, and run in ~50-100ms on modern hardware,
// which is acceptable for an admin key check that happens once per request.
// maxmem must exceed 128 * N * r bytes (= 32 MiB here); 64 MiB gives headroom.
const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

interface ScryptParams {
  N: number;
  r: number;
  p: number;
  maxmem?: number;
}

/**
 * Embedded checksum in the raw key (visible to the user). This is NOT a
 * security feature — it only lets humans detect a typo'd key before it
 * reaches the DB. Kept from the original implementation for backward
 * compatibility of the raw-key format.
 */
function customChecksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
    h = ((h << 5) | (h >>> 27)) ^ 0x5a5a5a5a;
  }
  return h.toString(36).padStart(5, '0').slice(-5);
}

/**
 * Hash a raw API key with scrypt + per-key random salt.
 * Stored format: `scrypt$<params>$<saltHex>$<hashHex>` so the algorithm
 * and parameters travel with the hash for forward-compatible upgrades.
 */
export function hashApiKey(raw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(raw, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Verify a raw key against a stored hash. Supports the current `scrypt$`
 * format. Any other format (including legacy customHash strings) is
 * treated as invalid — legacy keys are automatically rejected and must
 * be regenerated. Comparison is constant-time.
 */
export function verifyApiKeyHash(raw: string, stored: string): boolean {
  // Wrap the whole parse + scrypt in a try/catch so a malformed/corrupted
  // stored hash (e.g. from a tampered DB row) is rejected as invalid rather
  // than surfacing as an uncaught 500 on the requireAdmin path.
  try {
    if (typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], 'hex');
    const expectedHash = Buffer.from(parts[5], 'hex');
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    if (N <= 0 || r <= 0 || p <= 0) return false;
    if (salt.length === 0 || expectedHash.length === 0) return false;

    // maxmem must cover 128 * N * r; use a generous bound so legacy/changed
    // params in stored hashes still verify.
    const params: ScryptParams = { N, r, p, maxmem: Math.max(64 * 1024 * 1024, 128 * N * r * 2) };
    const computed = scryptSync(raw, salt, expectedHash.length, params);
    return computed.length === expectedHash.length && timingSafeEqual(computed, expectedHash);
  } catch {
    return false;
  }
}

export function generateApiKey(label: string) {
  const randomId = randomBytes(16).toString('hex');
  const checksum = customChecksum(randomId);
  const raw = `${PREFIX}_${randomId}_${checksum}`;
  const hash = hashApiKey(raw);
  return { raw, hash, prefix: PREFIX };
}

/**
 * Verify a raw key + stored hash, including the embedded checksum check.
 * Kept as the single entry point used by auth.ts / verify route so those
 * callers don't need to know about the checksum step.
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const parts = rawKey.split('_');
  if (parts.length !== 3) return false;
  if (parts[0] !== PREFIX) return false;
  if (customChecksum(parts[1]) !== parts[2]) return false;
  return verifyApiKeyHash(rawKey, storedHash);
}

export function validateApiKeyFormat(key: string): boolean {
  const parts = key.split('_');
  if (parts.length !== 3) return false;
  if (parts[0] !== PREFIX) return false;
  if (parts[1].length !== 32) return false;
  if (parts[2].length !== 5) return false;
  return true;
}
