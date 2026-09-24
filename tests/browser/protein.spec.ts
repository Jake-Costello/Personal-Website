import { expect, test } from '@playwright/test';
import { catalog, fulfillNetwork, installProteinApi, networkFixture } from './protein-fixtures';

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

test('protein descriptions stay visible and keep a fixed height across selections', async ({
  page,
}) => {
  await page.route('**/api/proteins', (route) =>
    route.fulfill({
      json: {
        ...catalog,
        proteins: catalog.proteins.map((protein) => ({
          ...protein,
          name:
            protein.symbol === 'TP53'
              ? 'Long annotation about protein function and interactions. '.repeat(10).slice(0, 500)
              : protein.symbol === 'MDM2'
                ? 'A short protein description.'
                : protein.symbol,
        })),
      },
    }),
  );
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  await page.getByLabel('First protein', { exact: true }).selectOption('TP53');
  await page.getByLabel('Second protein', { exact: true }).selectOption('MDM2');
  await page.getByRole('button', { name: /^Explore network/ }).click();
  const about = page.getByRole('region', { name: 'About this protein' });
  await expect(about).toContainText('Long annotation');
  await expect(about.getByRole('link')).toHaveAttribute(
    'href',
    'https://version-12-0.string-db.org/network/9606.TP53',
  );
  const height = (await about.boundingBox())!.height;
  const graphHeight = (await page.locator('.protein-canvas-panel').boundingBox())!.height;
  const copy = about.locator('p');
  expect(await copy.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.getByRole('button', { name: /^MDM2, group/ }).click();
  await expect(about).toContainText('A short protein description.');
  expect((await about.boundingBox())!.height).toBe(height);
  expect((await page.locator('.protein-canvas-panel').boundingBox())!.height).toBe(graphHeight);
  await expect(about.getByRole('link')).toHaveAttribute(
    'href',
    'https://version-12-0.string-db.org/network/9606.MDM2',
  );
  await page.getByRole('button', { name: /^CDK2, group/ }).click();
  await expect(about).toContainText('No description is included');
  expect((await about.boundingBox())!.height).toBe(height);
  await expect(page.getByRole('heading', { name: 'From APIs to a working tool.' })).toBeVisible();
  await page
    .locator('.protein-layout')
    .screenshot({ path: `.cache/lab-layout-${page.viewportSize()!.width}.png` });
  await page
    .locator('.protein-support')
    .screenshot({ path: `.cache/lab-support-${page.viewportSize()!.width}.png` });
});

test('loads two distinct random proteins without a click or synthetic fallback', async ({
  page,
}) => {
  const requests: URL[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/network') requests.push(new URL(request.url()));
  });
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  expect(requests.length).toBeGreaterThan(0);
  const query = requests.at(-1)!.searchParams;
  const pair = query.get('proteins')!.split(',');
  expect(new Set(pair).size).toBe(2);
  expect(
    pair.every((symbol) => catalog.proteins.some((protein) => protein.symbol === symbol)),
  ).toBe(true);
  expect(query.get('neighbors')).toBe('8');
  await expect(page.getByLabel('First protein', { exact: true })).toHaveValue(pair[0]);
  await expect(page.getByLabel('Second protein', { exact: true })).toHaveValue(pair[1]);
  await expect(page.locator('.protein-explorer')).not.toContainText(/demo|illustrative/i);
  await expect(page.locator('.protein-notes')).toContainText('Retrieved');
  await expect(page.getByRole('button', { name: 'Random pair', exact: true })).toHaveCount(0);
  const explore = page.getByRole('button', { name: /^Explore network/ });
  await expect(explore).toBeVisible();
  await expect(explore).toHaveCSS('border-radius', '50%');
  const exploreBounds = (await explore.boundingBox())!;
  const firstBounds = (await page.getByLabel('First protein', { exact: true }).boundingBox())!;
  expect(Math.abs(exploreBounds.width - exploreBounds.height)).toBeLessThan(1.5);
  expect(exploreBounds.x).toBeGreaterThanOrEqual(firstBounds.x + firstBounds.width);
  const alignedInput =
    page.viewportSize()!.width > 850
      ? firstBounds
      : (await page.getByLabel('Second protein', { exact: true }).boundingBox())!;
  expect(
    Math.abs(exploreBounds.y + exploreBounds.height / 2 - alignedInput.y - alignedInput.height / 2),
  ).toBeLessThan(1);
  await page
    .locator('.protein-query')
    .screenshot({ path: `.cache/lab-query-${page.viewportSize()!.width}.png` });
});

