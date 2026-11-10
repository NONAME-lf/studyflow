import { createHash, timingSafeEqual } from 'node:crypto';

// Refresh tokens are long random JWTs: SHA-256 is enough (bcrypt would cut them at 72 bytes).
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatchesHash(token: string, hash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
