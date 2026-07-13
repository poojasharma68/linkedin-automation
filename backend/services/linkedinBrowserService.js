import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import env from '../config/env.js';
import logger from '../config/logger.js';
import sessionStore from './sessionStore.js';

puppeteer.use(StealthPlugin());

const BROWSER_IDLE_CLOSE_MS = 2 * 60 * 1000;

/**
 * Runs headless Chromium and lends out pages that are pre-loaded with a specific
 * user's LinkedIn cookies.
 *
 * There is no server-side login any more: each user connects their own LinkedIn
 * from the browser extension, which sends their cookies to the /connect
 * endpoint. Here we just inject those stored cookies into an isolated browser
 * context per operation, so two users never share a session and nothing is
 * persisted in the browser profile itself.
 */
class LinkedInBrowserService {
  constructor() {
    this.timeout = env.PUPPETEER_TIMEOUT_MS;
    this.browser = null;
    this.operationQueue = Promise.resolve();
    this.idleCloseTimer = null;
  }

  // Serialize browser work so we never run more than one capture at a time —
  // keeps memory predictable on small hosts (the reason restarts were happening).
  #enqueue(task) {
    const run = this.operationQueue.then(task, task);
    this.operationQueue = run.catch(() => {});
    return run;
  }

  #clearIdleCloseTimer() {
    if (this.idleCloseTimer) {
      clearTimeout(this.idleCloseTimer);
      this.idleCloseTimer = null;
    }
  }

  #scheduleIdleClose() {
    this.#clearIdleCloseTimer();
    this.idleCloseTimer = setTimeout(() => {
      this.closeBrowser().catch(() => {});
    }, BROWSER_IDLE_CLOSE_MS);
  }

  async closeBrowser() {
    this.#clearIdleCloseTimer();
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      logger.debug('LinkedIn browser closed');
    }
  }

  async #getOrLaunchBrowser() {
    if (this.browser?.isConnected?.()) {
      return this.browser;
    }

    await this.closeBrowser();

    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,900',
      ],
      defaultViewport: {
        width: 1280,
        height: 900,
        deviceScaleFactor: 2,
      },
    };

    try {
      this.browser = await puppeteer.launch({ ...launchOptions, channel: 'chrome' });
    } catch (chromeChannelError) {
      logger.debug('System Chrome unavailable, using configured Chromium', {
        error: chromeChannelError.message,
      });
      this.browser = await puppeteer.launch(launchOptions);
    }

    logger.info('LinkedIn browser launched', { headless: true });
    return this.browser;
  }

  async #openPage(context) {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(this.timeout);
    page.setDefaultTimeout(this.timeout);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    return page;
  }

  async #applyCookies(page, cookies) {
    if (cookies.length) {
      await page.setCookie(...cookies);
    }
  }

  /**
   * Lends a page pre-loaded with `userId`'s LinkedIn cookies to `task`, inside a
   * throwaway isolated context. Throws a clear error if the user has not
   * connected LinkedIn yet.
   */
  withUserPage(userId, task) {
    return this.#enqueue(async () => {
      const cookies = await sessionStore.getCookies(userId);
      if (!cookies) {
        const error = new Error(
          'LinkedIn is not connected for this account. Open the extension and click Connect LinkedIn.'
        );
        error.code = 'LINKEDIN_NOT_CONNECTED';
        throw error;
      }

      let context = null;
      let page = null;

      try {
        const browser = await this.#getOrLaunchBrowser();
        context = await browser.createBrowserContext();
        page = await this.#openPage(context);
        await this.#applyCookies(page, cookies);
        return await task(page);
      } finally {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
        this.#scheduleIdleClose();
      }
    });
  }

  // Pre-warm Chromium so the first capture is fast.
  warmupBrowser() {
    return this.#enqueue(async () => {
      try {
        await this.#getOrLaunchBrowser();
        this.#scheduleIdleClose();
        logger.info('LinkedIn browser pre-warmed for fast screenshots');
      } catch (error) {
        logger.debug('LinkedIn browser warmup skipped', { error: error.message });
      }
    });
  }
}

export default new LinkedInBrowserService();
