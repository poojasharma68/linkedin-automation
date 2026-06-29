import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

// Seeded the first time the app runs with no categories file on disk.
const DEFAULT_CATEGORIES = [
  { name: 'Tech', color: '#58a6ff' },
  { name: 'Marketing', color: '#f0883e' },
  { name: 'Business', color: '#3fb950' },
  { name: 'Design', color: '#bc8cff' },
  { name: 'Career', color: '#f778ba' },
];

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

class CategoryService {
  constructor() {
    this.file = path.resolve(env.CATEGORIES_FILE);
    this.categories = this.#load();
  }

  #load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // No (or unreadable) file yet — fall through and seed the defaults.
    }

    this.categories = DEFAULT_CATEGORIES.map((category) => ({
      id: randomUUID(),
      slug: slugify(category.name),
      ...category,
    }));
    this.#save();
    return this.categories;
  }

  #save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.categories, null, 2));
  }

  findAll() {
    return this.categories.map((category) => ({ ...category }));
  }

  create({ name, color } = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw ApiError.badRequest('Category name is required');

    const slug = slugify(cleanName);
    if (!slug) throw ApiError.badRequest('Category name must contain letters or numbers');
    if (this.categories.some((category) => category.slug === slug)) {
      throw ApiError.conflict(`Category "${cleanName}" already exists`);
    }

    const category = { id: randomUUID(), name: cleanName, slug, color: color || '#0a66c2' };
    this.categories.push(category);
    this.#save();
    return { ...category };
  }

  // Name and color are editable; the slug stays fixed so posts already stored
  // against it (in the links API) keep matching.
  update(id, { name, color } = {}) {
    const category = this.categories.find((item) => item.id === id);
    if (!category) throw ApiError.notFound('Category not found');

    if (name != null) {
      const cleanName = String(name).trim();
      if (!cleanName) throw ApiError.badRequest('Category name is required');
      category.name = cleanName;
    }
    if (color != null) category.color = color;

    this.#save();
    return { ...category };
  }

  remove(id) {
    const index = this.categories.findIndex((category) => category.id === id);
    if (index === -1) throw ApiError.notFound('Category not found');

    const [removed] = this.categories.splice(index, 1);
    this.#save();
    return { ...removed };
  }

  validateCategorySlug(slug) {
    const normalized = String(slug || '').toLowerCase();
    const match = this.categories.find((category) => category.slug === normalized);
    if (!match) throw ApiError.badRequest(`Category "${slug}" does not exist`);
    return match.slug;
  }
}

export default new CategoryService();
