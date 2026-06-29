import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

// Public read so the website/admin UI can list categories.
router.get('/', getCategories);

// Writes are admin-only.
router.post('/', requireAdminAuth, createCategory);
router.patch('/:id', requireAdminAuth, updateCategory);
router.delete('/:id', requireAdminAuth, deleteCategory);

export default router;
