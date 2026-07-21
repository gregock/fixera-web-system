import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getTrackedMarkdownFiles, validatePublicDocs } from './lib/public-docs-validator.mjs';

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

function createTempRepo() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fixera-public-docs-'));
  tempRoots.push(root);
  return root;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

describe('validatePublicDocs', () => {
  it('passes on the committed repository Markdown set', () => {
    const projectRoot = process.cwd();
    const trackedMarkdownFiles = getTrackedMarkdownFiles(projectRoot);
    const result = validatePublicDocs({ projectRoot, trackedMarkdownFiles });
    assert.equal(result.failures.length, 0);
    assert.ok(result.checkedFiles > 0);
  });

  it('accepts a valid relative file link', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Guide](docs/guide.md)\n');
    write(root, 'docs/guide.md', '# Guide\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.deepEqual(result.failures, []);
  });

  it('accepts a valid relative directory link', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Docs](docs/)\n');
    mkdirSync(path.join(root, 'docs'), { recursive: true });

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.deepEqual(result.failures, []);
  });

  it('fails on a broken internal link', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Missing](docs/missing.md)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].reason, /does not exist/);
  });

  it('fails on a macOS local filesystem path', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Bad](/Users/example/file.md)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].reason, /local filesystem path/);
  });

  it('fails on a file URI', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Bad](file:///Users/example/file.md)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].reason, /filesystem URI/);
  });

  it('fails on a Windows drive path', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Bad](C:/temp/file.md)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].reason, /Windows local filesystem path/);
  });

  it('ignores external HTTPS links', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Site](https://example.com/docs)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.deepEqual(result.failures, []);
  });

  it('ignores fragment-only links', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Section](#validation)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.deepEqual(result.failures, []);
  });

  it('ignores path-like values inside fenced code blocks', () => {
    const root = createTempRepo();
    const readme = write(
      root,
      'README.md',
      ['```md', '[Example](/Users/example/file.md)', '```', '', '[Guide](docs/guide.md)'].join('\n')
    );
    write(root, 'docs/guide.md', '# Guide\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.deepEqual(result.failures, []);
  });

  it('reports git ls-files failures clearly', () => {
    assert.throws(
      () => getTrackedMarkdownFiles(process.cwd(), () => {
        throw new Error('spawn git ENOENT');
      }),
      /Failed to list tracked Markdown files via git ls-files: spawn git ENOENT/
    );
  });

  it('rejects links that escape the repository', () => {
    const root = createTempRepo();
    const readme = write(root, 'README.md', '[Escape](../outside.md)\n');

    const result = validatePublicDocs({ projectRoot: root, trackedMarkdownFiles: [readme] });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].reason, /escapes the repository/);
  });

  it('allows tracked Markdown discovery through git ls-files', () => {
    const root = createTempRepo();
    write(root, 'README.md', '# Root\n');
    write(root, 'docs/guide.md', '# Guide\n');
    execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['add', 'README.md', 'docs/guide.md'], { cwd: root, stdio: 'ignore' });

    const tracked = getTrackedMarkdownFiles(root);
    assert.deepEqual(
      tracked.map((entry) => path.relative(root, entry).replace(/\\/g, '/')).sort(),
      ['README.md', 'docs/guide.md']
    );
  });
});
