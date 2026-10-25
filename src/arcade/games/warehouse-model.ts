export type RackId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8';
export type WarehouseStation = 'receiving' | RackId | 'dispatch';
export type WarehouseUpgrade = 'cart' | 'automation';
export type WarehouseProgress = { version: 1; cart: boolean; automation: boolean; bestDay: number };
export type CargoLine = { location: RackId; quantity: number; kind: 'inbound' | 'picked' };
export type OrderLine = { location: RackId; required: number; delivered: number };
export type WarehouseState = {
  cash: number;
  stock: number;
  inventory: Record<RackId, number>;
  carried: CargoLine[];
  carrying: number;
  shipped: number;
  deliveries: number;
  inboundLocation: RackId;
  order: OrderLine[];
  orderSequence: number;
  cart: boolean;
  automation: boolean;
  bestDay: number;
  day: number;
  quota: number;
  dayShipped: number;
  remaining: number;
  quotaMet: boolean;
  status: 'working' | 'day-complete' | 'failed';
  message: string;
};
export type Point = { x: number; y: number };
export const RACK_IDS: readonly RackId[] = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
];
export const RACKS = [
  { id: 'A', x: 306, y: 225, w: 348, h: 62 },
  { id: 'B', x: 306, y: 395, w: 348, h: 62 },
] as const;
export const STATIONS: Record<WarehouseStation, Point> = {
  receiving: { x: 202, y: 332 },
  ...Object.fromEntries(
    RACK_IDS.map((id, index) => [
      id,
      {
        x: 348 + (index % 4) * 88,
        y: index < 4 ? 195 : index < 8 ? 315 : index < 12 ? 365 : 485,
      },
    ]),
  ),
  dispatch: { x: 758, y: 332 },
} as Record<WarehouseStation, Point>;
const OBSTACLES = [...RACKS, { x: 30, y: 236, w: 118, h: 148 }, { x: 812, y: 236, w: 118, h: 148 }];
export const UPGRADE_COST: Record<WarehouseUpgrade, number> = { cart: 40, automation: 100 };
export const WAREHOUSE_PROGRESS_KEY = 'jc-warehouse-progress-v1';
export const capacity = (state: WarehouseState) => (state.cart ? 3 : 1);
export const dayQuota = (day: number) => day + 1;
export const daySeconds = (day: number) => Math.max(45, 90 - (day - 1) * 3);
export const orderSize = (day: number) => (day === 1 ? 1 : day < 4 ? 2 : 3);
export const isRack = (station: WarehouseStation): station is RackId =>
  station !== 'receiving' && station !== 'dispatch';
const emptyProgress = (): WarehouseProgress => ({
  version: 1,
  cart: false,
  automation: false,
  bestDay: 0,
});

