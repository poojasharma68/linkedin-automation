import linkedinBrowserService from '../services/linkedinBrowserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const getSessionStatus = asyncHandler(async (_req, res) => {
  const session = await linkedinBrowserService.checkSession();

  res.status(200).json({
    success: true,
    data: session,
  });
});

export const startLogin = asyncHandler(async (_req, res) => {
  const result = await linkedinBrowserService.openLogin();

  if (!result.loggedIn) {
    throw ApiError.badRequest(result.message || 'LinkedIn login was not completed');
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

export default { getSessionStatus, startLogin };
