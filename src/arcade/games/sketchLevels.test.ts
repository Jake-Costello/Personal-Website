import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceSketchRide, beginRide, defaultTrail, trailHeight } from './sketchRideModel.ts';
import type { RideControls } from './sketchRideModel.ts';
import {
  advanceTrailEditor,
  completeLevel,
  initialLevelProgress,
  initialTrailEditor,
  nextLevel,
  SKETCH_LEVELS,
} from './sketchLevels.ts';

const pedal: RideControls = { left: false, right: false, pedal: true, brake: false, jump: false };

test('all ten increasingly long courses finish with real pedal, brake, and lean controls', () => {
  let previousLength = 0;
  for (const level of SKETCH_LEVELS) {
    assert.ok(level.finishX > previousLength);
    assert.equal(level.ramps.length, level.number);
    previousLength = level.finishX;
    let state = beginRide(level.trail);
    let airborneFrames = 0;
    let brakes = 0;
    let leans = 0;
    for (let frame = 0; frame < 60 * 65 && state.status === 'riding'; frame += 1) {
      // Reference rider: pedal the kickers, then slow and lean forward at the marked low branch.
      const zone = level.cautionZones.find(
        (candidate) => state.x >= candidate.from && state.x <= candidate.to,
      );
      const correction = (zone?.targetAngle ?? 0) - state.angle - state.spin * 0.3;
      const brake = !!zone && state.vx > zone.targetSpeed;
      const right = !!zone && correction > 0.1;
      const left = !!zone && correction < -0.1;
      state = advanceSketchRide(
        state,
        level.trail,
        { ...pedal, pedal: !brake, brake, left, right },
        1 / 60,
        level.finishX,
        level.obstacles,
      );
      if (!state.grounded) airborneFrames += 1;
      if (brake) brakes += 1;
      if (left || right) leans += 1;
    }
    assert.equal(
      state.status,
      'finished',
      `level ${level.number}: ${state.crashReason} at ${Math.round(state.x)}`,
    );
    assert.equal(state.x, level.finishX);
    assert.ok(
      airborneFrames >= level.number * 20,
      `level ${level.number} must contain actual airtime`,
    );
    if (level.number >= 5) assert.ok(brakes > 0 && leans > 0);
  }
});

test('later courses require handling: holding pedal without leaning hits the low branch', () => {
  for (const index of [4, 9]) {
    const level = SKETCH_LEVELS[index];
    let state = beginRide(level.trail);
    for (let frame = 0; frame < 60 * 45 && state.status === 'riding'; frame += 1)
      state = advanceSketchRide(state, level.trail, pedal, 1 / 60, level.finishX, level.obstacles);
    assert.equal(state.status, 'crashed');
    assert.equal(state.crashReason, 'obstacle');
    assert.equal(state.crashPart, 'head');
  }
});

test('level progression requires each finish and winning requires all ten finishes', () => {
  let progress = initialLevelProgress();
  assert.equal(nextLevel(progress), progress, 'cannot skip an unfinished level');
  for (let index = 0; index < 10; index += 1) {
    assert.equal(progress.level, index);
    assert.equal(progress.won, false);
    progress = completeLevel(progress);
    assert.equal(progress.completed, index + 1);
    assert.equal(progress.won, index === 9);
    assert.deepEqual(
      completeLevel(progress),
      progress,
      'finishing a replay must not add another completed level',
    );
    if (index < 9) progress = nextLevel(progress);
  }
  assert.equal(nextLevel(progress), progress, 'the winning level is the last level');
});

test('joystick draws continuously in four directions and left revises earlier trail', () => {
  let editor = initialTrailEditor(defaultTrail());
  const original = editor.trail;
  const controls = { left: false, right: true, up: false, down: true };
  for (let frame = 0; frame < 60; frame += 1) editor = advanceTrailEditor(editor, controls, 1 / 60);
  assert.ok(editor.cursor.x > 200);
  assert.ok(editor.cursor.y > 300);
  assert.ok(editor.revision >= 60);
  const forward = editor;
  for (let frame = 0; frame < 30; frame += 1)
    editor = advanceTrailEditor(
      editor,
      { left: true, right: false, up: true, down: false },
      1 / 60,
    );
  assert.ok(editor.cursor.x < forward.cursor.x && editor.cursor.y < forward.cursor.y);
  assert.notEqual(
    trailHeight(editor.trail, editor.cursor.x),
    trailHeight(original, editor.cursor.x),
  );
  assert.notEqual(editor.trail, forward.trail);
  assert.equal(
    advanceTrailEditor(editor, { left: false, right: false, up: false, down: false }, 1 / 60),
    editor,
  );
});

test('joystick cursor remains in drawable bounds and paused time does not draw', () => {
  let editor = initialTrailEditor(defaultTrail());
  for (let frame = 0; frame < 300; frame += 1)
    editor = advanceTrailEditor(
      editor,
      { left: true, right: false, up: true, down: false },
      1 / 30,
    );
  assert.equal(editor.cursor.x, 64);
  assert.equal(editor.cursor.y, 165);
  assert.equal(
    advanceTrailEditor(editor, { left: false, right: true, up: false, down: true }, 0),
    editor,
  );
});
