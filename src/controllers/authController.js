import crypto from 'crypto';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { createAdminToken, verifyAdminToken } from '../utils/adminToken.js';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    throw ApiError.badRequest('Username and password are required');
  }

  const validUser = safeEqual(username.trim(), env.ADMIN_USERNAME);
  const validPass = safeEqual(password, env.ADMIN_PASSWORD);

  if (!validUser || !validPass) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const token = createAdminToken(env.ADMIN_USERNAME);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      username: env.ADMIN_USERNAME,
      expiresInHours: 24,
    },
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
    },
  });
});

export default { login, me };
