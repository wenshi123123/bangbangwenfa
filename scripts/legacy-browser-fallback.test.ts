import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  LEGACY_BROWSER_CLASS,
  LEGACY_BROWSER_FALLBACK_CSS,
  buildLegacyBrowserDetectionScript,
} from '../src/lib/legacy-browser-fallback';

function runDetection(supportsModernCss: boolean) {
  const documentElement = { className: '' };

  vm.runInNewContext(buildLegacyBrowserDetectionScript(), {
    document: { documentElement },
    window: {
      CSS: {
        supports: () => supportsModernCss,
      },
    },
  });

  return documentElement.className;
}

assert.match(runDetection(false), new RegExp(LEGACY_BROWSER_CLASS));
assert.doesNotMatch(runDetection(true), new RegExp(LEGACY_BROWSER_CLASS));
assert.match(LEGACY_BROWSER_FALLBACK_CSS, /\.hero-carousel img/);
assert.match(LEGACY_BROWSER_FALLBACK_CSS, /max-width: 100%/);
assert.doesNotMatch(LEGACY_BROWSER_FALLBACK_CSS, /@layer|@property|oklch|color-mix/);

console.log('legacy browser fallback test passed');
