import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

// Synthetic fixtures are confined to tests; production always fetches source data.
function comparisonFixture(symbol: string) {
  return {
    human: { symbol, geneId: 'ENSGHUMAN', proteinId: 'ENSPHUMAN' },
    metric: 'human_sequence_identity',
    species: [
      {
        species: 'pan_troglodytes',
        taxonId: 9598,
        label: 'Chimpanzee',
        status: 'matched',
        orthologues: [
          {
            geneId: 'ENSGCHIMP',
            proteinId: 'ENSPCHIMP',
            type: 'ortholog_one2one',
            humanIdentity: 90,
            animalIdentity: 89,
            humanCoverage: 99,
            humanLength: 393,
            animalLength: 395,
            sourceUrl:
              'https://may2024.archive.ensembl.org/pan_troglodytes/Gene/Summary?g=ENSGCHIMP',
          },
        ],
      },
      {
        species: 'mus_musculus',
        taxonId: 10090,
        label: 'Mouse',
        status: 'matched',
        orthologues: [
          {
            geneId: 'ENSGMOUSE',
            proteinId: 'ENSPMOUSE',
            type: 'ortholog_one2many',
            humanIdentity: 90,
            animalIdentity: 89,
            humanCoverage: 99,
            humanLength: 393,
            animalLength: 395,
            sourceUrl: 'https://may2024.archive.ensembl.org/mus_musculus/Gene/Summary?g=ENSGMOUSE',
          },
        ],
      },
      {
        species: 'danio_rerio',
        taxonId: 7955,
        label: 'Zebrafish',
        status: 'unavailable',
        orthologues: [],
      },
      {
        species: 'drosophila_melanogaster',
        taxonId: 7227,
        label: 'Fruit fly',
        status: 'not_found',
        orthologues: [],
      },
    ],
    source: {
      name: 'Ensembl release 112',
      release: 112,
      url: 'https://may2024.rest.ensembl.org/',
      retrievedAt: '2026-09-23T12:00:00Z',
      cached: false,
    },
  };
}

function explanationFixture() {
  return {
    overview: 'The measured comparison provides evidence to explore.',
    network: 'This is a human association network.',
    comparison: 'Two returned orthologues have tied identity.',
    significance: 'Conserved sequence can suggest further research.',
    limitations: 'Matching sequences do not establish identical function.',
    citations: ['string', 'ensembl_method'],
    generatedAt: '2026-09-23T12:00:00Z',
    model: 'test-model',
    cached: true,
    sources: [
      { id: 'string', title: 'STRING associations', url: 'https://version-12-0.string-db.org/' },
      {
        id: 'ensembl_method',
        title: 'Ensembl orthologue method',
        url: 'https://may2024.rest.ensembl.org/documentation/info/homology_symbol',
      },
    ],
  };
}

async function loadComparison(page: Page) {
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await expect(page.locator('.protein-comparison-metric')).toContainText('BRCA1');
}

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { enabled: true } }));
  await page.route('**/api/comparison?**', (route) =>
    route.fulfill({
      json: comparisonFixture(new URL(route.request().url()).searchParams.get('protein')!),
    }),
  );
  await page.route('**/api/explain', (route) => route.fulfill({ json: explanationFixture() }));
});

test('comparison is on demand, labels ties and distinguishes absent from unavailable data', async ({
  page,
}, testInfo) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  expect(requested).not.toContain('/api/comparison');
  expect(requested).not.toContain('/api/ai/status');
  expect(requested).not.toContain('/api/explain');
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await expect(page.getByRole('meter')).toHaveCount(2);
  await expect(
    page.getByText('Highest identity among returned matches', { exact: true }),
  ).toHaveCount(2);
  await expect(page.locator('.protein-species-list')).toContainText(
    'This is not a 0% identity result',
  );
  await expect(page.locator('.protein-species-list')).toContainText('Its identity is unknown');
  await expect(page.locator('.protein-comparison-provenance')).toContainText('May 2024 archive');
  await page.locator('.protein-orthologue-details summary').first().click();
  await expect(page.locator('.protein-orthologue-details').first()).toContainText('ENSPCHIMP');
  await expect(page.locator('.protein-orthologue-details').first()).toContainText(
    'Human alignment coverage',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page
    .locator('.protein-comparison')
    .screenshot({ path: testInfo.outputPath('comparison.png') });
});

