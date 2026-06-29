import { randomUUID } from 'crypto';
import env from '../config/env.js';
import logger from '../config/logger.js';

const FROM_IMAGE_PATH = '/links/from-image';
const LINKS_PATH = '/links';
const REQUEST_TIMEOUT_MS = 60000;

class LinksApiService {
  constructor() {
    const baseUrl = env.LINKS_API_BASE_URL.replace(/\/$/, '');
    this.fromImageUrl = `${baseUrl}${FROM_IMAGE_PATH}`;
    this.linksUrl = `${baseUrl}${LINKS_PATH}`;
  }

  #buildFilename(category, extension = 'png') {
    const sanitizedCategory =
      category
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'uncategorized';

    return `${sanitizedCategory}-${Date.now()}-${randomUUID()}.${extension}`;
  }

  async #request(url, options, label) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.IsSuccess) {
        const reason = payload?.message || payload?.Message || `HTTP ${response.status}`;
        throw new Error(`${label} failed: ${reason}`);
      }

      return payload;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Step 1 — POST the screenshot plus its metadata; the API stores the file on
  // the CDN and persists a link record (category, programName, linkedinUrl...).
  async #postImage(buffer, filename, contentType, meta = {}) {
    const form = new FormData();
    // The API accepts one or many files under the `images` field.
    form.append('images', new Blob([buffer], { type: contentType }), filename);

    // Metadata stored alongside the file so it can be read back via GET /links.
    for (const [field, value] of Object.entries(meta)) {
      if (value != null && value !== '') form.append(field, String(value));
    }

    const payload = await this.#request(
      this.fromImageUrl,
      { method: 'POST', body: form },
      'CDN upload'
    );

    const uploaded = payload.Data?.links?.[0];
    if (!uploaded?.fileId) {
      throw new Error('CDN upload response did not include a fileId');
    }

    return uploaded;
  }

  // GET the links list (newest first) — the raw link objects from the API.
  async listLinks() {
    const payload = await this.#request(
      this.linksUrl,
      { method: 'GET', headers: { Accept: 'application/json' } },
      'Fetch links'
    );

    return Array.isArray(payload.Data) ? payload.Data : [];
  }

  // Step 2 — resolve the public CDN url for our fileId from the links list.
  async #getCdnUrl(fileId) {
    const links = await this.listLinks();
    return links.find((link) => link.fileId === fileId)?.url || null;
  }

  async uploadImage(buffer, { category, programName, linkedinUrl, source, contentType = 'image/png', extension = 'png' } = {}) {
    const filename = this.#buildFilename(category, extension);

    const uploaded = await this.#postImage(buffer, filename, contentType, {
      category,
      programName,
      linkedinUrl,
      source,
    });

    // Prefer the url from the links list; fall back to the upload response in
    // case the list hasn't caught up yet.
    const imageUrl = (await this.#getCdnUrl(uploaded.fileId)) || uploaded.url;
    if (!imageUrl) {
      throw new Error('Could not resolve CDN url for uploaded image');
    }

    logger.info('Image uploaded to CDN', { fileId: uploaded.fileId, imageUrl });

    return { key: uploaded.fileId, imageUrl };
  }
}

export default new LinksApiService();
