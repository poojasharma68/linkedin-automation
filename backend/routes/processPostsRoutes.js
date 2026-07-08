import { Router } from 'express';
import { processPosts } from '../controllers/linkedinPostController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);

// Capture a screenshot for each submitted LinkedIn URL and return its CDN url.
// Nothing is persisted server-side — the admin UI owns the output.
router.post('/', processPosts);

export default router;
