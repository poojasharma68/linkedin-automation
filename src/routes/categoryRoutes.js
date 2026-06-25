import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.get('/', getCategories);
router.post('/', requireAdminAuth, createCategory);
router.patch('/:id', requireAdminAuth, updateCategory);
router.delete('/:id', requireAdminAuth, deleteCategory);

export default router;
