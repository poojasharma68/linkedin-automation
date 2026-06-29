import { Router } from 'express';
import { processPosts, getPosts } from '../controllers/linkedinPostController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);

// Capture screenshots for the submitted LinkedIn URLs and store them.
router.post('/', processPosts);

// Read the stored screenshots back for the frontend.
router.get('/posts', getPosts);

export default router;
