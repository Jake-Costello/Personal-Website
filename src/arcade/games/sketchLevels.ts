import { TRAIL_START, trailHeight } from './sketchRideModel';
import type { Trail, TrailObstacle } from './sketchRideModel';

export type SketchLevel = {
  number: number;
  name: string;
  hint: string;
  finishX: number;
  trail: Trail;
  obstacles: TrailObstacle[];
  ramps: number[];
  cautionZones: { from: number; to: number; targetSpeed: number; targetAngle: number }[];
};

const names = [
  'First light',
  'Pine rollers',
  'Rock garden',
  'Ridge runner',
  'High country',
  'Switchback sky',
  'Long way down',
  'Alpine rhythm',
  'Cloud line',
  'The last descent',
];
const hints = [
  'Hold Pedal up the ramp. Let the bike fly over the rock.',
  'Two rollers, one clean landing. Keep your wheels with the trail.',
  'More rocks ahead. Carry speed over the marked ramps.',
  'The ridge gets longer. Small tilts make smooth landings.',
  'Brake at the low-branch sign. Tilt forward to clear it.',
  'Six kickers, then a low branch. Slow down and lean forward.',
  'Seven rocky jumps. Leave room to brake under the branch.',
  'Eight jumps. Brake and tilt forward under the final branch.',
  'Nine rocky crossings. The low branch needs a firm forward tilt.',
  'Ten final jumps. Brake and lean beneath the last branch.',
];

function rampOffset(x: number, lip: number, height: number) {
  const delta = x - lip;
  if (delta < -180 || delta > 140) return 0;
  if (delta < -60) return (-height * 0.35 * (delta + 180)) / 120;
  if (delta < 0) return -height * (0.35 + (0.65 * (delta + 60)) / 60);
  if (delta < 75) return -height * (1 - (0.9 * delta) / 75);
  return -height * 0.1 * (1 - (delta - 75) / 65);
}

export const SKETCH_LEVELS: SketchLevel[] = names.map((name, index) => {
  const number = index + 1;
  const finishX = 1800 + index * 360;
  const rampCount = number;
  const spacing = (finishX - 1070) / Math.max(1, rampCount - 1);
  const ramps = Array.from({ length: rampCount }, (_, ramp) => 620 + ramp * spacing);
  const trail: Trail = [];
  const height = 100 + index * 5;
  const cautionZones =
    index < 4
      ? []
      : [{ from: finishX - 400, to: finishX - 50, targetSpeed: 60, targetAngle: 1.45 }];
  for (let x = 0; x <= finishX + 120; x += 4) {
    let y = 240 + x * 0.105 + Math.sin(x / 170) * (4 + index * 0.7);
    for (const lip of ramps) y += rampOffset(x, lip, height);
    trail.push({ x, y });
  }
  const obstacles: TrailObstacle[] = ramps.map((lip, ramp) => {
    const x = lip + 50 + (ramp % 2) * 4;
    const radius = 8 + index * 0.75;
    return { x, y: trailHeight(trail, x) - radius, radius, kind: 'rock' };
  });
  if (index >= 4) {
    const x = finishX - 140;
    obstacles.push({
      x,
      y: trailHeight(trail, x) - 86,
      radius: 16 + (index - 4) * 0.65,
      kind: 'branch',
    });
  }
  return { number, name, hint: hints[index], finishX, trail, obstacles, ramps, cautionZones };
});

export type LevelProgress = { level: number; completed: number; won: boolean };
export function initialLevelProgress(): LevelProgress {
  return { level: 0, completed: 0, won: false };
}
export function completeLevel(progress: LevelProgress): LevelProgress {
  const completed = Math.max(progress.completed, progress.level + 1);
  return { ...progress, completed, won: completed === SKETCH_LEVELS.length };
}
export function nextLevel(progress: LevelProgress): LevelProgress {
  if (progress.completed <= progress.level || progress.level >= SKETCH_LEVELS.length - 1)
    return progress;
  return { ...progress, level: progress.level + 1 };
}

export type TrailEditor = { cursor: { x: number; y: number }; trail: Trail; revision: number };
export function initialTrailEditor(trail: Trail): TrailEditor {
  return { cursor: { x: TRAIL_START, y: trailHeight(trail, TRAIL_START) }, trail, revision: 0 };
}

/** Every joystick move edits the existing line, so moving left genuinely revises it. */
export function advanceTrailEditor(
  previous: TrailEditor,
  input: { left: boolean; right: boolean; up: boolean; down: boolean },
  seconds: number,
): TrailEditor {
  if (seconds <= 0 || !Number.isFinite(seconds)) return previous;
  const dt = Math.min(seconds, 0.05);
  const dx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 140 * dt;
  const dy = ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * 85 * dt;
  if (dx === 0 && dy === 0) return previous;
  const cursor = {
    x: Math.max(TRAIL_START, Math.min(886, previous.cursor.x + dx)),
    y: Math.max(165, Math.min(490, previous.cursor.y + dy)),
  };
  if (cursor.x === previous.cursor.x && cursor.y === previous.cursor.y) return previous;
  const left = Math.min(previous.cursor.x, cursor.x);
  const right = Math.max(previous.cursor.x, cursor.x);
  const trail = previous.trail.map((point) => {
    if (point.x < left - 8 || point.x > right + 8) return point;
    const distance = point.x < left ? left - point.x : point.x > right ? point.x - right : 0;
    const blend = 1 - distance / 10;
    const progress = dx
      ? Math.max(0, Math.min(1, (point.x - previous.cursor.x) / (cursor.x - previous.cursor.x)))
      : 1;
    const y = previous.cursor.y + (cursor.y - previous.cursor.y) * progress;
    return { x: point.x, y: point.y * (1 - blend) + y * blend };
  });
  return { cursor, trail, revision: previous.revision + 1 };
}
