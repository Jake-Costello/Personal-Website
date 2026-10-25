import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceSketchRide,
  beginRide,
  buildTrail,
  defaultTrail,
  TRAIL_FINISH,
  trailHeight,
} from './sketchRideModel.ts';

const neutral = { left: false, right: false, jump: false };

test('the starter course reaches the finish without needing expert controls', () => {
  const trail = defaultTrail();
  let state = beginRide(trail);
  for (let frame = 0; frame < 60 * 20 && state.status === 'riding'; frame += 1) {
    state = advanceSketchRide(state, trail, neutral, 1 / 60);
  }
  assert.equal(state.status, 'finished');
  assert.equal(state.x, TRAIL_FINISH);
  assert.ok(state.time > 3 && state.time < 20);
});

test('a jump leaves the trail, falls under gravity, and lands', () => {
  const trail = [
    { x: 0, y: 320 },
    { x: 960, y: 320 },
  ];
  let state = advanceSketchRide(beginRide(trail), trail, { ...neutral, jump: true }, 1 / 60);
  assert.equal(state.grounded, false);
  assert.equal(state.jumps, 1);
  assert.ok(state.y < 308);
  for (let frame = 0; frame < 90; frame += 1)
    state = advanceSketchRide(state, trail, neutral, 1 / 60);
  assert.equal(state.grounded, true);
  assert.equal(state.status, 'riding');
  assert.equal(state.y, 308);
});

test('pedaling and braking change pace without backing off the course', () => {
  const trail = defaultTrail();
  let slow = beginRide(trail);
  let fast = beginRide(trail);
  for (let frame = 0; frame < 60; frame += 1) {
    slow = advanceSketchRide(slow, trail, { ...neutral, left: true }, 1 / 60);
    fast = advanceSketchRide(fast, trail, { ...neutral, right: true }, 1 / 60);
  }
  assert.ok(fast.x > slow.x + 30);
  assert.ok(slow.vx >= 24);
});

test('drawing yields a finite continuous trail and short marks are rejected', () => {
  assert.equal(
    buildTrail([
      { x: 20, y: 20 },
      { x: 40, y: 40 },
    ]),
    null,
  );
  const trail = buildTrail([
    { x: 85, y: 205 },
    { x: 200, y: 260 },
    { x: 460, y: 310 },
    { x: 860, y: 450 },
  ]);
  assert.ok(trail);
  assert.equal(trail[0].x, 0);
  assert.equal(trail[trail.length - 1].x, 960);
  assert.ok(trail.every((point) => Number.isFinite(point.y)));
  assert.ok(trailHeight(trail, 860) > trailHeight(trail, 85));
});

test('an upside-down hard landing crashes and a fresh ride resets it', () => {
  const trail = defaultTrail();
  const initial = beginRide(trail);
  const crash = advanceSketchRide(
    { ...initial, y: initial.y - 1, vy: 350, angle: Math.PI, grounded: false },
    trail,
    neutral,
    1 / 60,
  );
  assert.equal(crash.status, 'crashed');
  assert.equal(advanceSketchRide(crash, trail, neutral, 1 / 60), crash);
  assert.deepEqual(beginRide(trail), initial);
});
