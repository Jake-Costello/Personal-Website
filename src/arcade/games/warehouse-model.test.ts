import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RACK_IDS,
  STATIONS,
  advanceWarehouseTime,
  buyUpgrade,
  canStand,
  capacity,
  dayQuota,
  daySeconds,
  endDay,
  newWarehouse,
  nextDay,
  orderSize,
  parseWarehouseProgress,
  pickAt,
  putAwayAt,
  routeTo,
  stationNear,
  warehouseProgress,
} from './warehouse-model';
import type { RackId, WarehouseState } from './warehouse-model';

function supply(state: WarehouseState) {
  const location = state.inboundLocation;
  return putAwayAt(putAwayAt(state, 'receiving'), location);
}
function completeOrder(state: WarehouseState) {
  let next = state;
  const requested = [...state.order];
  for (const line of requested) {
    if (!next.inventory[line.location]) {
      assert.equal(next.inboundLocation, line.location);
      next = supply(next);
    }
    next = pickAt(next, line.location);
    next = pickAt(next, 'dispatch');
  }
  return next;
}
function finishFirstDay() {
  return completeOrder(completeOrder(newWarehouse()));
}

test('one shared address accepts a labeled inbound box and lets the player pick it independently', () => {
  let state = newWarehouse();
  assert.equal(state.cash, 0);
  assert.equal(state.day, 1);
  assert.equal(state.quota, 2);
  assert.equal(state.remaining, 90);
  assert.equal(state.inboundLocation, 'A5');
  assert.equal(state.inventory.A5, 0);
  assert.deepEqual(state.order, [{ location: 'A5', required: 1, delivered: 0 }]);
  assert.equal(pickAt(state, 'A5').carrying, 0);
  assert.equal(pickAt(state, 'receiving').carrying, 0);
  state = putAwayAt(state, 'receiving');
  assert.equal(state.carrying, 1);
  assert.deepEqual(state.carried, [{ location: 'A5', quantity: 1, kind: 'inbound' }]);
  assert.notEqual(state.inboundLocation, 'A5');
  assert.deepEqual(putAwayAt(state, 'B2').inventory, state.inventory);
  assert.equal(putAwayAt(state, 'B2').carrying, 1);
  assert.equal(
    pickAt(state, 'dispatch').cash,
    0,
    'an inbound box cannot bypass putaway and picking',
  );
  state = putAwayAt(state, 'A5');
  assert.equal(state.inventory.A5, 1);
  assert.equal(state.carrying, 0);
  state = pickAt(state, 'A5');
  assert.equal(state.inventory.A5, 0);
  assert.deepEqual(state.carried, [{ location: 'A5', quantity: 1, kind: 'picked' }]);
  state = pickAt(state, 'dispatch');
  assert.equal(state.cash, 20);
  assert.equal(state.shipped, 1);
  assert.equal(state.dayShipped, 1);
  assert.equal(state.carrying, 0);
  assert.equal(state.order[0].location, 'B2');
  assert.equal(pickAt(state, 'dispatch').cash, 20);
});

test('picking and restocking are independent choices, with full loads and incorrect items handled safely', () => {
  let state = newWarehouse();
  state = pickAt(state, 'B1');
  assert.equal(state.inventory.B1, 1);
  assert.equal(state.carrying, 1);
  assert.equal(putAwayAt(state, 'receiving').carrying, 1);
  assert.equal(pickAt(state, 'B2').inventory.B2, 2);
  assert.equal(pickAt(state, 'dispatch').cash, 0);
  assert.equal(pickAt(state, 'dispatch').carrying, 1);
  state = putAwayAt(state, 'B1');
  assert.equal(state.inventory.B1, 2);
  assert.equal(state.carrying, 0);
  state = completeOrder(state);
  const beforeSupply = state.deliveries;
  state = completeOrder(state);
  assert.equal(state.deliveries, beforeSupply, 'a stocked outbound order needs no receiving step');
  assert.equal(state.cash, 40);
});

test('multi-item orders accept partial deliveries but only pay once all distinct slots are filled', () => {
  let state = nextDay(endDay(finishFirstDay()));
  assert.equal(state.order.length, 2);
  assert.notEqual(state.order[0].location, state.order[1].location);
  const [first, second] = state.order;
  const cash = state.cash;
  state = pickAt(pickAt(state, first.location), 'dispatch');
  assert.equal(state.cash, cash);
  assert.equal(state.dayShipped, 0);
  assert.equal(state.order[0].delivered, 1);
  assert.equal(state.order[1].delivered, 0);
  const partial = state;
  assert.equal(pickAt(state, 'dispatch').cash, cash);
  state = pickAt(pickAt(state, second.location), 'dispatch');
  assert.equal(state.cash, cash + 20);
  assert.equal(state.dayShipped, 1);
  assert.equal(state.shipped, partial.shipped + 1);
  assert.notDeepEqual(state.order, partial.order);
  assert.equal(orderSize(1), 1);
  assert.equal(orderSize(2), 2);
  assert.equal(orderSize(4), 3);
  assert.equal(orderSize(30), 3);
});

