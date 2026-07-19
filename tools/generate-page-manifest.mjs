import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const output = path.resolve(process.argv[2] || 'reports/page-manifest.json');
const legacyAliasFiles = new Set([
  'projects/indexprojects.html',
  'projects/indexprojects.da.html',
  'blog/fix-common-home-issues.html',
  'blog/fix-common-home-issues.da.html',
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function isIndexable(sourceFile, html) {
  const rel = path.relative(srcDir, sourceFile).replaceAll(path.sep, '/');
  if (rel.startsWith('dev/')) return false;
  if (/^404(?:\.da)?\.html$/i.test(rel)) return false;
  if (/^ads(?:\.da)?\.html$/i.test(rel)) return false;
  if (legacyAliasFiles.has(rel)) return false;
  return !/<meta[^>]+name\s*=\s*["']robots["'][^>]+content\s*=\s*["'][^"']*\bnoindex\b/i.test(html);
}

function canonicalFromHtml(html, sourceFile) {
  const match = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (!match) throw new Error(`Missing canonical: ${path.relative(root, sourceFile)}`);
  return match[1];
}

function pageKeyFromCanonical(canonical) {
  const url = new URL(canonical);
  let pathname = url.pathname || '/';
  if (pathname !== '/') pathname = pathname.replace(/\/$/, '');
  return pathname || '/';
}

function sectionFromPageKey(pageKey) {
  const baseKey = pageKey.endsWith('.da') ? pageKey.slice(0, -3) : pageKey;
  if (baseKey === '/') return 'home';
  if (baseKey === '/contact') return 'contact';
  if (baseKey.startsWith('/services')) return 'services';
  if (baseKey.startsWith('/areas')) return 'areas';
  if (baseKey.startsWith('/projects')) return 'projects';
  if (baseKey.startsWith('/blog')) return 'blog';
  if (baseKey === '/about' || baseKey === '/gallery') return 'supporting';
  return 'unknown';
}

function languageFromPageKey(pageKey) {
  return pageKey === '/index.da' || pageKey.endsWith('.da') || pageKey.includes('.da/') ? 'da' : 'en';
}

const pages = [];
const seen = new Set();
for (const sourceFile of await walk(srcDir)) {
  const html = await fs.readFile(sourceFile, 'utf8');
  if (!isIndexable(sourceFile, html)) continue;
  const canonicalUrl = canonicalFromHtml(html, sourceFile);
  const pageKey = pageKeyFromCanonical(canonicalUrl);
  if (seen.has(pageKey)) throw new Error(`Duplicate canonical page key: ${pageKey}`);
  seen.add(pageKey);
  pages.push({
    page_key: pageKey,
    canonical_url: canonicalUrl,
    source_file: path.relative(srcDir, sourceFile).replaceAll(path.sep, '/'),
    status: 'active',
    section: sectionFromPageKey(pageKey),
    language: languageFromPageKey(pageKey),
  });
}

pages.sort((a, b) => a.page_key.localeCompare(b.page_key));
const manifest = {
  schema: 'service-business-web-page-manifest@1',
  source_system: 'service_business_web_source',
  generated_at: new Date().toISOString(),
  page_count: pages.length,
  pages,
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Web page manifest generated: ${pages.length} pages at ${output}`);
