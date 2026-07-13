import crypto from 'crypto';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { createAdminToken, verifyAdminToken } from '../utils/adminToken.js';
import { extensionKeyFor } from '../utils/extensionKey.js';
import userStore from '../services/userStore.js';

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

// POST /signup — self-service account creation, gated by the shared invite code.
export const signup = asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const inviteCode = String(req.body?.inviteCode || '');

  if (!env.SIGNUP_INVITE_CODE) {
    throw ApiError.badRequest('Sign-up is not enabled yet. Ask the admin to set an invite code.');
  }
  if (!safeEqual(inviteCode, env.SIGNUP_INVITE_CODE)) {
    throw ApiError.unauthorized('Invalid invite code.');
  }
  if (!USERNAME_RE.test(username)) {
    throw ApiError.badRequest(
      'Username must be 3–30 characters: lowercase letters, numbers, dot, dash or underscore.'
    );
  }
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters.');
  }

  let user;
  try {
    user = await userStore.createUser(username, password);
  } catch (error) {
    if (error.code === 'USER_EXISTS') throw ApiError.badRequest(error.message);
    throw error;
  }

  const token = createAdminToken(user.username);
  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { token, username: user.username, expiresInHours: 24 },
  });
});

export const login = asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    throw ApiError.badRequest('Username and password are required');
  }

  const user = await userStore.verifyUser(username, password);
  if (!user) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const token = createAdminToken(user.username);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { token, username: user.username, expiresInHours: 24 },
  });
});

export const me = asyncHandler(async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const payload = verifyAdminToken(token);

  if (!payload) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  res.status(200).json({
    success: true,
    data: {
      username: payload.sub,
      authenticated: true,
      extensionKey: extensionKeyFor(payload.sub),
    },
  });
});

export default { signup, login, me };
