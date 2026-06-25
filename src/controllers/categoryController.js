import categoryService from '../services/categoryService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await categoryService.findAll();

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  const category = await categoryService.create({ name, color });

  res.status(201).json({
    success: true,
    message: 'Category created',
    data: category,
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  const category = await categoryService.update(req.params.id, { name, color });

  res.status(200).json({
    success: true,
    message: 'Category updated',
    data: category,
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Category deleted',
    data: category,
  });
});

export default { getCategories, createCategory, updateCategory, deleteCategory };
