import linkedinPostService from '../services/linkedinPostService.js';
import linkedinBrowserService from '../services/linkedinBrowserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const processPosts = asyncHandler(async (req, res) => {
  const { urls, categories, programmes } = req.body;

  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    throw ApiError.badRequest('urls is required — paste LinkedIn post links');
  }

  const session = await linkedinBrowserService.checkSession();
  if (!session.loggedIn) {
    throw ApiError.badRequest(
      'LinkedIn is not connected. Click Connect LinkedIn in the admin UI, sign in, then try again.'
    );
  }

  const result = await linkedinPostService.processUrls({ urls, categories, programmes });

  res.status(200).json({
    success: true,
    message: `${result.summary.completed} of ${result.summary.total} processed`,
    data: result,
  });
});

export default {
  processPosts,
};