test('unconfigured AI stays disabled while comparison remains usable', async ({ page }) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { enabled: false } }));
  await loadComparison(page);
  await expect(
    page.getByRole('button', { name: 'Explain this network', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.protein-ai-availability')).toContainText('not enabled yet');
  await expect(page.getByRole('meter')).toHaveCount(2);
});

test('explanation submits only the loaded query and renders grounded source links as plain text', async ({
  page,
}) => {
  let body: unknown;
  await page.route('**/api/explain', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ...explanationFixture(),
        overview: '<img src=x onerror=alert(1)> is plain explanation text.',
      },
    });
  });
  await loadComparison(page);
  await page.getByRole('button', { name: 'Explain this network', exact: true }).click();
  await expect(page.locator('.protein-explanation-overview')).toHaveText(
    '<img src=x onerror=alert(1)> is plain explanation text.',
  );
  await expect(page.locator('.protein-explanation-copy img')).toHaveCount(0);
  expect(body).toEqual({
    proteins: 'BRCA1,BRCA2',
    protein: 'BRCA1',
    confidence: 0.4,
    neighbors: 8,
  });
  await expect(page.locator('.protein-explanation-sources a')).toHaveCount(2);
  await expect(page.locator('.protein-explanation-meta')).toContainText('cached explanation');
});

test('failed explanation can retry without losing its measured comparison', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/explain', (route) =>
    ++attempts === 1
      ? route.fulfill({ status: 429, json: { detail: 'quota' } })
      : route.fulfill({ json: explanationFixture() }),
  );
  await loadComparison(page);
  const button = page.getByRole('button', { name: 'Explain this network', exact: true });
  await button.click();
  await expect(page.locator('.protein-comparison [role="alert"]')).toContainText('limit');
  await expect(page.getByRole('meter')).toHaveCount(2);
  await expect(page.locator('.protein-explanation-copy')).toHaveCount(0);
  await button.click();
  await expect(page.locator('.protein-explanation-copy')).toBeVisible();
  await expect(page.locator('.protein-comparison [role="alert"]')).toHaveCount(0);
});

test('changing the protein cancels a delayed comparison and clears an existing explanation', async ({
  page,
}) => {
  await loadComparison(page);
  await page.getByRole('button', { name: 'Explain this network', exact: true }).click();
  await expect(page.locator('.protein-explanation-copy')).toBeVisible();
  await page.getByLabel('Human protein to compare', { exact: true }).selectOption('BRCA2');
  await expect(page.locator('.protein-explanation-copy')).toHaveCount(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  await page.route('**/api/comparison?**', async (route) => {
    const symbol = new URL(route.request().url()).searchParams.get('protein')!;
    if (symbol === 'BRCA2') {
      markStarted();
      await gate;
    }
    await route.fulfill({ json: comparisonFixture(symbol) });
  });
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await started;
  await page.getByLabel('Human protein to compare', { exact: true }).selectOption('BRCA1');
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await expect(page.locator('.protein-comparison-metric')).toContainText('BRCA1');
  release();
  await expect(page.locator('.protein-comparison-metric')).not.toContainText('BRCA2');
});

test('pending graph changes clear previous evidence and disable further comparison', async ({
  page,
}) => {
  await loadComparison(page);
  await page.getByLabel('Network size', { exact: true }).selectOption('0');
  await expect(page.getByRole('button', { name: 'Compare species', exact: true })).toBeDisabled();
  await expect(page.locator('.protein-comparison-results')).toHaveCount(0);
  await page.getByRole('button', { name: /^Explore network/ }).click();
  await expect(page.getByRole('button', { name: 'Compare species', exact: true })).toBeEnabled();
  await expect(page.locator('.protein-comparison-results')).toHaveCount(0);
});

test('malformed comparison and unknown explanation citations are rejected', async ({ page }) => {
  await page.route('**/api/comparison?**', (route) =>
    route.fulfill({ json: { ...comparisonFixture('BRCA1'), metric: 'unknown' } }),
  );
  await page.goto('/#lab');
  await expect(page.locator('.protein-status')).toHaveText('LIVE STRING DATA');
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await expect(page.locator('.protein-comparison [role="alert"]')).toContainText(
    'unexpected species comparison',
  );
  await expect(page.getByRole('meter')).toHaveCount(0);
  await page.route('**/api/comparison?**', (route) =>
    route.fulfill({ json: comparisonFixture('BRCA1') }),
  );
  await page.getByRole('button', { name: 'Compare species', exact: true }).click();
  await expect(page.getByRole('meter')).toHaveCount(2);
  await page.route('**/api/explain', (route) =>
    route.fulfill({ json: { ...explanationFixture(), citations: ['unverified'] } }),
  );
  await page.getByRole('button', { name: 'Explain this network', exact: true }).click();
  await expect(page.locator('.protein-comparison [role="alert"]')).toContainText(
    'incomplete explanation',
  );
  await expect(page.locator('.protein-explanation-copy')).toHaveCount(0);
});
