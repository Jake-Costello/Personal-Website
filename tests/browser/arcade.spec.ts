import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

const cabinets = [
  'Sketch-to-Ride',
  'Warehouse Shift',
  'Protein Playground',
  'Shoreline Run',
] as const;

function choose(page: Page, title: string) {
  return page.getByRole('button', { name: `Choose ${title}`, exact: true });
}

async function expectSelected(page: Page, title: string) {
  for (const cabinet of cabinets) {
    await expect(choose(page, cabinet)).toHaveAttribute('aria-pressed', String(cabinet === title));
  }
}

async function expectReachable(control: Locator, page: Page) {
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  const bounds = await control.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.width).toBeGreaterThanOrEqual(23.99);
  expect(bounds!.height).toBeGreaterThanOrEqual(23.99);
}

test('the arcade loads and reloads directly without loading portfolio data', async ({ page }) => {
  const errors: string[] = [];
  const dataRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith('/api/') ||
      /string-db\.org|ensembl\.org|rcsb\.org|api\.openai\.com/.test(url.hostname)
    ) {
      dataRequests.push(request.url());
    }
  });
  for (const navigate of [() => page.goto('/arcade/'), () => page.reload()]) {
    const response = await navigate();
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Project Arcade — Jake Costello');
    await expect(page.getByRole('heading', { name: /^Project Arcade/ })).toBeVisible();
    await expectSelected(page, 'Sketch-to-Ride');
    await expect(page.locator('.protein-explorer, .journey, .golf-facts')).toHaveCount(0);
  }
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('cabinet selection wraps and supports focused keyboard navigation', async ({ page }) => {
  await page.goto('/arcade/');
  const selector = page.getByRole('region', { name: 'Project cabinet selector', exact: true });
  for (const title of [...cabinets.slice(1), cabinets[0]]) {
    await page.getByRole('button', { name: 'Next cabinet', exact: true }).click();
    await expectSelected(page, title);
  }
  await page.getByRole('button', { name: 'Previous cabinet', exact: true }).click();
  await expectSelected(page, 'Shoreline Run');
  await selector.focus();
  await page.keyboard.press('ArrowRight');
  await expectSelected(page, 'Sketch-to-Ride');
  await page.keyboard.press('ArrowLeft');
  await expectSelected(page, 'Shoreline Run');
  await choose(page, 'Warehouse Shift').click();
  await expectSelected(page, 'Warehouse Shift');
  // The selector must not hijack arrows while one of its ordinary controls has focus.
  await choose(page, 'Warehouse Shift').focus();
  await page.keyboard.press('ArrowRight');
  await expectSelected(page, 'Warehouse Shift');
});

test('visible side cabinets can be selected and the joystick advances the carousel', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/arcade/');
  const warehouseSide = page.locator(
    '.cabinet-select-overlay[aria-label="Select Warehouse Shift"]',
  );
  await expect(warehouseSide).toBeVisible();
  await warehouseSide.click();
  await expectSelected(page, 'Warehouse Shift');
  await page.getByRole('button', { name: 'Joystick: next cabinet', exact: true }).click();
  await expectSelected(page, 'Protein Playground');
  const previousSide = page.locator('.cabinet-select-overlay[aria-label="Select Warehouse Shift"]');
  await previousSide.click();
  await expectSelected(page, 'Warehouse Shift');
});