export function parseWarehouseProgress(raw: string | null): WarehouseProgress {
  if (!raw || raw.length > 512) return emptyProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyProgress();
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      typeof data.cart !== 'boolean' ||
      typeof data.automation !== 'boolean' ||
      typeof data.bestDay !== 'number' ||
      !Number.isSafeInteger(data.bestDay) ||
      data.bestDay < 0 ||
      data.bestDay > 10000
    )
      return emptyProgress();
    return { version: 1, cart: data.cart, automation: data.automation, bestDay: data.bestDay };
  } catch {
    return emptyProgress();
  }
}
export function warehouseProgress(state: WarehouseState): WarehouseProgress {
  return { version: 1, cart: state.cart, automation: state.automation, bestDay: state.bestDay };
}
function makeOrder(day: number, sequence: number): OrderLine[] {
  return Array.from({ length: orderSize(day) }, (_, index) => ({
    location: RACK_IDS[(4 + sequence * 5 + index * 5) % RACK_IDS.length],
    required: 1,
    delivered: 0,
  }));
}
function refresh(state: WarehouseState): WarehouseState {
  const carried = state.carried.filter((item) => item.quantity > 0);
  const missing = state.order.find(
    (line) =>
      line.required - line.delivered >
      state.inventory[line.location] +
        carried
          .filter((item) => item.location === line.location)
          .reduce((total, item) => total + item.quantity, 0),
  );
  return {
    ...state,
    carried,
    carrying: carried.reduce((total, item) => total + item.quantity, 0),
    stock: Object.values(state.inventory).reduce((total, quantity) => total + quantity, 0),
    inboundLocation: missing?.location ?? RACK_IDS[state.deliveries % RACK_IDS.length],
  };
}
function addCargo(carried: CargoLine[], location: RackId, kind: CargoLine['kind']): CargoLine[] {
  const existing = carried.find((line) => line.location === location && line.kind === kind);
  return existing
    ? carried.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
    : [...carried, { location, kind, quantity: 1 }];
}
export const newWarehouse = (progress: WarehouseProgress = emptyProgress()): WarehouseState =>
  refresh({
    cash: 0,
    stock: 30,
    inventory: Object.fromEntries(RACK_IDS.map((id) => [id, id === 'A5' ? 0 : 2])) as Record<
      RackId,
      number
    >,
    carried: [],
    carrying: 0,
    shipped: 0,
    deliveries: 0,
    inboundLocation: 'A5',
    order: makeOrder(1, 0),
    orderSequence: 0,
    cart: progress.cart,
    automation: progress.automation,
    bestDay: progress.bestDay,
    day: 1,
    quota: dayQuota(1),
    dayShipped: 0,
    remaining: daySeconds(1),
    quotaMet: false,
    status: 'working',
    message:
      'Incoming: A5. Put away unloads the box; take it to A5. Pick fills the outbound order.',
  });

export function advanceWarehouseTime(state: WarehouseState, seconds: number): WarehouseState {
  if (state.status !== 'working' || !Number.isFinite(seconds) || seconds <= 0) return state;
  const remaining = Math.max(0, state.remaining - seconds);
  if (remaining > 0) return { ...state, remaining };
  return {
    ...state,
    remaining: 0,
    status: state.quotaMet ? 'day-complete' : 'failed',
    message: state.quotaMet
      ? `Day ${state.day} complete. Your rack stock carries into tomorrow.`
      : `Time is up. You completed ${state.day - 1} days. Your upgrades are saved.`,
  };
}
export function endDay(state: WarehouseState): WarehouseState {
  if (state.status !== 'working' || !state.quotaMet) return state;
  return {
    ...state,
    status: 'day-complete',
    message: `Day ${state.day} complete. Your rack stock and carried boxes stay ready for tomorrow.`,
  };
}
export function nextDay(state: WarehouseState): WarehouseState {
  if (state.status !== 'day-complete') return state;
  const day = state.day + 1;
  return refresh({
    ...state,
    day,
    quota: dayQuota(day),
    dayShipped: 0,
    remaining: daySeconds(day),
    quotaMet: false,
    status: 'working',
    order: makeOrder(day, state.orderSequence),
    message: `Day ${day}: ${dayQuota(day)} orders, ${orderSize(day)} items each. Stock from yesterday is ready.`,
  });
}

export function putAwayAt(
  state: WarehouseState,
  station: WarehouseStation,
  inboundOnly = false,
): WarehouseState {
  if (state.status !== 'working') return state;
  if (station === 'receiving') {
    if (state.carrying >= capacity(state))
      return {
        ...state,
        message:
          'Your load is full. Put boxes at their labeled rack or deliver picked order items.',
      };
    const location = state.inboundLocation;
    return refresh({
      ...state,
      deliveries: state.deliveries + 1,
      carried: addCargo(state.carried, location, 'inbound'),
      message: `Box loaded: ${location}. Take it to ${location} and press Put away.`,
    });
  }
  if (station === 'dispatch')
    return { ...state, message: 'Use Pick at outbound to deliver the picked items in your order.' };
  const matching = state.carried.filter(
    (line) => line.location === station && (!inboundOnly || line.kind === 'inbound'),
  );
  const quantity = matching.reduce((total, line) => total + line.quantity, 0);
  if (!quantity)
    return {
      ...state,
      message: `No carried boxes belong to ${station}. Every box has a labeled storage address.`,
    };
  return refresh({
    ...state,
    inventory: { ...state.inventory, [station]: state.inventory[station] + quantity },
    carried: state.carried.filter((line) => !matching.includes(line)),
    message: `Stored ${quantity} at ${station}. This same location is available for picking.`,
  });
}

