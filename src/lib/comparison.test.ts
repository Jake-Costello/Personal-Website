import test from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonSpecies,
  parseAiStatus,
  parseComparison,
  parseExplanation,
  rankSpecies,
} from './comparison';
import type { ProteinComparisonData } from './comparison';

function comparison(): ProteinComparisonData {
  return {
    human: { symbol: 'TP53', geneId: 'ENSG00000141510', proteinId: 'ENSP00000269305' },
    metric: 'human_sequence_identity',
    species: comparisonSpecies.map((animal, index) => ({
      ...animal,
      status: index < 2 ? 'matched' : index === 2 ? 'unavailable' : 'not_found',
      orthologues:
        index < 2
          ? [
              {
                geneId: `ENSGTEST${index}`,
                proteinId: `ENSPTEST${index}`,
                type: 'ortholog_one2one',
                humanIdentity: 90,
                animalIdentity: 89,
                humanCoverage: 99,
                humanLength: 393,
                animalLength: 395,
                sourceUrl: `https://may2024.archive.ensembl.org/${animal.species}/Gene/Summary?g=ENSGTEST${index}`,
              },
            ]
          : [],
    })),
    source: {
      name: 'Ensembl release 112',
      release: 112,
      url: 'https://may2024.rest.ensembl.org/',
      retrievedAt: '2026-09-23T12:00:00Z',
      cached: false,
    },
  };
}

function explanation() {
  return {
    overview: 'An evidence-grounded test summary.',
    network: 'An association network.',
    comparison: 'Two tied matches.',
    significance: 'Conserved sequence can motivate further study.',
    limitations: 'This does not establish identical function.',
    citations: ['string', 'ensembl_method'],
    generatedAt: '2026-09-23T12:00:00Z',
    model: 'test-model',
    cached: false,
    sources: [
      { id: 'string', title: 'STRING', url: 'https://version-12-0.string-db.org/' },
      {
        id: 'ensembl_method',
        title: 'Ensembl method',
        url: 'https://may2024.rest.ensembl.org/documentation/info/homology_symbol',
      },
    ],
  };
}

test('comparison ranks returned matches only and preserves tied highest identity', () => {
  const result = parseComparison(comparison(), 'TP53');
  const ranked = rankSpecies(result);
  assert.deepEqual(
    ranked.map((row) => row.highest),
    [true, true, false, false],
  );
  assert.equal(ranked[2].best, null);
  assert.equal(ranked[3].best, null);
  assert.equal(ranked[2].status, 'unavailable');
  assert.equal(ranked[3].status, 'not_found');
  assert.equal(result.species[0].orthologues[0].humanIdentity, 90);
});

test('multiple orthologues choose the maximum without deleting other candidates', () => {
  const result = comparison();
  result.species[1].orthologues.push({
    ...result.species[1].orthologues[0],
    geneId: 'ENSGSECOND',
    proteinId: 'ENSPSECOND',
    humanIdentity: 95,
    type: 'ortholog_one2many',
  });
  const ranked = rankSpecies(parseComparison(result, 'TP53'));
  assert.equal(ranked[0].species, 'mus_musculus');
  assert.equal(ranked[0].best?.humanIdentity, 95);
  assert.equal(ranked[0].orthologues.length, 2);
  assert.equal(ranked[1].highest, false);
});

test('missing references are accepted only when all species have no match', () => {
  const value = comparison();
  value.human.geneId = null;
  value.human.proteinId = null;
  assert.throws(() => parseComparison(value, 'TP53'));
  value.species.forEach((item) => {
    item.status = 'not_found';
    item.orthologues = [];
  });
  assert.equal(parseComparison(value, 'TP53').human.proteinId, null);
  assert.ok(rankSpecies(value).every((row) => !row.highest));
});

test('comparison rejects mismatched identity, missing species, wrong taxa and inconsistent statuses', () => {
  const value = comparison();
  const invalid = [
    { ...value, human: { ...value.human, symbol: 'BRCA1' } },
    { ...value, metric: 'animal_sequence_identity' },
    { ...value, species: value.species.slice(1) },
    { ...value, species: [value.species[0], ...value.species.slice(0, 3)] },
    { ...value, species: value.species.map((item) => ({ ...item, taxonId: 9606 })) },
    { ...value, species: value.species.map((item) => ({ ...item, status: 'matched' })) },
    { ...value, species: value.species.map((item) => ({ ...item, status: 'not_found' })) },
    { ...value, source: { ...value.source, release: 113 } },
    { ...value, source: { ...value.source, retrievedAt: 'yesterday' } },
    { ...value, source: { ...value.source, url: 'https://rest.ensembl.org/' } },
  ];
  invalid.forEach((input) => assert.throws(() => parseComparison(input, 'TP53')));
});

test('comparison rejects invalid measurements, mixed human lengths, duplicates and unsafe links', () => {
  for (const changes of [
    { humanIdentity: NaN },
    { animalIdentity: 101 },
    { humanCoverage: -1 },
    { humanLength: 0 },
    { animalLength: 393.5 },
    { type: 'paralog' },
    { sourceUrl: 'javascript:alert(1)' },
    { sourceUrl: 'https://ensembl.org.evil.example/' },
    { sourceUrl: 'https://user:pass@ensembl.org/' },
    { sourceUrl: 'https://ensembl.org:8443/' },
    { sourceUrl: 'https://string-db.org/' },
  ]) {
    const value = comparison();
    Object.assign(value.species[0].orthologues[0], changes);
    assert.throws(() => parseComparison(value, 'TP53'));
  }
  const mixed = comparison();
  mixed.species[1].orthologues[0].humanLength = 399;
  assert.throws(() => parseComparison(mixed, 'TP53'));
  const duplicate = comparison();
  duplicate.species[0].orthologues.push(duplicate.species[0].orthologues[0]);
  assert.throws(() => parseComparison(duplicate, 'TP53'));
});

test('explanations require complete bounded text and citations to approved sources', () => {
  assert.equal(parseExplanation(explanation()).model, 'test-model');
  assert.equal(parseAiStatus({ enabled: false }), false);
  assert.throws(() => parseAiStatus({ enabled: 'true' }));
  for (const input of [
    { ...explanation(), overview: '' },
    { ...explanation(), limitations: 'x'.repeat(1201) },
    { ...explanation(), generatedAt: 'today' },
    { ...explanation(), citations: ['made_up'] },
    { ...explanation(), citations: [] },
    { ...explanation(), citations: ['string', 'string'] },
    { ...explanation(), sources: [...explanation().sources, explanation().sources[0]] },
    {
      ...explanation(),
      sources: [{ id: 'string', title: 'Untrusted', url: 'https://evil.example/' }],
    },
    { ...explanation(), sources: [{ id: 'string', title: 'Unsafe', url: 'javascript:alert(1)' }] },
  ])
    assert.throws(() => parseExplanation(input));
});

test('the observed citation-format note is omitted without altering scientific notation', () => {
  const value = {
    ...explanation(),
    network: 'The pair [BRCA1, BRCA2] has one link. [No source IDs here]',
  };
  const parsed = parseExplanation(value);
  assert.equal(parsed.network, 'The pair [BRCA1, BRCA2] has one link.');
  assert.deepEqual(parsed.citations, value.citations);
  assert.ok(value.network.endsWith('[No source IDs here]'));
  assert.throws(() => parseExplanation({ ...value, network: '[No source IDs here]' }));
});
