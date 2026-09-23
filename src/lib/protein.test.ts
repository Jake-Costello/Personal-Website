import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRandomProteinPair, parseNetwork, parseProteinCatalog, projectNode } from './protein';

function validNetwork() {
  return {
    nodes: [
      { id: '9606.one', label: 'TP53', community: 0, x: 0.5, y: 0, z: 0 },
      { id: '9606.two', label: 'CDK2', community: 0, x: -0.5, y: 0, z: 0 },
    ],
    edges: [{ source: '9606.one', target: '9606.two', score: 0.8 }],
    communities: 1,
    confidence: 0.4,
    source: {
      name: 'STRING v12.0',
      url: 'https://version-12-0.string-db.org/',
      mode: 'live',
      retrievedAt: '2026-09-23T12:00:00Z',
      cached: false,
    },
  };
}

test('accepts a live network with consistent communities and known provenance', () => {
  assert.equal(parseNetwork(validNetwork()).nodes.length, 2);
});

test('rejects malformed edges, nonfinite confidence, and untrusted source links', () => {
  const wrongEdge = validNetwork();
  wrongEdge.edges[0].target = 'missing';
  assert.throws(() => parseNetwork(wrongEdge));
  assert.throws(() => parseNetwork({ ...validNetwork(), confidence: Number.NaN }));
  for (const url of [
    'javascript:alert(1)',
    'https://string-db.org.evil.example/',
    'https://evil.example/',
    'https://user@string-db.org/',
  ]) {
    assert.throws(() =>
      parseNetwork({ ...validNetwork(), source: { ...validNetwork().source, url } }),
    );
  }
});

test('rejects duplicate identities and inconsistent community counts', () => {
  const duplicate = validNetwork();
  duplicate.nodes[1].id = duplicate.nodes[0].id;
  assert.throws(() => parseNetwork(duplicate));
  assert.throws(() => parseNetwork({ ...validNetwork(), communities: 2 }));
  const missingGroup = validNetwork();
  missingGroup.nodes.forEach((node) => {
    node.community = 1;
  });
  assert.throws(() => parseNetwork(missingGroup));
});

test('projection responds to rotation while staying finite at permitted coordinates', () => {
  const node = validNetwork().nodes[0];
  assert.notEqual(projectNode(node, 0, 0, 1).px, projectNode(node, Math.PI / 2, 0, 1).px);
  for (const yaw of [0, Math.PI / 2, Math.PI]) {
    const projected = projectNode({ ...node, x: 2, y: 2, z: 2 }, yaw, 1.2, 1.35);
    assert.ok(Number.isFinite(projected.px) && Number.isFinite(projected.py));
    assert.ok(projected.radius > 0);
  }
});

function validCatalog() {
  return {
    proteins: [
      { symbol: 'TP53', name: 'Test annotation one' },
      { symbol: 'CDK2', name: 'Test annotation two' },
      { symbol: 'BRCA1', name: 'Test annotation three' },
    ],
    connections: [{ source: 'TP53', target: 'CDK2', score: 0.8 }],
    source: validNetwork().source,
  };
}

test('catalog accepts disconnected selectable proteins and real source metadata', () => {
  const catalog = parseProteinCatalog(validCatalog());
  assert.equal(catalog.proteins.length, 3);
  assert.equal(catalog.connections.length, 1);
  assert.equal(parseProteinCatalog({ ...validCatalog(), connections: [] }).connections.length, 0);
});

test('catalog rejects ambiguous identities, invalid hints, and untrusted provenance', () => {
  const value = validCatalog();
  for (const bad of [
    { ...value, proteins: [value.proteins[0]] },
    { ...value, proteins: [...value.proteins, value.proteins[0]] },
    { ...value, proteins: value.proteins.map((item) => ({ ...item, name: 'x'.repeat(501) })) },
    { ...value, connections: [{ source: 'TP53', target: 'UNKNOWN', score: 0.8 }] },
    { ...value, connections: [{ source: 'TP53', target: 'TP53', score: 0.8 }] },
    { ...value, connections: [{ source: 'TP53', target: 'CDK2', score: Number.NaN }] },
    { ...value, connections: [{ source: 'TP53', target: 'CDK2', score: 0.3 }] },
    {
      ...value,
      connections: [...value.connections, { source: 'CDK2', target: 'TP53', score: 0.9 }],
    },
    { ...value, source: { ...value.source, mode: 'demo' } },
    { ...value, source: { ...value.source, url: 'https://string-db.org.evil.example/' } },
  ])
    assert.throws(() => parseProteinCatalog(bad));
});

test('random selection reaches every ordered distinct pair without retry loops', () => {
  const proteins = validCatalog().proteins;
  const pairs = new Set<string>();
  for (let first = 0; first < proteins.length; first++) {
    for (let second = 0; second < proteins.length - 1; second++) {
      const samples = [(first + 0.5) / proteins.length, (second + 0.5) / (proteins.length - 1)];
      const pair = chooseRandomProteinPair(proteins, () => samples.shift()!);
      assert.notEqual(pair[0], pair[1]);
      pairs.add(pair.join(','));
    }
  }
  assert.equal(pairs.size, proteins.length * (proteins.length - 1));
  assert.deepEqual(
    chooseRandomProteinPair(proteins, () => 0),
    ['TP53', 'CDK2'],
  );
  assert.deepEqual(
    chooseRandomProteinPair(proteins, () => 0.999999),
    ['BRCA1', 'CDK2'],
  );
});

test('random selection rejects impossible lists and invalid random samples', () => {
  const proteins = validCatalog().proteins;
  assert.throws(() => chooseRandomProteinPair([]));
  assert.throws(() => chooseRandomProteinPair([proteins[0], proteins[0]]));
  for (const sample of [Number.NaN, -0.1, 1, Number.POSITIVE_INFINITY]) {
    assert.throws(() => chooseRandomProteinPair(proteins, () => sample));
  }
});
