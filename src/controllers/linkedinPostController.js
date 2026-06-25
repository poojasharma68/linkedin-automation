import linkedinPostService from '../services/linkedinPostService.js';
import linkedinBrowserService from '../services/linkedinBrowserService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { isValidProgramme } from '../constants/programmes.js';

export const getPosts = asyncHandler(async (req, res) => {
  const { category, programme } = req.query;

  const posts = await linkedinPostService.findAll({
    category,
    programme,
    status: 'Completed',
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    category: category || 'all',
    programme: programme || 'all',
    data: posts,
  });
});

export const getAllPosts = asyncHandler(async (req, res) => {
  const { category, programme, status } = req.query;

  const posts = await linkedinPostService.findAll({ category, programme, status });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await linkedinPostService.findById(req.params.id);

  res.status(200).json({
    success: true,
    data: post,
  });
});

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

  const result = await linkedinPostService.submitAndProcess({ category, programme, urls });

  res.status(202).json({
    success: true,
    message: result.summary.message || 'Posts queued for processing',
    data: result,
  });
});

export const retryFailedPost = asyncHandler(async (req, res) => {
  const session = await linkedinBrowserService.checkSession();
  if (!session.loggedIn) {
    throw ApiError.badRequest(
      'LinkedIn is not connected. Click Connect LinkedIn, sign in, then retry.'
    );
  }

  const result = await linkedinPostService.retryFailedPost(req.params.id);

  res.status(202).json({
    success: true,
    message: result.message || 'Post retry queued',
    data: result,
  });
});

export const retryFailedPosts = asyncHandler(async (req, res) => {
  const { category, programme } = req.body;

  const session = await linkedinBrowserService.checkSession();
  if (!session.loggedIn) {
    throw ApiError.badRequest(
      'LinkedIn is not connected. Click Connect LinkedIn, sign in, then retry.'
    );
  }

  const summary = await linkedinPostService.retryFailedByCategory(category, programme);

  res.status(202).json({
    success: true,
    message: summary.message || 'Failed posts queued for retry',
    data: summary,
  });
});

export const testUpload = asyncHandler(async (req, res) => {
  if (!env.isDevelopment) {
    throw ApiError.notFound('Not found');
  }

  const buffer = Buffer.isBuffer(req.body) ? req.body : null;
  const contentType = req.headers['content-type'];

  const result = await linkedinPostService.testCdnUpload({ buffer, contentType });

  res.status(201).json({
    success: true,
    message: buffer
      ? 'Uploaded image sent to CDN and saved to DB'
      : 'Generated test image sent to CDN and saved to DB',
    data: result,
  });
});

export const getCdnLinks = asyncHandler(async (_req, res) => {
  if (!env.isDevelopment) {
    throw ApiError.notFound('Not found');
  }

  const links = await linkedinPostService.listCdnLinks();

  res.status(200).json({
    success: true,
    count: links.length,
    data: links,
  });
});

export const getCdnPosts = asyncHandler(async (req, res) => {
  if (!env.isDevelopment) {
    throw ApiError.notFound('Not found');
  }

  const { category, programme, status } = req.query;

  const posts = await linkedinPostService.findAll({ category, programme, status });

  const data = posts.map((post) => ({
    id: post.id,
    linkedinUrl: post.linkedinUrl,
    category: post.category,
    status: post.status,
    cdnUrl: post.imageUrl,
    createdAt: post.createdAt,
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await linkedinPostService.deletePost(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Post deleted',
    data: post,
  });
});

export default {
  getPosts,
  getAllPosts,
  getPostById,
  processPosts,
  retryFailedPost,
  retryFailedPosts,
  testUpload,
  getCdnLinks,
  getCdnPosts,
  deletePost,
};
