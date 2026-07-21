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

describe('validatePublicSafety', () => {
  it('includes documentation in the scan surface', () => {
    const root = createTempProject();
    const forbiddenId = ['G', 'RP3M5GM5F2'].join('-');

    write(root, 'docs/reference/leak.md', `tracking id: ${forbiddenId}\n`);
    const result = validatePublicSafety({ projectRoot: root });

    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].file, 'docs/reference/leak.md');
  });

  it('fails on a synthetic forbidden identifier in documentation', () => {
    const root = createTempProject();
    const forbiddenId = ['787421', '167171883'].join('');

    write(root, 'docs/leak.md', `id=${forbiddenId}\n`);
    const result = validatePublicSafety({ projectRoot: root });

    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /forbidden production identifier/);
  });

  it('fails on a synthetic active tracking loader in documentation', () => {
    const root = createTempProject();
    write(root, 'docs/loader.md', '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"></script>\n');

    const result = validatePublicSafety({ projectRoot: root });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /Google tag loader/);
  });

  it('passes on public-safe documentation', () => {
    const root = createTempProject();
    write(root, 'README.md', '# Public-safe repo\n');
    write(root, 'docs/notes.md', 'Public-safe documentation only.\n');

    const result = validatePublicSafety({ projectRoot: root });
    assert.deepEqual(result.failures, []);
    assert.ok(result.checkedFiles >= 2);
  });
});
