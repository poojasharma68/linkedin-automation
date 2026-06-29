import categoryService from './categoryService.js';
import { normalizeProgramme, DEFAULT_PROGRAMME, ALL_PROGRAMMES } from '../constants/programmes.js';
import puppeteerScreenshotService from './puppeteerScreenshotService.js';
import linksApiService from './linksApiService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import delay from '../utils/delay.js';

const MAX_URLS_PER_BATCH = 50;
const PROCESS_HARD_TIMEOUT_MS = env.PUPPETEER_TIMEOUT_MS + 90000;
// Tags our uploads in the shared links API so we can read back only ours.
const POST_SOURCE = 'unionstack';

class LinkedInPostService {
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

  #captureScreenshotWithTimeout(linkedinUrl) {
    return Promise.race([
      puppeteerScreenshotService.capturePostScreenshot(linkedinUrl),
      delay(PROCESS_HARD_TIMEOUT_MS).then(() => {
        throw new Error(
          'Screenshot capture timed out. Re-connect LinkedIn, then submit the URL again.'
        );
      }),
    ]);
  }

  async #processUrl(linkedinUrl, category, programme) {
    logger.info('Processing LinkedIn post', { linkedinUrl });

    try {
      const screenshotBuffer = await this.#captureScreenshotWithTimeout(linkedinUrl);
      const { imageUrl } = await linksApiService.uploadImage(screenshotBuffer, {
        category,
        programName: programme,
        linkedinUrl,
        source: POST_SOURCE,
      });

      logger.info('Post processed', { linkedinUrl, cdnUrl: imageUrl });

      return { linkedinUrl, status: 'Completed', cdnUrl: imageUrl };
    } catch (error) {
      logger.error('Post processing failed', { linkedinUrl, error: error.message });
      return { linkedinUrl, status: 'Failed', error: error.message };
    }
  }

  async processUrls({ category, programme, urls }) {
    if (!category?.trim()) {
      throw ApiError.badRequest('category is required');
    }

    const normalizedCategory = categoryService.validateCategorySlug(category.trim().toLowerCase());
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

    const results = [];
    for (const linkedinUrl of urlList) {
      results.push(await this.#processUrl(linkedinUrl, normalizedCategory, normalizedProgramme));
    }

    const summary = {
      total: results.length,
      completed: results.filter((result) => result.status === 'Completed').length,
      failed: results.filter((result) => result.status === 'Failed').length,
    };

    logger.info('Batch processed', { category: normalizedCategory, ...summary });

    return { category: normalizedCategory, programme: normalizedProgramme, summary, results };
  }

  // Reads our screenshots back from the links API, shaped for the frontend.
  // Optionally filtered by category slug and/or programme id.
  async listPosts({ category, programme } = {}) {
    const links = await linksApiService.listLinks();

    const wantCategory = category && category !== 'all' ? category : null;
    const wantProgramme =
      programme && programme !== ALL_PROGRAMMES ? normalizeProgramme(programme) : null;

    return links
      .filter((link) => link.source === POST_SOURCE && !link.isDeleted)
      .filter((link) => !wantCategory || link.category === wantCategory)
      .filter((link) => !wantProgramme || link.programName === wantProgramme)
      .map((link) => ({
        id: link._id || link.fileId,
        fileId: link.fileId,
        imageUrl: link.url,
        category: link.category,
        programme: link.programName,
        linkedinUrl: link.linkedinUrl,
        status: 'Completed',
        createdAt: link.createdAt,
      }));
  }
}

export default new LinkedInPostService();
