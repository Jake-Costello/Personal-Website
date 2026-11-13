import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCabinetJoystick, poseCabinetJoystick } from '../arcade/joystick';
import { createArcadeInput } from '../arcade/input';
import {
  moveCabinetJoystick,
  releaseCabinetJoystick,
  physicalActions,
} from '../arcade/controlLayout';
import { arcadeProjects } from '../arcade/projects';

function fixture(t: TestContext) {
  const black = new THREE.MeshStandardMaterial();
  const metal = new THREE.MeshStandardMaterial();
  const model = createCabinetJoystick(black, metal, '#f7b478');
  t.after(() => {
    model.dispose();
    black.dispose();
    metal.dispose();
  });
  model.root.updateMatrixWorld(true);
  return model;
}

test('joystick mounting flange stays seated and shaft bottom stays at its pivot in all directions', (t) => {
  const model = fixture(t);
  const initial = model.base.matrixWorld.toArray();
  for (const held of [['up'], ['down'], ['left'], ['right'], ['up', 'left'], ['down', 'right']]) {
    poseCabinetJoystick(model, held, true);
    model.root.updateMatrixWorld(true);
    assert.deepEqual(model.base.matrixWorld.toArray(), initial);
    assert.ok(new THREE.Box3().setFromObject(model.base).min.y >= -1e-9);
    const shaftBottom = new THREE.Vector3(0, -0.0325, 0).applyMatrix4(model.shaft.matrixWorld);
    assert.ok(shaftBottom.distanceTo(model.pivot.getWorldPosition(new THREE.Vector3())) < 1e-9);
  }
});

test('joystick diagonals stay inside the circular gate and release or pause returns to neutral', (t) => {
  const model = fixture(t);
  for (const held of [
    ['up', 'left'],
    ['up', 'right'],
    ['down', 'left'],
    ['down', 'right'],
  ]) {
    poseCabinetJoystick(model, held, true);
    model.root.updateMatrixWorld(true);
    const direction = new THREE.Vector3(0, 1, 0).transformDirection(model.pivot.matrixWorld);
    assert.ok(direction.angleTo(new THREE.Vector3(0, 1, 0)) <= 0.220001);
  }
  for (const [held, active] of [
    [[], true],
    [['right'], false],
    [['up', 'down', 'left', 'right'], true],
  ] as const) {
    poseCabinetJoystick(model, held, active);
    assert.equal(model.pivot.rotation.x, 0);
    assert.equal(model.pivot.rotation.z, 0);
  }
});

test('the small visible grip retains a larger undrawn pointer target without making the base draggable', (t) => {
  const model = fixture(t);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0.043, 0.077, 0.4),
    new THREE.Vector3(0, 0, -1),
  );
  const hits = ray.intersectObject(model.root, true);
  assert.ok(hits.some((hit) => model.isGrip(hit.object)));
  assert.ok(hits.every((hit) => hit.object !== model.grip));
  assert.equal(model.isGrip(model.base), false);
  assert.equal(hits.find((hit) => model.isGrip(hit.object))!.object.name, 'joystick-hit-area');
});

// Input ownership is separate from the visual mechanism: releasing steering must
// not release action buttons held by other fingers.

test('Resume Run steering cannot overwrite or release a held Pump or Jump', () => {
  const input = createArcadeInput();
  input.set('down', true);
  input.set('up', true);
  moveCabinetJoystick(input, 'shoreline', 28, -28);
  assert.equal(input.pressed.has('right'), true);
  assert.equal(input.pressed.has('down'), true);
  assert.equal(input.pressed.has('up'), true);
  releaseCabinetJoystick(input, 'shoreline');
  assert.equal(input.pressed.has('right'), false);
  assert.equal(input.pressed.has('down'), true);
  assert.equal(input.pressed.has('up'), true);
  input.clear();
});
test('Warehouse steering retains four-way movement without releasing held actions', () => {
  const input = createArcadeInput();
  input.set('action', true);
  moveCabinetJoystick(input, 'warehouse', -28, -28);
  assert.equal(input.pressed.has('left'), true);
  assert.equal(input.pressed.has('up'), true);
  releaseCabinetJoystick(input, 'warehouse');
  assert.deepEqual([...input.pressed], ['action']);
  input.clear();
});
test('the Resume Run physical actions are Pump and Jump without mutating its keyboard bindings', () => {
  const project = arcadeProjects.find((p) => p.id === 'shoreline')!;
  const actions = project.controls.map((c) => c.action);
  assert.deepEqual(
    physicalActions(project).map((c) => c.action),
    ['down', 'up'],
  );
  assert.deepEqual(
    project.controls.map((c) => c.action),
    actions,
  );
  assert.ok(actions.includes('left') && actions.includes('right'));
});
