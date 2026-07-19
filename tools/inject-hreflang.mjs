import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const BASE_URL = 'https://northstar-services.example';

function filePathToPublicUrl(relativePath) {
  const rel = relativePath.replace(/\\/g, '/');

  if (rel === 'index.html') return `${BASE_URL}/`;
  if (rel === 'index.da.html') return `${BASE_URL}/index.da`;

  // Special cases for projects hub
  if (rel === 'projects/index.html') return `${BASE_URL}/projects`;
  if (rel === 'projects/index.da.html') return `${BASE_URL}/projects.da`;

  if (rel.endsWith('/index.html')) {
    return `${BASE_URL}/${rel.slice(0, -'/index.html'.length)}/`;
  }

  if (rel.endsWith('/index.da.html')) {
    return `${BASE_URL}/${rel.replace('/index.da.html', '.da')}`;
  }

  if (rel.endsWith('.da.html')) {
    return `${BASE_URL}/${rel.replace('.da.html', '.da')}`;
  }

  if (rel.endsWith('.html')) {
    const cleaned = rel.replace('.html', '');
    return `${BASE_URL}/${cleaned}`;
  }

  return `${BASE_URL}/${rel}`;
}

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function buildUrls(filePath) {
  const relative = path.relative(publicDir, filePath).replace(/\\/g, '/');
  const isDanish = relative.endsWith('.da.html');

  const enPath = isDanish
    ? relative.replace('.da.html', '.html')
    : relative;

  const daPath = isDanish
    ? relative
    : relative.replace('.html', '.da.html');

  const enExists = fs.existsSync(path.join(publicDir, enPath));
  const daExists = fs.existsSync(path.join(publicDir, daPath));

  return {
    en: enExists ? filePathToPublicUrl(enPath) : null,
    da: daExists ? filePathToPublicUrl(daPath) : null
  };
}

walk(publicDir, file => {
  if (!file.endsWith('.html')) return;
  if (file.includes(`${path.sep}dev${path.sep}`)) return;
  if (file.replace(/\\/g, '/').includes('/dev/')) return;
  const relative = path.relative(publicDir, file).replace(/\\/g, '/');
  if (relative === 'projects/indexprojects.html' || relative === 'projects/indexprojects.da.html') return;

  let content = fs.readFileSync(file, 'utf8');
  const isNoindex = /<meta[^>]+name\s*=\s*["']robots["'][^>]+content\s*=\s*["'][^"']*noindex/i.test(content);
  if (isNoindex) return;

  content = content.replace(
    /^\s*https:\/\/northstar\.net\/[^\s<]+\s*(?:\r?\n\s*)?\/>\s*$/gim,
    ''
  );

  content = content.replace(
    /<link[^>]+hreflang\s*=\s*["']?(en|da)["']?[^>]*>\s*/gi,
    ''
  );

  content = content.replace(
    /<meta[^>]+property\s*=\s*["']?og:url["']?[^>]*>\s*/gi,
    ''
  );

  const canonicalMatch = content.match(
    /<link[^>]+rel\s*=\s*["']?canonical["']?[^>]+href\s*=\s*["']?([^"'>\s]+)["']?/i
  );

  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : null;
  const { en, da } = buildUrls(file);

  let hreflangBlock = '';

  if (en) {
    hreflangBlock += `<link rel="alternate" hreflang="en" href="${en}" />\n`;
  }

  if (da) {
    hreflangBlock += `<link rel="alternate" hreflang="da" href="${da}" />\n`;
  }

  const ogUrlBlock = canonicalUrl
    ? `<meta property="og:url" content="${canonicalUrl}" />\n`
    : '';

  content = content.replace(
    /<\/head>/i,
    `${hreflangBlock}${ogUrlBlock}</head>`
  );

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Hreflang injection complete.');
