import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');
const baseUrl = 'https://fixera.net';
const legacyAliasFiles = new Set([
  'projects/indexprojects.html',
  'projects/indexprojects.da.html',
  'blog/fix-common-home-issues.html',
  'blog/fix-common-home-issues.da.html'
]);

function walkHtml(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkHtml(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function read(relPath) {
  return fs.readFileSync(path.join(srcDir, relPath), 'utf8');
}

function isIndexableHtml(relPath, content) {
  if (relPath.startsWith('dev/')) {
    return false;
  }

  if (/^404(?:\.da)?\.html$/i.test(relPath)) {
    return false;
  }

  if (/^ads(?:\.da)?\.html$/i.test(relPath)) {
    return false;
  }

  if (legacyAliasFiles.has(relPath)) {
    return false;
  }

  return !/<meta[^>]+name\s*=\s*["']robots["'][^>]+content\s*=\s*["'][^"']*\bnoindex\b/i.test(content);
}

function filePathToUrl(relPath) {
  // Root
  if (relPath === 'index.html') {
    return `${baseUrl}/`;
  }

  // Root DA
  if (relPath === 'index.da.html') {
    return `${baseUrl}/index.da`;
  }

  // Projects hub
  if (relPath === 'projects/index.html') {
    return `${baseUrl}/projects`;
  }

  if (relPath === 'projects/index.da.html') {
    return `${baseUrl}/projects.da`;
  }

  // Nested index
  if (relPath.endsWith('/index.html')) {
    return `${baseUrl}/${relPath.slice(0, -'index.html'.length)}`;
  }

  if (relPath.endsWith('/index.da.html')) {
    return `${baseUrl}/${relPath.replace('/index.da.html', '.da')}`;
  }

  // Remove .html but preserve .da
  if (relPath.endsWith('.da.html')) {
    return `${baseUrl}/${relPath.replace('.da.html', '.da')}`;
  }

  if (relPath.endsWith('.html')) {
    return `${baseUrl}/${relPath.replace('.html', '')}`;
  }

  return `${baseUrl}/${relPath}`;
}

function inferMeta(relPath) {
  if (relPath === 'index.html' || relPath === 'index.da.html') {
    return { changefreq: 'weekly', priority: '1.0' };
  }

  if (
    relPath === 'about.html' ||
    relPath === 'about.da.html' ||
    relPath === 'services.html' ||
    relPath === 'services.da.html'
  ) {
    return { changefreq: 'weekly', priority: '0.8' };
  }

  if (
    relPath === 'gallery.html' ||
    relPath === 'gallery.da.html' ||
    relPath === 'contact.html' ||
    relPath === 'contact.da.html' ||
    relPath.startsWith('areas/') ||
    relPath.startsWith('services/lamp-installation-copenhagen') ||
    relPath.startsWith('services/shelf-installation-copenhagen') ||
    relPath.startsWith('services/tv-mounting-copenhagen') ||
    relPath.startsWith('services/ikea-furniture-assembly-copenhagen')
  ) {
    return { changefreq: 'weekly', priority: '0.7' };
  }

  if (
    relPath.startsWith('services/') ||
    relPath === 'blog/index.html' ||
    relPath === 'blog/index.da.html'
  ) {
    return { changefreq: 'weekly', priority: '0.6' };
  }

  if (relPath.startsWith('projects/')) {
    return { changefreq: 'monthly', priority: '0.6' };
  }

  if (
    relPath === 'blog/how-much-does-a-handyman-cost-in-copenhagen.html' ||
    relPath === 'blog/how-much-does-a-handyman-cost-in-copenhagen.da.html'
  ) {
    return { changefreq: 'weekly', priority: '0.7' };
  }

  if (relPath.startsWith('blog/')) {
    return { changefreq: 'monthly', priority: '0.5' };
  }

  return { changefreq: 'weekly', priority: '0.6' };
}

function getLastModified(relPath) {
  const fullPath = path.join(srcDir, relPath);

  try {
    const output = execSync(`git log -1 --format="%cI" -- "${fullPath}"`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    return output || null;
  } catch {
    return null;
  }
}

function buildSitemapXml(relPaths) {
  const urlEntries = relPaths.map(relPath => {
    const { changefreq, priority } = inferMeta(relPath);
    const loc = filePathToUrl(relPath);
    const lastmod = getLastModified(relPath);
    const lines = [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`
    ];

    if (lastmod) {
      lines.push(`    <lastmod>${lastmod}</lastmod>`);
    }

    lines.push('  </url>');
    return lines.join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
    ''
  ].join('\n');
}

if (!fs.existsSync(srcDir)) {
  console.error(`[SITEMAP] Missing src directory: ${srcDir}`);
  process.exit(1);
}

const relPaths = [];
const seenUrls = new Set();

for (const filePath of walkHtml(srcDir)) {
  const relPath = path.relative(srcDir, filePath).replace(/\\/g, '/');
  const content = read(relPath);

  if (!isIndexableHtml(relPath, content)) {
    continue;
  }

  const url = filePathToUrl(relPath);
  if (seenUrls.has(url)) {
    continue;
  }

  seenUrls.add(url);
  relPaths.push(relPath);
}

relPaths.sort((a, b) => filePathToUrl(a).localeCompare(filePathToUrl(b)));

const xml = buildSitemapXml(relPaths);
fs.writeFileSync(sitemapPath, xml, 'utf8');

console.log(`[SITEMAP] Generated ${relPaths.length} URLs at ${sitemapPath}`);
