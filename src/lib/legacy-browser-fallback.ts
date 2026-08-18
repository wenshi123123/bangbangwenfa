export const LEGACY_BROWSER_CLASS = 'legacy-browser';

/**
 * Tailwind 4 emits CSS cascade layers and modern color functions. Older mobile
 * browser kernels can reject those rules wholesale, so mark them before paint
 * and apply a small, standards-era fallback stylesheet.
 */
export function buildLegacyBrowserDetectionScript() {
  return `;(function () {
  var root = document.documentElement;
  if (!root) return;

  var supportsCoreLayoutCss = false;
  try {
    /*
     * 不要用 oklch 作为整套 CSS 的兼容性门槛。
     * 部分移动浏览器只是不支持这种颜色语法，但仍然能够正确处理
     * flex/grid/sticky 等布局；这时应继续使用主样式，才能保持跨浏览器一致。
     */
    supportsCoreLayoutCss = Boolean(
      window.CSS &&
        typeof window.CSS.supports === 'function' &&
        window.CSS.supports('display', 'flex') &&
        window.CSS.supports('display', 'grid') &&
        window.CSS.supports('position', 'sticky')
    );
  } catch (error) {
    supportsCoreLayoutCss = false;
  }

  if (!supportsCoreLayoutCss && (' ' + root.className + ' ').indexOf(' ${LEGACY_BROWSER_CLASS} ') === -1) {
    root.className += (root.className ? ' ' : '') + '${LEGACY_BROWSER_CLASS}';
  }
})();`;
}

