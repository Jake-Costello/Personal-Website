import { expect, test } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

test('mobile navigation dismisses with Escape and returns focus to its toggle', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.menu-toggle');
  await toggle.tap();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Selected work' }).focus();
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: testInfo.outputPath('mobile-escape.png'),
  });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.tap();
  await navigation.getByRole('link', { name: 'Selected work' }).tap();
  await expect(page).toHaveURL(/#work$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('project dialogs retain focus, dismissal, lab navigation and viewport fit', async ({
  page,
}, testInfo) => {
  await page.setViewportSize(
    testInfo.project.name === 'mobile'
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
  );
  await page.goto('/#work');
  const trigger = page.getByRole('button', { name: 'Read about Revision Marine' });
  if (testInfo.project.name === 'mobile') await trigger.tap();
  else {
    await trigger.focus();
    await trigger.press('Enter');
  }
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: 'Close project details' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('link', { name: 'Visit Revision Marine' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-dialog.png`),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Read about Protein Explorer' }).click();
  await dialog.getByRole('link', { name: 'Explore the lab' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/#lab$/);
});

test('project dialog contains scrolling and restores page scrolling on close', async ({
  page,
}, testInfo) => {
  await page.goto('/#work');
  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'auto');
  await page.getByRole('button', { name: 'Read about Revision Marine' }).click();
  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'stable');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe('hidden');
  const before = await page.evaluate(() => scrollY);
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const bounds = (await dialog.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 30);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.screenshot({ path: testInfo.outputPath('contained-dialog.png') });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'auto');
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});
