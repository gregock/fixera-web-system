import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MANIFEST_SCHEMA = 'fixera-image-manifest@1';
export const ALLOWED_TARGET_TYPES = new Set(['projects', 'services', 'gallery']);
export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.avif']);

export function normalizeTargetType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ALLOWED_TARGET_TYPES.has(normalized) ? normalized : null;
}

export function generateSafeSlug(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function sanitizeFilenameContext(input) {
  return generateSafeSlug(input).slice(0, 64);
}

export function resolveInsideRoot(rootDir, ...segments) {
  const resolved = path.resolve(rootDir, ...segments);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Resolved path escapes root directory: ${resolved}`);
  }
  return resolved;
}

export function resolveTargetLayout(repoRoot, targetType, slug) {
  const normalizedType = normalizeTargetType(targetType);
  if (!normalizedType) {
    throw new Error(`Invalid target type: ${targetType}`);
  }

  const safeSlug = generateSafeSlug(slug);
  if (!safeSlug) {
    throw new Error('Slug normalizes to an empty value.');
  }

  const imagesRoot = resolveInsideRoot(repoRoot, 'src', 'images');
  const targetRoot = resolveInsideRoot(imagesRoot, normalizedType, safeSlug);

  return {
    imagesRoot,
    targetType: normalizedType,
    slug: safeSlug,
    targetRoot,
    sourceDir: path.join(targetRoot, 'source'),
    derivedDir: path.join(targetRoot, 'derived'),
    manifestPath: path.join(targetRoot, 'manifest.json')
  };
}

export function isSupportedImageFile(filePath) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function discoverImageFiles(rootDir) {
  /** @type {{ absolutePath: string; relativePath: string; ext: string; baseName: string }[]} */
  const files = [];

  function walk(currentDir) {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !isSupportedImageFile(fullPath)) continue;

      files.push({
        absolutePath: fullPath,
        relativePath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
        ext: path.extname(entry.name).toLowerCase(),
        baseName: path.basename(entry.name, path.extname(entry.name))
      });
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function loadManifest(manifestPath, targetType, slug) {
  if (!fs.existsSync(manifestPath)) {
    return {
      schema: MANIFEST_SCHEMA,
      scope: targetType,
      slug,
      entries: []
    };
  }

  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Manifest is not a JSON object: ${manifestPath}`);
  }

  if (!Array.isArray(parsed.entries)) {
    throw new Error(`Manifest is missing an entries array: ${manifestPath}`);
  }

  return parsed;
}

export function buildManifestEntry({
  slug,
  sequence,
  sourceFile,
  width = null,
  height = null,
  orientation = null
}) {
  return {
    slug,
    role: 'other',
    sequence,
    alt: 'TODO',
    caption: 'TODO',
    width,
    height,
    orientation,
    service_tags: [],
    location: null,
    date: null,
    source_file: sourceFile,
    derivatives: [],
    published: false,
    privacy_notes: 'TODO: review before publishing'
  };
}

export function nextSequenceNumber(entries) {
  const max = (entries || []).reduce((acc, entry) => {
    const value = Number(entry?.sequence);
    return Number.isInteger(value) && value > acc ? value : acc;
  }, 0);
  return max + 1;
}

export function createDestinationName(targetSlug, sequence, originalBaseName, ext) {
  const seq = String(sequence).padStart(3, '0');
  const context = sanitizeFilenameContext(originalBaseName);
  return `${targetSlug}-${seq}${context ? `-${context}` : ''}${ext.toLowerCase()}`;
}

export async function safeCopyFile(sourcePath, destinationPath, sourceHash) {
  if (fs.existsSync(destinationPath)) {
    const existingHash = await hashFile(destinationPath);
    if (existingHash === sourceHash) {
      return { status: 'duplicate-exists', destinationPath };
    }
    throw new Error(`Refusing to overwrite existing file: ${destinationPath}`);
  }

  fs.copyFileSync(sourcePath, destinationPath);
  return { status: 'copied', destinationPath };
}

export function writeManifest(manifestPath, manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

