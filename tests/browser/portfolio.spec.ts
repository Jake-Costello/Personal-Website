import { expect, test } from '@playwright/test';

test('the portfolio renders without errors or horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'JACOB COSTELLO.' })).toBeVisible();
  await expect(page.getByText('THE PROTEIN PLAYGROUND')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: `.cache/${testInfo.project.name}-page.png`, fullPage: true });
});

test('all experience is reachable without playing, with the dock at the final chapter', async ({
  page,
}) => {
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.getByRole('heading', { name: 'And that explains the jetski.' })).toBeVisible();
  await expect(
    page.locator('.journey-stage').getByRole('link', { name: 'Meet Revision Marine' }),
  ).toHaveAttribute('href', '#project-revision');
  await page.getByRole('button', { name: 'Read as a timeline ↗' }).click();
  await expect(page.locator('.journey-overview > li')).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: 'Good code starts with a real problem.' }),
  ).toBeVisible();
});

test('the focused game responds to keys and stops consuming them after blur', async ({ page }) => {
  await page.goto('/#experience');
  const stage = page.getByRole('group', { name: /^Playable jetski experience/ });
  await stage.focus();
  await page.keyboard.down('ArrowRight');
  await expect(
    page.getByRole('heading', { name: 'An old payphone. Some new possibilities.' }),
  ).toBeVisible();
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Read as a timeline ↗' }).focus();
  const positionBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(positionBefore);
});

test('project details are accessible and the dialog closes with Escape', async ({ page }) => {
  await page.goto('/#work');
  await page.getByRole('button', { name: 'Read about Revision Marine' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Revision Marine', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('protein prototype filters connections and supports accessible selection', async ({
  page,
}) => {
  await page.goto('/#lab');
  await expect(page.getByText('ILLUSTRATIVE DEMO', { exact: true })).toBeVisible();
  const readout = page
    .locator('.protein-readout > div')
    .filter({ hasText: 'CONNECTIONS' })
    .locator('strong');
  const initialEdges = Number(await readout.textContent());
  const threshold = page.getByRole('slider', { name: 'Connection confidence' });
  await threshold.focus();
  await threshold.press('End');
  await expect.poll(async () => Number(await readout.textContent())).toBeLessThan(initialEdges);
  await page.getByText('Explore the data & how it works').click();
  await page
    .locator('.protein-node-list')
    .getByRole('button', { name: 'CDK2', exact: true })
    .click();
  await expect(page.locator('.protein-selected-heading h4')).toHaveText('CDK2');
  await page.getByRole('button', { name: 'Rotate network right' }).click();
  await expect(page.getByRole('button', { name: 'Reset network view' })).toBeEnabled();
  const labels = page.getByRole('button', { name: 'Show all protein labels' });
  await expect(labels).toHaveAttribute('aria-pressed', 'false');
  await labels.click();
  await expect(labels).toHaveAttribute('aria-pressed', 'true');
});

test('small screens expose working navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu +' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Selected work' }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole('button', { name: 'Menu +' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
