export type TrailPoint = { x: number; y: number };
export type Trail = TrailPoint[];
export type TrailObstacle = { x: number; y: number; radius: number; kind?: 'rock' | 'branch' };
export type RideControls = {
  left: boolean;
  right: boolean;
  pedal: boolean;
  brake: boolean;
  jump: boolean;
};
export type RiderBodyPart = 'head' | 'torso' | 'arm' | 'leg';
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
  pedalCycle: number;
  crashPart: RiderBodyPart | null;
  crashReason: 'body' | 'obstacle' | 'fall' | null;
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
    pedalCycle: 0,
    crashPart: null,
    crashReason: null,
    status: 'riding',
  };
}

function angleDifference(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Shared with the drawing so collision follows the visible animated rider. */
export function riderPose(state: SketchRideState) {
  const bob = state.grounded ? Math.sin(state.time * 8) * 1.5 : -3;
  const pedal = state.grounded ? Math.sin(state.pedalCycle) * 6 : 2;
  return {
    head: { x: -1, y: -51 + bob },
    shoulder: { x: -5, y: -43 + bob },
    hip: { x: -12, y: -27 },
    knee: { x: 3, y: -17 + pedal },
    foot: { x: 3, y: -1 },
    elbow: { x: 8, y: -31 },
    hand: { x: 19, y: -28 },
  };
}

function distanceToSegmentSquared(point: TrailPoint, a: TrailPoint, b: TrailPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0, 1) : 0;
  return (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2;
}

function segmentsDistanceSquared(a: TrailPoint, b: TrailPoint, c: TrailPoint, d: TrailPoint) {
  const cross = (p: TrailPoint, q: TrailPoint, r: TrailPoint) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const overlap =
    Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
    Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
  if (overlap && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0)
    return 0;
  return Math.min(
    distanceToSegmentSquared(a, c, d),
    distanceToSegmentSquared(b, c, d),
    distanceToSegmentSquared(c, a, b),
    distanceToSegmentSquared(d, a, b),
  );
}

/** Capsules cover every limb and torso; a circle covers the head and helmet. */
function riderBodyCapsules(state: SketchRideState) {
  const pose = riderPose(state);
  const world = (point: TrailPoint): TrailPoint => ({
    x: state.x + point.x * Math.cos(state.angle) - point.y * Math.sin(state.angle),
    y: state.y + point.x * Math.sin(state.angle) + point.y * Math.cos(state.angle),
  });
  const capsules: { part: RiderBodyPart; a: TrailPoint; b: TrailPoint; radius: number }[] = [
    { part: 'head', a: pose.head, b: pose.head, radius: 9 },
    { part: 'torso', a: pose.shoulder, b: pose.hip, radius: 4.5 },
    { part: 'arm', a: pose.shoulder, b: pose.elbow, radius: 2.5 },
    { part: 'arm', a: pose.elbow, b: pose.hand, radius: 2.5 },
    { part: 'leg', a: pose.hip, b: pose.knee, radius: 3 },
    { part: 'leg', a: pose.knee, b: pose.foot, radius: 3 },
  ];
  return capsules.map((capsule) => ({ ...capsule, a: world(capsule.a), b: world(capsule.b) }));
}

export function riderTerrainContact(state: SketchRideState, trail: Trail): RiderBodyPart | null {
  const capsules = riderBodyCapsules(state);
  for (const capsule of capsules) {
    const { a, b } = capsule;
    if (a.y >= trailHeight(trail, a.x) || b.y >= trailHeight(trail, b.x)) return capsule.part;
    const minX = Math.min(a.x, b.x) - capsule.radius;
    const maxX = Math.max(a.x, b.x) + capsule.radius;
    let low = 0;
    let high = trail.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >>> 1;
      if (trail[middle].x < minX) low = middle;
      else high = middle;
    }
    for (let index = Math.max(1, low); index < trail.length; index += 1) {
      const c = trail[index - 1];
      const d = trail[index];
      if (d.x < minX) continue;
      if (c.x > maxX) break;
      if (segmentsDistanceSquared(a, b, c, d) <= capsule.radius ** 2) return capsule.part;
    }
  }
  return null;
}

