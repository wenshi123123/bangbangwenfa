import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pageFile = path.join(process.cwd(), 'src/app/page.tsx');
const headerFile = path.join(process.cwd(), 'src/components/layout/header.tsx');
const mobileNavFile = path.join(process.cwd(), 'src/components/layout/mobile-nav.tsx');
const homepageRoutes = [
  'getCivilUrl()',
  'getConsultUrl()',
  'getAboutUrl()',
  'getLawyerJoinUrl()',
  'getGuardianCenterUrl()',
];

async function main() {
  const source = await fs.readFile(pageFile, 'utf8');
  const headerSource = await fs.readFile(headerFile, 'utf8');
  const mobileNavSource = await fs.readFile(mobileNavFile, 'utf8');

  for (const route of homepageRoutes) {
    const escapedRoute = route.replace(/[()]/g, '\\$&');
    assert.match(
      source,
      new RegExp(`<Link\\s+prefetch=\\{false\\}\\s+href=\\{${escapedRoute}\\}`),
      `${route} must not be automatically prefetched from the homepage`,
    );
  }

  assert.match(
    headerSource,
    /<Link\s+prefetch=\{false\}\s+href=\{USER_CENTER_HREF\}/,
    'the header user-center link must not trigger a registration prefetch',
  );

  for (const route of ['getCivilUrl()', 'getConsultUrl()']) {
    const escapedRoute = route.replace(/[()]/g, '\\$&');
    assert.match(
      mobileNavSource,
      new RegExp(`<Link\\s+prefetch=\\{false\\}\\s+href=\\{${escapedRoute}\\}`),
      `${route} must not be automatically prefetched from the mobile navigation`,
    );
  }

  console.log('home link prefetch performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
