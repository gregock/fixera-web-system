import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const manifestRoots = [
  path.join(projectRoot, 'src', 'images', 'projects'),
  path.join(projectRoot, 'src', 'images', 'services'),
  path.join(projectRoot, 'src', 'images', 'gallery')
];

const allowedRoles = new Set([
  'cover',
  'before',
  'process',
  'detail',
  'final',
  'material',
  'problem',
  'context',
  'team',
  'other'
]);

const requiredFields = [
  'slug',
  'role',
  'sequence',
  'alt',
  'caption',
  'width',
  'height',
  'orientation',
  'service_tags',
  'location',
  'date',
  'source_file',
  'derivatives',
  'published',
  'privacy_notes'
];

/** @type {{ file: string; message: string }[]} */
const failures = [];

function fail(file, message) {
  failures.push({ file, message });
  console.error(`❌ ${file}: ${message}`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectManifestFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectManifestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name === 'manifest.json') {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRelativePath(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || path.isAbsolute(trimmed)) return null;
  return trimmed;
}

function resolveManifestPath(manifestDir, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return null;

  const resolved = path.normalize(path.join(manifestDir, normalized));
  const relative = path.relative(manifestDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

function validateEntry(manifestFile, manifestDir, entry, index, seenSlugs, seenSourceFiles) {
  if (!isPlainObject(entry)) {
    fail(manifestFile, `Entry ${index + 1} is not a JSON object.`);
    return;
  }

  const missingFields = requiredFields.filter((field) => !Object.prototype.hasOwnProperty.call(entry, field));
  if (missingFields.length) {
    fail(manifestFile, `Entry ${index + 1} is missing required fields: ${missingFields.join(', ')}.`);
  }

  const slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';
  const role = typeof entry.role === 'string' ? entry.role.trim() : '';
  const published = entry.published;
  const sourceFile = normalizeRelativePath(entry.source_file);
  const derivatives = Array.isArray(entry.derivatives) ? entry.derivatives : null;
  const serviceTags = Array.isArray(entry.service_tags) ? entry.service_tags : null;

  if (!slug) {
    fail(manifestFile, `Entry ${index + 1} has an empty slug.`);
  } else if (seenSlugs.has(slug)) {
    fail(manifestFile, `Duplicate slug "${slug}" found in the same manifest.`);
  } else {
    seenSlugs.add(slug);
  }

  if (!role) {
    fail(manifestFile, `Entry ${index + 1} has an empty role.`);
  } else if (!allowedRoles.has(role)) {
    fail(manifestFile, `Entry ${index + 1} uses unsupported role "${role}".`);
  }

  if (typeof entry.sequence !== 'number' || !Number.isInteger(entry.sequence) || entry.sequence < 1) {
    fail(manifestFile, `Entry ${index + 1} must use a positive integer sequence.`);
  }

  if (typeof published !== 'boolean') {
    fail(manifestFile, `Entry ${index + 1} must set published to true or false.`);
  }

  if (!serviceTags) {
    fail(manifestFile, `Entry ${index + 1} must set service_tags as an array.`);
  } else if (serviceTags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    fail(manifestFile, `Entry ${index + 1} has an empty or non-string value in service_tags.`);
  }

  if (!derivatives) {
    fail(manifestFile, `Entry ${index + 1} must set derivatives as an array.`);
  } else if (derivatives.some((item) => typeof item !== 'string' || !item.trim())) {
    fail(manifestFile, `Entry ${index + 1} has an empty or non-string derivative reference.`);
  }

  if (derivatives) {
    for (const derivative of derivatives) {
      if (typeof derivative === 'string' && derivative.includes('..')) {
        fail(manifestFile, `Entry ${index + 1} must not traverse directories in derivatives.`);
        continue;
      }

      const derivativePath = resolveManifestPath(manifestDir, derivative);
      if (!derivativePath) {
        fail(manifestFile, `Entry ${index + 1} has an invalid derivative path.`);
        continue;
      }

      if (published && !fs.existsSync(derivativePath)) {
        fail(manifestFile, `Entry ${index + 1} references missing derivative file: ${derivative}.`);
      }
    }
  }

  if (sourceFile) {
    if (seenSourceFiles.has(sourceFile)) {
      fail(manifestFile, `Duplicate source_file "${sourceFile}" found in the same manifest.`);
    } else {
      seenSourceFiles.add(sourceFile);
    }
  }

  if (published) {
    const alt = typeof entry.alt === 'string' ? entry.alt.trim() : '';
    const caption = typeof entry.caption === 'string' ? entry.caption.trim() : '';
    const orientation = typeof entry.orientation === 'string' ? entry.orientation.trim() : '';
    const location = typeof entry.location === 'string' ? entry.location.trim() : '';
    const date = typeof entry.date === 'string' ? entry.date.trim() : '';
    const privacyNotes = typeof entry.privacy_notes === 'string' ? entry.privacy_notes.trim() : '';

    if (!alt) fail(manifestFile, `Published entry ${index + 1} must include non-empty alt text.`);
    if (typeof entry.width !== 'number' || !Number.isFinite(entry.width) || entry.width <= 0) {
      fail(manifestFile, `Published entry ${index + 1} must include width.`);
    }
    if (typeof entry.height !== 'number' || !Number.isFinite(entry.height) || entry.height <= 0) {
      fail(manifestFile, `Published entry ${index + 1} must include height.`);
    }
    if (!caption) fail(manifestFile, `Published entry ${index + 1} must include non-empty caption text.`);
    if (!orientation) fail(manifestFile, `Published entry ${index + 1} must include non-empty orientation text.`);
    if (!location) fail(manifestFile, `Published entry ${index + 1} must include non-empty location text.`);
    if (!date) fail(manifestFile, `Published entry ${index + 1} must include non-empty date text.`);
    if (!privacyNotes) fail(manifestFile, `Published entry ${index + 1} must include non-empty privacy_notes text.`);

    if (!sourceFile) {
      fail(manifestFile, `Published entry ${index + 1} must include a relative source_file.`);
    } else if (sourceFile.startsWith('/')) {
      fail(manifestFile, `Published entry ${index + 1} must use a relative source_file.`);
    } else if (sourceFile.includes('..')) {
      fail(manifestFile, `Published entry ${index + 1} must not traverse directories in source_file.`);
    } else {
      const sourcePath = resolveManifestPath(manifestDir, sourceFile);
      if (!sourcePath) {
        fail(manifestFile, `Published entry ${index + 1} has an invalid source_file path.`);
      } else if (!fs.existsSync(sourcePath)) {
        fail(manifestFile, `Published entry ${index + 1} references missing source file: ${sourceFile}.`);
      }
    }
  } else {
    if (typeof entry.alt === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing an alt field.`);
    if (typeof entry.caption === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a caption field.`);
    if (typeof entry.width === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a width field.`);
    if (typeof entry.height === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a height field.`);
    if (typeof entry.orientation === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing an orientation field.`);
    if (typeof entry.location === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a location field.`);
    if (typeof entry.date === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a date field.`);
    if (typeof entry.privacy_notes === 'undefined') fail(manifestFile, `Entry ${index + 1} is missing a privacy_notes field.`);
  }
}

function validateManifest(manifestFile) {
  let data;

  try {
    data = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (error) {
    fail(manifestFile, `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (!isPlainObject(data)) {
    fail(manifestFile, 'Manifest must be a JSON object.');
    return;
  }

  if (!Array.isArray(data.entries)) {
    fail(manifestFile, 'Manifest must contain an entries array.');
    return;
  }

  const manifestDir = path.dirname(manifestFile);
  const seenSlugs = new Set();
  const seenSourceFiles = new Set();

  data.entries.forEach((entry, index) => {
    validateEntry(manifestFile, manifestDir, entry, index, seenSlugs, seenSourceFiles);
  });
}

const manifestFiles = manifestRoots.flatMap((root) => collectManifestFiles(root)).sort();

if (manifestFiles.length === 0) {
  console.log('No image manifests found.');
  process.exit(0);
}

manifestFiles.forEach(validateManifest);

if (failures.length > 0) {
  console.error(`\nImage manifest validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`✅ Validated ${manifestFiles.length} image manifest(s).`);
