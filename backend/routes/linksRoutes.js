import { Router } from 'express';
import { getPosts } from '../controllers/linkedinPostController.js';

const router = Router();

// Public, read-only view of the stored screenshots (the records the external
// POST /links/from-image created). No admin token required — safe to open in
// Postman and to bind on a public website.
// Supports ?category=<slug>&programme=<id> filters.
router.get('/', getPosts);

export default router;
