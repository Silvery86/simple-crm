import crypto from 'crypto';

/**
 * Purpose: Encrypt and decrypt sensitive data like API keys and secrets.
 * Uses AES-256-GCM encryption algorithm.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Purpose: Get encryption key from environment or generate one.
 * Returns: Buffer - 32 bytes encryption key
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }
  
  // Use PBKDF2 to derive a key from the secret
  return crypto.pbkdf2Sync(secret, 'salt', 100000, 32, 'sha256');
}

/**
 * Purpose: Encrypt sensitive text data.
 * Params:
 *   - text: string — Plain text to encrypt
 * Returns:
 *   - string — Encrypted text in base64 format
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Purpose: Decrypt encrypted text data.
 * Params:
 *   - encryptedText: string — Encrypted text in base64 format
 * Returns:
 *   - string — Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    const key = getKey();
    const data = Buffer.from(encryptedText, 'base64');
    
    // Extract salt, iv, tag, and encrypted data
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = decipher.update(encrypted) + decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Purpose: Hash sensitive data (one-way, cannot be decrypted).
 * Use for data that only needs verification, not retrieval.
 * Params:
 *   - text: string — Text to hash
 * Returns:
 *   - string — Hashed text
 */
export function hash(text: string): string {
  if (!text) return text;
  
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
}

/**
 * Purpose: Compare plain text with hashed value.
 * Params:
 *   - text: string — Plain text
 *   - hashedText: string — Hashed text to compare against
 * Returns:
 *   - boolean — True if they match
 */
export function verifyHash(text: string, hashedText: string): boolean {
  if (!text || !hashedText) return false;
  
  const textHash = hash(text);
  return textHash === hashedText;
}
