const { chromium } = require('playwright');

const URLS = [
  'https://fixera.net/contact',
  'https://fixera.net/contact.da',
];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  for (const pageUrl of URLS) {
    const page = await context.newPage();

    console.log('\n==================================================');
    console.log(`PAGE: ${pageUrl}`);
    console.log('==================================================');

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const scriptUrls = await page.evaluate(() =>
      Array.from(document.scripts)
        .map((s) => s.src)
        .filter(Boolean)
    );

    console.log('\nLoaded script URLs:');
    scriptUrls.forEach((u) => console.log(`- ${u}`));

    const candidate = scriptUrls.find((u) => /\/js\/scripts\.js($|\?)/.test(u));

    if (!candidate) {
      console.log('\nRESULT: FAIL -> could not find /js/scripts.js');
      await page.close();
      continue;
    }

    console.log(`\nMain candidate: ${candidate}`);

    const res = await page.request.get(candidate);
    const text = await res.text();

    const hasInitAnalytics = text.includes('initAnalytics()');
    const idxInit = text.indexOf('initAnalytics()');
    const idxBoot = text.indexOf('// ---- Boot ----');
    const idxInitContact = text.indexOf('initContact(');

    console.log('\nBundle checks:');
    console.log(`- contains initAnalytics(): ${hasInitAnalytics}`);
    console.log(`- index initAnalytics(): ${idxInit}`);
    console.log(`- index "// ---- Boot ----": ${idxBoot}`);
    console.log(`- index initContact(: ${idxInitContact}`);

    if (idxInit !== -1 && idxBoot !== -1) {
      console.log(`- initAnalytics before boot: ${idxInit < idxBoot}`);
    }

    const snippetStart = Math.max(0, Math.min(idxInit, idxBoot) - 250);
    const snippetEnd = Math.min(text.length, Math.max(idxInit, idxBoot) + 500);

    console.log('\nBundle snippet around init/boot:\n');
    console.log(text.slice(snippetStart, snippetEnd));

    await page.close();
  }

  await browser.close();
})();
