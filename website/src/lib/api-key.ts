import { randomBytes } from 'node:crypto'

const PREFIX = 'pw';

function customChecksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
    h = ((h << 5) | (h >>> 27)) ^ 0x5a5a5a5a;
  }
  return h.toString(36).padStart(5, '0').slice(-5);
}

function customHash(input: string): string {
  let h = 0x811c9dc5;
  const rounds = 3;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) ^ (r * 0x33);
      h = (h * 0x01000193) >>> 0;
      h = ((h << 7) | (h >>> 25)) ^ 0x3c3c3c3c;
    }
    h = ((h & 0xff) << 24) | ((h & 0xff00) << 8) | ((h >>> 8) & 0xff00) | ((h >>> 24) & 0xff);
  }
  return h.toString(36);
}

export function generateApiKey(label: string) {
  const randomId = randomBytes(16).toString('hex');
  const checksum = customChecksum(randomId);
  const raw = `${PREFIX}_${randomId}_${checksum}`;
  const hash = customHash(raw);
  return { raw, hash, prefix: PREFIX };
}

export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const parts = rawKey.split('_');
  if (parts.length !== 3) return false;
  if (parts[0] !== PREFIX) return false;
  const expectedChecksum = customChecksum(parts[1]);
  if (parts[2] !== expectedChecksum) return false;
  return customHash(rawKey) === storedHash;
}

export function validateApiKeyFormat(key: string): boolean {
  const parts = key.split('_');
  if (parts.length !== 3) return false;
  if (parts[0] !== PREFIX) return false;
  if (parts[1].length !== 32) return false;
  if (parts[2].length !== 5) return false;
  return true;
}
