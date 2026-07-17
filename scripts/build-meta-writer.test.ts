import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

async function main() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'build-meta-writer-'));
  const outputFile = path.join(tempDir, 'build-meta.ts');

  try {
    process.env.BUILD_CACHE_BUST_VALUE = 'test-build-token';

    const writerModule = await import(
      pathToFileURL(path.join(process.cwd(), 'scripts/write-build-meta.mjs')).href
    );

    await writerModule.writeBuildMetaFile(outputFile);

    const generated = await readFile(outputFile, 'utf8');

    assert.match(generated, /export const BUILD_CACHE_BUST_VALUE: string = "test-build-token";/);
    assert.match(generated, /export const STATIC_ASSET_RECOVERY_PARAM = '__bbwv_recover';/);

    const cliOutputFile = path.join(tempDir, 'build-meta-from-cli.ts');
    await execFile(
      process.execPath,
      [path.join(process.cwd(), 'scripts/write-build-meta.mjs'), cliOutputFile],
      {
        env: {
          ...process.env,
          BUILD_CACHE_BUST_VALUE: 'cli-build-token',
        },
      },
    );
    const cliGenerated = await readFile(cliOutputFile, 'utf8');
    assert.match(cliGenerated, /export const BUILD_CACHE_BUST_VALUE: string = "cli-build-token";/);

    console.log('build meta writer test passed');
  } finally {
    delete process.env.BUILD_CACHE_BUST_VALUE;
    await rm(tempDir, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
