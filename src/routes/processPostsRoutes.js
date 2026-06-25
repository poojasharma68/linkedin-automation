import express, { Router } from 'express';
import {
  processPosts,
  retryFailedPosts,
  testUpload,
  getCdnLinks,
  getCdnPosts,
} from '../controllers/linkedinPostController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

// Dev-only smoke test: send an image as the binary body to upload it to the
// CDN, or send no body to upload an auto-generated test image. Declared before
// the auth guard so it's easy to hit from Postman.
router.post(
  '/test-upload',
  express.raw({ type: ['image/*', 'application/octet-stream'], limit: '15mb' }),
  testUpload
);

// Dev-only: fetch the CDN links from the links API (GET /api/links).
router.get('/test-links', getCdnLinks);

// Dev-only: list DB posts (the cards) with the CDN link saved on each.
router.get('/test-posts', getCdnPosts);

router.use(requireAdminAuth);

router.post('/retry-failed', retryFailedPosts);
router.post('/', processPosts);

export default router;
