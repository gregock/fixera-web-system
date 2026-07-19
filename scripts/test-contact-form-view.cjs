const { chromium } = require('playwright');

const URLS = [
  'https://northstar-services.example/contact',
  'https://northstar-services.example/contact.da',
];

const EVENT_NAME = 'contact_form_view';
const WAIT_MS = 1200;

function parseGACollect(url) {
  if (!url.includes('google-analytics.com/g/collect')) return null;
  try {
    const u = new URL(url);
    return {
      en: u.searchParams.get('en'),
      cta_position: u.searchParams.get('ep.cta_position') || u.searchParams.get('epn.cta_position'),
      form_source: u.searchParams.get('ep.form_source') || u.searchParams.get('epn.form_source'),
      url,
    };
  } catch {
    return null;
  }
}

async function readFormViewFromDataLayer(page) {
  return page.evaluate((eventName) => {
    const dl = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    const hits = [];
    for (const item of dl) {
      if (!Array.isArray(item)) continue;
      if (item[0] !== 'event') continue;
      if (item[1] !== eventName) continue;
      hits.push(item[2] || {});
    }
    return hits;
  }, EVENT_NAME);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const url of URLS) {
    const page = await context.newPage();
    const gaEvents = [];

    page.on('request', (req) => {
      const parsed = parseGACollect(req.url());
      if (!parsed) return;
      if (parsed.en === EVENT_NAME) gaEvents.push(parsed);
    });

    console.log(`\n==================================================`);
    console.log(`TESTING: ${url}`);
    console.log(`==================================================`);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#contact-form', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(WAIT_MS);

    const beforeDL = await readFormViewFromDataLayer(page);
    const beforeGA = gaEvents.length;
    console.log(`After load: dataLayer=${beforeDL.length}, ga_collect=${beforeGA}`);

    const form = page.locator('#contact-form');
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(WAIT_MS);

    const afterFirstDL = await readFormViewFromDataLayer(page);
    const afterFirstGA = gaEvents.length;
    console.log(`After first form view: dataLayer=${afterFirstDL.length}, ga_collect=${afterFirstGA}`);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await page.waitForTimeout(400);
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(WAIT_MS);

    const afterRepeatDL = await readFormViewFromDataLayer(page);
    const afterRepeatGA = gaEvents.length;
    console.log(`After repeated scrolling: dataLayer=${afterRepeatDL.length}, ga_collect=${afterRepeatGA}`);

    const payloadOk =
      afterFirstDL[0] &&
      afterFirstDL[0].cta_position === 'contact_form' &&
      afterFirstDL[0].form_source === 'contact_page';
    const noEarlyFire = beforeDL.length === 0;
    const oneOnFirstView = afterFirstDL.length === 1;
    const stillOneAfterRepeat = afterRepeatDL.length === 1;

    if (noEarlyFire && oneOnFirstView && stillOneAfterRepeat && payloadOk) {
      console.log('RESULT: PASS');
    } else {
      console.log('RESULT: FAIL');
      console.log(
        `Checks -> noEarlyFire=${noEarlyFire}, oneOnFirstView=${oneOnFirstView}, stillOneAfterRepeat=${stillOneAfterRepeat}, payloadOk=${!!payloadOk}`
      );
    }

    if (gaEvents.length) {
      const first = gaEvents[0];
      console.log(
        `GA transport observed: en=${first.en}, ep.cta_position=${first.cta_position || '(missing)'}, ep.form_source=${first.form_source || '(missing)'}`
      );
    } else {
      console.log('GA transport observed: none (event verification used dataLayer emission)');
    }

    await page.close();
  }

  await browser.close();
})();
