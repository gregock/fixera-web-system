import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const publicDir = path.join(projectRoot, 'public');

/** @typedef {{ name: string, regex: RegExp, message: string, allow?: (filePath: string, match: string) => boolean }} Rule */

/** @param {string} dir */
function walkHtml(dir) {
  /** @type {string[]} */
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkHtml(fullPath));
      continue;
    }

    if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

/** @param {string} dir */
function walkJs(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkJs(fullPath));
      continue;
    }

    if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/** @param {string} filePath */
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/** @param {string} filePath */
function rel(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

/** @param {string} content @param {RegExp} regex */
function collectMatches(content, regex) {
  const matches = [];
  const local = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = local.exec(content)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

/** @type {Rule[]} */
const srcRules = [
  {
    name: 'canonical-html',
    regex: /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+\.html["'][^>]*>/i,
    message: 'canonical must use clean public URLs'
  },
  {
    name: 'hreflang-html',
    regex: /<link[^>]+hreflang=["'](?:en|da)["'][^>]+href=["'][^"']+\.html["'][^>]*>/i,
    message: 'hreflang must use clean public URLs'
  },
  {
    name: 'og-url-html',
    regex: /<meta[^>]+property=["']og:url["'][^>]+content=["'][^"']+\.html["'][^>]*>/i,
    message: 'og:url must use clean public URLs'
  },
  {
    name: 'jsonld-html-url',
    regex: /https:\/\/northstar\.net\/[^"\s]+\.html/,
    message: 'JSON-LD or embedded public URLs must not use .html',
    allow: (filePath, match) => rel(filePath) === 'src/sitemap.xml' && match.startsWith('https://northstar-services.example/')
  },
  {
    name: 'data-lang-en-html',
    regex: /data-lang-en=["']\/[^"']+\.html["']/,
    message: 'data-lang-en must use clean EN URLs'
  },
  {
    name: 'data-lang-da-html',
    regex: /data-lang-da=["']\/[^"']+\.da\.html["']/,
    message: 'data-lang-da must use clean DA URLs'
  },
  {
    name: 'invalid-domain',
    regex: /https:\/\/northstar\.net\.da/,
    message: 'invalid domain variant detected'
  },
  {
    name: 'projects-hub-public-identity',
    regex: /https:\/\/northstar\.net\/projects\/indexprojects(?:\.da)?(?:\.html)?/,
    message: 'projects hub public identity must be /projects or /projects.da'
  },
  {
    name: 'projects-hub-data-lang',
    regex: /data-lang-(?:en|da)=["']\/projects\/indexprojects(?:\.da)?(?:\.html)?["']/,
    message: 'projects hub language switcher must use /projects or /projects.da'
  }
];

/** @type {Rule[]} */
const publicRules = [
  {
    name: 'canonical-html',
    regex: /<link[^>]+rel=canonical[^>]+href=https:\/\/northstar\.net\/[^\s>]+\.html[^>]*>/i,
    message: 'generated canonical must use clean public URLs'
  },
  {
    name: 'hreflang-html',
    regex: /<link[^>]+hreflang=(?:en|da)[^>]+href=https:\/\/northstar\.net\/[^\s>]+\.html[^>]*>/i,
    message: 'generated hreflang must use clean public URLs'
  },
  {
    name: 'og-url-html',
    regex: /<meta[^>]+property=og:url[^>]+content=https:\/\/northstar\.net\/[^\s>]+\.html[^>]*>/i,
    message: 'generated og:url must use clean public URLs'
  },
  {
    name: 'jsonld-html-url',
    regex: /https:\/\/northstar\.net\/[^"\s]+\.html/,
    message: 'generated JSON-LD or embedded public URLs must not use .html'
  },
  {
    name: 'data-lang-en-html',
    regex: /data-lang-en=["']\/[^"']+\.html["']/,
    message: 'generated data-lang-en must use clean EN URLs'
  },
  {
    name: 'data-lang-da-html',
    regex: /data-lang-da=["']\/[^"']+\.da\.html["']/,
    message: 'generated data-lang-da must use clean DA URLs'
  },
  {
    name: 'invalid-domain',
    regex: /https:\/\/northstar\.net\.da/,
    message: 'invalid generated domain variant detected'
  },
  {
    name: 'projects-hub-public-identity',
    regex: /https:\/\/northstar\.net\/projects\/indexprojects(?:\.da)?(?:\.html)?/,
    message: 'generated projects hub public identity must be /projects or /projects.da'
  },
  {
    name: 'projects-hub-data-lang',
    regex: /data-lang-(?:en|da)=["']\/projects\/indexprojects(?:\.da)?(?:\.html)?["']/,
    message: 'generated projects hub language switcher must use /projects or /projects.da'
  }
];

/** @type {Rule[]} */
const jsRules = [
  {
    name: 'runtime-index-da-html',
    regex: /\/index\.da\.html/,
    message: 'runtime must not reference /index.da.html'
  },
  {
    name: 'runtime-contact-html',
    regex: /\/contact\.html/,
    message: 'runtime must not reference /contact.html'
  },
  {
    name: 'runtime-contact-da-html',
    regex: /\/contact\.da\.html/,
    message: 'runtime must not reference /contact.da.html'
  },
  {
    name: 'runtime-projects-index',
    regex: /\/projects\/indexprojects(?:\.da)?(?:\.html)?/,
    message: 'runtime must not reference projects indexprojects paths'
  },
  {
    name: 'runtime-absolute-html',
    regex: /https:\/\/northstar\.net\/[^"'\s]+\.html/,
    message: 'runtime must not use .html public URLs'
  }
];

/** @param {string[]} files @param {Rule[]} rules */
function runChecks(files, rules) {
  /** @type {{ file: string, rule: string, message: string, matches: string[] }[]} */
  const failures = [];

  for (const filePath of files) {
    const content = read(filePath);

    for (const rule of rules) {
      const rawMatches = collectMatches(content, rule.regex);
      const matches = rule.allow
        ? rawMatches.filter((match) => !rule.allow(filePath, match))
        : rawMatches;

      if (matches.length > 0) {
        failures.push({
          file: rel(filePath),
          rule: rule.name,
          message: rule.message,
          matches: matches.slice(0, 5)
        });
      }
    }
  }

  return failures;
}

const srcFiles = walkHtml(srcDir);
const publicFiles = walkHtml(publicDir);
const srcJsFiles = walkJs(path.join(srcDir, 'js'));
const publicJsFiles = walkJs(path.join(publicDir, 'js'));

const failures = [
  ...runChecks(srcFiles, srcRules),
  ...runChecks(publicFiles, publicRules),
  ...runChecks(srcJsFiles, jsRules),
  ...runChecks(publicJsFiles, jsRules)
];

if (failures.length > 0) {
  console.error('[CLEAN-URL-CHECK] Failed.');
  for (const failure of failures) {
    console.error(`\n- ${failure.file}`);
    console.error(`  Rule: ${failure.rule}`);
    console.error(`  Problem: ${failure.message}`);
    for (const match of failure.matches) {
      console.error(`  Match: ${match}`);
    }
  }
  process.exit(1);
}

console.log('[CLEAN-URL-CHECK] Passed.');