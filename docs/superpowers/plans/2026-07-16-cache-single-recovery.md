# 缓存单次自愈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 旧 Next.js 静态资源失败时，页面只恢复导航一次，并使 www 与裸域名使用同一条不可缓存入口链路。

**Architecture:** 客户端使用 capture 阶段监听 DOM 静态资源错误，并仅识别同源 `/_next/static/` URL。它和现有 `ChunkLoadGuard` 共用一个 sessionStorage 标记，调用 `location.replace()` 到带恢复标记的 URL；middleware 把该 URL 规范到当前 build token，并且仅在这类显式恢复导航上发送 `Clear-Site-Data`。

**Tech Stack:** Next.js 16、React 19、TypeScript、Node `assert`、现有 `pnpm exec tsx` 测试执行器。

## Global Constraints

- 不增加对象存储、CDN、域名或依赖。
- 只处理同源 `/_next/static/` 静态资源；不得因 Supabase、微信、第三方资源或业务图片错误刷新页面。
- 整个 tab 会话最多自动恢复一次。
- `www` canonical redirect 必须是 307，且有 `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`。
- 正常 HTML 导航不得有 `Clear-Site-Data`；仅 `__bbwv_recover=1` 的恢复导航可携带它。

---

## File Structure

- Create: `src/lib/static-asset-recovery.ts` — URL 过滤、恢复 URL、一次性标记的纯逻辑。
- Create: `src/components/static-asset-recovery-guard.tsx` — DOM capture listener 和页面导航。
- Modify: `src/components/chunk-load-guard.tsx` — 改为调用同一恢复逻辑。
- Modify: `src/app/layout.tsx` — 安装资源错误守卫。
- Modify: `src/middleware.ts` — canonical no-store、恢复 query 和 Clear-Site-Data 范围。
- Create: `scripts/static-asset-recovery.test.ts` — 纯逻辑回归测试。
- Create: `scripts/middleware-runtime.test.ts` — middleware 运行时契约回归测试。

### Task 1: 静态资源恢复纯逻辑

**Files:**
- Create: `src/lib/static-asset-recovery.ts`
- Test: `scripts/static-asset-recovery.test.ts`

**Interfaces:**
- Produces: `isSameOriginNextStaticAsset(resourceUrl: string, pageOrigin: string): boolean`
- Produces: `buildStaticAssetRecoveryUrl(pageUrl: string, buildToken: string): string`
- Produces: `claimStaticAssetRecovery(storage: Pick<Storage, 'getItem' | 'setItem'>): boolean`
- Produces: `STATIC_ASSET_RECOVERY_KEY` and `STATIC_ASSET_RECOVERY_PARAM`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import {
  STATIC_ASSET_RECOVERY_KEY,
  buildStaticAssetRecoveryUrl,
  claimStaticAssetRecovery,
  isSameOriginNextStaticAsset,
} from '../src/lib/static-asset-recovery';

const storage = new Map<string, string>();
const session = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
};

assert.equal(isSameOriginNextStaticAsset('/_next/static/chunks/a.js', 'https://bangbangwenfa.com'), true);
assert.equal(isSameOriginNextStaticAsset('https://bangbangwenfa.com/_next/static/media/a.woff2', 'https://bangbangwenfa.com'), true);
assert.equal(isSameOriginNextStaticAsset('https://cdn.example.com/_next/static/a.js', 'https://bangbangwenfa.com'), false);
assert.equal(isSameOriginNextStaticAsset('https://bangbangwenfa.com/uploads/a.png', 'https://bangbangwenfa.com'), false);

const target = new URL(buildStaticAssetRecoveryUrl('https://bangbangwenfa.com/civil?foo=1', '20260716'));
assert.equal(target.searchParams.get('__bbwv'), '20260716');
assert.equal(target.searchParams.get('__bbwv_recover'), '1');
assert.equal(target.searchParams.get('foo'), '1');