export function pickAt(state: WarehouseState, station: WarehouseStation): WarehouseState {
  if (state.status !== 'working') return state;
  if (station === 'receiving')
    return { ...state, message: 'Use Put away at inbound to unload the labeled box.' };
  if (station !== 'dispatch') {
    if (!state.inventory[station])
      return {
        ...state,
        message: `${station} is empty. Check the incoming box label and restock here.`,
      };
    if (state.carrying >= capacity(state))
      return {
        ...state,
        message:
          'Your load is full. Deliver your picked items or put boxes back at their labeled rack.',
      };
    return refresh({
      ...state,
      inventory: { ...state.inventory, [station]: state.inventory[station] - 1 },
      carried: addCargo(state.carried, station, 'picked'),
      message: `Picked 1 from ${station}. Deliver it at outbound with Pick.`,
    });
  }
  if (state.quotaMet)
    return {
      ...state,
      message: 'Daily quota met. Restock your racks for tomorrow, or end the day.',
    };
  let moved = 0;
  const carried = state.carried.map((line) => ({ ...line }));
  const order = state.order.map((line) => {
    let needed = line.required - line.delivered;
    let delivered = line.delivered;
    for (const cargo of carried) {
      if (cargo.kind !== 'picked' || cargo.location !== line.location || needed <= 0) continue;
      const quantity = Math.min(needed, cargo.quantity);
      cargo.quantity -= quantity;
      needed -= quantity;
      delivered += quantity;
      moved += quantity;
    }
    return { ...line, delivered };
  });
  if (!moved)
    return {
      ...state,
      message: 'No matching picked items in your load. Follow the outbound order labels.',
    };
  if (order.some((line) => line.delivered < line.required))
    return refresh({
      ...state,
      carried,
      order,
      message: 'Items delivered. Fill the remaining order slots to earn $20.',
    });
  const dayShipped = state.dayShipped + 1;
  const quotaMet = dayShipped >= state.quota;
  const orderSequence = state.orderSequence + 1;
  return refresh({
    ...state,
    carried,
    cash: state.cash + 20,
    shipped: state.shipped + 1,
    dayShipped,
    quotaMet,
    bestDay: quotaMet ? Math.max(state.bestDay, state.day) : state.bestDay,
    orderSequence,
    order: quotaMet ? [] : makeOrder(state.day, orderSequence),
    message: quotaMet
      ? 'Quota met! Use the remaining time to restock for tomorrow, or End day.'
      : 'Order complete! +$20. The outbound truck has your next order.',
  });
}

export function buyUpgrade(state: WarehouseState, upgrade: WarehouseUpgrade): WarehouseState {
  if (state.status === 'failed' || state[upgrade]) return state;
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
        ? 'Picking cart saved. Carry 3 labeled boxes, including mixed orders.'
        : 'Routing automation saved. Auto stow inbound boxes, auto deliver picked items, and move 25% faster.',
  };
}
export function nextStation(state: WarehouseState): WarehouseStation {
  const inbound = state.carried.find((line) => line.kind === 'inbound');
  if (inbound) return inbound.location;
  if (
    state.carried.some(
      (item) =>
        item.kind === 'picked' &&
        state.order.some(
          (line) => line.location === item.location && line.delivered < line.required,
        ),
    )
  )
    return 'dispatch';
  const needed = state.order.find((line) => line.delivered < line.required);
  if (needed) return state.inventory[needed.location] > 0 ? needed.location : 'receiving';
  return 'receiving';
}
export function stationNear(point: Point): WarehouseStation | null {
  let nearest: WarehouseStation | null = null;
  let distance = Infinity;
  for (const name of Object.keys(STATIONS) as WarehouseStation[]) {
    const location = STATIONS[name];
    const next = Math.hypot(point.x - location.x, point.y - location.y);
    if (next < (isRack(name) ? 22 : 52) && next < distance) {
      nearest = name;
      distance = next;
    }
  }
  return nearest;
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
