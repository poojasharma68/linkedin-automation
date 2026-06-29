import ApiError from '../utils/ApiError.js';

// Categories are a fixed, code-defined list now that the app is stateless
// (no database). Add/edit/delete is intentionally not supported.
const CATEGORIES = [
  { name: 'Tech', slug: 'tech', color: '#58a6ff' },
  { name: 'Marketing', slug: 'marketing', color: '#f0883e' },
  { name: 'Business', slug: 'business', color: '#3fb950' },
  { name: 'Design', slug: 'design', color: '#bc8cff' },
  { name: 'Career', slug: 'career', color: '#f778ba' },
];

class CategoryService {
  findAll() {
    return CATEGORIES.map((category) => ({ ...category }));
  }

  validateCategorySlug(slug) {
    const normalized = String(slug || '').toLowerCase();
    const match = CATEGORIES.find((category) => category.slug === normalized);
    if (!match) {
      throw ApiError.badRequest(`Category "${slug}" does not exist`);
    }
    return match.slug;
  }
}

export default new CategoryService();
