import { promises as fs } from 'fs';
import path from 'path';

const buildToken =
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  'dev';

const projectRoot = process.cwd();
const chunksRoot = path.join(projectRoot, '.next', 'static', 'chunks');
const publicRoot = path.join(projectRoot, 'public');
const manifestPath = path.join(publicRoot, `__bbwv-chunks-${buildToken}.json`);
const recoveryPath = path.join(publicRoot, `__bbwv-recover-${buildToken}.js`);

async function collectChunkFiles(dir, baseDir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectChunkFiles(fullPath, baseDir, out);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) {
      continue;
    }

    out.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
  }
}

async function main() {
  const chunkFiles = [];

  try {
    await collectChunkFiles(chunksRoot, chunksRoot, chunkFiles);
  } catch (error) {
    throw new Error(`Unable to scan chunk files in ${chunksRoot}: ${error.message}`);
  }

  chunkFiles.sort();

  await fs.mkdir(publicRoot, { recursive: true });

  const existingPublicEntries = await fs.readdir(publicRoot, { withFileTypes: true });
  await Promise.all(
    existingPublicEntries
      .filter((entry) => entry.isFile() && entry.name.startsWith('__bbwv-'))
      .map((entry) => fs.rm(path.join(publicRoot, entry.name), { force: true })),
  );

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        buildToken,
        generatedAt: new Date().toISOString(),
        chunks: chunkFiles,
      },
      null,
      2,
    ) + '\n',
  );

  await fs.writeFile(
    recoveryPath,
    `(() => {\n` +
      `  try {\n` +
      `    const target = new URL(window.location.href);\n` +
      `    target.searchParams.set('__bbwv', ${JSON.stringify(buildToken)});\n` +
      `    window.location.replace(target.toString());\n` +
      `  } catch {\n` +
      `    window.location.reload();\n` +
      `  }\n` +
      `})();\n`,
  );

  console.log(`Wrote ${manifestPath}`);
  console.log(`Wrote ${recoveryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