function riderObstacleContact(
  state: SketchRideState,
  obstacles: TrailObstacle[],
): RiderBodyPart | null {
  const nearby = obstacles.filter((obstacle) => Math.abs(obstacle.x - state.x) < 100);
  if (!nearby.length) return null;
  for (const capsule of riderBodyCapsules(state)) {
    if (
      nearby.some(
        (obstacle) =>
          distanceToSegmentSquared(obstacle, capsule.a, capsule.b) <=
          (capsule.radius + obstacle.radius) ** 2,
      )
    )
      return capsule.part;
  }
  return null;
}

function wheelContactHeight(trail: Trail, x: number, angle: number) {
  const wheelX = Math.cos(angle) * 22;
  const wheelY = Math.sin(angle) * 22;
  return (
    Math.min(trailHeight(trail, x - wheelX) + wheelY, trailHeight(trail, x + wheelX) - wheelY) -
    WHEEL_RADIUS
  );
}

function stepRide(
  previous: SketchRideState,
  trail: Trail,
  controls: RideControls,
  dt: number,
  finishX: number,
  obstacles: TrailObstacle[],
): SketchRideState {
  const state = { ...previous, time: previous.time + dt };
  const existingContact = riderTerrainContact(state, trail);
  if (existingContact)
    return { ...state, status: 'crashed', crashPart: existingContact, crashReason: 'body' };
  const slope = trailSlope(trail, state.x);
  if (controls.jump && state.grounded) {
    state.vy = Math.min(state.vy, 20) - 224;
    state.grounded = false;
    state.jumps += 1;
  }
  if (controls.pedal) state.pedalCycle += dt * 12;
  const pedal = controls.pedal ? 95 : 0;
  const brake = controls.brake ? 225 : 0;
  state.vx = clamp(state.vx + (state.grounded ? 28 + slope * 175 + pedal - brake : 4) * dt, 0, 190);
  state.x += state.vx * dt;
  state.vy += 620 * dt;
  state.y += state.vy * dt;
  const floorAngle = Math.atan(trailSlope(trail, state.x));
  const lean = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  const restoring = state.grounded ? angleDifference(floorAngle, state.angle) * 3.5 : 0;
  state.spin += (lean * (state.grounded ? 7.5 : 3.4) + restoring) * dt;
  state.spin *= Math.exp(-(state.grounded ? 2.8 : 1.1) * dt);
  state.angle += state.spin * dt;

  // Resolve the tires without rotating the rider upright; their body can still hit first.
  const floor = wheelContactHeight(trail, state.x, state.angle);
  if (state.y >= floor) {
    state.y = floor;
    state.vy = trailSlope(trail, state.x) * state.vx;
    state.grounded = true;
  } else if (floor - state.y > 2.5 || !state.grounded) state.grounded = false;
  const contact = riderTerrainContact(state, trail);
  const obstacleContact = riderObstacleContact(state, obstacles);
  if (contact) {
    state.status = 'crashed';
    state.crashPart = contact;
    state.crashReason = 'body';
  } else if (
    obstacleContact ||
    obstacles.some((obstacle) => {
      if (Math.abs(obstacle.x - state.x) > 60) return false;
      for (const side of [-1, 1]) {
        const wheelX = state.x + Math.cos(state.angle) * 22 * side;
        const wheelY = state.y + Math.sin(state.angle) * 22 * side;
        if (
          (wheelX - obstacle.x) ** 2 + (wheelY - obstacle.y) ** 2 <=
          (WHEEL_RADIUS + obstacle.radius) ** 2
        )
          return true;
      }
      return false;
    })
  ) {
    state.status = 'crashed';
    state.crashReason = 'obstacle';
    state.crashPart = obstacleContact;
  } else if (state.y > trailHeight(trail, state.x) + 350) {
    state.status = 'crashed';
    state.crashReason = 'fall';
  } else if (state.x >= finishX) {
    state.x = finishX;
    state.status = 'finished';
  }
  return state;
}

export function advanceSketchRide(
  previous: SketchRideState,
  trail: Trail,
  controls: RideControls,
  seconds: number,
  finishX = TRAIL_FINISH,
  obstacles: TrailObstacle[] = [],
): SketchRideState {
  if (previous.status !== 'riding' || seconds <= 0 || !Number.isFinite(seconds)) return previous;
  const dt = Math.min(seconds, 1 / 30);
  const steps = Math.max(1, Math.ceil(dt * 240));
  let state = previous;
  for (let step = 0; step < steps && state.status === 'riding'; step += 1) {
    state = stepRide(
      state,
      trail,
      { ...controls, jump: controls.jump && step === 0 },
      dt / steps,
      finishX,
      obstacles,
    );
  }
  return state;
}
