import type { ProteinNetwork } from '../lib/protein';

// Hand-authored fixtures demonstrate interactions, not measured biological evidence.
const groups = [
  ['TP53', 'MDM2', 'ATM', 'CHEK2', 'TP53BP1', 'BAX'],
  ['CDK2', 'CCNE1', 'CDKN1A', 'RB1', 'E2F1', 'CCNA2'],
  ['BRCA1', 'BRCA2', 'RAD51', 'PALB2', 'RPA1', 'ATR'],
];

const nodes = groups.flatMap((labels, community) =>
  labels.map((label, index) => {
    const angle = (index / labels.length) * Math.PI * 2 + community * 0.6;
    const centers = [
      [-0.6, -0.35, 0.25],
      [0.55, -0.2, -0.2],
      [0.05, 0.6, 0.1],
    ];
    const [cx, cy, cz] = centers[community];
    return {
      id: label,
      label,
      community,
      x: cx + Math.cos(angle) * 0.3,
      y: cy + Math.sin(angle) * 0.3,
      z: cz + Math.sin(angle * 2) * 0.45,
    };
  }),
);

const edges = groups.flatMap((labels) =>
  labels.flatMap((source, index) => [
    { source, target: labels[(index + 1) % labels.length], score: 0.91 - index * 0.025 },
    { source, target: labels[(index + 2) % labels.length], score: 0.64 + index * 0.045 },
  ]),
);
edges.push(
  { source: 'TP53', target: 'CDKN1A', score: 0.87 },
  { source: 'ATM', target: 'BRCA1', score: 0.72 },
  { source: 'CDK2', target: 'BRCA2', score: 0.52 },
  { source: 'CHEK2', target: 'RB1', score: 0.45 },
  { source: 'ATR', target: 'CCNA2', score: 0.61 },
);

export const demoNetwork: ProteinNetwork = {
  nodes,
  edges,
  communities: 3,
  confidence: 0.4,
  source: {
    name: 'Illustrative demo · synthetic scores and groups',
    url: 'https://string-db.org/help/api/',
    mode: 'demo',
    retrievedAt: null,
  },
};

export const communityColors = ['#dfff7f', '#f399bf', '#b9e5ee', '#f7bc71', '#cfb5f0'];

export const proteinStructures: Record<string, { code: string; description: string }> = {
  TP53: { code: '1TUP', description: 'Experimental structure of a p53–DNA complex.' },
};
