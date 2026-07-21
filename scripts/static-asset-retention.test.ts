import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const dockerfile = await fs.readFile(path.join(process.cwd(), 'Dockerfile'), 'utf8');
  const buildScript = await fs.readFile(path.join(process.cwd(), 'scripts', 'build.sh'), 'utf8');

  assert.doesNotMatch(dockerfile, /legacy-next-static/, 'a container must not silently serve stale assets from an unmanaged archive');
  assert.match(dockerfile, /write-static-release-manifest\.mjs --write/, 'Docker build must create a release manifest');
  assert.match(
    dockerfile,
    /test -d \.next\/static && test -n "\$\(find \.next\/static -type f -print -quit\)"/,
    'Docker build must fail when Next emits no static files',
  );
  assert.match(dockerfile, /COPY --from=base \/app\/.next \.\/\.next/, 'runtime image must include the manifest alongside the built assets');
  assert.match(
    dockerfile,
    /RUN test -d \.\/\.next\/static && test -d \.\/public/,
    'runtime image must fail to build when static assets or public files are absent',
  );

  assert.doesNotMatch(buildScript, /legacy-next-static/, 'local build must not merge unrelated build hashes');
  assert.match(buildScript, /write-static-release-manifest\.mjs --write/, 'local build must create the same release manifest as Docker');
  assert.match(buildScript, /NEXT_PUBLIC_STATIC_ASSET_ORIGIN/, 'production build must require a static asset origin');
  assert.match(buildScript, /NEXT_PUBLIC_DEPLOYMENT_ID/, 'production build must require an explicit deployment id');
  assert.match(dockerfile, /ARG NEXT_PUBLIC_STATIC_ASSET_ORIGIN/, 'Docker must accept the static asset origin at build time');
  assert.match(dockerfile, /ARG NEXT_PUBLIC_DEPLOYMENT_ID/, 'Docker must accept the deployment id at build time');
  assert.match(dockerfile, /static-release\.env/, 'Docker must support the checked-in public release manifest for CloudBase source builds');
  assert.match(dockerfile, /test -n "\$NEXT_PUBLIC_STATIC_ASSET_ORIGIN"/, 'Docker build must fail without a static asset origin');
  assert.match(dockerfile, /test -n "\$NEXT_PUBLIC_DEPLOYMENT_ID"/, 'Docker build must fail without a deployment id');

  await fs.access(path.join(process.cwd(), 'scripts', 'write-static-release-manifest.mjs'));
  console.log('static asset release contract test passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
