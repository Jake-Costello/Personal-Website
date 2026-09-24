export const RIDE_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export const DEFAULT_RIDE_SPEED = 1;
export const TAP_SEQUENCE_MS = 750;
export const TAP_HOLD_MS = 250;

type Direction = 'left' | 'right';
type Control = Direction | 'down' | 'jump';
export type SpeedTapState = {
  direction: Direction | null;
  startedAt: number;
  pressedAt: number | null;
  count: number;
};

export const emptySpeedTaps = (): SpeedTapState => ({
  direction: null,
  startedAt: 0,
  pressedAt: null,
  count: 0,
});

export function clampRideSpeed(speed: number) {
  return Number.isFinite(speed)
    ? Math.max(RIDE_SPEEDS[0], Math.min(RIDE_SPEEDS.at(-1)!, speed))
    : DEFAULT_RIDE_SPEED;
}

export function changeRideSpeed(speed: number, direction: Direction) {
  const index = RIDE_SPEEDS.findIndex((value) => value === speed);
  const current = index < 0 ? RIDE_SPEEDS.indexOf(DEFAULT_RIDE_SPEED) : index;
  return RIDE_SPEEDS[
    Math.max(0, Math.min(RIDE_SPEEDS.length - 1, current + (direction === 'right' ? 1 : -1)))
  ];
}

/** Count completed short taps, never key repeats, holds, or cancelled pointers. */
export function trackSpeedTap(
  state: SpeedTapState,
  control: Control,
  active: boolean,
  now: number,
  cancelled = false,
): { state: SpeedTapState; change: Direction | null } {
  const unchanged = { state, change: null };
  const reset = { state: emptySpeedTaps(), change: null };
  if (cancelled || !Number.isFinite(now)) return reset;
  if (control !== 'left' && control !== 'right') return active ? reset : unchanged;

  if (active) {
    if (state.direction === control && state.pressedAt !== null) return unchanged;
    const continues =
      state.direction === control &&
      now >= state.startedAt &&
      now - state.startedAt <= TAP_SEQUENCE_MS;
    return {
      state: {
        direction: control,
        startedAt: continues ? state.startedAt : now,
        pressedAt: now,
        count: continues ? state.count : 0,
      },
      change: null,
    };
  }

  if (state.direction !== control || state.pressedAt === null) return unchanged;
  if (
    now < state.pressedAt ||
    now - state.pressedAt > TAP_HOLD_MS ||
    now - state.startedAt > TAP_SEQUENCE_MS
  )
    return reset;
  if (state.count === 2) return { state: emptySpeedTaps(), change: control };
  return { state: { ...state, count: state.count + 1, pressedAt: null }, change: null };
}
