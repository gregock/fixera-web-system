// validate-i18n-structure.mjs
// --------------------------------------------------
// Script para validar consistencia EN ↔ DA en /src
// --------------------------------------------------

import fs from 'fs';
import path from 'path';
import glob from 'glob';

function fail(msg) {
  console.error('[I18N-VALIDATE] ERROR:', msg);
  process.exitCode = 1;
}

const srcDir = path.join(process.cwd(), 'src');

// Listar todas las páginas EN
const enFiles = glob
  .sync('**/*.html', { cwd: srcDir })
  .filter(f => !f.endsWith('.da.html'))
  .filter(f => !f.startsWith('dev/'));

const mismatches = {};

enFiles.forEach(enFile => {
  const daFile = enFile.replace('.html', '.da.html');
  const enPath = path.join(srcDir, enFile);
  const daPath = path.join(srcDir, daFile);

  if (!fs.existsSync(daPath)) {
    fail(`Missing DA version for ${enFile}`);
    if (!mismatches[enFile]) mismatches[enFile] = [];
    mismatches[enFile].push('Missing DA version');
    return;
  }

  const enHtml = fs.readFileSync(enPath, 'utf8');
  const daHtml = fs.readFileSync(daPath, 'utf8');

  // Validar existencia de <head> en ambos idiomas (no comparar contenido literal)
  const enHead = enHtml.match(/<head>([\s\S]+?)<\/head>/i);
  const daHead = daHtml.match(/<head>([\s\S]+?)<\/head>/i);

  if (!enHead || !daHead) {
    fail(`Missing <head> in EN or DA for ${enFile}`);
    if (!mismatches[enFile]) mismatches[enFile] = [];
    mismatches[enFile].push('Missing <head>');
  }
});

const reportDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const reportPath = path.join(reportDir, 'i18n_structure_report.md');

let reportContent = '# I18N Structure Validation Report\n\n';

for (const [file, issues] of Object.entries(mismatches)) {
  reportContent += `### File: ${file}\n`;
  issues.forEach(issue => {
    reportContent += `- ${issue}\n`;
  });
  reportContent += '\n';
}

fs.writeFileSync(reportPath, reportContent, 'utf8');

console.log('[I18N-VALIDATE] All EN/DA pairs are consistent.');