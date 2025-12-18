import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Criptografar uma string (API key)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografar uma string
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash de API key (para armazenar referência sem expor)
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Gerar API key segura
 */
export function generateApiKey(prefix: string = 'base'): { key: string; hash: string } {
  const randomPart = crypto.randomBytes(32).toString('base64url');
  const key = `${prefix}_${randomPart}`;
  const hash = hashApiKey(key);

  return { key, hash };
}

/**
 * Obter hint de uma chave (últimos 4 caracteres)
 */
export function getKeyHint(key: string): string {
  return `****${key.slice(-4)}`;
}
