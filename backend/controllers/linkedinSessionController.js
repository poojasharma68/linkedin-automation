import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import sessionStore from '../services/sessionStore.js';

const LINKEDIN_DOMAIN = '.linkedin.com';

// Chrome's sameSite values differ from what Puppeteer's setCookie expects.
function normalizeSameSite(value) {
  switch (String(value || '').toLowerCase()) {
    case 'no_restriction':
    case 'none':
      return 'None';
    case 'strict':
      return 'Strict';
    case 'lax':
      return 'Lax';
    default:
      return undefined;
  }
}

// Accepts the raw cookies the extension collected (chrome.cookies shape) and
// returns Puppeteer-ready cookie objects.
function normalizeCookies(rawCookies) {
  if (!Array.isArray(rawCookies)) return [];

  return rawCookies
    .filter((cookie) => cookie && cookie.name && cookie.value)
    .map((cookie) => {
      const sameSite = normalizeSameSite(cookie.sameSite);
      const secure = sameSite === 'None' ? true : Boolean(cookie.secure);
      const expires =
        typeof cookie.expirationDate === 'number'
          ? Math.floor(cookie.expirationDate)
          : typeof cookie.expires === 'number'
            ? cookie.expires
            : -1;

      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || LINKEDIN_DOMAIN,
        path: cookie.path || '/',
        secure,
        httpOnly: Boolean(cookie.httpOnly),
        expires,
        ...(sameSite ? { sameSite } : {}),
      };
    });
}

function liAtCookie(cookies) {
  return cookies?.find((cookie) => cookie.name === 'li_at' && cookie.value);
}

function isExpired(cookie) {
  return typeof cookie.expires === 'number' && cookie.expires > 0 && cookie.expires * 1000 < Date.now();
}

// GET /status — cheap, no browser. Reports whether the signed-in user has a
// stored, unexpired LinkedIn session. Actual validity is confirmed on capture.
export const getSessionStatus = asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const record = await sessionStore.getRecord(userId);
  const liAt = liAtCookie(record?.cookies);
  const connected = Boolean(liAt) && !isExpired(liAt);

  res.status(200).json({
    success: true,
    data: {
      connected,
      // kept for backwards compatibility with the existing client field name
      loggedIn: connected,
      connectedAt: record?.connectedAt || null,
      updatedAt: record?.updatedAt || null,
    },
  });
});

// POST /connect — called by the browser extension. Authenticated by the
// extension key (req.user set by requireExtensionKey). Stores the user's cookies.
export const connectSession = asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const cookies = normalizeCookies(req.body?.cookies);

  if (!liAtCookie(cookies)) {
    throw ApiError.badRequest(
      'No LinkedIn session cookie (li_at) was found. Make sure you are logged in to LinkedIn in this browser, then try again.'
    );
  }

  const record = await sessionStore.saveSession(userId, cookies);

  res.status(200).json({
    success: true,
    message: 'LinkedIn connected successfully.',
    data: { connected: true, username: userId, connectedAt: record.connectedAt },
  });
});

// POST /disconnect — signed-in user removes their stored session.
export const disconnectSession = asyncHandler(async (req, res) => {
  const userId = req.user.username;
  await sessionStore.deleteSession(userId);

  res.status(200).json({
    success: true,
    message: 'LinkedIn disconnected.',
    data: { connected: false },
  });
});

export default { getSessionStatus, connectSession, disconnectSession };
