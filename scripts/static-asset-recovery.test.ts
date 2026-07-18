import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  STATIC_ASSET_RECOVERY_KEY,
  buildInlineStaticAssetRecoveryScript,
  buildStaticAssetRecoveryFailureMarkup,
  buildStaticAssetRecoveryUrl,
  claimStaticAssetRecovery,
  cleanStaticAssetRecoveryParams,
  getStaticResourceUrl,
  isSameOriginNextStaticAsset,
} from '../src/lib/static-asset-recovery';

const storage = new Map<string, string>();
const session = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
};

assert.equal(
  isSameOriginNextStaticAsset('/_next/static/chunks/a.js', 'https://bangbangwenfa.com'),
  true,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://bangbangwenfa.com/_next/static/media/a.woff2',
    'https://bangbangwenfa.com',
  ),
  true,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://cdn.example.com/_next/static/a.js',
    'https://bangbangwenfa.com',
  ),
  false,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://bangbangwenfa.com/uploads/a.png',
    'https://bangbangwenfa.com',
  ),
  false,
);

const target = new URL(
  buildStaticAssetRecoveryUrl('https://bangbangwenfa.com/civil?foo=1', '20260716'),
);
assert.equal(target.searchParams.get('__bbwv'), '20260716');
assert.equal(target.searchParams.get('__bbwv_recover'), '1');
assert.equal(target.searchParams.get('foo'), '1');

const dirtyUrl = new URL('https://bangbangwenfa.com/civil?foo=1&__bbwv=20260718&__bbwv_recover=1&__bbwv_retry=2&__bbwv_attempt=1');
assert.equal(cleanStaticAssetRecoveryParams(dirtyUrl), true);
assert.equal(dirtyUrl.toString(), 'https://bangbangwenfa.com/civil?foo=1');
const failureMarkup = buildStaticAssetRecoveryFailureMarkup('20260718');
assert.match(failureMarkup, /页面暂时没有加载完整/);
assert.match(failureMarkup, /sessionStorage\.removeItem/);
assert.match(failureMarkup, /__bbwv_retry/);

assert.equal(claimStaticAssetRecovery(session), true);
assert.equal(storage.get(STATIC_ASSET_RECOVERY_KEY), '1');
assert.equal(claimStaticAssetRecovery(session), false);

assert.equal(
  getStaticResourceUrl({ tagName: 'SCRIPT', src: '/_next/static/chunks/a.js' }),
  '/_next/static/chunks/a.js',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'LINK',
    rel: 'stylesheet',
    href: '/_next/static/css/a.css',
  }),
  '/_next/static/css/a.css',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'IMG',
    currentSrc: '/_next/static/media/a.png',
    src: '/fallback.png',
  }),
  '/_next/static/media/a.png',
);
assert.equal(
  getStaticResourceUrl({ tagName: 'IMG', src: '/uploads/a.png' }),
  '/uploads/a.png',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'LINK',
    rel: 'preconnect',
    href: '/_next/static/css/a.css',
  }),
  null,
);

const inlineRecoveryScript = buildInlineStaticAssetRecoveryScript('20260718');
assert.match(inlineRecoveryScript, /addEventListener\('error'/);
assert.match(inlineRecoveryScript, /_next\/static\//);
assert.match(inlineRecoveryScript, /__bbwv_recover/);
assert.match(inlineRecoveryScript, /maxRecoveryAttempts = 3/);
assert.match(inlineRecoveryScript, /20260718/);
assert.match(inlineRecoveryScript, /replaceState/);
assert.match(inlineRecoveryScript, /重新打开/);
assert.match(inlineRecoveryScript, /sessionStorage\.removeItem/);

class FakeLinkElement {
  readonly tagName = 'LINK';

  constructor(readonly href: string) {}
}

class FakeScriptElement {
  readonly tagName = 'SCRIPT';

  constructor(readonly src: string) {}
}

const recoveryListeners = new Map<string, (event: { target: unknown }) => void>();
const inlineStorage = new Map<string, string>();
let replacementUrl = '';
const inlineWindow = {
  location: {
    href: 'https://www.bangbangwenfa.com/civil?foo=1',
    origin: 'https://www.bangbangwenfa.com',
    replace: (url: string) => {
      replacementUrl = url;
    },
  },
  history: {
    replaceState: (_state: unknown, _title: string, url: string) => {
      inlineWindow.location.href = `https://www.bangbangwenfa.com${url}`;
    },
  },
  sessionStorage: {
    getItem: (key: string) => inlineStorage.get(key) ?? null,
    setItem: (key: string, value: string) => void inlineStorage.set(key, value),
  },
  addEventListener: (name: string, listener: (event: { target: unknown }) => void) => {
    recoveryListeners.set(name, listener);
  },
};

vm.runInNewContext(inlineRecoveryScript, {
  Date,
  Number,
  String,
  URL,
  window: inlineWindow,
});

const inlineErrorListener = recoveryListeners.get('error');
assert.ok(inlineErrorListener, 'the inline guard should subscribe before the Next runtime starts');
inlineErrorListener({
  target: new FakeLinkElement('https://www.bangbangwenfa.com/_next/static/chunks/missing.css'),
});

const inlineRecoveryTarget = new URL(replacementUrl);
assert.equal(inlineRecoveryTarget.searchParams.get('__bbwv'), '20260718');
assert.equal(inlineRecoveryTarget.searchParams.get('__bbwv_recover'), '1');
assert.equal(inlineRecoveryTarget.searchParams.get('__bbwv_attempt'), '1');
assert.equal(inlineRecoveryTarget.searchParams.get('foo'), '1');

console.log('static asset recovery test passed');
