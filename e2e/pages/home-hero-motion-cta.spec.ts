import { expect, test } from '@playwright/test';

test.describe('首页首屏动效与咨询入口', () => {
  test('呈现批准的文案和两个完整咨询入口', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /AI千问\s*不如\s*律师一言/ })).toBeVisible();
    await expect(page.getByText('AI 可以帮你做很多事。')).toBeVisible();
    await expect(page.getByText('但有些事，需要有人为你认真把关。')).toBeVisible();

    const civilLink = page.getByRole('link', { name: /民事咨询.*合同、婚姻、债务与日常权益/ });
    const criminalLink = page.getByRole('link', { name: /刑事咨询.*拘留、取保、辩护与刑事风险/ });

    await expect(civilLink).toHaveAttribute('href', '/civil');
    await expect(criminalLink).toHaveAttribute('href', '/consult');
    await expect(page.locator('.consult-entry-index')).toHaveCount(0);
  });

  test('窄屏时入口纵向堆叠并保持足够触控高度', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const entries = page.locator('[data-consult-entry]');
    await expect(entries).toHaveCount(2);

    const civilBox = await entries.nth(0).boundingBox();
    const criminalBox = await entries.nth(1).boundingBox();

    expect(civilBox).not.toBeNull();
    expect(criminalBox).not.toBeNull();
    expect(civilBox!.height).toBeGreaterThanOrEqual(72);
    expect(criminalBox!.height).toBeGreaterThanOrEqual(72);
    expect(criminalBox!.y).toBeGreaterThan(civilBox!.y + civilBox!.height - 1);
  });

  test('键盘聚焦入口时显示明确焦点反馈', async ({ page }) => {
    await page.goto('/');

    const civilLink = page.locator('[data-consult-entry="civil"]');
    await civilLink.focus();

    const focusStyle = await civilLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        boxShadow: style.boxShadow,
      };
    });

    const hasOutline = focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth > 0;
    const hasRing = focusStyle.boxShadow !== 'none';
    expect(hasOutline || hasRing).toBe(true);
  });

  test('正常偏好播放标题动画，减少动画偏好直接呈现最终内容', async ({ browser }) => {
    const normalContext = await browser.newContext({ reducedMotion: 'no-preference' });
    const normalPage = await normalContext.newPage();
    await normalPage.goto('/');

    const normalTitle = normalPage.locator('[data-hero-motion="ai"]');
    await expect(normalTitle).toBeVisible();
    const normalAnimationName = await normalTitle.evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(normalAnimationName).not.toBe('none');
    await normalContext.close();

    const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto('/');

    const reducedTitle = reducedPage.locator('[data-hero-motion="ai"]');
    await expect(reducedTitle).toBeVisible();
    const reducedStyle = await reducedTitle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: Number.parseFloat(style.animationDuration),
        opacity: style.opacity,
      };
    });

    expect(reducedStyle.animationDuration).toBeLessThanOrEqual(0.001);
    expect(reducedStyle.opacity).toBe('1');
    await reducedContext.close();
  });
});
