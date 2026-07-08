import puppeteerScreenshotService from './puppeteerScreenshotService.js';
import linksApiService from './linksApiService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import delay from '../utils/delay.js';

const MAX_URLS_PER_BATCH = 50;
const PROCESS_HARD_TIMEOUT_MS = env.PUPPETEER_TIMEOUT_MS + 90000;
// Tags our uploads in the shared links API so the records stay traceable.
const POST_SOURCE = 'unionstack';

function toTagList(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : String(input).split(',');
  return raw.map((tag) => String(tag).trim()).filter(Boolean);
}

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

  async #processUrl(linkedinUrl, tags) {
    logger.info('Processing LinkedIn post', { linkedinUrl });

    try {
      const screenshotBuffer = await this.#captureScreenshotWithTimeout(linkedinUrl);
      const { imageUrl } = await linksApiService.uploadImage(screenshotBuffer, {
        ...tags,
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

  // Screenshots each URL once and uploads it to the CDN. Categories and
  // programmes are free-form labels owned by the admin UI (it keeps them in
  // localStorage and assembles the JSON output itself) — here they only tag the
  // CDN record, so anything the user typed is accepted as-is.
  async processUrls({ urls, categories, programmes }) {
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

    const tags = {
      category: toTagList(categories).join(' ') || undefined,
      programName: toTagList(programmes).join(', ') || undefined,
    };

    const results = [];
    for (const linkedinUrl of urlList) {
      results.push(await this.#processUrl(linkedinUrl, tags));
    }

    const summary = {
      total: results.length,
      completed: results.filter((result) => result.status === 'Completed').length,
      failed: results.filter((result) => result.status === 'Failed').length,
    };

    logger.info('Batch processed', summary);

    return { summary, results };
  }
}

export default new LinkedInPostService();
