import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function listFiles(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      const content = await fs.readFile(absolutePath);
      files.push({
        path: relativePath,
        sha256: createHash('sha256').update(content).digest('hex'),
        size: content.byteLength,
      });
    }
  }

  return files;
}

export async function createStaticReleaseManifest({ staticDir, deploymentId }) {
  if (!deploymentId) throw new Error('NEXT_PUBLIC_DEPLOYMENT_ID is required to create a static release manifest');
  return {
    deploymentId,
    files: (await listFiles(staticDir)).sort((left, right) => left.path.localeCompare(right.path)),
  };
}

async function main() {
  const write = process.argv.includes('--write');
  if (!write) return;

  const staticDir = path.join(process.cwd(), '.next', 'static');
  const deploymentId = process.env.NEXT_PUBLIC_DEPLOYMENT_ID || process.env.BUILD_CACHE_BUST_VALUE;
  const manifest = await createStaticReleaseManifest({ staticDir, deploymentId });
  const destination = path.join(process.cwd(), '.next', 'static-release-manifest.json');
  await fs.writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote static release manifest for ${manifest.deploymentId} with ${manifest.files.length} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
