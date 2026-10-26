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
export const INBOUND_IDS = ['receiving', 'receiving2'] as const;
export const OUTBOUND_IDS = ['dispatch', 'dispatch2'] as const;
export type InboundId = (typeof INBOUND_IDS)[number];
export type OutboundId = (typeof OUTBOUND_IDS)[number];
export type WarehouseStation = InboundId | RackId | OutboundId | 'trash';
export type WarehouseUpgrade = 'cart' | 'automation';
export type WarehouseProgress = { version: 1; cart: boolean; automation: boolean; bestDay: number };
export type CargoLine = { location: RackId; quantity: number; kind: 'inbound' | 'picked' };
export type OrderLine = { location: RackId; required: number; delivered: number };
export type InboundLane = { id: InboundId; location: RackId; sequence: number; remaining: number };
export type OutboundTruck = {
  id: OutboundId;
  order: OrderLine[];
  sequence: number;
  phase: 'loading' | 'departing' | 'arriving';
  remaining: number;
};
export type WarehouseState = {
  cash: number;
  stock: number;
  inventory: Record<RackId, number>;
  carried: CargoLine[];
  carrying: number;
  shipped: number;
  deliveries: number;
  trashed: number;
  inbound: InboundLane[];
  trucks: OutboundTruck[];
  orderSequence: number;
  dayAssigned: number;
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
  receiving: { x: 210, y: 220 },
  receiving2: { x: 210, y: 410 },
  ...Object.fromEntries(
    RACK_IDS.map((id, index) => [
      id,
      { x: 348 + (index % 4) * 88, y: index < 4 ? 195 : index < 8 ? 315 : index < 12 ? 365 : 485 },
    ]),
  ),
  dispatch: { x: 756, y: 220 },
  dispatch2: { x: 756, y: 410 },
  trash: { x: 760, y: 495 },
} as Record<WarehouseStation, Point>;
const OBSTACLES = [
  ...RACKS,
  { x: 0, y: 180, w: 175, h: 80 },
  { x: 0, y: 370, w: 175, h: 80 },
  { x: 796, y: 180, w: 164, h: 80 },
  { x: 796, y: 370, w: 164, h: 80 },
  { x: 802, y: 478, w: 48, h: 40 },
];
export const RACK_CAPACITY = 4;
export const CONVEYOR_SECONDS = 1.1;
export const TRUCK_DEPART_SECONDS = 1.2;
export const TRUCK_ARRIVE_SECONDS = 1.2;
export const UPGRADE_COST: Record<WarehouseUpgrade, number> = { cart: 40, automation: 100 };
export const WAREHOUSE_PROGRESS_KEY = 'jc-warehouse-progress-v1';
export const capacity = (state: WarehouseState) => (state.cart ? 3 : 1);
export const dayQuota = (day: number) => day + 1;
export const daySeconds = (day: number) => Math.max(45, 90 - (day - 1) * 3);
export const orderSize = (day: number) => (day === 1 ? 1 : day < 4 ? 2 : 3);
export const isRack = (station: WarehouseStation): station is RackId =>
  RACK_IDS.includes(station as RackId);
export const isInbound = (station: WarehouseStation): station is InboundId =>
  INBOUND_IDS.includes(station as InboundId);
export const isOutbound = (station: WarehouseStation): station is OutboundId =>
  OUTBOUND_IDS.includes(station as OutboundId);
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
  return {
    ...state,
    carried,
    carrying: carried.reduce((total, item) => total + item.quantity, 0),
    stock: Object.values(state.inventory).reduce((total, quantity) => total + quantity, 0),
  };
}
function addCargo(carried: CargoLine[], location: RackId, kind: CargoLine['kind']): CargoLine[] {
  const existing = carried.find((line) => line.location === location && line.kind === kind);
  return existing
    ? carried.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
    : [...carried, { location, kind, quantity: 1 }];
}
function outstanding(state: WarehouseState) {
  return state.trucks
    .filter((truck) => truck.phase !== 'departing')
    .flatMap((truck) => truck.order.filter((line) => line.delivered < line.required));
}
export function nextPickLocations(state: WarehouseState): RackId[] {
  return [...new Set(outstanding(state).map((line) => line.location))];
}
// A visible box never changes its label. Choose a replacement only after pickup.
function nextIncoming(state: WarehouseState, lane: InboundId): RackId {
  const available = (location: RackId) =>
    state.inventory[location] +
    state.carried
      .filter((item) => item.location === location)
      .reduce((total, item) => total + item.quantity, 0) +
    state.inbound.filter((item) => item.id !== lane && item.location === location).length;
  const needs = new Map<RackId, number>();
  for (const line of outstanding(state))
    needs.set(line.location, (needs.get(line.location) ?? 0) + line.required - line.delivered);
  for (const [location, required] of needs) if (available(location) < required) return location;
  const start = (state.deliveries + (lane === 'receiving2' ? 8 : 0)) % RACK_IDS.length;
  for (let i = 0; i < RACK_IDS.length; i++) {
    const location = RACK_IDS[(start + i) % RACK_IDS.length];
    if (available(location) < RACK_CAPACITY) return location;
  }
  return RACK_IDS[start];
}
function makeTruck(id: OutboundId, day: number, sequence: number): OutboundTruck {
  return { id, order: makeOrder(day, sequence), sequence, phase: 'loading', remaining: 0 };
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
    trashed: 0,
    inbound: [
      { id: 'receiving', location: 'A5', sequence: 0, remaining: 0 },
      { id: 'receiving2', location: 'B2', sequence: 0, remaining: 0 },
    ],
    trucks: OUTBOUND_IDS.map((id, index) => makeTruck(id, 1, index)),
    orderSequence: 2,
    dayAssigned: 2,
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
      'Pick up a box from a conveyor or rack. Put it down at its labeled rack or matching truck.',
  });

