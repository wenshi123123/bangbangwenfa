import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

async function main() {
  process.env.NEXT_PUBLIC_STATIC_ASSET_ORIGIN = 'https://assets.example.test';
  process.env.NEXT_PUBLIC_DEPLOYMENT_ID = 'canary-001';

  const nextConfig = (await import(`${path.join(ROOT, 'next.config.mjs')}?contract=${Date.now()}`)).default as {
    assetPrefix?: string;
    env?: Record<string, string>;
  };
  assert.equal(
    nextConfig.assetPrefix,
    'https://assets.example.test/next/canary-001',
    'a deployment must emit every Next static URL from its immutable asset directory',
  );
  assert.equal(
    nextConfig.env?.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE,
    'canary-001',
    'a fixed deployment id must also make client build metadata deterministic across local and CloudBase builds',
  );
  const releaseVerifier = await fs.readFile(
    path.join(ROOT, 'scripts', 'verify-static-release.mjs'),
    'utf8',
  );
  assert.match(
    releaseVerifier,
    /next\/\$\{expectedDeploymentId\}\/_next\/static\//,
    'the release verifier must follow Next assetPrefix URLs through /_next/static',
  );
  assert.match(
    releaseVerifier,
    /access-control-allow-origin/,
    'the release verifier must validate CORS for cross-origin font assets',
  );
  assert.match(
    releaseVerifier,
    /encodeURIComponent/,
    'the release verifier must request dynamic route asset paths with browser-safe URL encoding',
  );

  const { createStaticReleaseManifest } = await import('./write-static-release-manifest.mjs');
  const staticDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bbwv-static-'));
  const assetPath = path.join(staticDir, 'chunks', 'app.js');
  await fs.mkdir(path.dirname(assetPath), { recursive: true });
  await fs.writeFile(assetPath, 'console.log("build");');

  const manifest = await createStaticReleaseManifest({
    staticDir,
    deploymentId: 'canary-001',
  });
  const digest = createHash('sha256').update('console.log("build");').digest('hex');
  assert.deepEqual(manifest, {
    deploymentId: 'canary-001',
    files: [{ path: 'chunks/app.js', sha256: digest, size: 21 }],
  });

  const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bbwv-build-'));
  await fs.mkdir(path.join(buildDir, '.next', 'static', 'css'), { recursive: true });
  await fs.writeFile(path.join(buildDir, '.next', 'static', 'css', 'app.css'), 'body{}');
  const writeResult = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'write-static-release-manifest.mjs'), '--write'],
    {
      cwd: buildDir,
      env: { ...process.env, NEXT_PUBLIC_DEPLOYMENT_ID: 'canary-001' },
      encoding: 'utf8',
    },
  );
  assert.equal(writeResult.status, 0, writeResult.stderr);
  const writtenManifest = JSON.parse(
    await fs.readFile(path.join(buildDir, '.next', 'static-release-manifest.json'), 'utf8'),
  );
  assert.equal(writtenManifest.deploymentId, 'canary-001');

  await fs.rm(staticDir, { recursive: true, force: true });
  await fs.rm(buildDir, { recursive: true, force: true });
  console.log('static release contract test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
