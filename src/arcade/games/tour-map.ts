/** Roads are gameplay data. Only outgoing neighbours can be visited. */
export const SHOP_NAMES = {
  record: 'Record House',
  tattoo: 'Tattoo Parlor',
  music: 'Backline',
  studio: 'Studio',
} as const;
export type ShopKind = keyof typeof SHOP_NAMES;
export type TourNode = {
  id: string;
  world: number;
  column: number;
  lane: number;
  kind: 'show' | 'shop' | 'event';
  next: string[];
  floor?: number;
  variant?: number;
  shop?: ShopKind;
};
const nodes: TourNode[] = [];
for (let world = 1; world <= 3; world++) {
  const p = `w${world}`,
    base = (world - 1) * 3,
    next =
      world < 3
        ? [`w${world + 1}-show-left`, `w${world + 1}-show-middle`, `w${world + 1}-show-right`]
        : ['crown-record', 'crown-music', 'crown-rehearsal'];
  nodes.push(
    {
      id: `${p}-show-left`,
      world,
      column: 0,
      lane: 0,
      kind: 'show',
      floor: base,
      variant: 0,
      next: [`${p}-record`, `${p}-extra-show`],
    },
    {
      id: `${p}-show-middle`,
      world,
      column: 0,
      lane: 1,
      kind: 'show',
      floor: base,
      variant: 1,
      next: [`${p}-extra-show`],
    },
    {
      id: `${p}-show-right`,
      world,
      column: 0,
      lane: 2,
      kind: 'show',
      floor: base + 1,
      variant: 0,
      next: [`${p}-rehearsal`],
    },
    {
      id: `${p}-record`,
      world,
      column: 1,
      lane: 0,
      kind: 'shop',
      shop: 'record',
      next: [`${p}-tattoo`],
    },
    {
      id: `${p}-extra-show`,
      world,
      column: 1,
      lane: 1,
      kind: 'show',
      floor: base + 1,
      variant: 1,
      next: [`${p}-studio`, `${p}-music`],
    },
    { id: `${p}-rehearsal`, world, column: 1, lane: 2, kind: 'event', next: [`${p}-music`] },
    {
      id: `${p}-tattoo`,
      world,
      column: 2,
      lane: 0,
      kind: 'shop',
      shop: 'tattoo',
      next: [`${p}-boss`],
    },
    {
      id: `${p}-studio`,
      world,
      column: 2,
      lane: 1,
      kind: 'shop',
      shop: 'studio',
      next: [`${p}-boss`],
    },
    {
      id: `${p}-music`,
      world,
      column: 2,
      lane: 2,
      kind: 'shop',
      shop: 'music',
      next: [`${p}-boss`],
    },
    { id: `${p}-boss`, world, column: 3, lane: 1, kind: 'show', floor: base + 2, variant: 0, next },
  );
}
nodes.push(
  {
    id: 'crown-record',
    world: 4,
    column: 0,
    lane: 0,
    kind: 'shop',
    shop: 'record',
    next: ['crown-show'],
  },
  {
    id: 'crown-music',
    world: 4,
    column: 0,
    lane: 1,
    kind: 'shop',
    shop: 'music',
    next: ['crown-show'],
  },
  { id: 'crown-rehearsal', world: 4, column: 0, lane: 2, kind: 'event', next: ['crown-show'] },
  { id: 'crown-show', world: 4, column: 3, lane: 1, kind: 'show', floor: 9, variant: 0, next: [] },
);
export const TOUR_NODES: readonly TourNode[] = nodes;
export const NODE_BY_ID = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<
  string,
  TourNode
>;
export const ENTRY_NODES = ['w1-show-left', 'w1-show-middle', 'w1-show-right'];
