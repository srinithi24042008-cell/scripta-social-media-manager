const crypto = require('crypto');

// GCM is authenticated encryption (AEAD) — the auth tag detects any
// tampering/bit-flipping of ciphertext, unlike the old CBC mode below.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended nonce length for GCM
const AUTH_TAG_LENGTH = 16;

// Legacy format, kept ONLY so tokens encrypted before the GCM migration
// can still be decrypted. Never used for new encryption.
const LEGACY_ALGORITHM = 'aes-256-cbc';
const LEGACY_IV_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from environment variables.
 * Priority: ENCRYPTION_KEY > JWT_SECRET.
 * Throws at call-time if neither is available (startup validation should
 * have already caught a missing JWT_SECRET before this is ever reached).
 */
function getSecretKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: No encryption key available. Set ENCRYPTION_KEY or JWT_SECRET in your .env file.'
    );
  }
  // Derive a consistent 32-byte key via SHA-256 regardless of secret length
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // v2: iv:authTag:ciphertext — the "v2" tag distinguishes this from the
  // legacy iv:ciphertext (CBC) format on decrypt.
  return `v2:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptLegacyCbc(iv, encrypted) {
  const key = getSecretKey();
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    const key = getSecretKey();

    if (parts[0] === 'v2' && parts.length === 4) {
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // Legacy CBC format: iv:ciphertext (no version tag, no auth tag)
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'hex');
      if (iv.length !== LEGACY_IV_LENGTH) return null;
      return decryptLegacyCbc(iv, parts[1]);
    }

    return null;
  } catch (err) {
    // Log at debug level — decryption failures should not leak internal detail
    if (process.env.NODE_ENV !== 'production') {
      console.error('[encryption] Decryption failed:', err.message);
    }
    return null;
  }
}

module.exports = { encrypt, decrypt };