assert.equal(claimStaticAssetRecovery(session), true);
assert.equal(storage.get(STATIC_ASSET_RECOVERY_KEY), '1');
assert.equal(claimStaticAssetRecovery(session), false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx scripts/static-asset-recovery.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/static-asset-recovery'`.

- [ ] **Step 3: Write minimal implementation**

```ts
export const STATIC_ASSET_RECOVERY_KEY = '__bbwv_static_asset_recovery_once';
export const STATIC_ASSET_RECOVERY_PARAM = '__bbwv_recover';

export function isSameOriginNextStaticAsset(resourceUrl: string, pageOrigin: string) {
  try {
    const resource = new URL(resourceUrl, pageOrigin);
    return resource.origin === pageOrigin && resource.pathname.startsWith('/_next/static/');
  } catch {
    return false;
  }
}

export function buildStaticAssetRecoveryUrl(pageUrl: string, buildToken: string) {
  const target = new URL(pageUrl);
  target.searchParams.set('__bbwv', buildToken);
  target.searchParams.set(STATIC_ASSET_RECOVERY_PARAM, '1');
  return target.toString();
}

export function claimStaticAssetRecovery(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  if (storage.getItem(STATIC_ASSET_RECOVERY_KEY) === '1') return false;
  storage.setItem(STATIC_ASSET_RECOVERY_KEY, '1');
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec tsx scripts/static-asset-recovery.test.ts`

Expected: `static asset recovery test passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/static-asset-recovery.ts scripts/static-asset-recovery.test.ts
git commit -m "feat: add static asset recovery primitives"
```

### Task 2: 在浏览器中捕获资源错误并复用 chunk 恢复

**Files:**
- Create: `src/components/static-asset-recovery-guard.tsx`
- Modify: `src/components/chunk-load-guard.tsx`
- Modify: `src/app/layout.tsx`
- Test: `scripts/static-asset-recovery.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `isSameOriginNextStaticAsset`、`buildStaticAssetRecoveryUrl`、`claimStaticAssetRecovery`。
- Produces: `StaticAssetRecoveryGuard` React component；`ChunkLoadGuard` 不再直接 `window.location.reload()`。

- [ ] **Step 1: Extend the failing test with DOM-resource extraction cases**

```ts
import { getStaticResourceUrl } from '../src/lib/static-asset-recovery';

assert.equal(getStaticResourceUrl({ tagName: 'SCRIPT', src: '/_next/static/chunks/a.js' }), '/_next/static/chunks/a.js');
assert.equal(getStaticResourceUrl({ tagName: 'LINK', rel: 'stylesheet', href: '/_next/static/css/a.css' }), '/_next/static/css/a.css');
assert.equal(getStaticResourceUrl({ tagName: 'IMG', currentSrc: '/_next/static/media/a.png', src: '/fallback.png' }), '/_next/static/media/a.png');
assert.equal(getStaticResourceUrl({ tagName: 'IMG', src: '/uploads/a.png' }), '/uploads/a.png');
assert.equal(getStaticResourceUrl({ tagName: 'LINK', rel: 'preconnect', href: '/_next/static/css/a.css' }), null);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx scripts/static-asset-recovery.test.ts`

Expected: FAIL because `getStaticResourceUrl` is not exported.

- [ ] **Step 3: Add the extractor and components**

```ts
export type ResourceElementLike = {
  tagName?: string;
  src?: string;
  href?: string;
  currentSrc?: string;
  poster?: string;
  rel?: string;
};

export function getStaticResourceUrl(element: ResourceElementLike): string | null {
  switch (element.tagName?.toUpperCase()) {
    case 'SCRIPT': return element.src || null;
    case 'LINK': return element.rel?.toLowerCase() === 'stylesheet' ? element.href || null : null;
    case 'IMG': case 'SOURCE': return element.currentSrc || element.src || null;
    case 'VIDEO': return element.poster || null;
    default: return null;
  }
}
```

```tsx
export function StaticAssetRecoveryGuard() {
  useEffect(() => {
    let fallbackClaimed = false;
    const onResourceError = (event: Event) => {
      const url = getStaticResourceUrl(event.target as ResourceElementLike);
      if (!url || !isSameOriginNextStaticAsset(url, window.location.origin)) return;
      const claimed = (() => { try { return claimStaticAssetRecovery(sessionStorage); } catch { if (fallbackClaimed) return false; fallbackClaimed = true; return true; } })();
      if (claimed) window.location.replace(buildStaticAssetRecoveryUrl(window.location.href, BUILD_CACHE_BUST_VALUE));
    };
    window.addEventListener('error', onResourceError, true);
    return () => window.removeEventListener('error', onResourceError, true);
  }, []);
  return null;
}
```

Change `ChunkLoadGuard` so the `ChunkLoadError` path calls the same `claimStaticAssetRecovery` and `buildStaticAssetRecoveryUrl` helper. Insert `<StaticAssetRecoveryGuard />` before `<ChunkLoadGuard />` in `src/app/layout.tsx`.

- [ ] **Step 4: Run focused tests**

Run: `pnpm exec tsx scripts/static-asset-recovery.test.ts && pnpm exec tsx scripts/wechat-web-payment.test.ts`

Expected: both commands print their pass messages.

- [ ] **Step 5: Commit**

```bash
git add src/lib/static-asset-recovery.ts src/components/static-asset-recovery-guard.tsx src/components/chunk-load-guard.tsx src/app/layout.tsx scripts/static-asset-recovery.test.ts
git commit -m "fix: recover once from stale static assets"
```

### Task 3: 收紧 middleware 缓存语义

**Files:**
- Modify: `src/middleware.ts`
- Create: `scripts/middleware-runtime.test.ts`

**Interfaces:**
- Consumes: `STATIC_ASSET_RECOVERY_PARAM` from Task 1.
- Produces: www canonical 307 + no-store；恢复导航使用 `Clear-Site-Data`；正常 HTML 不使用 `Clear-Site-Data`。

- [ ] **Step 1: Write the failing contract test**

```ts
async function main() {
  process.env.DEPLOY_ENV = 'PROD';
  process.env.BUILD_CACHE_BUST_VALUE = 'test-build';
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('../src/middleware');

  const wwwResponse = await middleware(new NextRequest('https://www.bangbangwenfa.com/civil', {
    headers: { accept: 'text/html' },
  }));
  assert.equal(wwwResponse.status, 307);
  assert.equal(wwwResponse.headers.get('location'), 'https://bangbangwenfa.com/civil');
  assert.match(wwwResponse.headers.get('cache-control') ?? '', /no-store/);

  const recoveryResponse = await middleware(new NextRequest(
    'https://bangbangwenfa.com/civil?__bbwv=old&__bbwv_recover=1',
    { headers: { accept: 'text/html' } },
  ));
  assert.equal(recoveryResponse.headers.get('clear-site-data'), '"cache"');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx scripts/middleware-runtime.test.ts`

Expected: FAIL because the canonical redirect is 308 and regular HTML currently passes `true` to `applySecurityHeaders`.

- [ ] **Step 3: Implement the middleware changes**

```ts
const isRecoveryNavigation = request.nextUrl.searchParams.get(STATIC_ASSET_RECOVERY_PARAM) === '1';

if (isProd && shouldRedirectToCanonicalHost(hostname)) {
  // construct redirectUrl as today
  return applySecurityHeaders(NextResponse.redirect(redirectUrl, 307), isProd);
}

if (hasBuildCacheBust && isHtmlNavigation && !isApiRoute &&
    (request.nextUrl.searchParams.get(CACHE_BUST_PARAM) !== BUILD_CACHE_BUST_VALUE || isRecoveryNavigation)) {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.searchParams.set(CACHE_BUST_PARAM, BUILD_CACHE_BUST_VALUE);
  rewriteUrl.searchParams.delete(STATIC_ASSET_RECOVERY_PARAM);
  return applySecurityHeaders(NextResponse.redirect(rewriteUrl, 307), isProd, isRecoveryNavigation);
}

return applySecurityHeaders(NextResponse.next(), isProd);
```

Keep the existing JS chunk rewrite unchanged.

- [ ] **Step 4: Run focused tests and type check**

Run: `pnpm exec tsx scripts/middleware-runtime.test.ts && pnpm exec tsx scripts/static-asset-recovery.test.ts && pnpm run ts-check`

Expected: all pass with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts scripts/middleware-runtime.test.ts
git commit -m "fix: avoid cached canonical and normal navigation responses"
```

### Task 4: 构建和线上回归

**Files:**
- No production file changes.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified production artifact and a manual mobile test checklist.

- [ ] **Step 1: Build the production artifact**

Run: `pnpm run build`

Expected: `Build completed successfully!` and exit code 0.

- [ ] **Step 2: Run existing high-value regressions**

Run: `pnpm exec tsx scripts/static-asset-recovery.test.ts && pnpm exec tsx scripts/middleware-runtime.test.ts && pnpm exec tsx scripts/wechat-web-payment.test.ts && pnpm exec tsx scripts/admin-system-configs-persistence.test.ts`

Expected: every script prints its pass message.

- [ ] **Step 3: After deployment, verify HTTP headers and routing**

Run:

```bash
curl -sSI https://www.bangbangwenfa.com/civil
curl -sSI https://bangbangwenfa.com/civil
curl -sSI https://bangbangwenfa.com/admin/login
```

Expected: first response is 307 to `https://bangbangwenfa.com/civil` with no-store; bare-domain pages have no `Clear-Site-Data` in normal navigation headers.

- [ ] **Step 4: Manual mobile verification**

Open `www.bangbangwenfa.com`, `/civil`, and `/admin/login` in a mobile browser and WeChat WebView; hard-refresh each twice. Confirm no infinite navigation, no static 404, and normal payment/admin paths continue to work.

- [ ] **Step 5: Commit any test-only correction, then push the implementation commits**

```bash
git status --short
git log --oneline -4
```

Expected: only intentional implementation commits are pushed; existing unrelated untracked files remain untouched.
