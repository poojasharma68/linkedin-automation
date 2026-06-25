import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import env from '../config/env.js';
import logger from '../config/logger.js';
import delay from '../utils/delay.js';
import linkedinBrowserService from './linkedinBrowserService.js';

const FEED_URL = 'https://www.linkedin.com/feed/';
const POST_READY_TIMEOUT_MS = 2500;
const NAVIGATION_TIMEOUT_MS = 8000;
const MEDIA_LOAD_TIMEOUT_MS = 8000;
const MIN_CARD_WIDTH = 240;
const MIN_CARD_HEIGHT = 60;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT_DEFAULT = 2400;
const DEVICE_SCALE_FACTOR = 2;
/** LinkedIn feed post column width at 1280px viewport — kept constant for every capture */
const FIXED_CAPTURE_WIDTH = 552;
const OUTPUT_PNG_WIDTH = FIXED_CAPTURE_WIDTH * DEVICE_SCALE_FACTOR;

const POST_CARD_QUERY =
  '.feed-shared-update-v2, article[data-urn], [data-view-name="feed-update"], .main-feed-activity-card, main article';

const POST_LOAD_SELECTORS = [
  'article[data-urn]',
  '.feed-shared-update-v2',
  '.main-feed-activity-card',
  'div[data-view-name="feed-update"]',
  '.update-components-actor',
  '.update-components-text',
  '.feed-shared-inline-show-more-text',
  '.feed-shared-update-v2__description',
  '[data-urn*="activity"]',
  '[data-urn*="ugcPost"]',
  '.feed-shared-actor',
  '.social-details-social-activity',
  '.feed-shared-social-actions',
];

const PAGE_CHROME_SELECTORS = [
  'header',
  'nav',
  '#global-nav',
  '.global-nav',
  '.scaffold-layout__aside',
  '.scaffold-layout__sidebar',
  '.scaffold-layout__sticky',
  '.scaffold-layout-toolbar',
  '.feed-identity-module',
  '.feed-follows-module',
  '.feed-right-rail',
  '.right-rail',
  '[class*="right-rail"]',
  '[class*="left-rail"]',
  'main aside',
  'aside[aria-label="Sidebar"]',
  '.pv-top-card',
  '.profile-background-image',
  'footer',
  '.ad-banner-container',
  '[class*="ad-banner"]',
  '.msg-overlay-container',
  '.msg-overlay-list-bubble',
  '.artdeco-modal',
  '[data-test-modal]',
];

const SOCIAL_REACTIONS_SELECTORS = [
  '.social-details-social-counts',
  '.social-details-social-activity',
  '.feed-shared-social-actions',
  '[class*="social-details-social-counts"]',
  '[class*="social-details-social-activity"]',
  '[class*="feed-shared-social-actions"]',
  '[class*="social-action-bar"]',
  '[class*="update-v2-social-activity"]',
  '.reactions-react-button',
  '[data-view-name="feed-reaction-count"]',
  '[data-view-name="feed-social-actions"]',
  'button[aria-label*="Like"]',
  'button[aria-label*="like"]',
  'button[aria-label*="React"]',
  'button[aria-label*="reaction"]',
  'button[aria-label*="Repost"]',
];

