import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STATIONS,
  buyUpgrade,
  canStand,
  capacity,
  newWarehouse,
  routeTo,
  workAt,
} from './warehouse-model';

test('warehouse pays only for received, shelved, picked, and dispatched goods', () => {
  let state = newWarehouse();
  assert.equal(state.cash, 0);
  assert.equal(workAt(state, 'dispatch').cash, 0);
  assert.equal(workAt(state, 'racks').carrying, 0);
  state = workAt(state, 'receiving');
  assert.equal(state.cargo, 'inbound');
  assert.equal(workAt(state, 'dispatch').cash, 0);
  state = workAt(state, 'racks');
  assert.equal(state.stock, 1);
  assert.equal(state.carrying, 0);
  state = workAt(state, 'racks');
  assert.equal(state.stock, 0);
  assert.equal(state.cargo, 'order');
  state = workAt(state, 'dispatch');
  assert.equal(state.cash, 20);
  assert.equal(state.shipped, 1);
  assert.equal(state.carrying, 0);
  assert.equal(workAt(state, 'dispatch').cash, 20);
});

test('upgrades require funds, cannot charge twice, and cart triples delivered earnings', () => {
  assert.equal(buyUpgrade(newWarehouse(), 'cart').cash, 0);
  assert.equal(buyUpgrade(newWarehouse(), 'cart').cart, false);
  let state = buyUpgrade({ ...newWarehouse(), cash: 40 }, 'cart');
  assert.equal(state.cash, 0);
  assert.equal(capacity(state), 3);
  assert.equal(buyUpgrade(state, 'cart'), state);
  for (const station of ['receiving', 'racks', 'racks', 'dispatch'] as const)
    state = workAt(state, station);
  assert.equal(state.cash, 60);
  assert.equal(state.shipped, 3);
  assert.equal(buyUpgrade(state, 'automation').automation, false);
  state = buyUpgrade({ ...state, cash: 100 }, 'automation');
  assert.equal(state.cash, 0);
  assert.equal(state.automation, true);
});

test('racks block movement and all work zones have reachable tap routes', () => {
  assert.equal(canStand({ x: 350, y: 230 }), false);
  assert.equal(canStand({ x: 350, y: 332 }), true);
  for (const start of [{ x: 202, y: 438 }, ...Object.values(STATIONS), { x: 480, y: 164 }]) {
    for (const target of Object.values(STATIONS)) {
      const route = routeTo(start, target);
      assert.ok(route.length > 0);
      assert.ok(route.every(canStand));
      assert.deepEqual(route.at(-1), target);
    }
  }
});
