import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Per-user LinkedIn session storage.
 *
 * Each user's LinkedIn cookies are encrypted (AES-256-GCM) and written to one
 * file per user, keyed by a hash of their username. Files live next to the
 * browser profile so a single mounted volume persists everything across deploys.
 *
 * This is intentionally a thin, swappable layer: the four methods below
 * (save/get/delete/has) are all the rest of the app uses, so moving to Redis or
 * Mongo later means reimplementing just this file.
 */
const SESSIONS_DIR = path.join(path.dirname(path.resolve(env.LINKEDIN_BROWSER_PROFILE_PATH)), 'sessions');
const SECRET = env.SESSION_ENCRYPTION_KEY || env.ADMIN_JWT_SECRET;
const KEY = crypto.createHash('sha256').update(`session-store:${SECRET}`).digest(); // 32 bytes

function fileFor(userId) {
  const name = crypto.createHash('sha256').update(String(userId)).digest('hex');
  return path.join(SESSIONS_DIR, `${name}.enc`);
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload) {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function ensureDir() {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

class SessionStore {
  /**
   * @param {string} userId
   * @param {Array<object>} cookies  Puppeteer-style cookie objects
   */
  async saveSession(userId, cookies) {
    await ensureDir();
    const existing = await this.getRecord(userId);
    const record = {
      cookies,
      connectedAt: existing?.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(fileFor(userId), encrypt(JSON.stringify(record)), 'utf8');
    logger.info('Saved LinkedIn session', { userId, cookies: cookies.length });
    return record;
  }

  /** Full record ({ cookies, connectedAt, updatedAt }) or null. */
  async getRecord(userId) {
    try {
      const payload = await fs.readFile(fileFor(userId), 'utf8');
      return JSON.parse(decrypt(payload));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to read LinkedIn session (treating as disconnected)', {
          userId,
          error: error.message,
        });
      }
      return null;
    }
  }

  /** Just the cookies array, or null when the user has not connected. */
  async getCookies(userId) {
    const record = await this.getRecord(userId);
    return record?.cookies?.length ? record.cookies : null;
  }

  async hasSession(userId) {
    return (await this.getCookies(userId)) !== null;
  }

  async deleteSession(userId) {
    try {
      await fs.unlink(fileFor(userId));
      logger.info('Deleted LinkedIn session', { userId });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export default new SessionStore();
