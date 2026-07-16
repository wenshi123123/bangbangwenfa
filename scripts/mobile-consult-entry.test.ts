import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const PAGE_FILE = path.join(process.cwd(), 'src/app/page.tsx');

async function main() {
  const source = await fs.readFile(PAGE_FILE, 'utf8');

  for (const [label, urlFactory] of [
    ['民事咨询', 'getCivilUrl'],
    ['刑事咨询', 'getConsultUrl'],
  ]) {
    assert.match(
      source,
      new RegExp(
        `<Button(?=[^>]*\\basChild\\b)(?=[^>]*h-12)[^>]*>\\s*<Link href=\\{${urlFactory}\\(\\)\\}>\\s*${label}`,
      ),
      `${label} must render as one 48px link target instead of nesting a button inside a link`,
    );
  }

  assert.doesNotMatch(
    source,
    /<Link href=\{get(?:Civil|Consult)Url\(\)\}>\s*<Button/,
    'the hero consultation links must not nest interactive elements',
  );

  console.log('mobile consult entry test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
