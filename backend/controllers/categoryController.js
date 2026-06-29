import categoryService from '../services/categoryService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = categoryService.findAll();

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = categoryService.create(req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = categoryService.update(req.params.id, req.body);
  res.status(200).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = categoryService.remove(req.params.id);
  res.status(200).json({ success: true, data: category });
});

export default { getCategories, createCategory, updateCategory, deleteCategory };
