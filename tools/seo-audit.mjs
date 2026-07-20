import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const BASE_URL = 'https://fixera.net';

let hasError = false;
const titleMap = new Map();
const report = [];

function fail(message) {
  console.error('❌', message);
  hasError = true;
  return message;
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

function extractTag(regex, content) {
  const match = content.match(regex);
  return match ? match[1] : null;
}

function filePathToUrl(relative) {
  const rel = relative.replace(/\\/g, '/');

  // Root
  if (rel === 'index.html') return `${BASE_URL}/`;
  if (rel === 'index.da.html') return `${BASE_URL}/index.da`;

  // Projects hub
  if (rel === 'projects/index.html') return `${BASE_URL}/projects`;
  if (rel === 'projects/index.da.html') return `${BASE_URL}/projects.da`;

  // Nested EN index
  if (rel.endsWith('/index.html')) {
    return `${BASE_URL}/${rel.slice(0, -'/index.html'.length)}/`;
  }

  // Nested DA index
  if (rel.endsWith('/index.da.html')) {
    return `${BASE_URL}/${rel.replace('/index.da.html', '.da')}`;
  }

  // DA pages
  if (rel.endsWith('.da.html')) {
    return `${BASE_URL}/${rel.replace('.da.html', '.da')}`;
  }

  // EN pages
  if (rel.endsWith('.html')) {
    return `${BASE_URL}/${rel.replace('.html', '')}`;
  }

  return `${BASE_URL}/${rel}`;
}

walk(publicDir, file => {
  if (!file.endsWith('.html')) return;

  const relative = path.relative(publicDir, file).replace(/\\/g, '/');
  if (relative.startsWith('dev/')) return;

  const content = fs.readFileSync(file, 'utf8');
  const expectedUrl = filePathToUrl(relative);

  const pageReport = { file, issues: [] };
  const robots = extractTag(/<meta[^>]+name\s*=\s*["']?robots["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i, content);
  const isNoindex = robots ? /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots) : false;
  const metaRefresh = extractTag(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i, content);
  const isLegacyRedirectPage = Boolean(
    (metaRefresh && /\burl\s*=/i.test(metaRefresh)) ||
      relative === 'projects/indexprojects.html' ||
      relative === 'projects/indexprojects.da.html'
  );

  // Legacy redirect pages are non-indexable transition URLs:
  // only enforce canonical presence and that it points away from the legacy URL.
  if (isLegacyRedirectPage) {
    const canonical = extractTag(/<link[^>]+rel\s*=\s*["']?canonical["']?[^>]+href\s*=\s*["']?([^"'>\s]+)["']?/i, content);
    if (!canonical) {
      pageReport.issues.push(fail(`Missing canonical in legacy redirect page ${file}`, file));
    } else if (canonical === expectedUrl) {
      pageReport.issues.push(
        fail(`Legacy redirect page canonical must point to a different URL in ${file}`, file)
      );
    }
    report.push(pageReport);
    return;
  }

  // TITLE
  const title = extractTag(/<title>(.*?)<\/title>/i, content);
  if (title) {
    if (titleMap.has(title)) {
      pageReport.issues.push(fail(`Duplicate <title>: "${title}" in ${file} and ${titleMap.get(title)}`, file));
    } else {
      titleMap.set(title, file);
    }
    if (!isNoindex) {
      if (title.length < 30) pageReport.issues.push(fail(`Title too short (${title.length} chars) in ${file}`, file));
      if (title.length > 60) pageReport.issues.push(fail(`Title too long (${title.length} chars) in ${file}`, file));
    }
  } else {
    pageReport.issues.push(fail(`Missing <title> in ${file}`, file));
  }

  // META DESCRIPTION
  if (!isNoindex) {
    const description = extractTag(/<meta[^>]+name\s*=\s*["']?description["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i, content);
    if (description) {
      if (description.length < 50) pageReport.issues.push(fail(`Description too short (${description.length} chars) in ${file}`, file));
      if (description.length > 180) pageReport.issues.push(fail(`Description too long (${description.length} chars) in ${file}`, file));
    } else {
      pageReport.issues.push(fail(`Missing meta description in ${file}`, file));
    }
  }

  // CANONICAL
  const canonical = extractTag(/<link[^>]+rel\s*=\s*["']?canonical["']?[^>]+href\s*=\s*["']?([^"'>\s]+)["']?/i, content);
  if (canonical) {
    if (!isNoindex && canonical !== expectedUrl) {
      pageReport.issues.push(fail(`Canonical mismatch: expected ${expectedUrl}, found ${canonical}`, file));
    }
  } else {
    pageReport.issues.push(fail(`Missing canonical in ${file}`, file));
  }

  // OG TITLE
  const ogTitle = extractTag(/<meta[^>]+property\s*=\s*["']?og:title["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i, content);
  if (ogTitle && title && ogTitle !== title) {
    pageReport.issues.push(fail(`OG:title mismatch in ${file}`, file));
  }

  // OG URL
  const ogUrl = extractTag(/<meta[^>]+property\s*=\s*["']?og:url["']?[^>]+content\s*=\s*["']?([^"'>\s]+)["']?/i, content);
  if (ogUrl && canonical && ogUrl !== canonical) {
    pageReport.issues.push(fail(`OG:url mismatch in ${file}`, file));
  }

  // HREFLANG EN/DA
  const hasEn = /hreflang\s*=\s*["']?en["']?/i.test(content);
  const hasDa = /hreflang\s*=\s*["']?da["']?/i.test(content);

  if (!hasEn || !hasDa) {
    pageReport.issues.push(fail(`Missing hreflang EN or DA in ${file}`, file));
  }

  // X-DEFAULT prohibido
  if (content.includes('hreflang="x-default"')) {
    pageReport.issues.push(fail(`x-default hreflang found in ${file}`, file));
  }

  report.push(pageReport);
});

// Generar Markdown report
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
const mdReport = report.map(r => {
  return `### ${r.file}\n${r.issues.length > 0 ? r.issues.map(i => `- ${i}`).join('\n') : '- ✅ All checks passed'}\n`;
}).join('\n');
fs.writeFileSync(path.join(reportDir, 'seo_audit_report.md'), mdReport);

if (hasError) {
  console.error('\nSEO audit failed. See reports/seo_audit_report.md for details.');
  process.exit(1);
} else {
  console.log('✅ SEO audit passed. See reports/seo_audit_report.md for details.');
}
