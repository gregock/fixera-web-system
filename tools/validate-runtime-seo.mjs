import fs from 'fs';
import path from 'path';
import https from 'https';

const projectRoot = process.cwd();
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');
const sourceBaseUrl = 'https://fixera.net';
const baseUrl = process.env.RUNTIME_SEO_BASE_URL || sourceBaseUrl;

/**
 * @typedef {{
 *   testUrl: string;
 *   expected: string;
 *   actualStatus?: number | string;
 *   actualLocation?: string;
 *   actualCanonical?: string;
 *   error?: string;
 * }} Failure
 */

/**
 * @param {string} url
 * @returns {Promise<{ status: number, headers: Record<string, string | string[] | undefined>, body: string }>}
 */
function requestUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'ServiceBusinessWebSystemRuntimeSeoValidator/1.0'
        },
        timeout: 15000
      },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * @param {string} html
 * @returns {string | null}
 */
function extractCanonical(html) {
  const canonicalTag = html.match(/<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>/i);
  if (!canonicalTag) return null;
  const hrefMatch = canonicalTag[0].match(/\bhref\s*=\s*["']?([^"'\s>]+)["']?/i);
  return hrefMatch ? hrefMatch[1] : null;
}

/**
 * @param {string} testUrl
 * @param {string | string[] | undefined} locationHeader
 * @returns {string | undefined}
 */
function normalizeLocation(testUrl, locationHeader) {
  if (!locationHeader) return undefined;
  const raw = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
  try {
    return new URL(raw, testUrl).href;
  } catch {
    return raw;
  }
}

/**
 * Normalize equivalent runtime URL forms for expectation comparison.
 * @param {string | undefined} url
 * @returns {string | undefined}
 */
function normalizeComparableUrl(url) {
  if (!url) return url;
  if (url === `${baseUrl}/projects/`) return `${baseUrl}/projects`;
  return url;
}

/**
 * @param {string} cleanUrl
 * @returns {string | null}
 */
function deriveHtmlVariant(cleanUrl) {
  const u = new URL(cleanUrl);
  const pathname = u.pathname;

  if (pathname === '/') return null;
  if (pathname === '/projects/' || pathname === '/projects') return null;
  if (pathname === '/index.da') return null;
  if (pathname.endsWith('.da')) return null;
  if (pathname.endsWith('/')) return null;

  return `${u.origin}${pathname}.html`;
}

/**
 * @returns {string[]}
 */
function readSitemapUrls() {
  if (!fs.existsSync(sitemapPath)) {
    console.error(`[RUNTIME-SEO] Missing sitemap: ${sitemapPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  const urls = matches.map(match => match[1].trim().replace(sourceBaseUrl, baseUrl));

  if (urls.length === 0) {
    console.error('[RUNTIME-SEO] No <loc> entries found in sitemap.xml');
    process.exit(1);
  }

  return urls;
}

/**
 * @param {Failure[]} failures
 * @param {Failure} failure
 */
function pushFailure(failures, failure) {
  failures.push(failure);
}

/**
 * @param {string} cleanUrl
 * @param {Failure[]} failures
 * @returns {Promise<void>}
 */
async function validateSitemapUrl(cleanUrl, failures) {
  let response;

  try {
    response = await requestUrl(cleanUrl);
  } catch (error) {
    pushFailure(failures, {
      testUrl: cleanUrl,
      expected: `200 and canonical ${cleanUrl}`,
      actualStatus: 'REQUEST_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  const canonical = response.status === 200 ? extractCanonical(response.body) : null;
  const location = normalizeLocation(cleanUrl, response.headers.location);

  if (response.status !== 200) {
    pushFailure(failures, {
      testUrl: cleanUrl,
      expected: `200 and canonical ${cleanUrl}`,
      actualStatus: response.status,
      actualLocation: location,
      actualCanonical: canonical || undefined
    });
    return;
  }

  if (canonical !== cleanUrl) {
    pushFailure(failures, {
      testUrl: cleanUrl,
      expected: `canonical ${cleanUrl}`,
      actualStatus: response.status,
      actualCanonical: canonical || undefined
    });
  }
}

/**
 * @param {string} variantUrl
 * @param {string} targetUrl
 * @param {Failure[]} failures
 * @returns {Promise<void>}
 */
async function validateHtmlVariant(variantUrl, targetUrl, failures) {
  let response;

  try {
    response = await requestUrl(variantUrl);
  } catch (error) {
    pushFailure(failures, {
      testUrl: variantUrl,
      expected: `308 redirect to ${targetUrl}`,
      actualStatus: 'REQUEST_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  const location = normalizeLocation(variantUrl, response.headers.location);
  const comparableLocation = normalizeComparableUrl(location);
  const comparableTarget = normalizeComparableUrl(targetUrl);
  if (response.status !== 308 || comparableLocation !== comparableTarget) {
    pushFailure(failures, {
      testUrl: variantUrl,
      expected: `308 redirect to ${targetUrl}`,
      actualStatus: response.status,
      actualLocation: location
    });
  }
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  if (!process.env.RUNTIME_SEO_BASE_URL) {
    console.log(
      '[RUNTIME-SEO] Skipped: set RUNTIME_SEO_BASE_URL to validate a deployed runtime URL.'
    );
    process.exit(0);
  }

  const sitemapUrls = readSitemapUrls();
  /** @type {Failure[]} */
  const failures = [];

  let totalChecks = 0;

  for (const cleanUrl of sitemapUrls) {
    totalChecks += 1;
    await validateSitemapUrl(cleanUrl, failures);

    const htmlVariant = deriveHtmlVariant(cleanUrl);
    if (htmlVariant) {
      totalChecks += 1;
      await validateHtmlVariant(htmlVariant, cleanUrl, failures);
    }
  }

  const legacyRedirects = [
    { source: `${baseUrl}/projects/indexprojects`, target: `${baseUrl}/projects` },
    { source: `${baseUrl}/projects/indexprojects.html`, target: `${baseUrl}/projects` },
    { source: `${baseUrl}/projects/indexprojects.da`, target: `${baseUrl}/projects.da` },
    { source: `${baseUrl}/projects/indexprojects.da.html`, target: `${baseUrl}/projects.da` },
    { source: `${baseUrl}/index.da.html`, target: `${baseUrl}/index.da` }
  ];

  for (const legacy of legacyRedirects) {
    totalChecks += 1;
    await validateHtmlVariant(legacy.source, legacy.target, failures);
  }

  if (failures.length === 0) {
    console.log(`[RUNTIME-SEO] PASS: ${totalChecks} checks, 0 failures.`);
    process.exit(0);
  }

  console.error(`[RUNTIME-SEO] FAIL: ${totalChecks} checks, ${failures.length} failures.`);
  failures.forEach((failure, index) => {
    console.error(`\n[${index + 1}] URL: ${failure.testUrl}`);
    console.error(`Expected: ${failure.expected}`);
    console.error(`Actual status: ${failure.actualStatus ?? 'N/A'}`);
    if (failure.actualLocation) {
      console.error(`Actual location: ${failure.actualLocation}`);
    }
    if (failure.actualCanonical) {
      console.error(`Actual canonical: ${failure.actualCanonical}`);
    }
    if (failure.error) {
      console.error(`Error: ${failure.error}`);
    }
  });

  process.exit(1);
}

main().catch(error => {
  console.error('[RUNTIME-SEO] Unhandled error:', error);
  process.exit(1);
});
