import crypto from 'crypto';
import env from '../config/env.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createAdminToken(username) {
  const payload = {
    sub: username,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.ADMIN_JWT_SECRET)
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac('sha256', env.ADMIN_JWT_SECRET)
    .update(body)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
