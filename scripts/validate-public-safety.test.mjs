import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validatePublicSafety } from './lib/public-safety-validator.mjs';

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

function createTempProject() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fixera-public-safety-'));
  tempRoots.push(root);
  return root;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function validateFixture(files) {
  const root = createTempProject();
  for (const [relativePath, content] of Object.entries(files)) {
    write(root, relativePath, content);
  }
  return validatePublicSafety({ projectRoot: root });
}

describe('validatePublicSafety', () => {
  it('passes on the committed repository', () => {
    const result = validatePublicSafety();
    assert.deepEqual(result.failures, []);
    assert.ok(result.checkedFiles > 0);
  });

  it('includes documentation in the scan surface', () => {
    const result = validateFixture({
      'docs/reference/leak.md': 'gtag("config", "G-REAL12345A");\n'
    });

    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].file, 'docs/reference/leak.md');
    assert.match(result.failures[0].message, /GA4 measurement ID/);
  });

  it('rejects a synthetic GA4 configuration', () => {
    const result = validateFixture({
      'docs/analytics.md': 'window.gtag("config", "G-AB12CD34EF");\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /GA4 measurement ID in analytics configuration/);
  });

  it('rejects a synthetic GA4 tag loader', () => {
    const result = validateFixture({
      'docs/loader.md': '<script src="https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4"></script>\n'
    });

    assert.equal(result.failures.length, 2);
    assert.ok(result.failures.some((failure) => /Google tag loader/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /GA4 measurement ID in tag loader/.test(failure.message)));
  });

  it('rejects a synthetic Meta Pixel init configuration', () => {
    const result = validateFixture({
      'docs/pixel.js': 'fbq("init", "123456789012345");\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Meta Pixel ID in fbq init/);
  });

  it('rejects a synthetic Google site verification meta tag', () => {
    const result = validateFixture({
      'src/index.html': '<meta name="google-site-verification" content="verification-token-live-123" />\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Google site verification token/);
  });

  it('does not reject unrelated long numbers outside tracking context', () => {
    const result = validateFixture({
      'docs/numbers.md': 'Reference number 123456789012345 should remain allowed in plain text.\n'
    });

    assert.deepEqual(result.failures, []);
  });

  it('allows placeholder and disabled public configuration', () => {
    const result = validateFixture({
      'src/js/ga.js': 'gtag("config", "G-PORTFOLIO000");\n',
      'src/js/fb.js': 'fbq("init", "PORTFOLIO_PIXEL_000000");\n',
      'src/index.html': '<meta name="google-site-verification" content="portfolio-placeholder" />\n',
      'src/home.html': '<meta name="facebook-domain-verification" content="portfolio-placeholder" />\n'
    });

    assert.deepEqual(result.failures, []);
  });

  it('keeps existing Google Analytics collect endpoint detection', () => {
    const result = validateFixture({
      'docs/collect.md': 'https://www.google-analytics.com/g/collect?v=2\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Google Analytics collect endpoint/);
  });

  it('keeps existing Facebook script loader detection', () => {
    const result = validateFixture({
      'docs/facebook-loader.md': '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Facebook Pixel script loader/);
  });

  it('keeps existing Facebook noscript pixel detection', () => {
    const result = validateFixture({
      'docs/facebook-noscript.html': '<img src="https://www.facebook.com/tr?id=1234567890&ev=PageView&noscript=1" />\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Facebook noscript pixel/);
  });

  it('keeps existing Facebook domain verification detection', () => {
    const result = validateFixture({
      'src/index.html': '<meta name="facebook-domain-verification" content="live-domain-token" />\n'
    });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Live Facebook domain verification token/);
  });

  it('does not export any exact identifier string list', async () => {
    const module = await import('./lib/public-safety-validator.mjs');
    const exactStringLists = Object.values(module).filter(
      (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    );
    assert.deepEqual(exactStringLists, []);
  });
});
