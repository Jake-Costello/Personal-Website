import { clampRideSpeed } from './speed';

export const WORLD_LENGTH = 4000;
const ACCELERATION = 1150;
export const MAX_SPEED = 440;
const GRAVITY = 1500;
const PUMP_WINDOW = 0.85;
export const SPLASH_SECONDS = 0.72;

export type WaterSplash = {
  kind: 'takeoff' | 'landing';
  age: number;
  position: number;
  facing: 1 | -1;
};

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
  wakeTime: number;
  splash: WaterSplash | null;
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
  wakeTime: 0,
  splash: null,
});

/** Seconds-based, bounded simulation. Jump is a one-frame input, consumed by the caller. */
export function advanceRide(
  current: RideState,
  input: RideInput,
  elapsed: number,
  worldLength = WORLD_LENGTH,
  speed = 1,
): RideState {
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  const next = { ...current };
  // Pace changes horizontal travel only; pump timing and jump physics stay familiar.
  const pace = clampRideSpeed(speed);
  const maximum = MAX_SPEED * pace;
  next.velocity = Math.max(-maximum, Math.min(maximum, current.velocity));
  if (current.splash) {
    const age = current.splash.age + dt;
    next.splash = age < SPLASH_SECONDS ? { ...current.splash, age } : null;
  }
  const direction = Number(input.right) - Number(input.left);
  if (direction) {
    next.velocity = Math.max(
      -maximum,
      Math.min(maximum, next.velocity + direction * ACCELERATION * pace * dt),
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
    next.splash = {
      kind: 'takeoff',
      age: 0,
      position: next.position,
      facing: next.facing,
    };
  }
  if (next.lift !== 0 || next.height > 0) {
    next.height = Math.max(0, next.height + next.lift * dt);
    next.lift -= GRAVITY * dt;
    if (next.height === 0) {
      next.lift = 0;
      if (current.height > 0) {
        next.splash = {
          kind: 'landing',
          age: 0,
          position: next.position,
          facing: next.facing,
        };
      }
    }
  }
  // Only advance the three-frame wake while there is spray to draw. Idle rides
  // settle to a stable state instead of repainting an invisible animation.
  next.wakeTime =
    Math.abs(next.velocity) > 25 && next.height === 0 ? (current.wakeTime + dt) % 0.375 : 0;
  return next;
}
