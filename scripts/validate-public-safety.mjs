import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

const forbiddenIds = [
  ['G', 'RP3M5GM5F2'].join('-'),
  ['787421', '167171883'].join(''),
  ['pa5ufv6powcuglb6', '9ku9elmdklx2ev'].join('')
];

const scanRoots = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'public'),
  path.join(projectRoot, 'README.md'),
  path.join(projectRoot, '.github', 'workflows')
];

const activeTrackingRules = [
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

/** @type {{ file: string, message: string }[]} */
const failures = [];

function walk(target) {
  if (!fs.existsSync(target)) return [];

  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  /** @type {string[]} */
  const files = [];

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    files.push(...walk(path.join(target, entry.name)));
  }

  return files;
}

function shouldScan(filePath) {
  return /\.(html|js|mjs|cjs|md|yml|yaml)$/i.test(filePath) || path.basename(filePath) === 'README.md';
}

function rel(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

for (const root of scanRoots) {
  for (const filePath of walk(root)) {
    if (!shouldScan(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');

    for (const id of forbiddenIds) {
      if (content.includes(id)) {
        failures.push({
          file: rel(filePath),
          message: `forbidden production identifier found: ${id}`
        });
      }
    }

    for (const rule of activeTrackingRules) {
      if (rule.regex.test(content)) {
        failures.push({
          file: rel(filePath),
          message: `active production tracking pattern found: ${rule.label}`
        });
      }
    }
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`❌ ${failure.file}: ${failure.message}`);
  }
  process.exit(1);
}

console.log('✅ Public-safety validation passed.');
