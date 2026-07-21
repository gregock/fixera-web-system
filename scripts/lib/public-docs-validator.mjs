import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const FENCE_PATTERN = /^(```|~~~)/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*]\(([^)]+)\)/g;
const EXTERNAL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:[\\/]/;

function stripQueryAndFragment(destination) {
  const hashIndex = destination.indexOf('#');
  const queryIndex = destination.indexOf('?');
  const cutIndex =
    hashIndex === -1 ? queryIndex : queryIndex === -1 ? hashIndex : Math.min(hashIndex, queryIndex);

  return cutIndex === -1 ? destination : destination.slice(0, cutIndex);
}

function extractDestination(rawTarget) {
  const trimmed = rawTarget.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('<')) {
    const closing = trimmed.indexOf('>');
    if (closing !== -1) {
      return trimmed.slice(1, closing).trim();
    }
  }

  const titleSeparator = trimmed.search(/\s(?=["'(])/);
  return titleSeparator === -1 ? trimmed : trimmed.slice(0, titleSeparator).trim();
}

function normalizeForFs(target) {
  return target.replace(/[\\/]+/g, path.sep);
}

export function getTrackedMarkdownFiles(projectRoot, execGitLsFiles = defaultExecGitLsFiles) {
  let output;

  try {
    output = execGitLsFiles(projectRoot);
  } catch (error) {
    const detail = error && typeof error.message === 'string' ? error.message : String(error);
    throw new Error(`Failed to list tracked Markdown files via git ls-files: ${detail}`);
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((relativePath) => path.resolve(projectRoot, relativePath));
}

function defaultExecGitLsFiles(projectRoot) {
  return execFileSync('git', ['ls-files', '--', '*.md'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

export function validatePublicDocs({
  projectRoot = process.cwd(),
  trackedMarkdownFiles = getTrackedMarkdownFiles(projectRoot),
  existsSync = fs.existsSync,
  statSync = fs.statSync,
  readFileSync = fs.readFileSync
} = {}) {
  /** @type {{ file: string, line: number, destination: string, reason: string }[]} */
  const failures = [];

  for (const filePath of trackedMarkdownFiles) {
    const relativeFile = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let inFence = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (FENCE_PATTERN.test(line.trim())) {
        inFence = !inFence;
        continue;
      }

      if (inFence) continue;

      for (const match of line.matchAll(MARKDOWN_LINK_PATTERN)) {
        const destination = extractDestination(match[1] || '');
        if (!destination) continue;
        if (destination.startsWith('#')) continue;
        if (/^(?:mailto|tel|sms|data|javascript):/i.test(destination)) continue;

        if (/^file:/i.test(destination)) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'local filesystem URI is not allowed'
          });
          continue;
        }

        if (WINDOWS_DRIVE_PATTERN.test(destination)) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'Windows local filesystem path is not allowed'
          });
          continue;
        }

        if (/^(\/Users\/|\/home\/|\/tmp\/|\/private\/tmp\/)/.test(destination)) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'local filesystem path is not allowed'
          });
          continue;
        }

        if (EXTERNAL_SCHEME_PATTERN.test(destination)) continue;
        if (path.isAbsolute(destination)) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'absolute paths are not allowed'
          });
          continue;
        }

        const sanitized = stripQueryAndFragment(destination);
        const resolvedPath = path.resolve(path.dirname(filePath), normalizeForFs(sanitized));
        const relativeResolved = path.relative(projectRoot, resolvedPath);
        const escapesRepo =
          relativeResolved === '' ? false : relativeResolved.startsWith('..') || path.isAbsolute(relativeResolved);

        if (escapesRepo) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'link escapes the repository'
          });
          continue;
        }

        if (!existsSync(resolvedPath)) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'target does not exist'
          });
          continue;
        }

        const stat = statSync(resolvedPath);
        if (!stat.isFile() && !stat.isDirectory()) {
          failures.push({
            file: relativeFile,
            line: index + 1,
            destination,
            reason: 'target is not a file or directory'
          });
        }
      }
    }
  }

  return {
    failures,
    checkedFiles: trackedMarkdownFiles.length
  };
}
