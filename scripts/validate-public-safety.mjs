import { validatePublicSafety } from './lib/public-safety-validator.mjs';

const { failures } = validatePublicSafety();

if (failures.length) {
  for (const failure of failures) {
    console.error(`❌ ${failure.file}: ${failure.message}`);
  }
  process.exit(1);
}

console.log('✅ Public-safety validation passed.');
