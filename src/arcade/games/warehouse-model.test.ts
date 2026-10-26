import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RACK_IDS,
  RACK_CAPACITY,
  INBOUND_IDS,
  OUTBOUND_IDS,
  STATIONS,
  CONVEYOR_SECONDS,
  TRUCK_DEPART_SECONDS,
  TRUCK_ARRIVE_SECONDS,
  advanceWarehouseTime,
  buyUpgrade,
  canStand,
  capacity,
  dayQuota,
  daySeconds,
  endDay,
  newWarehouse,
  nextDay,
  nextPickLocations,
  nextStation,
  orderSize,
  parseWarehouseProgress,
  pickUpAt,
  putDownAt,
  routeTo,
  stationNear,
  warehouseProgress,
} from './warehouse-model';
import type { RackId, WarehouseState, OutboundId } from './warehouse-model';

function restock(state: WarehouseState, location: RackId): WarehouseState {
  let next = state;
  for (let attempts = 0; next.inventory[location] === 0 && attempts < 80; attempts++) {
    const lane = next.inbound.find((item) => item.location === location) ?? next.inbound[0];
    next = advanceWarehouseTime(next, lane.remaining);
    next = pickUpAt(next, lane.id);
    assert.equal(next.carrying, 1);
    next =
      next.inventory[lane.location] < RACK_CAPACITY
        ? putDownAt(next, lane.location)
        : putDownAt(next, 'trash');
  }
  assert.ok(next.inventory[location] > 0, `Could not replenish ${location}`);
  return next;
}
function completeOrder(state: WarehouseState, truckId: OutboundId): WarehouseState {
  let next = state;
  const truck = next.trucks.find((item) => item.id === truckId)!;
  assert.equal(truck.phase, 'loading');
  assert.ok(truck.order.length);
  for (const line of truck.order) {
    if (line.delivered >= line.required) continue;
    if (!next.inventory[line.location]) next = restock(next, line.location);
    next = putDownAt(pickUpAt(next, line.location), truckId);
  }
  return next;
}
function finishFirstDay() {
  return completeOrder(completeOrder(newWarehouse(), 'dispatch'), 'dispatch2');
}

test('Pick up and Put down work consistently at conveyors, racks and either truck without swapping cargo', () => {
  let state = newWarehouse();
  assert.equal(state.cash, 0);
  assert.equal(state.quota, 2);
  assert.equal(state.remaining, 90);
  assert.deepEqual(
    state.trucks.map((truck) => truck.order[0].location),
    ['A5', 'B2'],
  );
  assert.deepEqual(nextPickLocations(state), ['A5', 'B2']);
  state = pickUpAt(state, 'receiving');
  assert.deepEqual(state.carried, [{ location: 'A5', quantity: 1, kind: 'inbound' }]);
  assert.equal(state.deliveries, 1);
  for (const station of ['receiving', 'receiving2', 'B2'] as const) {
    const blocked = pickUpAt(state, station);
    assert.deepEqual(blocked.carried, state.carried);
    assert.deepEqual(blocked.inbound, state.inbound);
    assert.deepEqual(blocked.inventory, state.inventory);
  }
  for (const station of ['receiving', 'receiving2', 'A1', 'dispatch2'] as const) {
    const blocked = putDownAt(state, station);
    assert.deepEqual(blocked.carried, state.carried);
    assert.deepEqual(blocked.inventory, state.inventory);
    assert.deepEqual(blocked.inbound, state.inbound);
  }
  state = putDownAt(state, 'A5');
  assert.equal(state.inventory.A5, 1);
  assert.equal(state.carrying, 0);
  state = pickUpAt(state, 'A5');
  assert.equal(state.inventory.A5, 0);
  assert.equal(state.carried[0].kind, 'picked');
  assert.deepEqual(pickUpAt(state, 'dispatch').carried, state.carried);
  state = putDownAt(state, 'dispatch');
  assert.equal(state.cash, 20);
  assert.equal(state.dayShipped, 1);
  assert.equal(state.carrying, 0);
  assert.equal(state.trucks[0].phase, 'departing');
  assert.equal(state.trucks[1].phase, 'loading');
  assert.equal(state.trucks[1].order[0].delivered, 0);
  assert.deepEqual(nextPickLocations(state), ['B2']);
  // A matching inbound box follows the same pickup/drop rules as a rack box.
  state = putDownAt(pickUpAt(state, 'receiving2'), 'dispatch2');
  assert.equal(state.cash, 40);
  assert.equal(state.quotaMet, true);
});

