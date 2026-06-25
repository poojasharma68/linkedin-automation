import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import env from '../config/env.js';
import logger from '../config/logger.js';
import delay from '../utils/delay.js';

puppeteer.use(StealthPlugin());

const LOGIN_URL = 'https://www.linkedin.com/login';
const FEED_URL = 'https://www.linkedin.com/feed/';
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const LOGIN_POLL_MS = 2000;

const BROWSER_IDLE_CLOSE_MS = 2 * 60 * 1000;

class LinkedInBrowserService {
  constructor() {
    this.profileDir = path.resolve(env.LINKEDIN_BROWSER_PROFILE_PATH);
    this.timeout = env.PUPPETEER_TIMEOUT_MS;
    this.browser = null;
    this.browserHeadless = true;
    this.loginInProgress = false;
    this.operationQueue = Promise.resolve();
    this.sessionCache = null;
    this.idleCloseTimer = null;
  }

  #getCachedSession() {
    if (this.sessionCache && Date.now() - this.sessionCache.checkedAt < 3 * 60 * 1000) {
      return this.sessionCache;
    }
    return null;
  }

  #setSessionCache(result) {
    this.sessionCache = { ...result, checkedAt: Date.now() };
    return this.sessionCache;
  }

  invalidateSessionCache() {
    this.sessionCache = null;
  }

  #enqueue(task) {
    const run = this.operationQueue.then(task, task);
    this.operationQueue = run.catch(() => {});
    return run;
  }

  async #ensureProfileDir() {
    await fs.mkdir(this.profileDir, { recursive: true });
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

  async #getOrLaunchBrowser({ headless, forceNew = false }) {
    if (!forceNew && this.browser?.isConnected?.() && this.browserHeadless === headless) {
      return this.browser;
    }

    await this.closeBrowser();
    await this.#ensureProfileDir();

    this.browserHeadless = headless;
    const launchOptions = {
      headless,
      userDataDir: this.profileDir,
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
      logger.debug('System Chrome unavailable, using bundled Chromium', {
        error: chromeChannelError.message,
      });
      this.browser = await puppeteer.launch(launchOptions);
    }

    logger.info('LinkedIn browser launched', { headless, profileDir: this.profileDir, reused: false });
    return this.browser;
  }

  async #launchBrowser({ headless }) {
    return this.#getOrLaunchBrowser({ headless, forceNew: true });
  }

  async #hasSessionCookie(page) {
    const cookies = await page.cookies('https://www.linkedin.com');
    return cookies.some((cookie) => cookie.name === 'li_at' && cookie.value);
  }

  async #isLoggedInOnPage(page) {
    const hasCookie = await this.#hasSessionCookie(page);
    if (!hasCookie) return false;

    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/uas/login')) {
      return false;
    }

    return true;
  }

  async #openPage(browser) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(this.timeout);
    page.setDefaultTimeout(this.timeout);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    return page;
  }

  async #checkSessionInternal() {
    let page = null;

    try {
      const browser = await this.#launchBrowser({ headless: true });
      page = await this.#openPage(browser);

      await page.goto(FEED_URL, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const loggedIn = await this.#isLoggedInOnPage(page);

      return {
        loggedIn,
        profileSaved: true,
        profilePath: this.profileDir,
      };
    } catch (error) {
      logger.error('LinkedIn session check failed', { error: error.message });
      return {
        loggedIn: false,
        profileSaved: true,
        profilePath: this.profileDir,
        error: error.message,
      };
    } finally {
      if (page) await page.close().catch(() => {});
      await this.closeBrowser();
    }
  }

  async #openLoginInternal() {
    if (this.loginInProgress) {
      return { loggedIn: false, message: 'LinkedIn login is already in progress' };
    }

    this.loginInProgress = true;
    let page = null;

    try {
      const existing = await this.#checkSessionInternal();
      if (existing.loggedIn) {
        return {
          loggedIn: true,
          message: 'LinkedIn session is already active',
          profilePath: this.profileDir,
        };
      }

      const browser = await this.#launchBrowser({ headless: false });
      page = await this.#openPage(browser);

      await page.goto(LOGIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      logger.info('LinkedIn login browser opened — waiting for user sign-in');

      const startedAt = Date.now();

      while (Date.now() - startedAt < LOGIN_TIMEOUT_MS) {
        await delay(LOGIN_POLL_MS);

        if (await this.#isLoggedInOnPage(page)) {
          await page
            .goto(FEED_URL, {
              waitUntil: 'domcontentloaded',
              timeout: this.timeout,
            })
            .catch(() => {});

          logger.info('LinkedIn login completed — browser profile saved');

          this.#setSessionCache({
            loggedIn: true,
            profileSaved: true,
            profilePath: this.profileDir,
          });

          return {
            loggedIn: true,
            message: 'LinkedIn login successful. Browser profile saved.',
            profilePath: this.profileDir,
          };
        }
      }

      return {
        loggedIn: false,
        message: 'LinkedIn login timed out after 5 minutes',
        profilePath: this.profileDir,
      };
    } finally {
      if (page) await page.close().catch(() => {});
      await this.closeBrowser();
      this.loginInProgress = false;
    }
  }

  checkSession() {
    const cached = this.#getCachedSession();
    if (cached) {
      return Promise.resolve(cached);
    }

    return this.#enqueue(async () => {
      const result = await this.#checkSessionInternal();
      return this.#setSessionCache(result);
    });
  }

  openLogin() {
    return this.#enqueue(() => this.#openLoginInternal());
  }

  ensureLoggedIn() {
    return this.#enqueue(async () => {
      const cached = this.#getCachedSession();
      if (cached?.loggedIn) {
        return { loggedIn: true, message: 'LinkedIn session ready' };
      }

      const session = await this.#checkSessionInternal();
      this.#setSessionCache(session);

      if (session.loggedIn) {
        return { loggedIn: true, message: 'LinkedIn session ready' };
      }

      return this.#openLoginInternal();
    });
  }

  warmupBrowser() {
    return this.#enqueue(async () => {
      try {
        await this.#getOrLaunchBrowser({ headless: true });
        this.#scheduleIdleClose();
        logger.info('LinkedIn browser pre-warmed for fast screenshots');
      } catch (error) {
        logger.debug('LinkedIn browser warmup skipped', { error: error.message });
      }
    });
  }

  withPage(task, { headless = true, reuseBrowser = true } = {}) {
    return this.#enqueue(async () => {
      let page = null;

      try {
        const browser = await this.#getOrLaunchBrowser({
          headless,
          forceNew: !reuseBrowser,
        });
        page = await this.#openPage(browser);
        return await task(page);
      } finally {
        if (page) await page.close().catch(() => {});
        if (reuseBrowser) {
          this.#scheduleIdleClose();
        } else {
          await this.closeBrowser();
        }
      }
    });
  }
}

export default new LinkedInBrowserService();