const COMMENT_SELECTORS = [
  '.comments-comment-box',
  '.comments-comments-list',
  '.comments-comment-item',
  '.comments-comments-list__comment-item',
  '[class*="comments-comment"]',
  '[class*="comment-social-bar"]',
  '[class*="comments-entry-point"]',
  '[data-view-name="feed-comment"]',
  '[data-view-name="feed-comment-box"]',
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
    return page.evaluate((id, socialSelectors) => {
      const main = document.querySelector('main') || document.body;
      const candidates = [...main.querySelectorAll(
        '.feed-shared-update-v2, article[data-urn], [data-view-name="feed-update"], article'
      )];

      const hasUrnNode = id ? !!document.querySelector(`[data-urn*="${id}"]`) : null;
      const urnInHtml = id
        ? candidates.some((node) => (node.innerHTML || '').includes(id))
        : null;

      const socialSelector = socialSelectors.join(', ');
      const withSocial = candidates.filter((node) => node.querySelector(socialSelector)).length;

      const viable = candidates.filter((node) => {
        const rect = node.getBoundingClientRect();
        const hasActor = !!node.querySelector(
          '[class*="update-components-actor"], [class*="feed-shared-actor"], [class*="actor"], a[href*="/in/"]'
        );
        const hasText = (node.textContent || '').trim().length > 40;
        const hasMedia = !!node.querySelector(
          'img, video, [class*="feed-shared-image"], [class*="update-components-image"]'
        );
        return (
          hasActor &&
          (hasText || hasMedia) &&
          rect.width >= 240 &&
          rect.height >= 60
        );
      }).length;

      const url = window.location.href;
      const onLogin = url.includes('/login') || url.includes('/authwall');
      const bodyText = (document.body?.innerText || '').slice(0, 500);

      const feedPostHeading = [...main.querySelectorAll('h2')].some(
        (heading) =>
          !heading.closest('aside') && (heading.textContent || '').trim() === 'Feed post'
      );

      return {
        url,
        onLogin,
        urnId: id,
        hasUrnNode,
        urnInHtml,
        feedPostHeading,
        candidateCount: candidates.length,
        withSocial,
        viable,
        bodySnippet: bodyText,
      };
    }, urnId, SOCIAL_REACTIONS_SELECTORS);
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

  async #waitForPostContent(page, urnId) {
    const pageIssue = await this.#detectPageIssue(page);
    if (pageIssue) throw new Error(pageIssue);

    try {
      await page.waitForFunction(
        (selectors, id, cardQuery, minWidth, minHeight) => {
          const main = document.querySelector('main') || document.body;
          const socialSelector =
            '.social-details-social-counts, .social-details-social-activity, .feed-shared-social-actions, [data-view-name="feed-social-actions"], [class*="social-action-bar"], button[aria-label*="Like"], button[aria-label*="React"]';

          const feedPostHeading = [...main.querySelectorAll('h2')].some(
            (heading) =>
              !heading.closest('aside') && (heading.textContent || '').trim() === 'Feed post'
          );
          if (feedPostHeading) return true;

          if (id && document.querySelector(`[data-urn*="${id}"]`)) return true;

          if (selectors.some((selector) => main.querySelector(selector))) return true;

          const cards = [...main.querySelectorAll(cardQuery)];
          if (
            cards.some((card) => {
              const rect = card.getBoundingClientRect();
              const hasActor = !!card.querySelector('a[href*="/in/"]');
              const hasContent = (card.textContent || '').trim().length > 40;
              return hasActor && hasContent && rect.width >= minWidth && rect.height >= minHeight;
            })
          ) {
            return true;
          }

          const actor = main.querySelector(
            '[class*="update-components-actor"], [class*="feed-shared-actor"], .feed-shared-actor__container'
          );
          const social = main.querySelector(socialSelector);

          return !!(actor && social);
        },
        { timeout: POST_READY_TIMEOUT_MS, polling: 100 },
        POST_LOAD_SELECTORS,
        urnId,
        POST_CARD_QUERY,
        MIN_CARD_WIDTH,
        MIN_CARD_HEIGHT
      );
    } catch {
      const issue = await this.#detectPageIssue(page);
      if (issue) throw new Error(issue);
      throw new Error(
        'LinkedIn post did not render in time. Retry once — if it persists, re-connect LinkedIn.'
      );
    }
  }

  async #findPostCard(page, urnId) {
    if (urnId) {
      await page.evaluate((id) => {
        const node = document.querySelector(`[data-urn*="${id}"]`);
        node?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, urnId);
    }

    const selector = await page.evaluate(
      (id, socialSelectors, cardQuery, minWidth, minHeight) => {
        document.querySelectorAll('[data-screenshot-target]').forEach((node) => {
          node.removeAttribute('data-screenshot-target');
        });

        const socialSelector = socialSelectors.join(', ');

        const mark = (el) => {
          if (!el) return null;
          el.setAttribute('data-screenshot-target', 'true');
          return '[data-screenshot-target="true"]';
        };

        const resolveCard = (node) => {
          if (!node) return null;

          let card =
            node.closest('.feed-shared-update-v2') ||
            node.closest('article[data-urn]') ||
            node.closest('[data-view-name="feed-update"]') ||
            node.closest('.main-feed-activity-card') ||
            node.closest('main article') ||
            node;

          let current = card;
          while (current) {
            if (current.querySelector(socialSelector)) {
              return current;
            }

            const parent = current.parentElement?.closest(
              '.feed-shared-update-v2, article[data-urn], [data-view-name="feed-update"], .main-feed-activity-card, main article'
            );

            if (!parent || parent === current) break;
            current = parent;
          }

          return card;
        };

        const scoreCandidate = (candidate, requireUrn) => {
          const rect = candidate.getBoundingClientRect();
          const hasActor = candidate.querySelector(
            '[class*="update-components-actor"], [class*="feed-shared-actor"], [class*="actor"], a[href*="/in/"]'
          );
          const hasText = (candidate.textContent || '').trim().length > 8;
          const hasMedia = candidate.querySelector(
            'img, video, [class*="feed-shared-image"], [class*="update-components-image"]'
          );
          const html = candidate.innerHTML || '';
          const area = rect.width * rect.height;

          if (
            !hasActor ||
            (!hasText && !hasMedia) ||
            rect.width < minWidth ||
            rect.height < minHeight ||
            area >= 5000000 ||
            (requireUrn && id && !html.includes(id))
          ) {
            return 0;
          }

          return area;
        };

        const findBestCard = (requireUrn) => {
          const main = document.querySelector('main') || document.body;
          let best = null;
          let bestArea = 0;

          const feedUpdates = [...main.querySelectorAll('[data-view-name="feed-update"]')];
          if (feedUpdates.length === 1) {
            const single = resolveCard(feedUpdates[0]);
            if (single && scoreCandidate(feedUpdates[0], requireUrn) > 0) {
              return single;
            }
          }

          for (const candidate of main.querySelectorAll(cardQuery)) {
            const area = scoreCandidate(candidate, requireUrn);
            if (area > bestArea) {
              best = resolveCard(candidate);
              bestArea = area;
            }
          }

          return best;
        };

        const findByFeedPostHeading = () => {
          const main = document.querySelector('main') || document.body;
          const heading = [...main.querySelectorAll('h2')].find(
            (node) => !node.closest('aside') && (node.textContent || '').trim() === 'Feed post'
          );
          if (!heading) return null;

          let el = heading.parentElement;
          while (el && el !== main) {
            if (el.closest('aside')) break;
            const rect = el.getBoundingClientRect();
            if (
              el.querySelector(socialSelector) &&
              el.querySelector('a[href*="/in/"]') &&
              rect.width >= minWidth &&
              rect.height >= minHeight
            ) {
              return el;
            }
            el = el.parentElement;
          }

          el = heading.parentElement;
          let fallback = null;
          let smallestArea = Infinity;

          for (let depth = 0; depth < 8 && el && el !== main; depth += 1) {
            if (el.closest('aside')) break;
            const rect = el.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (rect.width >= minWidth && rect.height >= minHeight && area < smallestArea) {
              fallback = el;
              smallestArea = area;
            }
            el = el.parentElement;
          }

          return fallback;
        };

        const findBySocialButtons = () => {
          const main = document.querySelector('main') || document.body;
          const buttons = [...main.querySelectorAll('button[aria-label]')].filter((btn) => {
            if (btn.closest('aside')) return false;
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            return /like|react|repost|comment|send/.test(label);
          });

          if (!buttons.length) return null;

          let el = buttons[0];
          for (let depth = 0; depth < 15 && el && el !== main; depth += 1) {
            if (el.closest('aside')) break;
            const rect = el.getBoundingClientRect();
            const hasAuthor = el.querySelector('a[href*="/in/"]');
            const hasContent = (el.textContent || '').trim().length > 80;

            if (hasAuthor && hasContent && rect.width >= minWidth && rect.height >= minHeight) {
              return el;
            }
            el = el.parentElement;
          }

          return null;
        };

        if (id) {
          const byUrn = document.querySelector(`[data-urn*="${id}"]`);
          if (byUrn) return mark(resolveCard(byUrn));

          for (const candidate of document.querySelectorAll(cardQuery)) {
            if ((candidate.innerHTML || '').includes(id)) {
              return mark(resolveCard(candidate));
            }
          }
        }

        return mark(
          findBestCard(!!id) ||
            findBestCard(false) ||
            findByFeedPostHeading() ||
            findBySocialButtons()
        );
      },
      urnId,
      SOCIAL_REACTIONS_SELECTORS,
      POST_CARD_QUERY,
      MIN_CARD_WIDTH,
      MIN_CARD_HEIGHT
    );

    if (!selector) return null;

    const element = await page.$(selector);
    if (!element) return null;

    const valid = await element.evaluate(
      (el, minWidth, minHeight) => {
        const rect = el.getBoundingClientRect();
        return rect.width >= minWidth && rect.height >= minHeight;
      },
      MIN_CARD_WIDTH,
      MIN_CARD_HEIGHT
    );

    return valid ? element : null;
  }

  async #hidePageChrome(page) {
    await page.evaluate((chromeSelectors) => {
      chromeSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
          if (node.closest('[data-screenshot-target="true"]')) return;
          node.style.setProperty('display', 'none', 'important');
        });
      });

      const postCard = document.querySelector('[data-screenshot-target="true"]');
      const main = document.querySelector('main');

      if (postCard && main) {
        main.querySelectorAll(':scope > *').forEach((child) => {
          if (!child.contains(postCard) && child !== postCard) {
            child.style.setProperty('display', 'none', 'important');
          }
        });
      }
    }, PAGE_CHROME_SELECTORS);
  }

  async #prepareCardForScreenshot(article) {
    await article.evaluate(
      (el, commentSelectors, socialSelectors) => {
        const card = el;

        const isInComments = (node) =>
          !!node.closest(
            '.comments-comment-box, .comments-comments-list, .comments-comment-item, [class*="comments-comment"], [data-view-name="feed-comment"]'
          );

        const findBottommostSocialElement = () => {
          const socialElements = [];
          socialSelectors.forEach((selector) => {
            card.querySelectorAll(selector).forEach((node) => {
              if (isInComments(node)) return;
              const rect = node.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                socialElements.push(node);
              }
            });
          });

          if (!socialElements.length) return { bottommost: null, bottom: null };

          let bottommost = socialElements[0];
          let bottom = bottommost.getBoundingClientRect().bottom;

          socialElements.forEach((node) => {
            const nodeBottom = node.getBoundingClientRect().bottom;
            if (nodeBottom > bottom) {
              bottom = nodeBottom;
              bottommost = node;
            }
          });

          return { bottommost, bottom };
        };

        const findSocialWrapper = (bottommost) =>
          bottommost?.closest(
            '[class*="update-v2-social-activity"], [class*="social-activity"], [class*="social-action"], [data-view-name="feed-social-actions"]'
          ) || bottommost;

        commentSelectors.forEach((selector) => {
          card.querySelectorAll(selector).forEach((node) => {
            node.style.display = 'none';
          });
        });

        card.querySelectorAll('textarea, [contenteditable="true"]').forEach((node) => {
          node.style.display = 'none';
        });

        card.querySelectorAll('button, a, span').forEach((node) => {
          const label = (node.getAttribute('aria-label') || node.textContent || '').toLowerCase();
          if (/view more comments|load more comments|show more comments|add a comment/.test(label)) {
            const container = node.closest('[class*="comment"]') || node.parentElement;
            if (container && card.contains(container)) {
              container.style.display = 'none';
            }
          }
        });

        const { bottommost, bottom } = findBottommostSocialElement();
        if (!bottommost || bottom == null) return;

        const wrapper = findSocialWrapper(bottommost);

        let current = wrapper;
        while (current && current !== card) {
          let sibling = current.nextElementSibling;
          while (sibling) {
            sibling.style.display = 'none';
            sibling = sibling.nextElementSibling;
          }
          current = current.parentElement;
        }

        card.querySelectorAll('*').forEach((node) => {
          if (wrapper.contains(node) || node === wrapper) return;
          if (isInComments(node)) {
            node.style.display = 'none';
            return;
          }

          const rect = node.getBoundingClientRect();
          if (rect.height > 0 && rect.top >= bottom - 1) {
            node.style.display = 'none';
          }
        });
      },
      COMMENT_SELECTORS,
      SOCIAL_REACTIONS_SELECTORS
    );
  }

  async #getPageCaptureMetrics(article) {
    return article.evaluate(
      (el, socialSelectors, fixedWidth) => {
        const cardRect = el.getBoundingClientRect();

        const isInComments = (node) =>
          !!node.closest(
            '.comments-comment-box, .comments-comments-list, .comments-comment-item, [class*="comments-comment"], [data-view-name="feed-comment"]'
          );

        const socialElements = [];
        socialSelectors.forEach((selector) => {
          el.querySelectorAll(selector).forEach((node) => {
            if (isInComments(node)) return;
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              socialElements.push(node);
            }
          });
        });

        let captureBottom = cardRect.bottom;
        if (socialElements.length > 0) {
          captureBottom = Math.max(
            ...socialElements.map((node) => node.getBoundingClientRect().bottom)
          );
        }

        const padding = 2;

        return {
          x: Math.max(0, cardRect.left),
          y: Math.max(0, cardRect.top),
          width: fixedWidth,
          height: Math.max(200, Math.ceil(captureBottom - cardRect.top + padding)),
        };
      },
      SOCIAL_REACTIONS_SELECTORS,
      FIXED_CAPTURE_WIDTH
    );
  }

  async #getElementCaptureClip(article) {
    const metrics = await this.#getPageCaptureMetrics(article);
    return {
      x: 0,
      y: 0,
      width: metrics.width,
      height: metrics.height,
    };
  }

  async #normalizeCardWidth(article) {
    await article.evaluate((el, width) => {
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

  async #triggerLazyMedia(page, article) {
    const box = await article.boundingBox();
    if (!box) return;

    const step = 280;
    const steps = Math.max(1, Math.ceil(box.height / step));

    for (let i = 0; i <= steps; i += 1) {
      await page.evaluate((scrollY) => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }, Math.max(0, box.y + i * step - 80));
      await delay(120);
    }

    await article.evaluate((el) => {
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await delay(150);
  }

  async #countPendingMedia(article) {
    return article.evaluate((el) => {
      const isVisible = (node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 24 && rect.height >= 24;
      };

      const pendingImages = [...el.querySelectorAll('img')].filter((img) => {
        if (!isVisible(img)) return false;
        if (!img.complete) return true;
        if (img.naturalWidth < 80 || img.naturalHeight < 40) return true;
        return false;
      }).length;

      const pendingVideos = [...el.querySelectorAll('video')].filter((video) => {
        if (!isVisible(video)) return false;
        return video.readyState < 2;
      }).length;

      return pendingImages + pendingVideos;
    });
  }

  async #waitForPostMediaLoaded(article) {
    const deadline = Date.now() + MEDIA_LOAD_TIMEOUT_MS;
    let stablePasses = 0;

    while (Date.now() < deadline) {
      const pending = await this.#countPendingMedia(article);

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

    const remaining = await this.#countPendingMedia(article);
    if (remaining > 0) {
      logger.warn('Post media still loading at screenshot time', { pending: remaining });
    }
  }

  async #normalizeScreenshotWidth(buffer) {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || metadata.width === OUTPUT_PNG_WIDTH) {
      return buffer;
    }

    return sharp(buffer)
      .resize({ width: OUTPUT_PNG_WIDTH })
      .png()
      .toBuffer();
  }

  async #screenshotPostCard(page, article) {
    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT_DEFAULT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });

    await this.#dismissOverlays(page);
    await this.#hidePageChrome(page);
    await this.#prepareCardForScreenshot(article);

    await article.evaluate((el) => {
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
    });

    await this.#normalizeCardWidth(article);
    await delay(100);
    await this.#triggerLazyMedia(page, article);
    await this.#waitForPostMediaLoaded(article);

    let captureMetrics = await this.#getPageCaptureMetrics(article);

    const viewportHeight = Math.min(Math.max(captureMetrics.height + 80, 900), 16000);
    if (viewportHeight > VIEWPORT_HEIGHT_DEFAULT) {
      await page.setViewport({
        width: VIEWPORT_WIDTH,
        height: viewportHeight,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      });
      await delay(100);
      await this.#normalizeCardWidth(article);
      captureMetrics = await this.#getPageCaptureMetrics(article);
    }

    logger.debug('Capturing LinkedIn post page screenshot', captureMetrics);

    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: captureMetrics,
    });

    const normalized = await this.#normalizeScreenshotWidth(screenshot);
    const outputMeta = await sharp(normalized).metadata();
    logger.debug('Screenshot normalized', {
      width: outputMeta.width,
      height: outputMeta.height,
      targetWidth: OUTPUT_PNG_WIDTH,
    });

    return normalized;
  }

  async #loadPostPage(page, targetUrl, urnId) {
    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT_DEFAULT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });

    await this.#goto(page, targetUrl);
    await this.#dismissOverlays(page);
    await this.#waitForPostContent(page, urnId);
  }

  async capturePostScreenshot(linkedinUrl) {
    const { candidates, urnId } = this.#buildCandidateUrls(linkedinUrl);
    const startedAt = Date.now();

    return linkedinBrowserService.withPage(async (page) => {
      let lastError = null;

      try {
        const hasSession = await this.#hasLinkedInSession(page);
        if (!hasSession) {
          await this.#goto(page, FEED_URL).catch(() => {});
          await delay(100);
          const pageIssue = await this.#detectPageIssue(page);
          if (pageIssue) throw new Error(pageIssue);
        }

        for (let index = 0; index < candidates.length; index += 1) {
          const targetUrl = candidates[index];

          try {
            logger.debug('Loading LinkedIn post URL', { targetUrl, urnId });

            await this.#loadPostPage(page, targetUrl, urnId);

            const postCard = await this.#findPostCard(page, urnId);
            if (!postCard) {
              const diagnosis = await this.#diagnosePostCardFailure(page, urnId);
              await this.#saveDebugSnapshot(page, 'post-card-not-found.png', 'post card not found');

              let hint = 'Re-connect LinkedIn and retry.';
              if (diagnosis.onLogin) {
                hint = 'LinkedIn session expired. Click Connect LinkedIn in the admin UI and log in again.';
              } else if (diagnosis.viable === 0 && diagnosis.candidateCount === 0) {
                hint = 'The page loaded but no post content was found. Check the URL is a valid public post link.';
              } else if (diagnosis.viable === 0) {
                hint = 'Post elements were found but did not match expected layout. LinkedIn may have changed their page structure.';
              } else if (urnId && !diagnosis.hasUrnNode && !diagnosis.urnInHtml) {
                hint = 'Post page loaded but the post ID from the URL was not found in the page. The post may be private or deleted.';
              }

              lastError = new Error(`LinkedIn post card not found. ${hint}`);
              logger.warn('Post card not found for URL candidate', {
                targetUrl,
                urnId,
                diagnosis,
              });
              continue;
            }

            const screenshot = await this.#screenshotPostCard(page, postCard);

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
            logger.warn('LinkedIn URL candidate failed', {
              targetUrl,
              error: error.message,
            });
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