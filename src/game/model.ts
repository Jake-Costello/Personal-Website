export const WORLD_LENGTH = 4000;
const ACCELERATION = 1150;
export const MAX_SPEED = 440;
const GRAVITY = 1500;
const PUMP_WINDOW = 0.85;

export type RideInput = {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
};

export type RideState = {
  position: number;
  velocity: number;
  height: number;
  lift: number;
  facing: 1 | -1;
  turn: number;
  charge: number;
  crouch: number;
  pumpWindow: number;
  jumps: number;
};

export const idleInput = (): RideInput => ({ left: false, right: false, down: false, jump: false });

export const initialRide = (position = 0): RideState => ({
  position,
  velocity: 0,
  height: 0,
  lift: 0,
  facing: 1,
  turn: 0,
  charge: 0,
  crouch: 0,
  pumpWindow: 0,
  jumps: 0,
});

/** Seconds-based, bounded simulation. Jump is a one-frame input, consumed by the caller. */
export function advanceRide(
  current: RideState,
  input: RideInput,
  elapsed: number,
  worldLength = WORLD_LENGTH,
): RideState {
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  const next = { ...current };
  const direction = Number(input.right) - Number(input.left);
  if (direction) {
    next.velocity = Math.max(
      -MAX_SPEED,
      Math.min(MAX_SPEED, current.velocity + direction * ACCELERATION * dt),
    );
    if (direction !== current.facing) {
      next.facing = direction as 1 | -1;
      next.turn = 0.3;
    }
  } else {
    next.velocity *= Math.exp(-7 * dt);
    if (Math.abs(next.velocity) < 0.5) next.velocity = 0;
  }
  next.turn = Math.max(0, next.turn - dt);
  next.position = Math.max(0, Math.min(worldLength, current.position + next.velocity * dt));
  if (next.position === 0 || next.position === worldLength) next.velocity = 0;

  if (input.down && next.height === 0) {
    next.charge = Math.min(1, current.charge + dt * 2.5);
    next.pumpWindow = PUMP_WINDOW;
  } else {
    next.pumpWindow = Math.max(0, current.pumpWindow - dt);
    if (next.pumpWindow === 0) next.charge = 0;
  }
  // Pose is separate from stored jump charge: releasing Down straightens the
  // rider while preserving the short window for pressing Up.
  const crouchTarget = input.down && next.height === 0 ? 1 : 0;
  next.crouch += (crouchTarget - next.crouch) * Math.min(1, dt * 14);
  if (Math.abs(next.crouch - crouchTarget) < 0.005) next.crouch = crouchTarget;
  if (input.jump && next.height === 0 && next.charge > 0 && next.pumpWindow > 0) {
    next.lift = 400 + next.charge * 210;
    next.charge = 0;
    next.pumpWindow = 0;
    next.jumps += 1;
    next.crouch = 0;
  }
  if (next.lift !== 0 || next.height > 0) {
    next.height = Math.max(0, next.height + next.lift * dt);
    next.lift -= GRAVITY * dt;
    if (next.height === 0) next.lift = 0;
  }
  return next;
}
