import linkedinBrowserService from '../src/services/linkedinBrowserService.js';
import delay from '../src/utils/delay.js';

const urnId = '7466043266342502402';
const url =
  'https://www.linkedin.com/posts/himakshi-b-98b851193_entrepreneurship-fashionstartup-genzfounder-ugcPost-7466043266342502402-Z7Qb/';

await linkedinBrowserService.withPage(async (page) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  const info = await page.evaluate((id) => {
    const byUrn = document.querySelector(`[data-urn*="${id}"]`);
    const updates = [...document.querySelectorAll('.feed-shared-update-v2, article[data-urn], article')];

    return {
      htmlHasId: (document.body?.innerHTML || '').includes(id),
      byUrn: byUrn
        ? {
            tag: byUrn.tagName,
            className: byUrn.className,
            width: byUrn.getBoundingClientRect().width,
            height: byUrn.getBoundingClientRect().height,
          }
        : null,
      updateCount: updates.length,
      updates: updates.slice(0, 8).map((el) => ({
        tag: el.tagName,
        className: el.className?.slice?.(0, 80),
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        hasId: (el.innerHTML || '').includes(id),
        hasActor: Boolean(
          el.querySelector(
            '[class*="update-components-actor"], [class*="feed-shared-actor"], [class*="actor"], a[href*="/in/"]'
          )
        ),
        dataUrn: el.getAttribute('data-urn')?.slice(0, 80),
      })),
    };
  }, urnId);

  console.log(JSON.stringify(info, null, 2));
});

await linkedinBrowserService.closeBrowser();
process.exit(0);
