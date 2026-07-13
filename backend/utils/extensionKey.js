import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Each user's extension key is derived from their username with the app secret,
 * so there is nothing extra to store. The user copies it out of the web UI once
 * and pastes it into the browser extension; the extension sends it with each
 * /connect call so the server knows whose cookie it is.
 */
export function extensionKeyFor(username) {
  return crypto
    .createHmac('sha256', env.ADMIN_JWT_SECRET)
    .update(`ext:${username}`)
    .digest('hex')
    .slice(0, 40);
}

export default { extensionKeyFor };