export const LEGACY_BROWSER_FALLBACK_CSS = `
html.${LEGACY_BROWSER_CLASS},
html.${LEGACY_BROWSER_CLASS} body {
  min-height: 100%;
  margin: 0;
  background: #faf7f2;
  color: #3d322d;
  font-family: Arial, 'Microsoft YaHei', sans-serif;
  line-height: 1.6;
}

html.${LEGACY_BROWSER_CLASS} *,
html.${LEGACY_BROWSER_CLASS} *::before,
html.${LEGACY_BROWSER_CLASS} *::after {
  box-sizing: border-box;
}

/* 旧内核可能无法执行现代动画，不能让内容停留在 opacity: 0。 */
html.${LEGACY_BROWSER_CLASS} *,
html.${LEGACY_BROWSER_CLASS} *::before,
html.${LEGACY_BROWSER_CLASS} *::after {
  animation: none !important;
  transition: none !important;
}

html.${LEGACY_BROWSER_CLASS} body {
  font-size: 16px;
  line-height: 1.6;
}

html.${LEGACY_BROWSER_CLASS} h1,
html.${LEGACY_BROWSER_CLASS} h2,
html.${LEGACY_BROWSER_CLASS} h3,
html.${LEGACY_BROWSER_CLASS} h4,
html.${LEGACY_BROWSER_CLASS} p {
  max-width: 100%;
  margin-top: 0;
  overflow-wrap: anywhere;
}

html.${LEGACY_BROWSER_CLASS} h1 {
  font-size: 32px;
  line-height: 1.3;
}

html.${LEGACY_BROWSER_CLASS} h2 {
  font-size: 26px;
  line-height: 1.35;
}

html.${LEGACY_BROWSER_CLASS} h3 {
  font-size: 21px;
  line-height: 1.4;
}

html.${LEGACY_BROWSER_CLASS} img {
  display: block;
  max-width: 100%;
  height: auto;
}

html.${LEGACY_BROWSER_CLASS} a {
  color: #a85d40;
  text-decoration: none;
}

html.${LEGACY_BROWSER_CLASS} button,
html.${LEGACY_BROWSER_CLASS} input,
html.${LEGACY_BROWSER_CLASS} textarea {
  font: inherit;
}

html.${LEGACY_BROWSER_CLASS} button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #c47353;
  border-radius: 20px;
  background: #ffffff;
  color: #a85d40;
}

html.${LEGACY_BROWSER_CLASS} header {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 56px;
  padding: 0;
  border-bottom: 1px solid #e8d8cc;
  background: #faf7f2;
}

/* 公共 Header：Tailwind 不可用时仍保持可用的移动端布局。 */
html.${LEGACY_BROWSER_CLASS} header.nav-inner > .container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 12px;
}

html.${LEGACY_BROWSER_CLASS} header.nav-inner > .container > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  gap: 8px;
}

html.${LEGACY_BROWSER_CLASS} .nav-logo {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  min-width: 0;
}

html.${LEGACY_BROWSER_CLASS} .nav-logo > div {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px;
  max-width: 32px;
  flex: 0 0 32px;
  overflow: hidden;
  border-radius: 8px;
}

html.${LEGACY_BROWSER_CLASS} .nav-logo img,
html.${LEGACY_BROWSER_CLASS} .nav-logo > div > img {
  display: block;
  width: 100% !important;
  height: 100% !important;
  max-width: none;
  object-fit: contain;
}

html.${LEGACY_BROWSER_CLASS} .nav-logo > span {
  display: inline-block;
  max-width: 8em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 17px;
}

html.${LEGACY_BROWSER_CLASS} .nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 6px;
}

html.${LEGACY_BROWSER_CLASS} .nav-actions > div {
  display: flex;
  align-items: center;
  gap: 6px;
}

html.${LEGACY_BROWSER_CLASS} .nav-actions button,
html.${LEGACY_BROWSER_CLASS} .nav-actions a {
  white-space: nowrap;
}

html.${LEGACY_BROWSER_CLASS} .nav-actions > button,
html.${LEGACY_BROWSER_CLASS} .nav-actions > div > button:last-child {
  min-width: 40px;
  min-height: 40px;
  padding: 8px;
}

html.${LEGACY_BROWSER_CLASS} [data-slot="sheet-content"] {
  position: fixed;
  z-index: 50;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 0;
  border-top: 1px solid #e8d8cc;
  border-radius: 18px 18px 0 0;
  background: #ffffff;
}

html.${LEGACY_BROWSER_CLASS} [data-slot="dialog-overlay"],
html.${LEGACY_BROWSER_CLASS} [data-slot="sheet-overlay"] {
  position: fixed;
  z-index: 40;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

html.${LEGACY_BROWSER_CLASS} [data-slot="dialog-content"] {
  position: fixed;
  z-index: 50;
  top: 50%;
  left: 50%;
  width: calc(100% - 32px);
  max-width: 520px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  transform: translate(-50%, -50%);
  border: 1px solid #e8d8cc;
  border-radius: 12px;
  background: #ffffff;
}

html.${LEGACY_BROWSER_CLASS} main {
  display: block;
  width: 100%;
  min-width: 0;
}

html.${LEGACY_BROWSER_CLASS} main > div,
html.${LEGACY_BROWSER_CLASS} main > section,
html.${LEGACY_BROWSER_CLASS} main section {
  display: block;
  width: 100%;
  padding: 28px 16px;
}

html.${LEGACY_BROWSER_CLASS} main section > div {
  max-width: 720px;
  margin: 0 auto;
}

html.${LEGACY_BROWSER_CLASS} main input,
html.${LEGACY_BROWSER_CLASS} main select,
html.${LEGACY_BROWSER_CLASS} main textarea {
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid #e8d8cc;
  border-radius: 8px;
  background: #ffffff;
  color: #3d322d;
}

html.${LEGACY_BROWSER_CLASS} main textarea {
  min-height: 96px;
  resize: vertical;
}

html.${LEGACY_BROWSER_CLASS} main button,
html.${LEGACY_BROWSER_CLASS} main a[role="button"] {
  max-width: 100%;
  white-space: normal;
  word-break: break-word;
}

html.${LEGACY_BROWSER_CLASS} main table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

html.${LEGACY_BROWSER_CLASS} main th,
html.${LEGACY_BROWSER_CLASS} main td {
  padding: 8px;
  border-bottom: 1px solid #e8d8cc;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}

html.${LEGACY_BROWSER_CLASS} main img {
  max-width: 100%;
  height: auto;
}

html.${LEGACY_BROWSER_CLASS} .hero-content {
  display: block;
  max-width: 680px;
  margin: 0 auto;
  padding: 36px 16px 16px;
  text-align: center;
}

html.${LEGACY_BROWSER_CLASS} .hero-content > * {
  display: block;
  opacity: 1 !important;
  transform: none !important;
}

html.${LEGACY_BROWSER_CLASS} .hero-content h1 {
  margin: 0 0 18px;
  font-size: 32px;
  font-weight: 400;
  line-height: 1.3;
}

html.${LEGACY_BROWSER_CLASS} .hero-content p {
  margin: 10px 0;
}

html.${LEGACY_BROWSER_CLASS} .hero-content a,
html.${LEGACY_BROWSER_CLASS} .hero-content button {
  display: inline-block;
  margin: 10px 6px 0;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel {
  position: relative;
  display: block;
  width: 100%;
  opacity: 1 !important;
  transform: none !important;
  max-width: 720px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: #f5ede5;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel > div:first-child {
  position: relative;
  width: 100%;
  min-height: 420px;
  aspect-ratio: 4 / 5;
  overflow: hidden;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel > div:first-child > div {
  position: relative;
  width: 100%;
  height: 100%;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel > div:first-child > div > div {
  position: absolute;
  inset: 0;
  display: none;
  opacity: 0;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel > div:first-child > div > div[class*="opacity-100"] {
  display: flex;
  opacity: 1;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel > div:first-child > div > div[class*="opacity-0"] {
  display: none;
  opacity: 0;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel img {
  width: 100%;
  height: 100%;
  max-height: 420px;
  object-fit: cover;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .absolute {
  position: absolute;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .inset-0 {
  inset: 0;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .left-5 {
  left: 20px;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .right-5 {
  right: 20px;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .bottom-24 {
  bottom: 96px;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel .bottom-4 {
  bottom: 16px;
}

html.${LEGACY_BROWSER_CLASS} footer {
  padding: 28px 16px;
  background: #3d322d;
  color: #ffffff;
}
`;
