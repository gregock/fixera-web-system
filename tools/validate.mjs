import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const srcDir = path.join(projectRoot, 'src');

let hasError = false;

function fail(message) {
  console.error(`❌ VALIDATION ERROR: ${message}`);
  hasError = true;
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

function publicUrlPathToFilePath(pathname) {
  if (pathname === '/' || pathname === '') {
    return path.join(publicDir, 'index.html');
  }

  if (pathname === '/index.da') {
    return path.join(publicDir, 'index.da.html');
  }

  if (pathname === '/projects/' || pathname === '/projects') {
    return path.join(publicDir, 'projects', 'index.html');
  }

  if (pathname === '/projects.da') {
    return path.join(publicDir, 'projects', 'index.da.html');
  }

  if (pathname.endsWith('/')) {
    return path.join(publicDir, pathname.slice(1), 'index.html');
  }

  if (pathname.endsWith('.da')) {
    const flatCandidate = path.join(publicDir, `${pathname.slice(1)}.html`);
    if (fs.existsSync(flatCandidate)) {
      return flatCandidate;
    }

    const dirCandidate = path.join(publicDir, pathname.slice(1, -3), 'index.da.html');
    return dirCandidate;
  }

  const flatCandidate = path.join(publicDir, `${pathname.slice(1)}.html`);
  if (fs.existsSync(flatCandidate)) {
    return flatCandidate;
  }

  return path.join(publicDir, pathname.slice(1), 'index.html');
}

// 1️⃣ Detect forbidden /da/
walk(srcDir, file => {
  if (file.endsWith('.html')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('/da/')) {
      fail(`Forbidden /da/ path found in ${file}`);
    }
  }
});

// 2️⃣ Validate sitemap URLs exist in public
const sitemapPath = path.join(publicDir, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const matches = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)];

  matches.forEach(match => {
    const url = match[1];
    const pathname = url.replace('https://fixera.net', '');

    const filePath = publicUrlPathToFilePath(pathname);

    if (!fs.existsSync(filePath)) {
      fail(`Sitemap URL does not exist in public/: ${pathname}`);
    }
  });
} else {
  fail('Missing generated sitemap in public/sitemap.xml');
}

// 3️⃣ Basic SEO validation on generated public HTML
walk(publicDir, file => {
  if (file.endsWith('.html')) {
    const relative = path.relative(publicDir, file).replace(/\\/g, '/');
    if (relative.startsWith('dev/')) return;

    const content = fs.readFileSync(file, 'utf8');

    const robotsMatch = content.match(/<meta[^>]+name\s*=\s*["']?robots["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i);
    const robots = robotsMatch ? robotsMatch[1] : '';
    const isNoindex = /(?:^|[\s,])noindex(?:$|[\s,])/i.test(robots);
    const metaRefreshMatch = content.match(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["']?([^"'>]+)["']?/i);
    const isLegacyRedirectPage = Boolean(metaRefreshMatch && /\burl\s*=/i.test(metaRefreshMatch[1]));

    // 🚫 Forbid x-default hreflang
    if (content.includes('hreflang="x-default"')) {
      fail(`Forbidden hreflang="x-default" found in ${file}`);
    }

    if (isLegacyRedirectPage) {
      const canonicalMatch = content.match(/<link[^>]+rel\s*=\s*["']?canonical["']?[^>]+href\s*=\s*["']?([^"'>\s]+)["']?/i);
      if (!canonicalMatch) {
        fail(`Missing canonical link in legacy redirect page ${file}`);
      }
      return;
    }

    if (!/<title>.*?<\/title>/i.test(content)) {
      fail(`Missing <title> in ${file}`);
    }

    if (!isNoindex && !/<meta[^>]+name\s*=\s*["']?description["']?[^>]*>/i.test(content)) {
      fail(`Missing meta description in ${file}`);
    }

    if (!/<link[^>]+rel\s*=\s*["']?canonical["']?[^>]*>/i.test(content)) {
      fail(`Missing canonical link in ${file}`);
    }
  }
});

// 4️⃣ Hreflang reciprocity validation (EN ↔ DA)
walk(publicDir, file => {
  if (file.endsWith('.html')) {
    const relative = path.relative(publicDir, file).replace(/\\/g, '/');
    if (relative.startsWith('dev/')) return;

    const content = fs.readFileSync(file, 'utf8');

    const isDanish = file.endsWith('.da.html');
    const basePath = isDanish
      ? file.replace('.da.html', '.html')
      : file.replace('.html', '.da.html');

    const hasHreflangEn = /<link[^>]+rel\s*=\s*["']?alternate["']?[^>]+hreflang\s*=\s*["']?en["']?[^>]*>/i.test(content);
    const hasHreflangDa = /<link[^>]+rel\s*=\s*["']?alternate["']?[^>]+hreflang\s*=\s*["']?da["']?[^>]*>/i.test(content);

    if (!hasHreflangEn) {
      fail(`Missing hreflang="en" in ${file}`);
    }

    if (!hasHreflangDa) {
      fail(`Missing hreflang="da" in ${file}`);
    }

    if (fs.existsSync(basePath)) {
      const counterpart = fs.readFileSync(basePath, 'utf8');

      const reciprocalCheck = isDanish
        ? /hreflang\s*=\s*["']?da["']?/i
        : /hreflang\s*=\s*["']?en["']?/i;

      if (!reciprocalCheck.test(counterpart)) {
        fail(`Hreflang reciprocity broken between ${file} and ${basePath}`);
      }
    }
  }
});

// 5️⃣ Run SEO audit (blocking)
import { execSync } from 'child_process';

try {
  execSync('node tools/seo-audit.mjs', { stdio: 'inherit' });
} catch {
  hasError = true;
}

if (hasError) {
  console.error('\nValidation failed.');
  process.exit(1);
} else {
  console.log('✅ Validation passed.');
  process.exit(0);
}
