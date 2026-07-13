import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import env from '../config/env.js';
import logger from '../config/logger.js';
import delay from '../utils/delay.js';
import linkedinBrowserService from './linkedinBrowserService.js';

const FEED_URL = 'https://www.linkedin.com/feed/';
const NAVIGATION_TIMEOUT_MS = 20000;
const POST_READY_TIMEOUT_MS = 15000;
/**
 * LinkedIn hydrates the post detail page and then re-mounts the post card once,
 * roughly 350ms after domcontentloaded. The pre-mount node gets detached, so a
 * card is only safe to screenshot after its identity has held still this long.
 */
const CARD_STABLE_MS = 400;
const MEDIA_LOAD_TIMEOUT_MS = 8000;
const MIN_CARD_WIDTH = 240;
const MIN_CARD_HEIGHT = 60;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT_DEFAULT = 2400;
const MAX_VIEWPORT_HEIGHT = 16000;
const DEVICE_SCALE_FACTOR = 2;
/** LinkedIn feed post column width at 1280px viewport — kept constant for every capture */
const FIXED_CAPTURE_WIDTH = 552;
const OUTPUT_PNG_WIDTH = FIXED_CAPTURE_WIDTH * DEVICE_SCALE_FACTOR;

/**
 * LinkedIn ships build-hashed class names (`_75228706`, `dec34939`, ...), so no
 * `.feed-shared-*` / `[class*="update-components-*"]` selector matches any more.
 * Everything below anchors on the hooks that survive a rebuild: ARIA labels,
 * `data-testid`, and the visually-hidden "Feed post" heading. The legacy
 * selectors are kept as a fallback for sessions still served the old DOM.
 */
const SOCIAL_REACTIONS_SELECTORS = [
  '[data-testid^="ReactionFacepileCollection"]',
  'button[aria-label*="reaction" i]',
  'button[aria-label*="like" i]',
  'button[aria-label*="repost" i]',
  // legacy DOM
  '.social-details-social-counts',
  '.social-details-social-activity',
  '.feed-shared-social-actions',
  '[class*="social-action-bar"]',
  '[class*="update-v2-social-activity"]',
  '.reactions-react-button',
  '[data-view-name="feed-social-actions"]',
];
const SOCIAL_SELECTOR = SOCIAL_REACTIONS_SELECTORS.join(', ');

/** Legacy-DOM post containers. Matches nothing on the current LinkedIn build. */
const LEGACY_CARD_QUERY =
  '.feed-shared-update-v2, article[data-urn], [data-view-name="feed-update"], .main-feed-activity-card, main article';

/**
 * Comment threads live *outside* the post card on the current DOM, but the card
 * lookup walks up the ancestor chain — these markers tell it when it has gone
 * one level too far and swallowed the comment list.
 */
const COMMENT_SELECTORS = [
  '[data-testid*="commentList"]',
  '[data-testid*="feed-comment"]',
  '.comments-comment-box',
  '.comments-comments-list',
  '.comments-comment-item',
  '[class*="comments-comment"]',
  '[class*="comments-entry-point"]',
];
const COMMENT_SELECTOR = COMMENT_SELECTORS.join(', ');

const PAGE_CHROME_SELECTORS = [
  'header',
  'nav',
  'aside',
  'footer',
  '#global-nav',
  '.msg-overlay-container',
  '.msg-overlay-list-bubble',
  '.artdeco-modal',
  '[data-test-modal]',
];

class PuppeteerScreenshotService {
  constructor() {
    this.navigationTimeout = NAVIGATION_TIMEOUT_MS;
  }

