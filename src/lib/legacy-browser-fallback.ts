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

  var supportsModernCss = false;
  try {
    supportsModernCss = Boolean(
      window.CSS &&
        typeof window.CSS.supports === 'function' &&
        window.CSS.supports('color', 'oklch(50% 0.1 30)')
    );
  } catch (error) {
    supportsModernCss = false;
  }

  if (!supportsModernCss && (' ' + root.className + ' ').indexOf(' ${LEGACY_BROWSER_CLASS} ') === -1) {
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
  padding: 10px 14px;
  border-bottom: 1px solid #e8d8cc;
  background: #faf7f2;
}

html.${LEGACY_BROWSER_CLASS} main {
  display: block;
  width: 100%;
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

html.${LEGACY_BROWSER_CLASS} .hero-content {
  max-width: 680px;
  margin: 0 auto;
  padding: 36px 16px 16px;
  text-align: center;
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
  max-width: 720px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: #f5ede5;
}

html.${LEGACY_BROWSER_CLASS} .hero-carousel img {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
}

html.${LEGACY_BROWSER_CLASS} footer {
  padding: 28px 16px;
  background: #3d322d;
  color: #ffffff;
}
`;
