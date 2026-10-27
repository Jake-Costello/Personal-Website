import { expect, test } from '@playwright/test';

test('the owner setup link excludes this browser, persists on reload, and can be undone', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('umami.is')) requests.push(request.url());
  });
  await page.goto('/analytics.html?exclude=1');
  await expect(page.getByRole('status')).toHaveText('Your visits are excluded in this browser.');
  await expect(page).toHaveURL(/\/analytics\.html$/);
  expect(await page.evaluate(() => localStorage.getItem('umami.disabled'))).toBe('1');
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Your visits are excluded in this browser.');
  await page.getByRole('button', { name: 'Allow counting again' }).click();
  await expect(page.getByRole('status')).toHaveText('Visits from this browser can be counted.');
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('umami.disabled'))).toBeNull();
  await expect(page.getByRole('status')).toHaveText('Visits from this browser can be counted.');
  expect(requests).toEqual([]);
});

test('blocked browser storage does not falsely report a saved preference', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked');
    };
  });
  await page.goto('/analytics.html?exclude=1');
  await expect(page.getByRole('status')).toContainText(
    'This browser blocked saving the preference.',
  );
});
