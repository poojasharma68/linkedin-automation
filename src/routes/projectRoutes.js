import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  connectSheet,
  updateProject,
  deleteProject,
  validateSheet,
} from '../controllers/projectController.js';

const router = Router();

router.get('/', getProjects);
router.post('/', connectSheet);
router.post('/validate-sheet', validateSheet);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
