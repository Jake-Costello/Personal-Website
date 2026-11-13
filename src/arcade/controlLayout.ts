import type { ArcadeProject } from './projects';
import type { ArcadeInput } from './input';

export const controlLayout = {
  joystick: { x: -0.22, y: 0.006, z: 0.035 },
  buttons: [
    { x: 0.15, z: -0.035 },
    { x: 0.225, z: -0.085 },
  ],
  button: { radius: 0.025, height: 0.007, rest: 0.006, pressed: 0.003, mount: 0.006 },
} as const;

export function physicalActions(project: ArcadeProject) {
  return project.id === 'shoreline'
    ? project.controls
        .filter((c) => c.action === 'down' || c.action === 'up')
        .sort((a, b) => Number(a.action === 'up') - Number(b.action === 'up'))
    : project.controls;
}
const steering = ['left', 'right'] as const;
const fourWay = ['left', 'right', 'up', 'down'] as const;
export function joystickAxes(id: ArcadeProject['id']) {
  return id === 'shoreline' ? steering : fourWay;
}

export function moveCabinetJoystick(
  input: ArcadeInput,
  id: ArcadeProject['id'],
  dx: number,
  dy: number,
) {
  const next = { left: dx < -8, right: dx > 8, up: dy < -8, down: dy > 8 };
  joystickAxes(id).forEach((axis) => input.set(axis, next[axis]));
}
export function releaseCabinetJoystick(input: ArcadeInput, id: ArcadeProject['id']) {
  joystickAxes(id).forEach((axis) => input.set(axis, false));
}
