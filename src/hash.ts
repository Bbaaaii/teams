import config from './config.json';
import { pbkdf2Sync } from 'crypto';

// NOTE: Changing these would invalidate all existing tokens and passwords
const HASH_ITERATIONS = 1000;
const HASH_KEYLEN = 64;

/**
 * Hashes a string using a global secret stored in the config file
 * @param token string to hash
 * @returns hashed string
 */
export function hashString(token: string): string {
  // This toString is necessary as OTHERWISE it just breaks sometimes
  // It might be due to the fact that when requests are sent and such, the datatype is lost
  // I'm not sure, but TypeScript doesn't complain about token, the crypto library does, and it works with this
  const hash = pbkdf2Sync(token.toString(), config.globalSecret, HASH_ITERATIONS, HASH_KEYLEN, 'sha512');

  return hash.toString('utf-8');
}

/**
 * Compares a string to a hashed string
 * @param token unhashed string
 * @param hash hashed string
 * @returns true if the strings match
 */
export function hashCompare(token: string, hash: string): boolean {
  const newHash = hashString(token);

  return newHash === hash;
}
