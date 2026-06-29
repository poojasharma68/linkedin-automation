import ApiError from '../utils/ApiError.js';
import { verifyAdminToken } from '../utils/adminToken.js';

export default function requireAdminAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  const payload = verifyAdminToken(token);
  if (!payload) {
    return next(ApiError.unauthorized('Admin login required'));
  }

  req.admin = { username: payload.sub };
  return next();
}
