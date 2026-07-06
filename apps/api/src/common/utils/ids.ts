import { randomBytes } from 'node:crypto';

/**
 * Application-generated, prefix-tagged identifiers (e.g. `req_9f3k2m8q4x7c`).
 * Prefixes make ids self-describing in logs and DB rows, and keep our public
 * request id independent of any Setu id.
 */
export const ID_PREFIXES = {
  request: 'req',
  document: 'doc',
  signature: 'sig',
} as const;

// Crockford-ish base32 (no i/l/o/u to avoid ambiguity).
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

export function newId(prefix: string, size = 12): string {
  const bytes = randomBytes(size);
  let out = '';
  for (let i = 0; i < size; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix}_${out}`;
}
