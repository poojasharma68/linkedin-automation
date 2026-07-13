import { Router } from 'express';
import {
  getSessionStatus,
  connectSession,
  disconnectSession,
} from '../controllers/linkedinSessionController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';
import requireExtensionKey from '../middleware/requireExtensionKey.js';

const router = Router();

// Called by the browser extension with the user's extension key (not the web
// login token), so it authenticates differently from the routes below.
router.post('/connect', requireExtensionKey, connectSession);

// Web-app routes — require the signed-in user's login token.
router.get('/status', requireAdminAuth, getSessionStatus);
router.post('/disconnect', requireAdminAuth, disconnectSession);

export default router;
