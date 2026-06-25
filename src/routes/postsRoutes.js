import { Router } from 'express';
import { getPosts } from '../controllers/linkedinPostController.js';

const router = Router();

router.get('/', getPosts);

export default router;