test('incoming labels remain fixed until pickup and the replacement must travel to the conveyor end', () => {
  const initial = newWarehouse();
  const unchanged = advanceWarehouseTime(initial, 4);
  assert.deepEqual(unchanged.inbound, initial.inbound);
  let state = pickUpAt(initial, 'receiving');
  assert.equal(state.inbound[0].remaining, CONVEYOR_SECONDS);
  assert.equal(state.inbound[0].sequence, 1);
  const waitingLabel = state.inbound[0].location;
  state = putDownAt(state, 'A5');
  state = pickUpAt(state, 'B2');
  state = putDownAt(state, 'dispatch2');
  assert.equal(state.inbound[0].location, waitingLabel, 'new demand cannot relabel a visible box');
  const blocked = pickUpAt(state, 'receiving');
  assert.equal(blocked.carrying, 0);
  assert.equal(blocked.deliveries, 1);
  state = advanceWarehouseTime(state, CONVEYOR_SECONDS / 2);
  assert.equal(state.inbound[0].remaining, CONVEYOR_SECONDS / 2);
  state = advanceWarehouseTime(state, CONVEYOR_SECONDS / 2);
  state = pickUpAt(state, 'receiving');
  assert.equal(state.carried[0].location, waitingLabel);
  assert.equal(state.inbound[0].sequence, 2);
});

test('two outbound orders are independent, partial loads do not pay, and trucks depart then return once', () => {
  let state = nextDay(endDay(finishFirstDay()));
  const firstOrder = state.trucks[0].order;
  const secondOrder = state.trucks[1].order;
  assert.equal(firstOrder.length, 2);
  assert.notDeepEqual(firstOrder, secondOrder);
  const first = firstOrder[0].location;
  state = restock(state, first);
  state = putDownAt(pickUpAt(state, first), 'dispatch');
  assert.equal(state.cash, 40);
  assert.equal(state.dayShipped, 0);
  assert.equal(state.trucks[0].order[0].delivered, 1);
  assert.deepEqual(state.trucks[1].order, secondOrder);
  state = completeOrder(state, 'dispatch');
  assert.equal(state.cash, 60);
  assert.equal(state.trucks[0].phase, 'departing');
  assert.equal(state.trucks[0].remaining, TRUCK_DEPART_SECONDS);
  const departedSequence = state.trucks[0].sequence;
  for (let i = 0; i < 5; i++) state = putDownAt(state, 'dispatch');
  assert.equal(state.cash, 60);
  assert.equal(state.shipped, 3);
  state = advanceWarehouseTime(state, TRUCK_DEPART_SECONDS / 2);
  assert.equal(state.trucks[0].phase, 'departing');
  state = advanceWarehouseTime(state, TRUCK_DEPART_SECONDS / 2);
  assert.equal(state.trucks[0].phase, 'arriving');
  assert.equal(state.trucks[0].remaining, TRUCK_ARRIVE_SECONDS);
  assert.notEqual(state.trucks[0].sequence, departedSequence);
  assert.equal(state.trucks[0].order.length, 2);
  assert.deepEqual(state.trucks[1].order, secondOrder);
  state = advanceWarehouseTime(state, TRUCK_ARRIVE_SECONDS);
  assert.equal(state.trucks[0].phase, 'loading');
  assert.equal(state.trucks[0].remaining, 0);
  assert.equal(state.dayAssigned, state.quota);
  state = completeOrder(state, 'dispatch2');
  state = advanceWarehouseTime(state, TRUCK_DEPART_SECONDS + TRUCK_ARRIVE_SECONDS);
  assert.equal(state.trucks[1].phase, 'loading');
  assert.deepEqual(state.trucks[1].order, [], 'no additional order beyond daily quota');
  state = completeOrder(state, 'dispatch');
  assert.equal(state.quotaMet, true);
  assert.equal(state.dayShipped, 3);
  assert.equal(state.cash, 100);
});

test('rack capacity keeps excess boxes carried; trash costs $5 per box even with zero cash', () => {
  const initial = newWarehouse({ version: 1, cart: true, automation: false, bestDay: 0 });
  let state: WarehouseState = {
    ...initial,
    inventory: { ...initial.inventory, A5: 3 },
    stock: initial.stock + 3,
    carrying: 3,
    carried: [{ location: 'A5', quantity: 3, kind: 'inbound' }],
  };
  state = putDownAt(state, 'A5');
  assert.equal(state.inventory.A5, RACK_CAPACITY);
  assert.equal(state.carrying, 2);
  const full = putDownAt(state, 'A5');
  assert.deepEqual(full.carried, state.carried);
  assert.deepEqual(full.inventory, state.inventory);
  assert.equal(nextStation(state), 'dispatch');
  state = putDownAt(state, 'trash');
  assert.equal(state.carrying, 1);
  assert.equal(state.cash, -5);
  assert.equal(state.trashed, 1);
  state = putDownAt(state, 'trash');
  assert.equal(state.carrying, 0);
  assert.equal(state.cash, -10);
  assert.equal(state.trashed, 2);
  assert.equal(putDownAt(state, 'trash').cash, -10);
  assert.equal(pickUpAt(state, 'trash').carrying, 0);
});

