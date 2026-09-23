export interface ProteinNode {
  id: string;
  label: string;
  community: number;
  x: number;
  y: number;
  z: number;
}

export interface ProteinEdge {
  source: string;
  target: string;
  score: number;
}

export interface ProteinNetwork {
  nodes: ProteinNode[];
  edges: ProteinEdge[];
  communities: number;
  confidence: number;
  source: {
    name: string;
    url: string;
    mode: 'demo' | 'live';
    retrievedAt: string | null;
    cached?: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isStringSource(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      ['string-db.org', 'version-12-0.string-db.org'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parseNetwork(value: unknown): ProteinNetwork {
  if (
    !isRecord(value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    value.nodes.length > 40 ||
    value.edges.length > 2000 ||
    !isRecord(value.source)
  ) {
    throw new Error('The service returned an unexpected network. Please try again.');
  }
  const nodes = value.nodes as unknown[];
  if (
    nodes.some(
      (node) =>
        !isRecord(node) ||
        typeof node.id !== 'string' ||
        !node.id ||
        node.id.length > 80 ||
        typeof node.label !== 'string' ||
        node.label.length > 80 ||
        !Number.isInteger(node.community) ||
        Number(node.community) < 0 ||
        ['x', 'y', 'z'].some(
          (axis) =>
            typeof node[axis] !== 'number' ||
            !Number.isFinite(node[axis]) ||
            Math.abs(Number(node[axis])) > 2,
        ),
    )
  ) {
    throw new Error('The service returned invalid protein positions. Please try again.');
  }
  const ids = new Set((nodes as ProteinNode[]).map((node) => node.id));
  if (
    ids.size !== nodes.length ||
    value.edges.some(
      (edge) =>
        !isRecord(edge) ||
        typeof edge.source !== 'string' ||
        typeof edge.target !== 'string' ||
        !ids.has(edge.source) ||
        !ids.has(edge.target) ||
        edge.source === edge.target ||
        typeof edge.score !== 'number' ||
        !Number.isFinite(edge.score) ||
        edge.score < 0 ||
        edge.score > 1,
    )
  ) {
    throw new Error('The service returned invalid connections. Please try again.');
  }
  if (
    value.source.mode !== 'live' ||
    typeof value.source.name !== 'string' ||
    !isStringSource(value.source.url) ||
    typeof value.source.retrievedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.source.retrievedAt)) ||
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0.4 ||
    value.confidence > 0.95 ||
    !Number.isInteger(value.communities) ||
    Number(value.communities) < 0 ||
    (value.source.cached !== undefined && typeof value.source.cached !== 'boolean')
  ) {
    throw new Error('The service returned incomplete source information. Please try again.');
  }
  const groups = new Set((nodes as ProteinNode[]).map((node) => node.community));
  if (
    groups.size !== value.communities ||
    [...groups].some((group) => group >= Number(value.communities))
  ) {
    throw new Error('The service returned inconsistent communities. Please try again.');
  }
  return value as unknown as ProteinNetwork;
}

export function projectNode(node: ProteinNode, yaw: number, pitch: number, zoom: number) {
  const x = node.x * Math.cos(yaw) + node.z * Math.sin(yaw);
  const z = -node.x * Math.sin(yaw) + node.z * Math.cos(yaw);
  const y = node.y * Math.cos(pitch) - z * Math.sin(pitch);
  const depth = node.y * Math.sin(pitch) + z * Math.cos(pitch);
  const perspective = 3 / (3 - depth * 0.35);
  return {
    ...node,
    px: 330 + x * 225 * zoom * perspective,
    py: 210 + y * 153 * zoom * perspective,
    depth,
    radius: 9 + (depth + 1) * 2,
  };
}
