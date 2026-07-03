// Build metadata used by middleware to avoid serving stale HTML that still
// points at removed chunk filenames after a redeploy.
export const BUILD_CACHE_BUST_VALUE =
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  'dev';