test('quota met leaves the floor open for restocking, and stock plus carried goods survive the next day', () => {
  let state = finishFirstDay();
  assert.equal(state.status, 'working');
  assert.equal(state.quotaMet, true);
  assert.equal(state.bestDay, 1);
  assert.equal(state.cash, 40);
  assert.deepEqual(state.order, []);
  state = advanceWarehouseTime(state, 10);
  assert.equal(state.remaining, 80);
  const destination = state.inboundLocation;
  const before = state.inventory[destination];
  state = supply(state);
  assert.equal(state.inventory[destination], before + 1);
  state = putAwayAt(state, 'receiving');
  const inventory = state.inventory;
  const carried = state.carried;
  state = endDay(state);
  assert.equal(state.status, 'day-complete');
  assert.equal(advanceWarehouseTime(state, 100), state);
  assert.equal(pickAt(state, 'A1'), state);
  state = nextDay(state);
  assert.equal(state.day, 2);
  assert.equal(state.quota, 3);
  assert.equal(state.remaining, 87);
  assert.equal(state.dayShipped, 0);
  assert.equal(state.quotaMet, false);
  assert.deepEqual(state.inventory, inventory);
  assert.deepEqual(state.carried, carried);
  assert.equal(state.cash, 40);
  assert.ok(dayQuota(10) > dayQuota(2));
  assert.ok(daySeconds(10) < daySeconds(2));
  assert.equal(daySeconds(100), 45);
});

test('timeout completes a quota-met day but fails an unfinished one; retry retains only permanent progression', () => {
  const initial = newWarehouse();
  assert.equal(endDay(initial), initial);
  assert.equal(nextDay(initial), initial);
  for (const elapsed of [-1, 0, NaN, Infinity])
    assert.equal(advanceWarehouseTime(initial, elapsed), initial);
  const success = advanceWarehouseTime(finishFirstDay(), 100);
  assert.equal(success.status, 'day-complete');
  assert.equal(success.remaining, 0);
  let state = buyUpgrade(success, 'cart');
  state = nextDay(state);
  state = advanceWarehouseTime(state, 86.5);
  assert.equal(state.remaining, 0.5);
  assert.equal(state.status, 'working');
  state = advanceWarehouseTime(state, 1);
  assert.equal(state.status, 'failed');
  assert.equal(putAwayAt(state, 'receiving'), state);
  assert.equal(pickAt(state, 'A1'), state);
  assert.equal(advanceWarehouseTime(state, 1), state);
  const retry = newWarehouse(warehouseProgress(state));
  assert.equal(retry.day, 1);
  assert.equal(retry.cash, 0);
  assert.equal(retry.shipped, 0);
  assert.equal(retry.remaining, 90);
  assert.equal(retry.cart, true);
  assert.equal(retry.bestDay, 1);
  assert.deepEqual(retry.inventory, initial.inventory);
  assert.deepEqual(retry.carried, []);
});

test('cart holds three mixed SKUs; inbound-only automation never returns picked goods to storage', () => {
  assert.equal(buyUpgrade(newWarehouse(), 'cart').cart, false);
  let state = buyUpgrade(finishFirstDay(), 'cart');
  assert.equal(state.cash, 0);
  assert.equal(capacity(state), 3);
  assert.equal(buyUpgrade(state, 'cart'), state);
  state = nextDay(endDay(state));
  for (const location of ['A1', 'A2', 'B1'] as RackId[]) state = pickAt(state, location);
  assert.equal(state.carrying, 3);
  assert.equal(state.carried.length, 3);
  assert.equal(pickAt(state, 'B2').inventory.B2, state.inventory.B2);
  state = putAwayAt(state, 'A1');
  assert.equal(state.carrying, 2);
  const mixed: WarehouseState = {
    ...state,
    carried: [
      { location: 'A3', quantity: 1, kind: 'inbound' },
      { location: 'A3', quantity: 1, kind: 'picked' },
    ],
    carrying: 2,
  };
  const stored = putAwayAt(mixed, 'A3', true);
  assert.equal(stored.inventory.A3, mixed.inventory.A3 + 1);
  assert.deepEqual(stored.carried, [{ location: 'A3', quantity: 1, kind: 'picked' }]);
  state = buyUpgrade({ ...state, cash: 100 }, 'automation');
  assert.equal(state.cash, 0);
  assert.equal(state.automation, true);
  assert.equal(buyUpgrade(state, 'automation'), state);
});

test('later orders always have replenish-able missing SKUs and conserve inventory through mixed orders', () => {
  let state = newWarehouse({ version: 1, cart: true, automation: true, bestDay: 0 });
  let deliveredUnits = 0;
  const initialUnits = state.stock;
  const assertInventory = () => {
    assert.equal(
      state.stock,
      Object.values(state.inventory).reduce((a, b) => a + b, 0),
    );
    assert.equal(
      state.carrying,
      state.carried.reduce((total, line) => total + line.quantity, 0),
    );
    assert.equal(state.stock + state.carrying + deliveredUnits, initialUnits + state.deliveries);
    assert.ok(Object.values(state.inventory).every((count) => count >= 0));
  };
  for (let day = 1; day <= 20; day++) {
    while (!state.quotaMet) {
      const requested = [...state.order];
      assert.equal(new Set(requested.map((line) => line.location)).size, requested.length);
      for (const line of requested) {
        if (!state.inventory[line.location]) {
          assert.equal(state.inboundLocation, line.location);
          state = supply(state);
          assertInventory();
        }
        state = pickAt(state, line.location);
        assertInventory();
        const before = state.carrying;
        state = pickAt(state, 'dispatch');
        deliveredUnits += before - state.carrying;
        assertInventory();
      }
    }
    assert.equal(state.dayShipped, state.quota);
    state = nextDay(endDay(state));
    assertInventory();
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

test('two horizontal racks expose all sixteen reachable addresses and block walking through shelves', () => {
  assert.equal(RACK_IDS.length, 16);
  assert.equal(canStand({ x: 350, y: 245 }), false);
  assert.equal(canStand({ x: 350, y: 415 }), false);
  assert.equal(canStand({ x: 350, y: 332 }), true);
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
