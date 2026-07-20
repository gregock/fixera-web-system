const { chromium } = require('playwright');

const BASE = 'https://fixera.net';

const TESTS = [
  {
    label: 'HOME EN · WhatsApp hero/nav/floating',
    url: `${BASE}/`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href*="whatsapp"]'
    ]
  },
  {
    label: 'HOME DA · WhatsApp hero/nav/floating',
    url: `${BASE}/index.da`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href*="whatsapp"]'
    ]
  },
  {
    label: 'CONTACT EN · WhatsApp / phone / email',
    url: `${BASE}/contact`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href^="tel:"]',
      'a[href^="mailto:"]'
    ]
  },
  {
    label: 'CONTACT DA · WhatsApp / phone / email',
    url: `${BASE}/contact.da`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href^="tel:"]',
      'a[href^="mailto:"]'
    ]
  },
  {
    label: 'SERVICES EN · WhatsApp / contact links',
    url: `${BASE}/services`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href*="/contact"]'
    ]
  },
  {
    label: 'SERVICES DA · WhatsApp / contact links',
    url: `${BASE}/services.da`,
    selectors: [
      'a[href*="wa.me"]',
      'a[href*="/contact"]'
    ]
  }
];

function parseGA(url) {
  try {
    const u = new URL(url);
    const en = u.searchParams.get('en');
    const ep = {};
    for (const [k, v] of u.searchParams.entries()) {
      if (k.startsWith('ep.') || k.startsWith('epn.')) ep[k] = v;
    }
    return { en, ep, full: url };
  } catch {
    return { en: null, ep: {}, full: url };
  }
}

async function safeClick(page, locator) {
  try {
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allResults = [];

  for (const test of TESTS) {
    const requests = [];

    const handler = req => {
      const url = req.url();
      if (url.includes('google-analytics.com/g/collect')) {
        requests.push(parseGA(url));
      }
    };

    page.on('request', handler);

    console.log(`\n==================================================`);
    console.log(`TEST: ${test.label}`);
    console.log(`URL: ${test.url}`);
    console.log(`==================================================`);

    try {
      await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
    } catch (err) {
      console.log(`ERROR loading page: ${err.message}`);
      page.off('request', handler);
      allResults.push({
        label: test.label,
        url: test.url,
        error: `load failed: ${err.message}`,
        clicks: []
      });
      continue;
    }

    const clicks = [];

    for (const selector of test.selectors) {
      const count = await page.locator(selector).count();

      if (count === 0) {
        console.log(`- ${selector}: no matches`);
        continue;
      }

      const maxToTest = Math.min(count, 3);

      for (let i = 0; i < maxToTest; i++) {
        const locator = page.locator(selector).nth(i);
        const href = await locator.getAttribute('href');
        const text = ((await locator.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ').slice(0, 80);

        const before = requests.length;
        const clicked = await safeClick(page, locator);
        await page.waitForTimeout(1200);
        const after = requests.length;

        const newReqs = requests.slice(before, after);

        const result = {
          selector,
          index: i,
          href,
          text,
          clicked,
          ga_requests: newReqs
        };

        clicks.push(result);

        console.log(`\n[${selector}] #${i + 1}`);
        console.log(`text: ${text || '(no text)'}`);
        console.log(`href: ${href || '(no href)'}`);
        console.log(`clicked: ${clicked ? 'yes' : 'no'}`);

        if (!newReqs.length) {
          console.log(`GA4: NO EVENT OBSERVED`);
        } else {
          for (const r of newReqs) {
            console.log(`GA4: en=${r.en || '(none)'}`);
            const keys = Object.keys(r.ep);
            if (keys.length) {
              console.log(`params: ${keys.map(k => `${k}=${r.ep[k]}`).join(', ')}`);
            }
          }
        }

        if (href && (href.startsWith('tel:') || href.startsWith('mailto:') || href.includes('wa.me'))) {
          await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    }

    page.off('request', handler);

    allResults.push({
      label: test.label,
      url: test.url,
      clicks
    });
  }

  console.log(`\n\n================ FINAL SUMMARY ================`);
  for (const group of allResults) {
    console.log(`\n${group.label}`);
    if (group.error) {
      console.log(`ERROR: ${group.error}`);
      continue;
    }

    for (const c of group.clicks) {
      const status = c.ga_requests.length ? 'TRACKED' : 'NO_EVENT';
      console.log(`- ${status} | ${c.selector} | ${c.text || c.href || '(unknown)'}`);
    }
  }

  await browser.close();
})();