  #normalizePostUrl(linkedinUrl) {
    try {
      const parsed = new URL(linkedinUrl);
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return linkedinUrl;
    }
  }

  #extractPostUrn(linkedinUrl) {
    const ugcMatch = linkedinUrl.match(/ugcPost[:-](\d{10,})/i);
    if (ugcMatch) return { type: 'ugcPost', id: ugcMatch[1] };

    const activityMatch = linkedinUrl.match(/activity[:-](\d{10,})/i);
    if (activityMatch) return { type: 'activity', id: activityMatch[1] };

    const urnMatch = linkedinUrl.match(/urn:li:(activity|ugcPost):(\d+)/i);
    if (urnMatch) return { type: urnMatch[1], id: urnMatch[2] };

    return null;
  }

  #buildCandidateUrls(linkedinUrl) {
    const normalized = this.#normalizePostUrl(linkedinUrl);
    const urn = this.#extractPostUrn(normalized);
    const candidates = [normalized];

    if (urn) {
      const feedUrl = `https://www.linkedin.com/feed/update/urn:li:${urn.type}:${urn.id}/`;
      if (!candidates.includes(feedUrl)) {
        candidates.push(feedUrl);
      }
    }

    return { candidates, urnId: urn?.id ?? null };
  }

  async #goto(page, url) {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.navigationTimeout,
    });
  }

  async #hasLinkedInSession(page) {
    const cookies = await page.cookies('https://www.linkedin.com');
    return cookies.some((cookie) => cookie.name === 'li_at' && cookie.value);
  }

  async #detectPageIssue(page) {
    const url = page.url();

    if (url.includes('/login') || url.includes('/uas/login') || url.includes('/authwall')) {
      return 'LinkedIn session expired. Click Connect LinkedIn in the admin UI and log in again.';
    }

    const hasSession = await this.#hasLinkedInSession(page);
    if (!hasSession) {
      return 'LinkedIn login required. Click Connect LinkedIn and sign in.';
    }

    return page.evaluate(() => {
      const loginInput =
        document.querySelector('#username') ||
        document.querySelector('input[name="session_key"]') ||
        document.querySelector('input#session_password');

      if (loginInput) {
        return 'LinkedIn login required. Click Connect LinkedIn and sign in.';
      }

      const text = document.body?.innerText || '';
      if (text.includes('Security verification') || text.includes("Let's do a quick check")) {
        return 'LinkedIn security check detected. Complete verification in Chrome, then retry.';
      }

      if (text.includes('This page doesn') || text.includes('Page not found')) {
        return 'LinkedIn post page not found. Check the URL is a public post link.';
      }

      return null;
    });
  }

  async #saveDebugSnapshot(page, filename, reason) {
    if (!env.isDevelopment) return;

    try {
      const debugDir = path.resolve('screenshots/debug');
      await fs.mkdir(debugDir, { recursive: true });
      await page.screenshot({ path: path.join(debugDir, filename), fullPage: false });
      logger.warn('Saved debug screenshot', { filename, reason, url: page.url() });
    } catch {
      // ignore
    }
  }

  async #saveDebugFailure(page, reason) {
    await this.#saveDebugSnapshot(page, 'failure.png', reason);
  }

  async #diagnosePostCardFailure(page, urnId) {
    return page.evaluate(
      (id, socialSelector) => {
        const main = document.querySelector('main') || document.body;
        const url = window.location.href;

        return {
          url,
          onLogin: url.includes('/login') || url.includes('/authwall'),
          urnId: id,
          feedPostHeading: [...main.querySelectorAll('h2')].some(
            (heading) =>
              !heading.closest('aside') && (heading.textContent || '').trim() === 'Feed post'
          ),
          urnNodePresent: id
            ? !!document.querySelector(`[data-urn*="${id}"], [data-testid*="${id}"]`)
            : null,
          socialNodes: main.querySelectorAll(socialSelector).length,
          authorLinks: main.querySelectorAll('a[href*="/in/"]').length,
          bodySnippet: (document.body?.innerText || '').slice(0, 300),
        };
      },
      urnId,
      SOCIAL_SELECTOR
    );
  }

  #buildFailureHint(diagnosis, urnId) {
    if (diagnosis.onLogin) {
      return 'LinkedIn session expired. Click Connect LinkedIn in the admin UI and log in again.';
    }

    if (!diagnosis.feedPostHeading && diagnosis.socialNodes === 0) {
      return 'The page loaded but no post content was found. Check the URL is a valid public post link.';
    }

    if (urnId && diagnosis.urnNodePresent === false) {
      return 'Post page loaded but the post ID from the URL was not found in the page. The post may be private or deleted.';
    }

    return 'Post elements were found but did not match the expected layout. LinkedIn may have changed their page structure.';
  }

  async #dismissOverlays(page) {
    await page.evaluate(() => {
      document
        .querySelectorAll(
          '.msg-overlay-container, .msg-overlay-list-bubble, .artdeco-modal, [data-test-modal], button[aria-label="Dismiss"]'
        )
        .forEach((node) => {
          node.style.display = 'none';
        });
    });
  }

  /**
   * Resolves the post card and returns a live ElementHandle.
   *
   * The card is only returned once the same DOM node has survived
   * CARD_STABLE_MS — LinkedIn re-mounts it shortly after hydration, and a
   * detached node cannot be measured or screenshotted.
   */
  async #waitForStableCard(page, urnId) {
    const pageIssue = await this.#detectPageIssue(page);
    if (pageIssue) throw new Error(pageIssue);

    await page.evaluate(() => {
      window.__postCard = null;
      window.__postCardSince = 0;
    });

    try {
      await page.waitForFunction(
        (id, socialSelector, commentSelector, legacyCardQuery, minWidth, minHeight, stableMs) => {
          const main = document.querySelector('main') || document.body;

          const qualifies = (el) => {
            if (!el || el === main) return false;
            // Walking too far up swallows the comment thread — reject those.
            if (el.querySelector(commentSelector)) return false;
            const rect = el.getBoundingClientRect();
            return (
              !!el.querySelector(socialSelector) &&
              !!el.querySelector('a[href*="/in/"]') &&
              rect.width >= minWidth &&
              rect.height >= minHeight
            );
          };

          const climbTo = (node, maxDepth) => {
            let el = node;
            for (let depth = 0; depth < maxDepth && el && el !== main; depth += 1) {
              if (el.closest('aside')) return null;
              if (qualifies(el)) return el;
              el = el.parentElement;
            }
            return null;
          };

          // Legacy DOM: the post container carries the urn directly.
          const fromLegacyUrn = () => {
            if (!id) return null;
            const node = document.querySelector(`[data-urn*="${id}"]`);
            return node ? climbTo(node, 15) || node : null;
          };

          // Current DOM: a visually-hidden <h2>Feed post</h2> labels the card,
          // and its parent is the card itself.
          const fromHeading = () => {
            const heading = [...main.querySelectorAll('h2')].find(
              (node) =>
                !node.closest('aside') && (node.textContent || '').trim() === 'Feed post'
            );
            return heading ? climbTo(heading.parentElement, 10) : null;
          };

          const fromLegacyQuery = () => {
            let best = null;
            let bestArea = 0;
            for (const candidate of main.querySelectorAll(legacyCardQuery)) {
              if (!qualifies(candidate)) continue;
              const rect = candidate.getBoundingClientRect();
              const area = rect.width * rect.height;
              if (area > bestArea) {
                best = candidate;
                bestArea = area;
              }
            }
            return best;
          };

          const fromSocialButtons = () => {
            const button = [...main.querySelectorAll('button[aria-label]')].find(
              (node) =>
                !node.closest('aside') &&
                /like|react|repost/i.test(node.getAttribute('aria-label') || '')
            );
            return button ? climbTo(button, 15) : null;
          };

          const card = fromLegacyUrn() || fromHeading() || fromLegacyQuery() || fromSocialButtons();

          if (!card) {
            window.__postCard = null;
            window.__postCardSince = 0;
            return false;
          }

          if (window.__postCard !== card) {
            window.__postCard = card;
            window.__postCardSince = performance.now();
            return false;
          }

          return card.isConnected && performance.now() - window.__postCardSince >= stableMs;
        },
        { timeout: POST_READY_TIMEOUT_MS, polling: 100 },
        urnId,
        SOCIAL_SELECTOR,
        COMMENT_SELECTOR,
        LEGACY_CARD_QUERY,
        MIN_CARD_WIDTH,
        MIN_CARD_HEIGHT,
        CARD_STABLE_MS
      );
    } catch {
      const issue = await this.#detectPageIssue(page);
      if (issue) throw new Error(issue);
      return null;
    }

    // Hand back the very node the predicate settled on — no re-query, so there
    // is no window for a re-mount to invalidate it.
    const handle = await page.evaluateHandle(() => window.__postCard);
    const card = handle.asElement();
    if (!card) {
      await handle.dispose();
      return null;
    }

    return card;
  }

  async #hidePageChrome(page, card) {
    await page.evaluate(
      (postCard, chromeSelectors) => {
        chromeSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((node) => {
            if (node === postCard || node.contains(postCard) || postCard.contains(node)) return;
            node.style.setProperty('display', 'none', 'important');
          });
        });

        const main = document.querySelector('main');
        if (!main) return;

        main.querySelectorAll(':scope > *').forEach((child) => {
          if (child !== postCard && !child.contains(postCard)) {
            child.style.setProperty('display', 'none', 'important');
          }
        });
      },
      card,
      PAGE_CHROME_SELECTORS
    );
  }

  async #prepareCardForScreenshot(card) {
    await card.evaluate(
      (el, commentSelector, socialSelector) => {
        const isInComments = (node) => !!node.closest(commentSelector);

        el.querySelectorAll(commentSelector).forEach((node) => {
          node.style.display = 'none';
        });

        el.querySelectorAll('textarea, [contenteditable="true"]').forEach((node) => {
          node.style.display = 'none';
        });

        const socialElements = [...el.querySelectorAll(socialSelector)].filter((node) => {
          if (isInComments(node)) return false;
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        if (!socialElements.length) return;

        const bottom = Math.max(
          ...socialElements.map((node) => node.getBoundingClientRect().bottom)
        );

        // Drop anything that *starts* below the social bar. Buttons sharing the
        // bar's row have a smaller top, so the action row survives intact — and
        // the capture clip stops at `bottom` regardless.
        el.querySelectorAll('*').forEach((node) => {
          const rect = node.getBoundingClientRect();
          if (rect.height > 0 && rect.top >= bottom - 1) {
            node.style.display = 'none';
          }
        });
      },
      COMMENT_SELECTOR,
      SOCIAL_SELECTOR
    );
  }

  async #normalizeCardWidth(card) {
    await card.evaluate((el, width) => {
      el.style.width = `${width}px`;
      el.style.minWidth = `${width}px`;
      el.style.maxWidth = `${width}px`;
      el.style.boxSizing = 'border-box';
      el.style.overflow = 'visible';

      el.querySelectorAll('img, video').forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 80 && rect.height < 80) return;
        node.style.width = '100%';
        node.style.maxWidth = '100%';
        node.style.height = 'auto';
        node.style.display = 'block';
      });
    }, FIXED_CAPTURE_WIDTH);
  }

  async #triggerLazyMedia(page, card) {
    const box = await card.boundingBox();
    if (!box) return;

    const step = 280;
    const steps = Math.max(1, Math.ceil(box.height / step));

    for (let i = 0; i <= steps; i += 1) {
      await page.evaluate((scrollY) => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }, Math.max(0, box.y + i * step - 80));
      await delay(120);
    }
  }

  async #countPendingMedia(card) {
    return card.evaluate((el) => {
      const isVisible = (node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 24 && rect.height >= 24;
      };

      const pendingImages = [...el.querySelectorAll('img')].filter((img) => {
        if (!isVisible(img)) return false;
        if (!img.complete) return true;
        return img.naturalWidth < 80 || img.naturalHeight < 40;
      }).length;

      const pendingVideos = [...el.querySelectorAll('video')].filter((video) => {
        if (!isVisible(video)) return false;
        return video.readyState < 2;
      }).length;

      return pendingImages + pendingVideos;
    });
  }

  async #waitForPostMediaLoaded(card) {
    const deadline = Date.now() + MEDIA_LOAD_TIMEOUT_MS;
    let stablePasses = 0;

    while (Date.now() < deadline) {
      const pending = await this.#countPendingMedia(card);

      if (pending === 0) {
        stablePasses += 1;
        if (stablePasses >= 2) {
          await delay(200);
          return;
        }
      } else {
        stablePasses = 0;
      }

      await delay(250);
    }

    const remaining = await this.#countPendingMedia(card);
    if (remaining > 0) {
      logger.warn('Post media still loading at screenshot time', { pending: remaining });
    }
  }

  /**
   * Measured with the document scrolled to the origin, so viewport-relative and
   * document-relative coordinates coincide and the clip is unambiguous.
   */
  async #getCaptureMetrics(card) {
    return card.evaluate(
      (el, socialSelector, commentSelector, fixedWidth) => {
        const cardRect = el.getBoundingClientRect();

        const socialBottoms = [...el.querySelectorAll(socialSelector)]
          .filter((node) => !node.closest(commentSelector))
          .map((node) => node.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => rect.bottom);

        const captureBottom = socialBottoms.length
          ? Math.max(...socialBottoms)
          : cardRect.bottom;

        const padding = 2;
        const top = Math.max(0, cardRect.top);

        return {
          x: Math.max(0, cardRect.left),
          y: top,
          width: fixedWidth,
          height: Math.max(200, Math.ceil(captureBottom - cardRect.top + padding)),
          bottom: Math.ceil(captureBottom),
        };
      },
      SOCIAL_SELECTOR,
      COMMENT_SELECTOR,
      FIXED_CAPTURE_WIDTH
    );
  }

  async #normalizeScreenshotWidth(buffer) {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || metadata.width === OUTPUT_PNG_WIDTH) {
      return buffer;
    }

    return sharp(buffer).resize({ width: OUTPUT_PNG_WIDTH }).png().toBuffer();
  }

  async #screenshotPostCard(page, card) {
    await this.#dismissOverlays(page);
    await this.#hidePageChrome(page, card);
    await this.#prepareCardForScreenshot(card);
    await this.#normalizeCardWidth(card);
    await delay(100);

    await this.#triggerLazyMedia(page, card);
    await this.#waitForPostMediaLoaded(card);

    const pinToOrigin = () => page.evaluate(() => window.scrollTo(0, 0));

    await pinToOrigin();
    await delay(80);

    let metrics = await this.#getCaptureMetrics(card);

    // Grow the viewport so the whole card fits inside it — otherwise the clip
    // would run past the rendered surface and the tail comes back blank.
    const requiredHeight = Math.min(
      Math.max(metrics.bottom + 80, VIEWPORT_HEIGHT_DEFAULT),
      MAX_VIEWPORT_HEIGHT
    );

    if (requiredHeight > VIEWPORT_HEIGHT_DEFAULT) {
      await page.setViewport({
        width: VIEWPORT_WIDTH,
        height: requiredHeight,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      });
      await delay(120);
      await this.#normalizeCardWidth(card);
      await pinToOrigin();
      await delay(80);
      metrics = await this.#getCaptureMetrics(card);
    }

    logger.debug('Capturing LinkedIn post card screenshot', metrics);

    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: { x: metrics.x, y: metrics.y, width: metrics.width, height: metrics.height },
    });

    return this.#normalizeScreenshotWidth(screenshot);
  }

  async #loadPostPage(page, targetUrl) {
    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT_DEFAULT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });

    await this.#goto(page, targetUrl);
    await this.#dismissOverlays(page);
  }

  async capturePostScreenshot(userId, linkedinUrl) {
    const { candidates, urnId } = this.#buildCandidateUrls(linkedinUrl);
    const startedAt = Date.now();

    return linkedinBrowserService.withUserPage(userId, async (page) => {
      let lastError = null;

      try {
        const hasSession = await this.#hasLinkedInSession(page);
        if (!hasSession) {
          await this.#goto(page, FEED_URL).catch(() => {});
          await delay(100);
          const pageIssue = await this.#detectPageIssue(page);
          if (pageIssue) throw new Error(pageIssue);
        }

        for (const targetUrl of candidates) {
          try {
            logger.debug('Loading LinkedIn post URL', { targetUrl, urnId });

            await this.#loadPostPage(page, targetUrl);

            const postCard = await this.#waitForStableCard(page, urnId);
            if (!postCard) {
              const diagnosis = await this.#diagnosePostCardFailure(page, urnId);
              await this.#saveDebugSnapshot(page, 'post-card-not-found.png', 'post card not found');

              lastError = new Error(
                `LinkedIn post card not found. ${this.#buildFailureHint(diagnosis, urnId)}`
              );
              logger.warn('Post card not found for URL candidate', { targetUrl, urnId, diagnosis });
              continue;
            }

            const screenshot = await this.#screenshotPostCard(page, postCard);
            await postCard.dispose();

            logger.info('LinkedIn post card screenshot captured', {
              linkedinUrl: targetUrl,
              urnId,
              durationMs: Date.now() - startedAt,
            });

            if (env.isDevelopment) {
              const debugDir = path.resolve('screenshots/debug');
              await fs.mkdir(debugDir, { recursive: true });
              await fs.writeFile(path.join(debugDir, 'latest.png'), screenshot);
            }

            return screenshot;
          } catch (error) {
            lastError = error;
            logger.warn('LinkedIn URL candidate failed', { targetUrl, error: error.message });
          }
        }

        throw lastError || new Error('Failed to capture LinkedIn post screenshot');
      } catch (error) {
        await this.#saveDebugFailure(page, error.message);
        logger.error('Failed to capture LinkedIn post screenshot', {
          linkedinUrl,
          error: error.message,
        });
        throw error;
      }
    });
  }
}

export default new PuppeteerScreenshotService();
