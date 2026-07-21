import fs from 'node:fs/promises';
import path from 'node:path';

function requireUrl(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return new URL(value.endsWith('/') ? value : `${value}/`);
}

async function request(url, method = 'HEAD') {
  const response = await fetch(url, { method, redirect: 'manual', cache: 'no-store' });
  return {
    url,
    status: response.status,
    cacheControl: response.headers.get('cache-control') ?? '',
    contentType: response.headers.get('content-type') ?? '',
    allowOrigin: response.headers.get('access-control-allow-origin') ?? '',
    deploymentId: response.headers.get('x-bbwv-deployment-id'),
    legacyRecovery: response.headers.get('x-bbwv-legacy-asset-recovery'),
  };
}

function withQuery(url, query) {
  if (!query) return url;
  const result = new URL(url);
  const params = new URLSearchParams(query);
  for (const [key, value] of params) result.searchParams.set(key, value);
  return result.toString();
}

function staticAssetUrl(assetOrigin, deploymentId, pathname) {
  const encodedPathname = pathname.split('/').map(encodeURIComponent).join('/');
  return new URL(`next/${deploymentId}/_next/static/${encodedPathname}`, assetOrigin).toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const siteOrigin = requireUrl('SITE_ORIGIN', process.env.SITE_ORIGIN);
  const assetOrigin = requireUrl('STATIC_ASSET_ORIGIN', process.env.STATIC_ASSET_ORIGIN);
  const manifestPath = process.env.STATIC_RELEASE_MANIFEST || path.join(process.cwd(), '.next', 'static-release-manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const expectedDeploymentId = process.env.DEPLOYMENT_ID || manifest.deploymentId;
  const siteQuery = process.env.SITE_QUERY || '';

  assert(manifest.deploymentId === expectedDeploymentId, 'manifest deployment id does not match DEPLOYMENT_ID');
  assert(Array.isArray(manifest.files) && manifest.files.length > 0, 'static release manifest is empty');

  for (const pathname of ['guardian', 'guardian/center']) {
    const result = await request(withQuery(new URL(pathname, siteOrigin).toString(), siteQuery), 'GET');
    assert(result.status === 200, `${pathname} returned ${result.status}`);
    assert(/no-store/.test(result.cacheControl), `${pathname} must be no-store, got ${result.cacheControl}`);

    const html = await fetch(withQuery(new URL(pathname, siteOrigin).toString(), siteQuery), {
      cache: 'no-store',
    }).then(response => response.text());
    const expectedPrefix = new URL(`next/${expectedDeploymentId}/_next/static/`, assetOrigin).toString();
    assert(html.includes(expectedPrefix), `${pathname} does not reference static deployment ${expectedDeploymentId}`);
  }

  for (const file of manifest.files) {
    const url = staticAssetUrl(assetOrigin, expectedDeploymentId, file.path);
    const result = await request(url);
    assert(result.status === 200, `${file.path} returned ${result.status}`);
    assert(/max-age=31536000/.test(result.cacheControl), `${file.path} is not long-lived: ${result.cacheControl}`);
    assert(!/text\/html/i.test(result.contentType), `${file.path} returned HTML instead of its static content type`);
    if (/\.(woff2?|ttf|otf)$/i.test(file.path)) {
      assert(
        result.allowOrigin === '*' || result.allowOrigin === siteOrigin.origin,
        `${file.path} must allow the site origin for cross-origin font loading: ${result.allowOrigin || '(missing)'}`,
      );
    }
  }

  const missing = await request(
    staticAssetUrl(assetOrigin, expectedDeploymentId, 'chunks/does-not-exist.js'),
    'GET',
  );
  assert(missing.status === 404, `missing static asset returned ${missing.status}`);
  assert(!missing.legacyRecovery, 'missing static asset must not be a recovery response');
  assert(!/text\/html/i.test(missing.contentType), 'missing static asset must not return an HTML recovery document');

  console.log(`Verified ${manifest.files.length} versioned static assets and dynamic deployment ${expectedDeploymentId}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
