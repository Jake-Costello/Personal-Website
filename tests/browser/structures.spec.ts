import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';
import { achievementMessages } from '../../src/data/achievements';

const storageKey = 'personal-website:achievements:v1';
const targets = {
  '1TUP': { entity: '3', uniprot: 'P04637' },
  '1YCR': { entity: '1', uniprot: 'Q00987' },
};

// RCSB-shaped fixtures exercise the live-data validation; these are not app data.
function record(url: string, predicted = false) {
  const parts = new URL(url).pathname.split('/');
  const entityRequest = parts.includes('polymer_entity');
  const code = (entityRequest ? parts.at(-2) : parts.at(-1)) as keyof typeof targets;
  const target = targets[code];
  if (!target) throw new Error(`Unexpected test structure ${code}`);
  return entityRequest
    ? {
        rcsb_id: `${code}_${target.entity}`,
        rcsb_polymer_entity_container_identifiers: {
          entry_id: code,
          entity_id: target.entity,
          uniprot_ids: [target.uniprot],
        },
        entity_poly: { rcsb_entity_polymer_type: 'Protein' },
        rcsb_entity_source_organism: [{ ncbi_taxonomy_id: 9606 }],
      }
    : {
        rcsb_id: code,
        rcsb_entry_container_identifiers: { entry_id: code, polymer_entity_ids: [target.entity] },
        struct: { title: 'Human experimental test structure' },
        exptl: [{ method: 'X-RAY DIFFRACTION' }],
        rcsb_entry_info: {
          structure_determination_methodology: predicted ? 'computational' : 'experimental',
          resolution_combined: [2.2],
        },
      };
}

async function fulfillStructure(route: Route) {
  await route.fulfill({ json: record(route.request().url()) });
}

async function openPair(page: Page) {
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  await page.getByLabel('First protein', { exact: true }).selectOption('TP53');
  await page.getByLabel('Second protein', { exact: true }).selectOption('MDM2');
  await page.getByRole('button', { name: /^Explore network/ }).click();
  await expect(page.locator('.protein-selected-heading h4')).toHaveText('TP53');
  await expect(
    page.getByRole('button', { name: 'Inspect experimental structure', exact: true }),
  ).toBeEnabled();
}

async function discoveries(page: Page) {
  return page.evaluate((key) => {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved).discoveredProteins ?? []) : [];
  }, storageKey);
}

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
  await page.route('https://data.rcsb.org/rest/v1/core/**', fulfillStructure);
});

test('only explicit inspections of two distinct proteins unlock the striped ball, once', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://data.rcsb.org/')) requests += 1;
  });
  await openPair(page);
  expect(requests).toBe(0);
  expect(await discoveries(page)).toEqual([]);
  await page.getByRole('button', { name: 'Inspect experimental structure', exact: true }).click();
  await expect(page.locator('.structure-verified')).toHaveText('Experimental evidence verified');
  await expect(page.getByRole('link', { name: /View 1TUP at RCSB PDB/ })).toHaveAttribute(
    'href',
    'https://www.rcsb.org/structure/1TUP',
  );
  await expect(page.locator('.structure-evidence')).toContainText('X-RAY DIFFRACTION');
  await expect(page.locator('.structure-challenge')).toContainText('1/2');
  expect(await discoveries(page)).toEqual(['TP53']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect structure again', exact: true }).click();
  await expect(page.locator('.structure-verified')).toBeVisible();
  expect(await discoveries(page)).toEqual(['TP53']);
  await page.getByRole('button', { name: /^MDM2, group/ }).click();
  await page.getByRole('button', { name: 'Inspect experimental structure', exact: true }).click();
  await expect(page.getByRole('dialog', { name: achievementMessages.striped.title })).toBeVisible();
  expect(await discoveries(page)).toEqual(['TP53', 'MDM2']);
  await page.getByRole('button', { name: 'Keep exploring', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.structure-challenge')).toContainText('MDM2 already counted.');
  await page.getByRole('button', { name: 'Inspect structure again', exact: true }).click();
  await expect(page.locator('.structure-verified')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.structure-challenge')).toContainText('2/2');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await discoveries(page)).toEqual(['TP53', 'MDM2']);
});

test('an upstream failure does not count or claim absence, and retry can recover', async ({
  page,
}) => {
  await page.route('https://data.rcsb.org/rest/v1/core/**', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await openPair(page);
  await page.getByRole('button', { name: 'Inspect experimental structure', exact: true }).click();
  await expect(page.locator('.experimental-structure [role="alert"]')).toContainText(
    'temporarily unavailable',
  );
  expect(await discoveries(page)).toEqual([]);
  await expect(page.locator('.structure-evidence')).toHaveCount(0);
  await page.unroute('https://data.rcsb.org/rest/v1/core/**');
  await page.route('https://data.rcsb.org/rest/v1/core/**', fulfillStructure);
  await page.getByRole('button', { name: 'Retry structure lookup', exact: true }).click();
  await expect(page.locator('.structure-verified')).toBeVisible();
  expect(await discoveries(page)).toEqual(['TP53']);
});

test('a predicted record cannot earn credit even when the protein and method field match', async ({
  page,
}) => {
  await page.route('https://data.rcsb.org/rest/v1/core/**', (route) =>
    route.fulfill({ json: record(route.request().url(), true) }),
  );
  await openPair(page);
  await page.getByRole('button', { name: 'Inspect experimental structure', exact: true }).click();
  await expect(page.locator('.experimental-structure [role="alert"]')).toContainText(
    'No discovery was recorded',
  );
  expect(await discoveries(page)).toEqual([]);
  await expect(page.locator('.structure-evidence')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const change of ['selected protein', 'pending network query']) {
  test(`an in-flight lookup cannot earn credit after changing the ${change}`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let received = 0;
    await page.route('https://data.rcsb.org/rest/v1/core/**', async (route) => {
      received += 1;
      await pending;
      await route.fulfill({ json: record(route.request().url()) }).catch(() => {});
    });
    await openPair(page);
    await page.getByRole('button', { name: 'Inspect experimental structure', exact: true }).click();
    await expect.poll(() => received).toBe(2);
    if (change === 'selected protein') {
      await page.getByRole('button', { name: /^MDM2, group/ }).click();
      await expect(page.locator('.protein-selected-heading h4')).toHaveText('MDM2');
    } else {
      await page.getByLabel('Second protein', { exact: true }).selectOption('EGFR');
      await expect(
        page.getByRole('button', { name: 'Inspect experimental structure', exact: true }),
      ).toBeDisabled();
    }
    release();
    // Let both ignored transport results settle before checking that neither earned credit.
    await page.waitForTimeout(100);
    expect(await discoveries(page)).toEqual([]);
    await expect(page.locator('.structure-evidence')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
