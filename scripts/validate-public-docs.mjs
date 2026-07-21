import { getTrackedMarkdownFiles, validatePublicDocs } from './lib/public-docs-validator.mjs';

let trackedMarkdownFiles;

try {
  trackedMarkdownFiles = getTrackedMarkdownFiles(process.cwd());
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const { failures, checkedFiles } = validatePublicDocs({
  trackedMarkdownFiles
});

if (failures.length) {
  for (const failure of failures) {
    console.error(`❌ ${failure.file}:${failure.line} -> ${failure.destination} (${failure.reason})`);
  }
  process.exit(1);
}

console.log(`✅ Markdown documentation validation passed for ${checkedFiles} tracked file(s).`);
