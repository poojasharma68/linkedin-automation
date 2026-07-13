import linkedinPostService from '../services/linkedinPostService.js';
import sessionStore from '../services/sessionStore.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const processPosts = asyncHandler(async (req, res) => {
  const userId = req.user.username;
  const { urls, categories, programmes } = req.body;

  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    throw ApiError.badRequest('urls is required — paste LinkedIn post links');
  }

  const hasSession = await sessionStore.hasSession(userId);
  if (!hasSession) {
    throw ApiError.badRequest(
      'LinkedIn is not connected for your account. Open the extension and click Connect LinkedIn, then try again.'
    );
  }

  const result = await linkedinPostService.processUrls({ userId, urls, categories, programmes });

  res.status(200).json({
    success: true,
    message: `${result.summary.completed} of ${result.summary.total} processed`,
    data: result,
  });
});

export default {
  processPosts,
};
