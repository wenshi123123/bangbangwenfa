import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PAGE_FILE = path.join(ROOT, 'src/app/page.tsx');
const NEXT_CONFIG_FILE = path.join(ROOT, 'next.config.mjs');
const MAX_HERO_IMAGE_BYTES = 250 * 1024;

async function main() {
  const pageSource = await fs.readFile(PAGE_FILE, 'utf8');
  const heroAssetMatches = pageSource.match(/\/hero-photo-\d+\.(?:png|jpg|jpeg|webp)/g) ?? [];
  const heroAssets = [...new Set(heroAssetMatches)];

  assert.ok(heroAssets.length >= 5, `expected at least 5 hero assets, got ${heroAssets.length}`);

  for (const assetPath of heroAssets) {
    const filePath = path.join(ROOT, 'public', assetPath.replace(/^\//, ''));
    const stat = await fs.stat(filePath);
    assert.ok(
      stat.size <= MAX_HERO_IMAGE_BYTES,
      `${assetPath} is ${stat.size} bytes, exceeding ${MAX_HERO_IMAGE_BYTES} byte budget`,
    );
  }

  const nextConfig = (await import(NEXT_CONFIG_FILE)).default as {
    images?: { unoptimized?: boolean };
  };

  assert.notEqual(
    nextConfig.images?.unoptimized,
    true,
    'next.config.mjs keeps images.unoptimized=true, so mobile still downloads original assets',
  );

  console.log('home hero performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
