import { Router } from 'express';
import { getAllPosts, getPostById, retryFailedPost, deletePost } from '../controllers/linkedinPostController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', getAllPosts);
router.post('/:id/retry', retryFailedPost);
router.delete('/:id', deletePost);
router.get('/:id', getPostById);

export default router;
