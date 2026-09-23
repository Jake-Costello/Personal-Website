import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRide, idleInput, initialRide, WORLD_LENGTH } from './model.ts';

function run(seconds: number, state = initialRide(), input = idleInput()) {
  for (let frame = 0; frame < seconds * 60; frame += 1) state = advanceRide(state, input, 1 / 60);
  return state;
}

test('the whole journey is reachable and bounded in either direction', () => {
  const end = run(15, initialRide(), { ...idleInput(), right: true });
  assert.equal(end.position, WORLD_LENGTH);
  assert.equal(end.velocity, 0);
  const start = run(15, end, { ...idleInput(), left: true });
  assert.equal(start.position, 0);
  assert.equal(start.velocity, 0);
});

test('releasing movement slows to a complete stop and reversal changes facing', () => {
  const moving = run(1, initialRide(), { ...idleInput(), right: true });
  assert.ok(moving.velocity > 0);
  const reversed = advanceRide(moving, { ...idleInput(), left: true }, 1 / 60);
  assert.equal(reversed.facing, -1);
  assert.ok(reversed.turn > 0);
  assert.ok(reversed.velocity < moving.velocity);
  const stopped = run(3, moving);
  assert.equal(stopped.velocity, 0);
});

test('a pump then up launches even after a brief release, and lands', () => {
  const pumped = run(0.3, initialRide(), { ...idleInput(), down: true });
  const released = run(0.2, pumped);
  const jumping = advanceRide(released, { ...idleInput(), jump: true }, 1 / 60);
  assert.ok(jumping.height > 0);
  assert.equal(jumping.jumps, 1);
  const landed = run(2, jumping);
  assert.equal(landed.height, 0);
  assert.equal(landed.lift, 0);
});

test('up alone and an expired pump do not launch', () => {
  const noPump = advanceRide(initialRide(), { ...idleInput(), jump: true }, 1 / 60);
  assert.equal(noPump.height, 0);
  const pumped = run(0.3, initialRide(), { ...idleInput(), down: true });
  const expired = run(1, pumped);
  assert.equal(advanceRide(expired, { ...idleInput(), jump: true }, 1 / 60).height, 0);
});

test('the rider bends while pumping, releases the crouch, and extends on takeoff', () => {
  const crouched = run(0.4, initialRide(), { ...idleInput(), down: true });
  assert.ok(crouched.crouch > 0.95);
  assert.equal(crouched.height, 0);
  const released = run(0.2, crouched);
  assert.ok(released.crouch < 0.1);
  assert.ok(released.charge > 0, 'releasing the pose must not discard the stored jump');
  const jumping = advanceRide(crouched, { ...idleInput(), down: true, jump: true }, 1 / 60);
  assert.ok(jumping.height > 0);
  assert.equal(jumping.crouch, 0);
});

test('the same controls can traverse a longer route and stop at its destination', () => {
  let state = initialRide();
  const length = 42_000;
  for (let frame = 0; frame < 110 * 60; frame += 1) {
    state = advanceRide(state, { ...idleInput(), right: true }, 1 / 60, length);
  }
  assert.equal(state.position, length);
  assert.equal(state.velocity, 0);
});
