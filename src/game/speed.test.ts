import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRideSpeed, emptySpeedTaps, trackSpeedTap } from './speed.ts';
import type { SpeedTapState } from './speed.ts';

function tap(state: SpeedTapState, direction: 'left' | 'right', time: number, held = 50) {
  const pressed = trackSpeedTap(state, direction, true, time);
  return trackSpeedTap(pressed.state, direction, false, time + held);
}

test('three completed quick taps adjust once, then start a fresh sequence', () => {
  for (const direction of ['left', 'right'] as const) {
    let result = tap(emptySpeedTaps(), direction, 100);
    assert.equal(result.change, null);
    result = tap(result.state, direction, 250);
    assert.equal(result.change, null);
    result = tap(result.state, direction, 400);
    assert.equal(result.change, direction);
    assert.deepEqual(result.state, emptySpeedTaps());
    assert.equal(tap(result.state, direction, 550).change, null);
  }
});

test('slow, mixed, held, or interrupted taps cannot accumulate into a speed change', () => {
  let state = tap(emptySpeedTaps(), 'right', 0).state;
  state = tap(state, 'right', 400).state;
  assert.equal(tap(state, 'right', 800).change, null);
  state = tap(state, 'left', 600).state;
  assert.equal(tap(state, 'right', 700).change, null);
  state = tap(emptySpeedTaps(), 'right', 0).state;
  state = tap(state, 'right', 150).state;
  assert.deepEqual(tap(state, 'right', 300, 300).state, emptySpeedTaps());
  for (const key of ['down', 'jump'] as const) {
    const interrupted = trackSpeedTap(state, key, true, 300);
    assert.deepEqual(interrupted.state, emptySpeedTaps());
    assert.equal(tap(interrupted.state, 'right', 400).change, null);
  }
});

test('repeated keydown, duplicate release, and pointer cancellation are not extra taps', () => {
  let state = trackSpeedTap(emptySpeedTaps(), 'right', true, 0).state;
  state = trackSpeedTap(state, 'right', true, 20).state;
  state = trackSpeedTap(state, 'right', true, 40).state;
  let result = trackSpeedTap(state, 'right', false, 50);
  assert.equal(result.state.count, 1);
  assert.equal(result.change, null);
  result = trackSpeedTap(result.state, 'right', false, 60);
  assert.equal(result.state.count, 1);
  state = trackSpeedTap(result.state, 'right', true, 100).state;
  result = trackSpeedTap(state, 'right', false, 150, true);
  assert.deepEqual(result.state, emptySpeedTaps());
  assert.equal(result.change, null);
});

test('ride pace steps remain bounded in both directions', () => {
  let speed: number = 1;
  for (let index = 0; index < 20; index += 1) speed = changeRideSpeed(speed, 'right');
  assert.equal(speed, 2);
  for (let index = 0; index < 20; index += 1) speed = changeRideSpeed(speed, 'left');
  assert.equal(speed, 0.75);
});