test('upgrades are only purchasable between days and remain compatible with saved progression', () => {
  let working = { ...newWarehouse(), cash: 150 };
  assert.equal(buyUpgrade(working, 'cart'), working);
  assert.equal(buyUpgrade(working, 'automation'), working);
  const failed: WarehouseState = { ...working, status: 'failed' };
  assert.equal(buyUpgrade(failed, 'cart'), failed);
  let state = endDay(finishFirstDay());
  state = buyUpgrade(state, 'cart');
  assert.equal(state.cart, true);
  assert.equal(state.cash, 0);
  assert.equal(capacity(state), 3);
  assert.equal(buyUpgrade(state, 'cart'), state);
  assert.equal(buyUpgrade(state, 'automation').automation, false);
  state = buyUpgrade({ ...state, cash: 100 }, 'automation');
  assert.equal(state.automation, true);
  assert.equal(state.cash, 0);
  const retry = newWarehouse(warehouseProgress(state));
  assert.equal(retry.cart, true);
  assert.equal(retry.automation, true);
  assert.equal(retry.bestDay, 1);
  assert.equal(retry.cash, 0);
  assert.equal(retry.day, 1);
  assert.deepEqual(retry.carried, []);
});

test('overnight stock, carried boxes, conveyor position and money persist while day orders refresh', () => {
  let state = finishFirstDay();
  assert.equal(state.status, 'working');
  state = advanceWarehouseTime(state, 0.2);
  state = pickUpAt(state, 'receiving2');
  const inventory = state.inventory;
  const carried = state.carried;
  const inbound = state.inbound;
  const cash = state.cash;
  state = endDay(state);
  assert.equal(state.status, 'day-complete');
  assert.equal(advanceWarehouseTime(state, 100), state);
  assert.equal(pickUpAt(state, 'B2'), state);
  assert.equal(putDownAt(state, 'trash'), state);
  state = nextDay(state);
  assert.equal(state.day, 2);
  assert.equal(state.remaining, daySeconds(2));
  assert.equal(state.quota, dayQuota(2));
  assert.equal(state.dayShipped, 0);
  assert.equal(state.quotaMet, false);
  assert.deepEqual(state.inventory, inventory);
  assert.deepEqual(state.carried, carried);
  assert.deepEqual(state.inbound, inbound);
  assert.equal(state.cash, cash);
  assert.equal(state.trucks[0].order.length, 2);
  assert.equal(state.trucks[1].order.length, 2);
  assert.ok(dayQuota(10) > dayQuota(2));
  assert.ok(daySeconds(10) < daySeconds(2));
  assert.equal(daySeconds(100), 45);
  assert.equal(orderSize(4), 3);
});

test('timed transitions stop at the day boundary and terminal states cannot act or advance', () => {
  const initial = newWarehouse();
  assert.equal(endDay(initial), initial);
  assert.equal(nextDay(initial), initial);
  for (const seconds of [-1, 0, NaN, Infinity])
    assert.equal(advanceWarehouseTime(initial, seconds), initial);
  let state = pickUpAt({ ...initial, remaining: 0.25 }, 'receiving');
  state = putDownAt(state, 'dispatch');
  state = advanceWarehouseTime(state, 100);
  assert.equal(state.status, 'failed');
  assert.equal(state.remaining, 0);
  assert.equal(state.inbound[0].remaining, CONVEYOR_SECONDS - 0.25);
  assert.equal(state.trucks[0].remaining, TRUCK_DEPART_SECONDS - 0.25);
  assert.equal(advanceWarehouseTime(state, 100), state);
  assert.equal(pickUpAt(state, 'receiving2'), state);
  assert.equal(putDownAt(state, 'dispatch2'), state);
  const complete = advanceWarehouseTime(finishFirstDay(), 100);
  assert.equal(complete.status, 'day-complete');
  assert.equal(complete.remaining, 0);
});

