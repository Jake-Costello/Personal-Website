import { expect, test } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

const golfModule = /\/(?:src\/components\/GolfFacts\.tsx|assets\/GolfFacts-[^/?]+\.js)(?:\?|$)/;

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

test('home starts live protein data before loading golf near About without shifting its space', async ({
  page,
}) => {
  let golfRequests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(golfModule, async (route) => {
    golfRequests += 1;
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'JAKE COSTELLO.' })).toBeVisible();
    await expect(page.locator('.protein-status.is-live')).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    const region = page.getByRole('group', { name: 'Golf stories', exact: true });
    await expect(region).toHaveAttribute('data-golf-ready', 'false');
    expect(golfRequests).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Stop 300px before the scene enters view: the 600px margin should warm it already.
    await region.evaluate((element) => {
      window.scrollTo({
        top: window.scrollY + element.getBoundingClientRect().top - window.innerHeight - 300,
        behavior: 'instant',
      });
    });
    await expect.poll(() => golfRequests).toBe(1);
    expect(
      await region.evaluate((element) => element.getBoundingClientRect().top > window.innerHeight),
    ).toBe(true);
    const reservedHeight = await region.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    release();
    await expect(region).toHaveAttribute('data-golf-ready', 'true');
    await expect(region.locator('.golf-club-button')).toHaveCount(6);
    const loadedHeight = await region.evaluate((element) => element.getBoundingClientRect().height);
    expect(Math.abs(loadedHeight - reservedHeight)).toBeLessThan(1);

    const mountedScene = await region.locator('.golf-facts').elementHandle();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await mountedScene!.evaluate((element) => element.isConnected)).toBe(true);
    await expect(region).toHaveAttribute('data-golf-ready', 'true');
    expect(golfRequests).toBe(1);
  } finally {
    release();
  }
});

test('direct About navigation loads golf and moves keyboard focus from its placeholder to a club', async ({
  page,
}) => {
  let requested = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(golfModule, async (route) => {
    requested = true;
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/#about', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => requested).toBe(true);
    const region = page.getByRole('group', { name: 'Golf stories', exact: true });
    await expect(region).toHaveAttribute('aria-busy', 'true');
    await region.focus();
    await expect(region).toBeFocused();
    release();
    await expect(region).toHaveAttribute('data-golf-ready', 'true');
    const driver = region.locator('.golf-club-button').first();
    await expect(driver).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Personal fact', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(region.locator('.golf-facts')).toHaveAttribute('data-phase', 'idle');
    await expect(driver).toBeFocused();
  } finally {
    release();
  }
});

test('a failed golf module leaves the homepage usable and recovers after reloading', async ({
  page,
}) => {
  let requests = 0;
  await page.route(golfModule, async (route) => {
    requests += 1;
    if (requests === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#about', { waitUntil: 'domcontentloaded' });
  const region = page.getByRole('group', { name: 'Golf stories', exact: true });
  await expect(region.getByRole('status')).toContainText('couldn');
  await expect(page.getByRole('heading', { name: 'JAKE COSTELLO.' })).toBeVisible();
  await expect(page.locator('.protein-status.is-live')).toHaveCount(1);
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    region.getByRole('button', { name: 'Reload page', exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/\/#about$/);
  await expect(region).toHaveAttribute('data-golf-ready', 'true');
  await expect(region.locator('.golf-club-button')).toHaveCount(6);
  expect(requests).toBe(2);
});