test('touch swipes rotate cabinets while vertical gestures preserve the selection', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/arcade/');
  const stage = page.locator('.arcade-stage');
  await stage.scrollIntoViewIfNeeded();
  const session = await page.context().newCDPSession(page);
  try {
    const bounds = (await stage.boundingBox())!;
    const start = { id: 1, x: bounds.x + bounds.width * 0.73, y: bounds.y + bounds.height - 14 };
    // Start below the cabinets, where a swipe cannot accidentally press a game button.
    expect(
      await page.evaluate(
        ({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button, a')),
        start,
      ),
    ).toBe(false);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let step = 1; step <= 5; step += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...start, x: start.x - (bounds.width * 0.46 * step) / 5 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expectSelected(page, 'Warehouse Shift');

    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let step = 1; step <= 5; step += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...start, x: start.x + step * 2, y: start.y - step * 22 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expectSelected(page, 'Warehouse Shift');
  } finally {
    await session.detach();
  }
});

test('only the selected cabinet exposes enabled project actions', async ({ page }) => {
  await page.goto('/arcade/');
  for (const selected of ['Sketch-to-Ride', 'Warehouse Shift']) {
    await choose(page, selected).click();
    await expect(
      page.getByRole('button', { name: `${selected}: preview`, exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: `${selected}: details`, exact: true }),
    ).toBeEnabled();
    for (const title of cabinets.filter((title) => title !== selected)) {
      const actions = page.locator(
        `[aria-label="${title}: details"], [aria-label="${title}: preview"], [aria-label="${title}: start"]`,
      );
      for (const action of await actions.all()) {
        const unavailable = await action.evaluate((element) =>
          Boolean(
            element.closest('[inert]') ||
            element.matches(':disabled') ||
            (element.getAttribute('aria-disabled') === 'true' &&
              element.getAttribute('tabindex') === '-1'),
          ),
        );
        expect(unavailable, `${title} must not activate while another cabinet is selected`).toBe(
          true,
        );
      }
    }
  }
});

test('project previews explain their status and return focus after closing', async ({ page }) => {
  await page.goto('/arcade/');
  const preview = page.getByRole('button', { name: 'Sketch-to-Ride: preview', exact: true });
  await preview.click();
  const dialog = page.getByRole('dialog', { name: 'Sketch-to-Ride', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/(?:not|isn.t) playable yet/i);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(preview).toBeFocused();

  const selector = page.getByRole('region', { name: 'Project cabinet selector', exact: true });
  await selector.focus();
  await page.keyboard.press('a');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Close project details', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(selector).toBeFocused();
  await page.keyboard.press('b');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(selector).toBeFocused();
});

test('live cabinet start actions link to the existing experiences', async ({ page }) => {
  await installProteinApi(page);
  for (const [title, anchor] of [
    ['Protein Playground', 'lab'],
    ['Shoreline Run', 'experience'],
  ]) {
    await page.goto('/arcade/');
    await choose(page, title).click();
    const start = page.getByRole('button', { name: `${title}: start`, exact: true });
    await start.click();
    await expect(page).toHaveURL(new RegExp(`/#${anchor}$`));
    await expect(page.locator(`#${anchor}`)).toBeVisible();
  }
});

test('motion can be paused and reduced-motion starts stationary', async ({ page }) => {
  await page.goto('/arcade/');
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeDisabled();
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.arcade-backdrop')).toHaveAttribute('data-renderer', 'static');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume motion', exact: true })).toBeVisible();
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-motion', 'paused');
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-motion', 'running');
});

test('the homepage links to the separate arcade and preserves its project cards', async ({
  page,
}) => {
  await installProteinApi(page);
  await page.goto('/#work');
  await expect(page.locator('#work .project-card')).toHaveCount(2);
  const invitation = page.getByRole('link', { name: /A few experiments worth playing/ });
  await expect(invitation).toHaveAttribute('href', '/arcade/');
  await invitation.click();
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.goBack();
  const menu = page.getByRole('button', { name: 'Menu +', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Project Arcade', exact: true })
    .click();
  await expect(page).toHaveURL(/\/arcade\/$/);
});

test('small screens keep cabinet controls reachable without horizontal page overflow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/arcade/');
  await page.evaluate(() => document.fonts.ready);
  for (const title of cabinets) {
    await choose(page, title).click();
    await expectSelected(page, title);
    await expectReachable(choose(page, title), page);
    await expectReachable(
      page.getByRole('button', { name: 'Previous cabinet', exact: true }),
      page,
    );
    await expectReachable(page.getByRole('button', { name: 'Next cabinet', exact: true }), page);
    await expectReachable(
      page.getByRole('button', { name: `${title}: details`, exact: true }),
      page,
    );
    const start = page.getByRole('button', { name: `${title}: start`, exact: true });
    const primary = (await start.count())
      ? start
      : page.getByRole('button', { name: `${title}: preview`, exact: true });
    await expectReachable(primary, page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
