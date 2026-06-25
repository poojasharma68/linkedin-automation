import Category from '../models/Category.js';
import LinkedInPost from '../models/LinkedInPost.js';
import toSlug from '../utils/toSlug.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

const DEFAULT_CATEGORIES = [
  { name: 'Tech', slug: 'tech', color: '#58a6ff' },
  { name: 'Marketing', slug: 'marketing', color: '#f0883e' },
  { name: 'Business', slug: 'business', color: '#3fb950' },
  { name: 'Design', slug: 'design', color: '#bc8cff' },
  { name: 'Career', slug: 'career', color: '#f778ba' },
];

class CategoryService {
  formatCategory(category) {
    return {
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      color: category.color,
      createdAt: category.createdAt,
    };
  }

  async seedDefaults() {
    const count = await Category.countDocuments();
    if (count > 0) return;

    await Category.insertMany(DEFAULT_CATEGORIES);
    logger.info('Default categories seeded');
  }

  async findAll() {
    const categories = await Category.find().sort({ name: 1 }).lean();
    return categories.map((c) => this.formatCategory(c));
  }

  async findBySlug(slug) {
    const category = await Category.findOne({ slug: slug.toLowerCase() }).lean();
    if (!category) throw ApiError.notFound(`Category "${slug}" not found`);
    return this.formatCategory(category);
  }

  async create({ name, color }) {
    if (!name?.trim()) throw ApiError.badRequest('Category name is required');

    const slug = toSlug(name);
    if (!slug) throw ApiError.badRequest('Invalid category name');

    const existing = await Category.findOne({ slug }).lean();
    if (existing) throw ApiError.conflict('Category already exists');

    const category = await Category.create({
      name: name.trim(),
      slug,
      color: color || '#0a66c2',
    });

    logger.info('Category created', { slug });
    return this.formatCategory(category);
  }

  async update(id, { name, color }) {
    const category = await Category.findById(id);
    if (!category) throw ApiError.notFound('Category not found');

    const oldSlug = category.slug;

    if (name?.trim()) {
      const newSlug = toSlug(name);
      if (!newSlug) throw ApiError.badRequest('Invalid category name');

      const duplicate = await Category.findOne({ slug: newSlug, _id: { $ne: id } }).lean();
      if (duplicate) throw ApiError.conflict('Category name already in use');

      category.name = name.trim();
      category.slug = newSlug;

      if (oldSlug !== newSlug) {
        await LinkedInPost.updateMany({ category: oldSlug }, { category: newSlug });
      }
    }

    if (color) category.color = color;

    await category.save();
    logger.info('Category updated', { id, slug: category.slug });

    return this.formatCategory(category);
  }

  async delete(id) {
    const category = await Category.findById(id);
    if (!category) throw ApiError.notFound('Category not found');

    const { deletedCount } = await LinkedInPost.deleteMany({ category: category.slug });

    await category.deleteOne();
    logger.info('Category deleted', { slug: category.slug, deletedPosts: deletedCount });

    return this.formatCategory(category);
  }

  async validateCategorySlug(slug) {
    const exists = await Category.findOne({ slug: slug.toLowerCase() }).lean();
    if (!exists) throw ApiError.badRequest(`Category "${slug}" does not exist`);
    return exists.slug;
  }
}

export default new CategoryService();