test('automation stows inbound cargo only, never discards boxes, and leaves picked order cargo alone', () => {
  const initial = newWarehouse({ version: 1, cart: true, automation: true, bestDay: 0 });
  const mixed: WarehouseState = {
    ...initial,
    carried: [
      { location: 'A3', quantity: 1, kind: 'inbound' },
      { location: 'A3', quantity: 1, kind: 'picked' },
    ],
    carrying: 2,
  };
  const stored = putDownAt(mixed, 'A3', true);
  assert.equal(stored.inventory.A3, mixed.inventory.A3 + 1);
  assert.deepEqual(stored.carried, [{ location: 'A3', quantity: 1, kind: 'picked' }]);
  assert.equal(putDownAt(mixed, 'trash', true), mixed);
});

test('later two-truck orders remain replenish-able and conserve all units across days', () => {
  let state = newWarehouse({ version: 1, cart: true, automation: true, bestDay: 0 });
  let delivered = 0;
  const initialUnits = state.stock;
  const check = () => {
    assert.equal(
      state.stock,
      Object.values(state.inventory).reduce((sum, item) => sum + item, 0),
    );
    assert.equal(
      state.carrying,
      state.carried.reduce((sum, item) => sum + item.quantity, 0),
    );
    assert.equal(
      state.stock + state.carrying + delivered + state.trashed,
      initialUnits + state.deliveries,
    );
    assert.ok(
      Object.values(state.inventory).every((count) => count >= 0 && count <= RACK_CAPACITY),
    );
    assert.ok(state.carrying <= capacity(state));
  };
  for (let day = 1; day <= 12; day++) {
    // Exercise logistics independently of player movement time and daily difficulty.
    state = { ...state, remaining: 10000 };
    for (let attempts = 0; !state.quotaMet && attempts < state.quota * 3; attempts++) {
      const truck = state.trucks.find((item) => item.phase === 'loading' && item.order.length);
      if (!truck) {
        state = advanceWarehouseTime(state, 3);
        continue;
      }
      assert.equal(new Set(truck.order.map((line) => line.location)).size, truck.order.length);
      for (const line of truck.order) {
        if (line.delivered >= line.required) continue;
        if (!state.inventory[line.location]) state = restock(state, line.location);
        check();
        state = pickUpAt(state, line.location);
        check();
        const before = state.carrying;
        state = putDownAt(state, truck.id);
        delivered += before - state.carrying;
        check();
      }
    }
    assert.equal(state.dayShipped, state.quota);
    state = nextDay(endDay(state));
    check();
  }
});

test('saved progression validates version and types and never restores arbitrary attempt fields', () => {
  const baseline = parseWarehouseProgress(null);
  for (const invalid of [
    '',
    '{',
    'null',
    '[]',
    '{}',
    '{"version":2,"cart":true,"automation":false,"bestDay":1}',
    '{"version":1,"cart":"true","automation":false,"bestDay":1}',
    '{"version":1,"cart":true,"automation":false,"bestDay":-1}',
    '{"version":1,"cart":true,"automation":false,"bestDay":1.5}',
    '{"version":1,"cart":true,"automation":false,"bestDay":10001}',
    ' '.repeat(513),
  ])
    assert.deepEqual(parseWarehouseProgress(invalid), baseline);
  const saved = parseWarehouseProgress(
    '{"version":1,"cart":true,"automation":true,"bestDay":8,"cash":999,"__proto__":{"polluted":true}}',
  );
  assert.deepEqual(saved, { version: 1, cart: true, automation: true, bestDay: 8 });
  assert.deepEqual(parseWarehouseProgress(JSON.stringify(saved)), saved);
  const restored = newWarehouse(saved);
  assert.equal(restored.cash, 0);
  assert.equal(restored.day, 1);
  assert.equal(restored.cart, true);
  assert.equal(restored.automation, true);
  assert.equal(restored.bestDay, 8);
});

test('all sixteen rack addresses, both docks, both trucks and trash remain reachable', () => {
  assert.equal(RACK_IDS.length, 16);
  assert.equal(INBOUND_IDS.length, 2);
  assert.equal(OUTBOUND_IDS.length, 2);
  assert.equal(Object.keys(STATIONS).length, 21);
  assert.equal(canStand({ x: 350, y: 245 }), false);
  assert.equal(canStand({ x: 350, y: 415 }), false);
  assert.equal(canStand({ x: 350, y: 332 }), true);
  assert.equal(canStand({ x: 100, y: 220 }), false);
  assert.equal(canStand({ x: 850, y: 410 }), false);
  for (const [station, point] of Object.entries(STATIONS))
    assert.equal(stationNear(point), station);
  for (const start of [{ x: 202, y: 438 }, ...Object.values(STATIONS)]) {
    for (const target of Object.values(STATIONS)) {
      const route = routeTo(start, target);
      assert.ok(route.length > 0);
      assert.ok(route.every(canStand));
      assert.deepEqual(route.at(-1), target);
    }
  }
});
