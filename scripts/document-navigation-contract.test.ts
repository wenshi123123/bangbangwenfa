import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const layout = await fs.readFile(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

  assert.match(layout, /__bbwvDocumentNavigationGuardInstalled/, 'layout must install one global document-navigation guard');
  assert.match(layout, /addEventListener\('click'/, 'guard must observe internal link activation before Next router handles it');
  assert.match(layout, /event\.preventDefault\(\)/, 'guard must prevent client-router navigation for internal documents');
  assert.match(layout, /window\.location\.assign/, 'guard must use a native document navigation');
  assert.match(layout, /anchor\.origin !== window\.location\.origin/, 'guard must leave external links alone');
  assert.match(layout, /anchor\.hash/, 'guard must preserve in-page hash navigation');
  assert.match(layout, /anchor\.hasAttribute\('download'\)/, 'guard must preserve downloads');

  console.log('document navigation contract test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
