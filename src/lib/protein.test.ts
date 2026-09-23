import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNetwork, projectNode } from './protein';

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
