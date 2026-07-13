import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { extensionKeyFor } from '../utils/extensionKey.js';

/**
 * User accounts, stored as one JSON file on the same volume as the sessions.
 *
 * People self-register (gated by the shared invite code), so there is no
 * hand-maintained user list. Passwords are never stored in the clear — only a
 * scrypt hash with a per-user salt. Usernames are not secret, so the file itself
 * is plain JSON.
 */
const USERS_FILE = path.join(path.dirname(path.resolve(env.LINKEDIN_BROWSER_PROFILE_PATH)), 'users.json');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

class UserStore {
  constructor() {
    this.cache = null;
    this.writeQueue = Promise.resolve();
  }

  async #load() {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(USERS_FILE, 'utf8');
      this.cache = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to read users file (starting empty)', { error: error.message });
      }
      this.cache = [];
    }
    return this.cache;
  }

  async #persist() {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  // Serialize writes so two near-simultaneous signups can't clobber the file.
  #enqueueWrite(fn) {
    const run = this.writeQueue.then(fn, fn);
    this.writeQueue = run.catch(() => {});
    return run;
  }

  async listUsers() {
    return [...(await this.#load())];
  }

  async getUser(username) {
    return (await this.#load()).find((u) => u.username === username) || null;
  }

  async createUser(username, password) {
    return this.#enqueueWrite(async () => {
      await this.#load();
      if (this.cache.some((u) => u.username === username)) {
        const error = new Error('That username is already taken.');
        error.code = 'USER_EXISTS';
        throw error;
      }
      const user = { username, password: hashPassword(password), createdAt: new Date().toISOString() };
      this.cache.push(user);
      await this.#persist();
      logger.info('User created', { username });
      return { username: user.username };
    });
  }

  async verifyUser(username, password) {
    const user = await this.getUser(username);
    if (!user) return null;
    return verifyPassword(password, user.password) ? { username: user.username } : null;
  }

  async findByExtensionKey(key) {
    if (!key) return null;
    for (const user of await this.#load()) {
      const expected = extensionKeyFor(user.username);
      const a = Buffer.from(key);
      const b = Buffer.from(expected);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return { username: user.username };
      }
    }
    return null;
  }
}

export default new UserStore();
