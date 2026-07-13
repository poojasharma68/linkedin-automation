import crypto from 'crypto';
import env from './env.js';
import logger from './logger.js';

/**
 * The app's user list. Each person logs into the web app with their own
 * username/password and connects their own LinkedIn. Users are defined via the
 * APP_USERS env var (JSON array of { username, password }); if that is unset we
 * fall back to the single ADMIN_USERNAME/ADMIN_PASSWORD so nothing breaks.
 *
 * There is no database — for an internal tool with well under 10 users a config
 * list is enough. The user's `username` is their stable id everywhere else
 * (session storage, JWT subject, extension key).
 */
function loadUsers() {
  if (env.APP_USERS) {
    try {
      const parsed = JSON.parse(env.APP_USERS);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('APP_USERS must be a non-empty JSON array');
      }

      const users = parsed.map((entry, index) => {
        const username = String(entry.username || '').trim();
        const password = String(entry.password ?? '');
        if (!username || !password) {
          throw new Error(`APP_USERS[${index}] needs both "username" and "password"`);
        }
        return { username, password };
      });

      const names = new Set(users.map((u) => u.username));
      if (names.size !== users.length) {
        throw new Error('APP_USERS has duplicate usernames');
      }

      logger.info('Loaded app users from APP_USERS', { count: users.length });
      return users;
    } catch (error) {
      throw new Error(`Failed to parse APP_USERS: ${error.message}`);
    }
  }

  logger.info('APP_USERS not set — using the single ADMIN_USERNAME account');
  return [{ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }];
}

const users = loadUsers();
const usersByName = new Map(users.map((u) => [u.username, u]));

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Each user's extension key is derived from their username with the app secret,
 * so there is nothing extra to configure or store. The user copies it out of the
 * web UI once and pastes it into the browser extension; the extension sends it
 * with each /connect call so the server knows whose cookie it is.
 */
export function extensionKeyFor(username) {
  return crypto
    .createHmac('sha256', env.ADMIN_JWT_SECRET)
    .update(`ext:${username}`)
    .digest('hex')
    .slice(0, 40);
}

export function findUserByCredentials(username, password) {
  const user = usersByName.get(String(username || '').trim());
  if (!user) return null;
  // Compare against the resolved user (not a map lookup on password) so a bad
  // username still does a constant-time-ish password compare.
  const okUser = timingSafeEqualStr(username.trim(), user.username);
  const okPass = timingSafeEqualStr(password, user.password);
  return okUser && okPass ? { username: user.username } : null;
}

export function findUserByExtensionKey(key) {
  if (!key || typeof key !== 'string') return null;
  for (const user of users) {
    if (timingSafeEqualStr(key, extensionKeyFor(user.username))) {
      return { username: user.username };
    }
  }
  return null;
}

export function isKnownUser(username) {
  return usersByName.has(String(username || '').trim());
}

export default { extensionKeyFor, findUserByCredentials, findUserByExtensionKey, isKnownUser };
