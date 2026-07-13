import ApiError from '../utils/ApiError.js';
import userStore from '../services/userStore.js';

/**
 * Authenticates a request coming from the browser extension. The extension
 * sends the user's extension key (derived from their username) in the
 * `x-extension-key` header; we resolve it back to a user and attach it as
 * `req.user` so the /connect handler knows whose LinkedIn cookie this is.
 */
export default async function requireExtensionKey(req, _res, next) {
  try {
    const key = req.headers['x-extension-key'];
    const user = await userStore.findByExtensionKey(typeof key === 'string' ? key.trim() : null);

    if (!user) {
      return next(ApiError.unauthorized('Invalid or missing extension key'));
    }

    req.user = { username: user.username };
    return next();
  } catch (error) {
    return next(error);
  }
}
