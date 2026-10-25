import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceSketchRide,
  beginRide,
  buildTrail,
  defaultTrail,
  riderTerrainContact,
  TRAIL_FINISH,
  trailHeight,
} from './sketchRideModel.ts';

const neutral = { left: false, right: false, pedal: false, brake: false, jump: false };
const flatTrail = [
  { x: 0, y: 320 },
  { x: 960, y: 320 },
];

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
    slow = advanceSketchRide(slow, trail, { ...neutral, brake: true }, 1 / 60);
    fast = advanceSketchRide(fast, trail, { ...neutral, pedal: true }, 1 / 60);
  }
  assert.ok(fast.x > slow.x + 30);
  assert.ok(slow.vx >= 0);
});

test('leaning changes tilt independently of pedal and brake acceleration', () => {
  const initial = beginRide(flatTrail);
  const normal = advanceSketchRide(initial, flatTrail, neutral, 1 / 60);
  const back = advanceSketchRide(initial, flatTrail, { ...neutral, left: true }, 1 / 60);
  const forward = advanceSketchRide(initial, flatTrail, { ...neutral, right: true }, 1 / 60);
  const pedaled = advanceSketchRide(initial, flatTrail, { ...neutral, pedal: true }, 1 / 60);
  const braked = advanceSketchRide(initial, flatTrail, { ...neutral, brake: true }, 1 / 60);
  assert.equal(back.vx, normal.vx);
  assert.equal(forward.vx, normal.vx);
  assert.ok(back.angle < normal.angle && forward.angle > normal.angle);
  assert.equal(pedaled.angle, normal.angle);
  assert.equal(braked.angle, normal.angle);
  assert.ok(pedaled.vx > normal.vx && braked.vx < normal.vx);
});

test('holding pedal accelerates continuously without triggering jumps, and brake can stop', () => {
  let state = beginRide(flatTrail);
  for (let frame = 0; frame < 90; frame += 1)
    state = advanceSketchRide(state, flatTrail, { ...neutral, pedal: true }, 1 / 60);
  assert.ok(state.vx > 150);
  assert.equal(state.jumps, 0);
  assert.equal(state.grounded, true);
  for (let frame = 0; frame < 90; frame += 1)
    state = advanceSketchRide(state, flatTrail, { ...neutral, brake: true }, 1 / 60);
  assert.equal(state.vx, 0);
  assert.equal(state.status, 'riding');
});

test('upright wheels on flat ground and ordinary slopes do not count as body contact', () => {
  for (const slope of [-0.6, 0, 0.6]) {
    const trail = [
      { x: 0, y: 260 },
      { x: 960, y: 260 + slope * 960 },
    ];
    assert.equal(riderTerrainContact(beginRide(trail), trail), null);
  }
});

test('head, torso, arms, and legs each detect their actual geometric contact with terrain', () => {
  const initial = { ...beginRide(flatTrail), x: 200 };
  assert.equal(riderTerrainContact({ ...initial, y: 264, angle: Math.PI }, flatTrail), 'head');
  assert.equal(
    riderTerrainContact({ ...initial, y: 304, angle: -Math.PI / 2 }, flatTrail),
    'torso',
  );
  assert.equal(riderTerrainContact({ ...initial, y: 300, angle: Math.PI / 2 }, flatTrail), 'arm');
  assert.equal(riderTerrainContact({ ...initial, y: 319, angle: 0 }, flatTrail), 'leg');
  assert.equal(riderTerrainContact({ ...initial, y: 259, angle: Math.PI }, flatTrail), null);
});

test('a sideways arm contact crashes even at low speed and without a hard landing', () => {
  const initial = {
    ...beginRide(flatTrail),
    x: 200,
    y: 270,
    angle: Math.PI / 2,
    grounded: false,
    vx: 0,
    vy: 0,
  };
  const bump = [
    { x: 0, y: 320 },
    { x: 210, y: 320 },
    { x: 220, y: 288 },
    { x: 235, y: 288 },
    { x: 245, y: 320 },
    { x: 960, y: 320 },
  ];
  const state = advanceSketchRide(initial, bump, neutral, 1 / 60);
  assert.equal(state.status, 'crashed');
  assert.equal(state.crashPart, 'arm');
});

test('an inverted falling rider crashes on their head while the axle is still above the trail', () => {
  let state = {
    ...beginRide(flatTrail),
    x: 200,
    y: 230,
    angle: Math.PI,
    grounded: false,
    vx: 30,
    vy: 100,
  };
  for (let frame = 0; frame < 60 && state.status === 'riding'; frame += 1)
    state = advanceSketchRide(state, flatTrail, neutral, 1 / 60);
  assert.equal(state.status, 'crashed');
  assert.equal(state.crashPart, 'head');
  assert.ok(state.y < 270, 'head impact must happen before the wheels or axle reach the trail');
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
