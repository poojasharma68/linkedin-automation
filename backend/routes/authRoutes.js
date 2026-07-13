import { Router } from 'express';
import { signup, login, me } from '../controllers/authController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAdminAuth, me);

export default router;
