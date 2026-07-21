import fs from 'fs';
import path from 'path';

export const forbiddenIds = [
  ['G', 'RP3M5GM5F2'].join('-'),
  ['787421', '167171883'].join(''),
  ['pa5ufv6powcuglb6', '9ku9elmdklx2ev'].join('')
];

export const activeTrackingRules = [
  {
    label: 'Google tag loader',
    regex: /googletagmanager\.com\/gtag\/js\?id=/i
  },
  {
    label: 'Google Analytics collect endpoint',
    regex: /google-analytics\.com\/g\/collect/i
  },
  {
    label: 'Facebook Pixel script loader',
    regex: /connect\.facebook\.net\/.*fbevents\.js/i
  },
  {
    label: 'Facebook noscript pixel',
    regex: /facebook\.com\/tr\?id=/i
  },
  {
    label: 'Live Facebook domain verification token',
    regex: /<meta[^>]+name=["']facebook-domain-verification["'][^>]+content=["'](?!portfolio-placeholder)[^"']+/i
  }
];

export function getDefaultScanRoots(projectRoot) {
  return [
    path.join(projectRoot, 'src'),
    path.join(projectRoot, 'public'),
    path.join(projectRoot, 'docs'),
    path.join(projectRoot, 'README.md'),
    path.join(projectRoot, 'case-study.md'),
    path.join(projectRoot, '.github', 'workflows')
  ];
}

export function shouldScanPublicSafetyFile(filePath) {
  return /\.(html|js|mjs|cjs|md|yml|yaml)$/i.test(filePath) || path.basename(filePath) === 'README.md';
}

function walk(target, exclusions, existsSync, statSync, readdirSync) {
  if (!existsSync(target)) return [];

  const stat = statSync(target);
  if (stat.isFile()) return [target];

  /** @type {string[]} */
  const files = [];

  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (exclusions.has(entry.name)) continue;
    files.push(...walk(path.join(target, entry.name), exclusions, existsSync, statSync, readdirSync));
  }

  return files;
}

function toRelative(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

export function validatePublicSafety({
  projectRoot = process.cwd(),
  scanRoots = getDefaultScanRoots(projectRoot),
  existsSync = fs.existsSync,
  statSync = fs.statSync,
  readdirSync = fs.readdirSync,
  readFileSync = fs.readFileSync
} = {}) {
  const exclusions = new Set(['.git', 'node_modules']);
  /** @type {{ file: string, message: string }[]} */
  const failures = [];
  let checkedFiles = 0;

  for (const root of scanRoots) {
    for (const filePath of walk(root, exclusions, existsSync, statSync, readdirSync)) {
      if (!shouldScanPublicSafetyFile(filePath)) continue;

      checkedFiles += 1;
      const content = readFileSync(filePath, 'utf8');

      for (const id of forbiddenIds) {
        if (content.includes(id)) {
          failures.push({
            file: toRelative(projectRoot, filePath),
            message: `forbidden production identifier found: ${id}`
          });
        }
      }

      for (const rule of activeTrackingRules) {
        if (rule.regex.test(content)) {
          failures.push({
            file: toRelative(projectRoot, filePath),
            message: `active production tracking pattern found: ${rule.label}`
          });
        }
      }
    }
  }

  return { failures, checkedFiles };
}