export function advanceWarehouseTime(state: WarehouseState, seconds: number): WarehouseState {
  if (state.status !== 'working' || !Number.isFinite(seconds) || seconds <= 0) return state;
  const elapsed = Math.min(seconds, state.remaining);
  const remaining = Math.max(0, state.remaining - elapsed);
  let orderSequence = state.orderSequence;
  let dayAssigned = state.dayAssigned;
  const trucks = state.trucks.map((original) => {
    let truck = original;
    let time = elapsed;
    while (truck.phase !== 'loading' && time >= truck.remaining) {
      time -= truck.remaining;
      if (truck.phase === 'departing') {
        const assigned = dayAssigned < state.quota;
        truck = {
          ...truck,
          phase: 'arriving',
          remaining: TRUCK_ARRIVE_SECONDS,
          sequence: orderSequence,
          order: assigned ? makeOrder(state.day, orderSequence) : [],
        };
        // Even after the quota is allocated, a replacement truck pulls up and waits.
        if (assigned) {
          orderSequence++;
          dayAssigned++;
        }
      } else truck = { ...truck, phase: 'loading', remaining: 0 };
    }
    return truck.phase === 'loading'
      ? truck
      : { ...truck, remaining: Math.max(0, truck.remaining - time) };
  });
  const next = {
    ...state,
    trucks,
    orderSequence,
    dayAssigned,
    inbound: state.inbound.map((lane) => ({
      ...lane,
      remaining: Math.max(0, lane.remaining - elapsed),
    })),
    remaining,
  };
  if (remaining > 0) return next;
  return {
    ...next,
    status: state.quotaMet ? 'day-complete' : 'failed',
    message: state.quotaMet
      ? `Day ${state.day} complete. Your stock and carried boxes stay for tomorrow.`
      : `Time is up. You completed ${state.day - 1} days. Your upgrades are saved.`,
  };
}
export function endDay(state: WarehouseState): WarehouseState {
  if (state.status !== 'working' || !state.quotaMet) return state;
  return {
    ...state,
    status: 'day-complete',
    message: `Day ${state.day} complete. Your stock and carried boxes stay for tomorrow.`,
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
    dayAssigned: 2,
    remaining: daySeconds(day),
    quotaMet: false,
    status: 'working',
    trucks: OUTBOUND_IDS.map((id, index) => makeTruck(id, day, state.orderSequence + index)),
    orderSequence: state.orderSequence + 2,
    message: `Day ${day}: ${dayQuota(day)} orders, ${orderSize(day)} items each. Stock from yesterday is ready.`,
  });
}
export function pickUpAt(state: WarehouseState, station: WarehouseStation): WarehouseState {
  if (state.status !== 'working') return state;
  if (!isInbound(station) && !isRack(station))
    return {
      ...state,
      message: 'Pick up boxes at a conveyor or rack. Use Put down to deliver or discard them.',
    };
  if (state.carrying >= capacity(state))
    return { ...state, message: 'Your load is full. Put down a box before picking up another.' };
  if (isInbound(station)) {
    const lane = state.inbound.find((item) => item.id === station)!;
    if (lane.remaining > 0)
      return { ...state, message: 'The next box is moving down the conveyor.' };
    const loaded = refresh({
      ...state,
      deliveries: state.deliveries + 1,
      carried: addCargo(state.carried, lane.location, 'inbound'),
    });
    const location = nextIncoming(loaded, station);
    return {
      ...loaded,
      inbound: loaded.inbound.map((item) =>
        item.id === station
          ? { ...item, location, sequence: item.sequence + 1, remaining: CONVEYOR_SECONDS }
          : item,
      ),
      message: `Picked up ${lane.location}. Put it down at ${lane.location} or a truck requesting it.`,
    };
  }
  if (!state.inventory[station])
    return {
      ...state,
      message: `${station} is empty. A box with that address must arrive at a conveyor.`,
    };
  return refresh({
    ...state,
    inventory: { ...state.inventory, [station]: state.inventory[station] - 1 },
    carried: addCargo(state.carried, station, 'picked'),
    message: `Picked up ${station}. Put it down at a matching truck or return it to ${station}.`,
  });
}
export function putDownAt(
  state: WarehouseState,
  station: WarehouseStation,
  inboundOnly = false,
): WarehouseState {
  if (state.status !== 'working') return state;
  if (isInbound(station))
    return {
      ...state,
      message:
        'Boxes cannot go back on the conveyor. Use their rack, a matching truck, or the $5 trash bin.',
    };
  if (!state.carrying) return { ...state, message: 'You are not carrying a box.' };
  if (station === 'trash') {
    if (inboundOnly) return state;
    const first = state.carried[0];
    return refresh({
      ...state,
      cash: state.cash - 5,
      trashed: state.trashed + 1,
      carried: state.carried.map((item, index) =>
        index === 0 ? { ...item, quantity: item.quantity - 1 } : item,
      ),
      message: `Discarded one ${first.location} box. -$5 disposal cost.`,
    });
  }
  if (isRack(station)) {
    let free = RACK_CAPACITY - state.inventory[station];
    let moved = 0;
    const carried = state.carried.map((item) => {
      if (item.location !== station || (inboundOnly && item.kind !== 'inbound')) return item;
      const quantity = Math.min(item.quantity, free);
      free -= quantity;
      moved += quantity;
      return { ...item, quantity: item.quantity - quantity };
    });
    if (!moved)
      return {
        ...state,
        message:
          free <= 0
            ? `${station} is full (${RACK_CAPACITY}/${RACK_CAPACITY}). Keep the box, deliver it, or use the $5 trash bin.`
            : `Your boxes belong at their labeled addresses, not ${station}.`,
      };
    return refresh({
      ...state,
      inventory: { ...state.inventory, [station]: state.inventory[station] + moved },
      carried,
      message: `Stored ${moved} at ${station}.${carried.some((item) => item.location === station && item.quantity > 0) ? ' The rack is full; the remaining boxes stay with you.' : ''}`,
    });
  }
  const truck = state.trucks.find((item) => item.id === station)!;
  if (truck.phase !== 'loading')
    return { ...state, message: 'Wait for the next truck to park before loading.' };
  if (state.quotaMet || !truck.order.length)
    return {
      ...state,
      message: 'This truck is waiting for tomorrow. Restock your racks or finish the day.',
    };
  const carried = state.carried.map((item) => ({ ...item }));
  let moved = 0;
  const order = truck.order.map((line) => {
    let needed = line.required - line.delivered;
    let delivered = line.delivered;
    for (const cargo of carried) {
      if (cargo.location !== line.location || needed <= 0) continue;
      const quantity = Math.min(cargo.quantity, needed);
      cargo.quantity -= quantity;
      needed -= quantity;
      delivered += quantity;
      moved += quantity;
    }
    return { ...line, delivered };
  });
  if (!moved)
    return { ...state, message: 'No carried boxes match this truck. Check its order locations.' };
  const complete = order.every((line) => line.delivered >= line.required);
  const trucks = state.trucks.map((item) =>
    item.id === station
      ? {
          ...item,
          order,
          phase: complete ? ('departing' as const) : ('loading' as const),
          remaining: complete ? TRUCK_DEPART_SECONDS : 0,
        }
      : item,
  );
  if (!complete)
    return refresh({
      ...state,
      carried,
      trucks,
      message: "Box loaded. Fill this truck's remaining slots to earn $20.",
    });
  const dayShipped = state.dayShipped + 1;
  const quotaMet = dayShipped >= state.quota;
  return refresh({
    ...state,
    carried,
    trucks,
    cash: state.cash + 20,
    shipped: state.shipped + 1,
    dayShipped,
    quotaMet,
    bestDay: quotaMet ? Math.max(state.bestDay, state.day) : state.bestDay,
    message: quotaMet
      ? 'Quota met! Restock for tomorrow, or End day to buy upgrades.'
      : 'Order complete! +$20. The truck is leaving.',
  });
}
export function buyUpgrade(state: WarehouseState, upgrade: WarehouseUpgrade): WarehouseState {
  if (state.status !== 'day-complete' || state[upgrade]) return state;
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
        ? 'Picking cart saved. Carry three labeled boxes.'
        : 'Routing automation saved. Automatic rack storage and truck delivery; movement is 25% faster.',
  };
}
export function nextStation(state: WarehouseState): WarehouseStation {
  for (const truck of state.trucks)
    if (
      truck.phase === 'loading' &&
      truck.order.some(
        (line) =>
          line.required > line.delivered &&
          state.carried.some((item) => item.location === line.location),
      )
    )
      return truck.id;
  const cargo = state.carried[0];
  if (cargo) return state.inventory[cargo.location] < RACK_CAPACITY ? cargo.location : 'trash';
  const locations = nextPickLocations(state);
  const stocked = locations.find((location) => state.inventory[location] > 0);
  if (stocked) return stocked;
  const incoming = state.inbound.find((lane) => locations.includes(lane.location));
  return incoming?.id ?? 'receiving';
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
