export type Cargo = 'inbound' | 'order' | null;
export type WarehouseStation = 'receiving' | 'racks' | 'dispatch';
export type WarehouseUpgrade = 'cart' | 'automation';
export type WarehouseState = {
  cash: number;
  stock: number;
  carrying: number;
  cargo: Cargo;
  shipped: number;
  cart: boolean;
  automation: boolean;
  message: string;
};
export type Point = { x: number; y: number };

export const STATIONS: Record<WarehouseStation, Point> = {
  receiving: { x: 202, y: 332 },
  racks: { x: 480, y: 332 },
  dispatch: { x: 758, y: 332 },
};
export const RACKS = [310, 434, 558].flatMap((x) =>
  [190, 390].map((y) => ({ x, y, w: 92, h: 100 })),
);
const OBSTACLES = [...RACKS, { x: 30, y: 236, w: 118, h: 148 }, { x: 812, y: 236, w: 118, h: 148 }];
export const UPGRADE_COST: Record<WarehouseUpgrade, number> = { cart: 40, automation: 100 };
export const capacity = (state: WarehouseState) => (state.cart ? 3 : 1);
export const newWarehouse = (): WarehouseState => ({
  cash: 0,
  stock: 0,
  carrying: 0,
  cargo: null,
  shipped: 0,
  cart: false,
  automation: false,
  message: 'Your first shift. Unload a box from the truck on the left.',
});

export function workAt(state: WarehouseState, station: WarehouseStation): WarehouseState {
  if (station === 'receiving') {
    if (state.carrying) return { ...state, message: 'Finish moving your current load first.' };
    return {
      ...state,
      carrying: capacity(state),
      cargo: 'inbound',
      message: 'Goods received. Take them to the middle racks to put away.',
    };
  }
  if (station === 'racks') {
    if (state.cargo === 'inbound') {
      return {
        ...state,
        stock: state.stock + state.carrying,
        carrying: 0,
        cargo: null,
        message: 'Stock shelved. Interact here again to pick an outbound order.',
      };
    }
    if (state.cargo === 'order')
      return { ...state, message: 'Order picked. Deliver it to the truck on the right.' };
    if (!state.stock)
      return { ...state, message: 'Racks are empty. Receive goods from the truck on the left.' };
    const picked = Math.min(state.stock, capacity(state));
    return {
      ...state,
      stock: state.stock - picked,
      carrying: picked,
      cargo: 'order',
      message: 'Order picked. Bring it to the outbound truck on the right.',
    };
  }
  if (state.cargo !== 'order')
    return { ...state, message: 'Pick a stocked order from the middle racks first.' };
  const earned = state.carrying * 20;
  return {
    ...state,
    cash: state.cash + earned,
    shipped: state.shipped + state.carrying,
    carrying: 0,
    cargo: null,
    message: `Shipped! +$${earned}. ${!state.cart && state.cash + earned >= 40 ? 'A picking cart is ready in Upgrades.' : 'Receive another load to keep the shift moving.'}`,
  };
}

export function buyUpgrade(state: WarehouseState, upgrade: WarehouseUpgrade): WarehouseState {
  if (state[upgrade]) return state;
  if (state.cash < UPGRADE_COST[upgrade])
    return {
      ...state,
      message: `Earn $${UPGRADE_COST[upgrade] - state.cash} more for this upgrade.`,
    };
  return {
    ...state,
    [upgrade]: true,
    cash: state.cash - UPGRADE_COST[upgrade],
    message:
      upgrade === 'cart'
        ? 'Picking cart ready. Move up to 3 boxes per trip.'
        : 'Routing automation online. Auto stow, auto dispatch, and 25% faster travel.',
  };
}

export function nextStation(state: WarehouseState): WarehouseStation {
  return state.cargo === 'order'
    ? 'dispatch'
    : state.cargo === 'inbound' || state.stock > 0
      ? 'racks'
      : 'receiving';
}

export function stationNear(point: Point): WarehouseStation | null {
  for (const name of Object.keys(STATIONS) as WarehouseStation[]) {
    const location = STATIONS[name];
    if (Math.hypot(point.x - location.x, point.y - location.y) < 64) return name;
  }
  return null;
}

export function canStand(point: Point) {
  const radius = 12;
  if (point.x < 24 || point.x > 936 || point.y < 160 || point.y > 514) return false;
  return !OBSTACLES.some(
    (box) =>
      point.x > box.x - radius &&
      point.x < box.x + box.w + radius &&
      point.y > box.y - radius &&
      point.y < box.y + box.h + radius,
  );
}

// A small four-direction navigation grid keeps tap-to-work routes out of the racks.
export function routeTo(start: Point, destination: Point): Point[] {
  if (!canStand(destination)) return [];
  const step = 20;
  const cols = 46;
  const rows = 18;
  const pointFor = (index: number): Point => ({
    x: 30 + (index % cols) * step,
    y: 164 + Math.floor(index / cols) * step,
  });
  const nearest = (point: Point) => {
    let best = -1;
    let distance = Infinity;
    for (let i = 0; i < cols * rows; i++) {
      const candidate = pointFor(i);
      if (!canStand(candidate)) continue;
      const next = Math.hypot(point.x - candidate.x, point.y - candidate.y);
      if (next < distance) {
        best = i;
        distance = next;
      }
    }
    return best;
  };
  const from = nearest(start);
  const to = nearest(destination);
  if (from < 0 || to < 0) return [];
  const previous = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let i = 0; i < queue.length && !previous.has(to); i++) {
    const cell = queue[i];
    const x = cell % cols;
    for (const neighbor of [
      x > 0 ? cell - 1 : -1,
      x < cols - 1 ? cell + 1 : -1,
      cell - cols,
      cell + cols,
    ]) {
      if (
        neighbor < 0 ||
        neighbor >= rows * cols ||
        previous.has(neighbor) ||
        !canStand(pointFor(neighbor))
      )
        continue;
      previous.set(neighbor, cell);
      queue.push(neighbor);
    }
  }
  if (!previous.has(to)) return [];
  const route: Point[] = [destination];
  for (let cell = to; cell !== -1; cell = previous.get(cell) ?? -1) route.push(pointFor(cell));
  return route.reverse();
}
