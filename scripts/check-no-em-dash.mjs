import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const TARGETS = ['src', 'docs', 'package.json'];
const NEEDLE = '—';
const TEXT_EXTENSIONS = new Set([
  '.html',
  '.md',
  '.json',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.txt',
  '.xml',
  '.webmanifest',
  '.svg',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function findMatches(filePath) {
  const text = readFileSync(filePath, 'utf8');
  if (!text.includes(NEEDLE)) return [];

  const lines = text.split(/\r?\n/);
  const matches = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(NEEDLE)) {
      matches.push({ line: i + 1, content: lines[i].trim() });
    }
  }

  return matches;
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const base = path.basename(filePath);
  if (base === 'robots.txt' || base === 'package.json') return true;
  return false;
}

const filesToScan = [];
for (const target of TARGETS) {
  if (statSync(target).isDirectory()) {
    filesToScan.push(...walk(target));
  } else {
    filesToScan.push(target);
  }
}

const violations = [];
for (const filePath of filesToScan) {
  if (!shouldScanFile(filePath)) continue;
  const matches = findMatches(filePath);
  if (matches.length > 0) {
    violations.push({ filePath, matches });
  }
}

if (violations.length > 0) {
  console.error('Found em dash characters (—) in scanned files:');
  for (const violation of violations) {
    for (const match of violation.matches) {
      console.error(`${violation.filePath}:${match.line}: ${match.content}`);
    }
  }
  process.exit(1);
}

console.log('No em dash characters found in src, docs, or package.json.');
