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

export default { getCategories };