test('two selectors show association hints and can display an isolated pair', async ({ page }) => {
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  const first = page.getByLabel('First protein', { exact: true });
  const second = page.getByLabel('Second protein', { exact: true });
  await first.selectOption('TP53');
  await expect(second.locator('option[value="MDM2"]')).toContainText('0.99');
  const duplicate = second.locator('option[value="TP53"]');
  if (await duplicate.count()) await expect(duplicate).toBeDisabled();
  await first.selectOption('BRCA1');
  await second.selectOption('EGFR');
  await page.getByLabel('Network size', { exact: true }).selectOption('0');
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/network' && url.searchParams.get('neighbors') === '0';
  });
  await page.getByRole('button', { name: /^Explore network/ }).click();
  await responsePromise;
  await expect(page.locator('.protein-node')).toHaveCount(2);
  await expect(page.locator('.protein-graph > line')).toHaveCount(0);
  await expect(page.locator('.protein-readout')).toContainText('COMMUNITIES');
  await expect(
    page.locator('.protein-readout > div').filter({ hasText: 'COMMUNITIES' }).locator('strong'),
  ).toHaveText('2');
  await expect(page.locator('.protein-explorer')).toContainText(
    /no (connections|links|associations)/i,
  );
});

test('catalog failure offers retry and never replaces missing data with a demo', async ({
  page,
}) => {
  await page.route('**/api/proteins', (route) =>
    route.fulfill({ status: 503, json: { detail: 'Unavailable' } }),
  );
  await page.goto('/#lab');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.protein-node')).toHaveCount(0);
  await expect(page.locator('.protein-explorer')).not.toContainText(/demo|illustrative/i);
  await page.unroute('**/api/proteins');
  await page.route('**/api/proteins', (route) => route.fulfill({ json: catalog }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('failed replacement request preserves the last real graph and recovers', async ({ page }) => {
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  const priorNodes = await page.locator('.protein-node').count();
  const priorLabel = await page.locator('.protein-selected-heading h4').textContent();
  await page.route('**/api/network?**', (route) =>
    route.fulfill({ status: 429, json: { detail: 'Busy' }, headers: { 'Retry-After': '1' } }),
  );
  await page.getByLabel('First protein', { exact: true }).selectOption('EGFR');
  await page.getByRole('button', { name: /^Explore network/ }).click();
  await expect(page.getByRole('alert')).toContainText(/busy|minute|try again/i);
  await expect(page.locator('.protein-node')).toHaveCount(priorNodes);
  await expect(page.locator('.protein-selected-heading h4')).toHaveText(priorLabel!);
  await page.unroute('**/api/network?**');
  await page.route('**/api/network?**', fulfillNetwork);
  await page.getByRole('button', { name: /^Explore network/ }).click();
  await expect(page.locator('.protein-selected-heading h4')).toHaveText('EGFR');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a network failure on initial load remains empty until a successful retry', async ({
  page,
}) => {
  await page.route('**/api/network?**', (route) =>
    route.fulfill({ status: 504, json: { detail: 'Timeout' } }),
  );
  await page.goto('/#lab');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.protein-node')).toHaveCount(0);
  await expect(page.locator('.protein-explorer')).not.toContainText(/demo|illustrative/i);
  await page.unroute('**/api/network?**');
  await page.route('**/api/network?**', fulfillNetwork);
  await page
    .getByRole('button', { name: /Retry|Explore network/i })
    .first()
    .click();
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
});

test('malformed scientific data is rejected instead of displayed', async ({ page }) => {
  await page.route('**/api/network?**', (route) => {
    const result = networkFixture(route.request().url());
    return route.fulfill({
      json: { ...result, source: { ...result.source, url: 'https://untrusted.example/' } },
    });
  });
  await page.goto('/#lab');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.protein-node')).toHaveCount(0);
  await expect(page.locator('.protein-notes a[href="https://untrusted.example/"]')).toHaveCount(0);
});
