import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const dockerfile = await fs.readFile(path.join(process.cwd(), 'Dockerfile'), 'utf8');

  assert.match(dockerfile, /legacy-next-static/, 'Docker build must include retained legacy static assets');
  assert.match(dockerfile, /cp -R[nf]? .*legacy-next-static|legacy-next-static.*\.next\/static/, 'build must merge retained assets into the active Next static directory');
  assert.match(dockerfile, /public\/legacy\.css/, 'legacy CSS must have a stable public fallback path');
  assert.match(dockerfile, /COPY --from=base \/app\/.next \.\/.next/, 'runtime image must include the merged static directory');

  const archive = path.join(process.cwd(), 'legacy-next-static');
  const entries = await fs.readdir(archive);
  assert.ok(entries.length > 0, 'retained static asset archive must not be empty');

  console.log('static asset retention test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
