import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { createAdminToken, verifyAdminToken } from '../utils/adminToken.js';
import { findUserByCredentials, extensionKeyFor } from '../config/users.js';

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    throw ApiError.badRequest('Username and password are required');
  }

  const user = findUserByCredentials(username, password);
  if (!user) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const token = createAdminToken(user.username);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      username: user.username,
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
      // The extension key is deterministic, so it is safe to return here for the
      // signed-in user to copy into their browser extension.
      extensionKey: extensionKeyFor(payload.sub),
    },
  });
});

export default { login, me };
