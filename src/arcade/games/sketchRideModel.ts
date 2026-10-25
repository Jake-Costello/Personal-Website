export type TrailPoint = { x: number; y: number };
export type Trail = TrailPoint[];
export type RideControls = { left: boolean; right: boolean; jump: boolean };
export type SketchRideState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  grounded: boolean;
  time: number;
  jumps: number;
  status: 'riding' | 'crashed' | 'finished';
};

export const TRAIL_START = 64;
export const TRAIL_FINISH = 886;
export const WHEEL_RADIUS = 12;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function defaultTrail(): Trail {
  const points: Trail = [];
  for (let x = 0; x <= 960; x += 4) {
    const progress = clamp((x - 65) / 820, 0, 1);
    const y = 219 + progress * 255 + Math.sin(progress * Math.PI * 4) * 22;
    points.push({ x, y });
  }
  return points;
}

export function trailHeight(trail: Trail, x: number): number {
  if (x <= trail[0].x) return trail[0].y;
  const last = trail[trail.length - 1];
  if (x >= last.x) return last.y;
  let low = 0;
  let high = trail.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (trail[middle].x > x) high = middle;
    else low = middle;
  }
  const a = trail[low];
  const b = trail[high];
  return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
}

export function trailSlope(trail: Trail, x: number): number {
  return (trailHeight(trail, x + 18) - trailHeight(trail, x - 18)) / 36;
}

/** A drawn stroke becomes a continuous course, including short lead-in and run-out. */
export function buildTrail(stroke: Trail): Trail | null {
  const points = stroke
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({ x: clamp(point.x, TRAIL_START, TRAIL_FINISH), y: clamp(point.y, 165, 490) }))
    .sort((a, b) => a.x - b.x)
    .filter((point, index, all) => index === 0 || point.x - all[index - 1].x > 0.5);
  if (points.length < 3 || points[points.length - 1].x - points[0].x < 100) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const anchors = [
    { x: 0, y: start.y },
    { x: Math.max(1, start.x - 28), y: start.y },
    ...points,
    { x: 960, y: end.y + Math.min(35, (960 - end.x) * 0.15) },
  ];
  const sampled: Trail = [];
  for (let x = 0; x <= 960; x += 4) {
    // Average over a wheelbase to keep small pointer jitters from becoming walls.
    const y =
      (trailHeight(anchors, x - 8) + 2 * trailHeight(anchors, x) + trailHeight(anchors, x + 8)) / 4;
    sampled.push({ x, y });
  }
  return sampled;
}

export function beginRide(trail: Trail): SketchRideState {
  return {
    x: TRAIL_START,
    y: trailHeight(trail, TRAIL_START) - WHEEL_RADIUS,
    vx: 48,
    vy: trailSlope(trail, TRAIL_START) * 48,
    angle: Math.atan(trailSlope(trail, TRAIL_START)),
    spin: 0,
    grounded: true,
    time: 0,
    jumps: 0,
    status: 'riding',
  };
}

function angleDifference(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function advanceSketchRide(
  previous: SketchRideState,
  trail: Trail,
  controls: RideControls,
  seconds: number,
): SketchRideState {
  if (previous.status !== 'riding' || seconds <= 0 || !Number.isFinite(seconds)) return previous;
  const dt = Math.min(seconds, 1 / 30);
  const state = { ...previous, time: previous.time + dt };
  const slope = trailSlope(trail, state.x);
  if (controls.jump && state.grounded) {
    state.vy = Math.min(state.vy, 20) - 224;
    state.grounded = false;
    state.jumps += 1;
  }
  const pedal = controls.right ? 95 : 0;
  const brake = controls.left ? 145 : 0;
  state.vx = clamp(
    state.vx + (state.grounded ? 28 + slope * 175 + pedal - brake : 4) * dt,
    24,
    190,
  );
  state.x += state.vx * dt;
  state.vy += 620 * dt;
  state.y += state.vy * dt;
  if (!state.grounded) {
    state.spin += ((controls.right ? 3.4 : 0) - (controls.left ? 3.4 : 0)) * dt;
    state.spin *= Math.exp(-1.1 * dt);
    state.angle += state.spin * dt;
  }
  const floor = trailHeight(trail, state.x) - WHEEL_RADIUS;
  const newSlope = trailSlope(trail, state.x);
  const floorAngle = Math.atan(newSlope);
  if (state.y >= floor) {
    const impact = state.vy - newSlope * state.vx;
    const badLanding =
      !state.grounded && impact > 90 && Math.abs(angleDifference(state.angle, floorAngle)) > 1.05;
    if (badLanding || Math.abs(floorAngle) > 1.27) {
      state.status = 'crashed';
      state.y = floor;
      return state;
    }
    state.y = floor;
    state.vy = newSlope * state.vx;
    state.angle += angleDifference(floorAngle, state.angle) * Math.min(1, dt * 19);
    state.spin = 0;
    state.grounded = true;
  } else if (floor - state.y > 2.5 || !state.grounded) {
    state.grounded = false;
  }
  if (state.y > 650) state.status = 'crashed';
  else if (state.x >= TRAIL_FINISH) {
    state.x = TRAIL_FINISH;
    state.status = 'finished';
  }
  return state;
}
