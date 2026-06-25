import categoryService from './categoryService.js';
import { normalizeProgramme, DEFAULT_PROGRAMME } from '../constants/programmes.js';
import LinkedInPost from '../models/LinkedInPost.js';
import puppeteerScreenshotService from './puppeteerScreenshotService.js';
import linksApiService from './linksApiService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import delay from '../utils/delay.js';

const MAX_URLS_PER_BATCH = 50;
const PROCESS_HARD_TIMEOUT_MS = env.PUPPETEER_TIMEOUT_MS + 90000;

class LinkedInPostService {
  constructor() {
    this.queueChain = Promise.resolve();
    this.isWorkerRunning = false;
  }

  parseUrls(input) {
    if (Array.isArray(input)) {
      return input.map((url) => url.trim()).filter(Boolean);
    }

    return String(input)
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);
  }

  #isValidLinkedInUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('linkedin.com');
    } catch {
      return false;
    }
  }

  formatPost(post) {
    return {
      id: String(post._id),
      linkedinUrl: post.linkedinUrl,
      category: post.category,
      programme: post.programme || null,
      imageUrl: post.imageUrl,
      status: post.status,
      errorMessage: post.errorMessage || null,
      createdAt: post.createdAt,
    };
  }

  #scheduleQueueProcessing(category) {
    this.queueChain = this.queueChain
      .then(() => this.#runQueueWorker(category))
      .catch((error) => {
        logger.error('Background queue worker error', { error: error.message });
      });

    return this.queueChain;
  }

  async #runQueueWorker(category) {
    if (this.isWorkerRunning) return;

    this.isWorkerRunning = true;

    try {
      let hasMore = true;

      while (hasMore) {
        const summary = await this.processQueue({ category });
        hasMore = summary.processed > 0;

        if (hasMore) {
          await delay(500);
        }
      }
    } finally {
      this.isWorkerRunning = false;
    }
  }

  async findAll(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.category && filters.category !== 'all') {
      query.category = filters.category.toLowerCase();
    }

    const programme = normalizeProgramme(filters.programme);
    if (programme) {
      query.programme = programme;
    }

    const posts = await LinkedInPost.find(query).sort({ createdAt: -1 }).lean();
    return posts.map((post) => this.formatPost(post));
  }

  async findById(id) {
    const post = await LinkedInPost.findById(id).lean();
    if (!post) throw ApiError.notFound('LinkedIn post not found');
    return this.formatPost(post);
  }

  async createQueue({ category, programme, urls }) {
    if (!category?.trim()) {
      throw ApiError.badRequest('category is required');
    }

    const normalizedCategory = category.trim().toLowerCase();
    await categoryService.validateCategorySlug(normalizedCategory);

    const normalizedProgramme = normalizeProgramme(programme) || DEFAULT_PROGRAMME;

    const urlList = this.parseUrls(urls);

    if (urlList.length === 0) {
      throw ApiError.badRequest('At least one LinkedIn URL is required');
    }

    if (urlList.length > MAX_URLS_PER_BATCH) {
      throw ApiError.badRequest(`Maximum ${MAX_URLS_PER_BATCH} URLs per batch`);
    }

    const invalidUrls = urlList.filter((url) => !this.#isValidLinkedInUrl(url));
    if (invalidUrls.length > 0) {
      throw ApiError.badRequest('Invalid LinkedIn URL(s) found', { invalidUrls });
    }

    const queued = [];
    const skipped = [];

    for (const linkedinUrl of urlList) {
      const existing = await LinkedInPost.findOne({ linkedinUrl }).lean();

      if (existing) {
        if (['Failed', 'Processing'].includes(existing.status)) {
          const updated = await LinkedInPost.findByIdAndUpdate(
            existing._id,
            {
              category: normalizedCategory,
              programme: normalizedProgramme,
              status: 'Pending',
              errorMessage: null,
              imageUrl: null,
            },
            { new: true }
          );
          queued.push(this.formatPost(updated));
          continue;
        }

        skipped.push({
          linkedinUrl,
          reason: `Already exists in "${existing.category}" as ${existing.status}`,
          status: existing.status,
          category: existing.category,
          id: String(existing._id),
        });
        continue;
      }

      try {
        const post = await LinkedInPost.create({
          linkedinUrl,
          category: normalizedCategory,
          programme: normalizedProgramme,
          status: 'Pending',
        });
        queued.push(this.formatPost(post));
      } catch (error) {
        if (error.code === 11000) {
          skipped.push({ linkedinUrl, reason: 'Duplicate' });
        } else {
          throw error;
        }
      }
    }

    logger.info('Queue created', {
      category: normalizedCategory,
      programme: normalizedProgramme,
      queued: queued.length,
      skipped: skipped.length,
    });

    return { category: normalizedCategory, programme: normalizedProgramme, queued, skipped };
  }

  async #uploadScreenshot(buffer, category, postId) {
    try {
      const { imageUrl } = await linksApiService.uploadImage(
        buffer,
        category,
        'image/png',
        'png'
      );
      return imageUrl;
    } catch (error) {
      if (!env.isDevelopment) throw error;

      const dir = path.resolve('screenshots', category);
      await fs.mkdir(dir, { recursive: true });
      const fileName = `${postId}.png`;
      await fs.writeFile(path.join(dir, fileName), buffer);

      const imageUrl = `http://localhost:${env.PORT}/screenshots/${category}/${fileName}`;
      logger.warn('CDN upload failed; saved screenshot locally for development', {
        postId,
        imageUrl,
        error: error.message,
      });
      return imageUrl;
    }
  }

  async #captureScreenshotWithTimeout(linkedinUrl) {
    return Promise.race([
      puppeteerScreenshotService.capturePostScreenshot(linkedinUrl),
      delay(PROCESS_HARD_TIMEOUT_MS).then(() => {
        throw new Error(
          'Screenshot capture timed out. Re-connect LinkedIn, then click Retry on the post.'
        );
      }),
    ]);
  }

  async #processPost(post) {
    const postId = post._id;
    logger.info('Processing LinkedIn post', { id: postId, linkedinUrl: post.linkedinUrl });

    await LinkedInPost.findByIdAndUpdate(postId, {
      status: 'Processing',
      errorMessage: null,
    });

    try {
      const screenshotBuffer = await this.#captureScreenshotWithTimeout(post.linkedinUrl);

      const imageUrl = await this.#uploadScreenshot(
        screenshotBuffer,
        post.category,
        String(postId)
      );

      await LinkedInPost.findByIdAndUpdate(postId, {
        imageUrl,
        status: 'Completed',
        errorMessage: null,
      });

      logger.info('Post processed', { id: postId, imageUrl });

      return { linkedinUrl: post.linkedinUrl, status: 'Completed', imageUrl, id: postId };
    } catch (error) {
      await LinkedInPost.findByIdAndUpdate(postId, {
        status: 'Failed',
        errorMessage: error.message,
      });

      logger.error('Post processing failed', { id: postId, error: error.message });

      return { linkedinUrl: post.linkedinUrl, status: 'Failed', error: error.message, id: postId };
    }
  }

  async processQueue({ category } = {}) {
    const query = { status: 'Pending' };

    if (category && category !== 'all') {
      query.category = category.toLowerCase();
    }

    const pendingPosts = await LinkedInPost.find(query).sort({ createdAt: 1 }).limit(10);

    if (pendingPosts.length === 0) {
      return { processed: 0, completed: 0, failed: 0, results: [] };
    }

    const results = [];

    for (const post of pendingPosts) {
      const result = await this.#processPost(post);
      results.push(result);
    }

    const summary = {
      processed: results.length,
      completed: results.filter((r) => r.status === 'Completed').length,
      failed: results.filter((r) => r.status === 'Failed').length,
      results,
    };

    logger.info('Queue processing batch finished', summary);
    return summary;
  }

  async submitAndProcess({ category, programme, urls }) {
    const queue = await this.createQueue({ category, programme, urls });

    if (queue.queued.length > 0) {
      this.#scheduleQueueProcessing(queue.category);
    }

    return {
      queue,
      summary: {
        queued: queue.queued.length,
        skipped: queue.skipped.length,
        processing: queue.queued.length > 0,
        message:
          queue.queued.length > 0
            ? `${queue.queued.length} post(s) queued. Screenshots are captured in the background — watch the list below for status updates.`
            : 'No new posts were queued.',
      },
    };
  }

  async retryFailedPost(id) {
    const post = await LinkedInPost.findById(id);

    if (!post) throw ApiError.notFound('LinkedIn post not found');
    if (!['Failed', 'Processing', 'Completed'].includes(post.status)) {
      throw ApiError.badRequest('Only failed, processing, or completed posts can be retried');
    }

    await LinkedInPost.findByIdAndUpdate(post._id, {
      status: 'Pending',
      errorMessage: null,
      imageUrl: null,
    });

    this.#scheduleQueueProcessing(post.category);

    return {
      id: String(post._id),
      status: 'Pending',
      message: 'Retry queued. The post will update when the screenshot finishes.',
    };
  }

  async resetStuckProcessing(maxAgeMinutes = 15) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const result = await LinkedInPost.updateMany(
      { status: 'Processing', updatedAt: { $lt: cutoff } },
      {
        status: 'Failed',
        errorMessage: 'Processing timed out. Click Retry after reconnecting LinkedIn.',
      }
    );

    if (result.modifiedCount > 0) {
      logger.warn('Reset stuck processing posts', { count: result.modifiedCount });
    }

    return result.modifiedCount;
  }

  async retryFailedByCategory(category, programme) {
    const query = { status: { $in: ['Failed', 'Processing'] } };

    if (category && category !== 'all') {
      query.category = category.toLowerCase();
    }

    const normalizedProgramme = normalizeProgramme(programme);
    if (normalizedProgramme) {
      query.programme = normalizedProgramme;
    }

    const failedPosts = await LinkedInPost.find(query);

    if (failedPosts.length === 0) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        queued: 0,
        message: 'No failed posts to retry in this category.',
      };
    }

    await LinkedInPost.updateMany(query, {
      status: 'Pending',
      errorMessage: null,
    });

    const normalizedCategory = category && category !== 'all' ? category.toLowerCase() : null;
    this.#scheduleQueueProcessing(normalizedCategory);

    return {
      processed: 0,
      completed: 0,
      failed: 0,
      queued: failedPosts.length,
      message: `${failedPosts.length} post(s) queued for retry.`,
    };
  }

  async processPendingQueue() {
    return this.processQueue();
  }

  async #generateTestImage() {
    const background = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    };

    // Random color → unique image each call, so the CDN treats it as a fresh
    // upload instead of a reused duplicate.
    return sharp({
      create: { width: 64, height: 64, channels: 3, background },
    })
      .png()
      .toBuffer();
  }

  async testCdnUpload({ buffer, contentType } = {}) {
    const hasUpload = Buffer.isBuffer(buffer) && buffer.length > 0;
    const imageBuffer = hasUpload ? buffer : await this.#generateTestImage();
    const mimeType = hasUpload && contentType ? contentType : 'image/png';
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';

    const { imageUrl, key } = await linksApiService.uploadImage(
      imageBuffer,
      'test',
      mimeType,
      extension
    );

    const post = await LinkedInPost.create({
      linkedinUrl: `https://www.linkedin.com/test/${Date.now()}-${randomUUID()}`,
      category: 'test',
      programme: DEFAULT_PROGRAMME,
      imageUrl,
      status: 'Completed',
    });

    logger.info('Test CDN upload saved to DB', { id: post._id, imageUrl });

    return { imageUrl, cdnKey: key, post: this.formatPost(post) };
  }

  async listCdnLinks() {
    const links = await linksApiService.listLinks();

    return links.map((link) => ({
      fileId: link.fileId,
      cdnUrl: link.url,
      title: link.title,
      createdAt: link.createdAt,
    }));
  }

  async deletePost(id) {
    const post = await LinkedInPost.findByIdAndDelete(id);

    if (!post) throw ApiError.notFound('LinkedIn post not found');

    logger.info('LinkedIn post deleted', { id, linkedinUrl: post.linkedinUrl });

    return this.formatPost(post);
  }
}

export default new LinkedInPostService();
