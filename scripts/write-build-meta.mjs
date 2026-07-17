import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BUILD_CACHE_BUST_VALUE =
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  'dev';

const FILE_CONTENT = `// Build metadata used by middleware to avoid serving stale HTML that still
// points at removed chunk filenames after a redeploy.
export const BUILD_CACHE_BUST_VALUE: string = ${JSON.stringify(BUILD_CACHE_BUST_VALUE)};

export const STATIC_ASSET_RECOVERY_PARAM = '__bbwv_recover';
`;

export async function writeBuildMetaFile(outputFile) {
  await writeFile(outputFile, FILE_CONTENT, 'utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2]) {
  await writeBuildMetaFile(process.argv[2]);
}
