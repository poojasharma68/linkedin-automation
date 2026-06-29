import linkedinPostService from '../services/linkedinPostService.js';
import linkedinBrowserService from '../services/linkedinBrowserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { isValidProgramme } from '../constants/programmes.js';

export const processPosts = asyncHandler(async (req, res) => {
  const { category, programme, urls } = req.body;

  if (!category?.trim()) {
    throw ApiError.badRequest('category is required');
  }

  if (!programme?.trim() || !isValidProgramme(programme.trim().toLowerCase())) {
    throw ApiError.badRequest('A valid programme is required (UG, PG, Executive, or PGP Bharat)');
  }

  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    throw ApiError.badRequest('urls is required — paste LinkedIn post links');
  }

  const session = await linkedinBrowserService.checkSession();
  if (!session.loggedIn) {
    throw ApiError.badRequest(
      'LinkedIn is not connected. Click Connect LinkedIn in the admin UI, sign in, then try again.'
    );
  }

  const result = await linkedinPostService.processUrls({ category, programme, urls });

  res.status(200).json({
    success: true,
    message: `${result.summary.completed} of ${result.summary.total} processed`,
    data: result,
  });
});

// Returns the stored screenshots (from the links API) for the frontend.
// Supports ?category=<slug>&programme=<id> filters.
export const getPosts = asyncHandler(async (req, res) => {
  const { category, programme } = req.query;

  const data = await linkedinPostService.listPosts({ category, programme });

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

export default {
  processPosts,
  getPosts,
};
