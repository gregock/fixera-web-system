import fs from 'fs';
import path from 'path';

const placeholderValues = new Set([
  '',
  'portfolio-placeholder',
  'disabled',
  'none',
  'not-configured',
  'placeholder',
  'replace-me',
  'todo'
]);

function isAllowedPlaceholder(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return placeholderValues.has(normalized) || normalized.startsWith('portfolio_');
}

function isRealLookingGa4MeasurementId(value) {
  return /^G-[A-Z0-9]{6,}$/i.test(value) && !/portfolio|placeholder|example|sample|test/i.test(value);
}

function isRealLookingPixelId(value) {
  return /^\d{8,20}$/.test(value);
}

function isRealLookingVerificationValue(value) {
  return Boolean(String(value || '').trim()) && !isAllowedPlaceholder(value);
}

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

export const contextualPublicSafetyRules = [
  {
    label: 'GA4 measurement ID in tag loader',
    findMatches(content) {
      const matches = content.matchAll(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]{6,})/gi);
      return [...matches]
        .map((match) => match[1])
        .filter((value) => isRealLookingGa4MeasurementId(value));
    }
  },
  {
    label: 'GA4 measurement ID in analytics configuration',
    findMatches(content) {
      const patterns = [
        /gtag\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]{6,})['"]/gi,
        /['"]measurement[_-]?id['"]\s*[:=]\s*['"](G-[A-Z0-9]{6,})['"]/gi,
        /\bmeasurementId\b\s*[:=]\s*['"](G-[A-Z0-9]{6,})['"]/gi
      ];

      return patterns.flatMap((regex) =>
        [...content.matchAll(regex)]
          .map((match) => match[1])
          .filter((value) => isRealLookingGa4MeasurementId(value))
      );
    }
  },
  {
    label: 'Meta Pixel ID in fbq init',
    findMatches(content) {
      const matches = content.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})['"]?/gi);
      return [...matches].map((match) => match[1]).filter((value) => isRealLookingPixelId(value));
    }
  },
  {
    label: 'Google site verification token',
    findMatches(content) {
      const matches = content.matchAll(/<meta[^>]+name=["']google-site-verification["'][^>]+content=["']([^"']*)["']/gi);
      return [...matches]
        .map((match) => match[1])
        .filter((value) => isRealLookingVerificationValue(value));
    }
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

      for (const rule of activeTrackingRules) {
        if (rule.regex.test(content)) {
          failures.push({
            file: toRelative(projectRoot, filePath),
            message: `active production tracking pattern found: ${rule.label}`
          });
        }
      }

      for (const rule of contextualPublicSafetyRules) {
        const matches = rule.findMatches(content);
        if (matches.length) {
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
