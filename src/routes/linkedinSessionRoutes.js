import { Router } from 'express';
import { getSessionStatus, startLogin } from '../controllers/linkedinSessionController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/status', getSessionStatus);
router.post('/login', startLogin);

export default router;
