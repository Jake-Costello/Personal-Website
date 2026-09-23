import type { Page, Route } from '@playwright/test';

// Deliberately synthetic test fixtures; never imported by the application.
export const proteinSymbols = [
  'TP53',
  'CDK2',
  'BRCA1',
  'BRCA2',
  'MDM2',
  'ATM',
  'CHEK2',
  'RAD51',
  'PALB2',
  'EGFR',
  'AKT1',
  'MTOR',
];
export const source = {
  name: 'STRING v12.0 · human functional associations',
  url: 'https://version-12-0.string-db.org/',
  mode: 'live',
  retrievedAt: '2026-09-23T12:00:00Z',
  cached: false,
};
export const catalog = {
  proteins: proteinSymbols.map((symbol) => ({ symbol, name: `${symbol} test annotation` })),
  connections: [
    { source: 'TP53', target: 'MDM2', score: 0.99 },
    { source: 'TP53', target: 'CDK2', score: 0.85 },
    { source: 'BRCA1', target: 'BRCA2', score: 0.97 },
  ],
  source,
};

export function networkFixture(url: string) {
  const query = new URL(url).searchParams;
  const proteins = query.get('proteins')!.split(',');
  const confidence = Number(query.get('confidence') ?? 0.4);
  const neighbors = Number(query.get('neighbors') ?? 24);
  const isolated = neighbors === 0 && proteins.includes('EGFR') && proteins.includes('BRCA1');
  const labels = [...proteins];
  if (neighbors > 0 && confidence <= 0.5) {
    labels.push(proteinSymbols.find((symbol) => !proteins.includes(symbol))!);
  }
  const connected = !isolated && confidence <= 0.85;
  return {
    nodes: labels.map((label, index) => ({
      id: `9606.${label}`,
      label,
      community: connected && index < 2 ? 0 : connected ? 1 : index,
      x: index === 0 ? -0.5 : 0.5,
      y: index === 2 ? 0.5 : -0.2,
      z: index === 0 ? 0.3 : -0.3,
    })),
    edges: connected
      ? [
          { source: `9606.${proteins[0]}`, target: `9606.${proteins[1]}`, score: 0.85 },
          ...(labels.length === 3
            ? [{ source: `9606.${proteins[1]}`, target: `9606.${labels[2]}`, score: 0.5 }]
            : []),
        ]
      : [],
    confidence,
    neighbors,
    communities: connected ? labels.length - 1 : labels.length,
    source,
  };
}

export async function fulfillNetwork(route: Route) {
  await route.fulfill({ json: networkFixture(route.request().url()) });
}

export async function installProteinApi(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0.2;
  });
  await page.route('**/api/proteins', (route) => route.fulfill({ json: catalog }));
  await page.route('**/api/network?**', fulfillNetwork);
}
