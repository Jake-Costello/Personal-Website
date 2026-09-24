import { MAX_SPEED, type RideState } from './model';
import { INTRO_SECONDS, type JourneyRoute } from './route';

export const TRIAL_SPEED = 2;
export const PENALTY_SECONDS = 4;
const MINIMUM_SPACING_SECONDS = 3;
const FINISH_ALLOWANCE_SECONDS = 10;

export type TrialObstacle = {
  id: string;
  position: number;
  kind: 'buoy' | 'plane' | 'bobcat' | 'paint';
  clearance: number;
};

export type TrialCourse = {
  obstacles: TrialObstacle[];
  targetSeconds: number;
};

export type TrialState = {
  elapsed: number;
  penalty: number;
  hits: number;
  cleared: number;
  resolved: string[];
  finished: boolean;
  lastHit: string | null;
  lastHitAge: number;
};

const obstacleKind = (chapterId: string): TrialObstacle['kind'] => {
  if (chapterId === 'first-tools') return 'plane';
  if (['ohio-university', 'payphone', 'graduation'].includes(chapterId)) return 'bobcat';
  if (['sherwin', 'picking-carts', 'cart-rollout', 'waco', 'waco-delivery'].includes(chapterId)) {
    return 'paint';
  }
  return 'buoy';
};

const clearances: Record<TrialObstacle['kind'], number> = {
  buoy: 40,
  plane: 48,
  bobcat: 44,
  paint: 42,
};

/** A repeatable course: one chapter obstacle, with occasional transition buoys. */
export function buildTrialCourse(
  route: JourneyRoute,
  chapters: readonly { id: string }[],
): TrialCourse {
  if (
    !Number.isFinite(route.length) ||
    route.length < 0 ||
    !Number.isFinite(route.speed) ||
    route.speed <= 0 ||
    chapters.length !== route.stops.length
  ) {
    throw new RangeError('The trial needs a finite journey and matching chapters.');
  }
  if (route.length === 0) return { obstacles: [], targetSeconds: 0 };

  const minimumSpacing = MAX_SPEED * TRIAL_SPEED * MINIMUM_SPACING_SECONDS;
  const obstacles: TrialObstacle[] = [];
  for (const stop of route.stops) {
    const chapter = chapters[stop.index];
    const kind = obstacleKind(chapter.id);
    const position = stop.start + (INTRO_SECONDS + stop.readingSeconds * 0.55) * route.speed;
    // Retain room to prepare, land, and recharge even if the route is shortened later.
    if (
      position >= minimumSpacing &&
      position <= route.length - minimumSpacing &&
      obstacles.every((obstacle) => Math.abs(obstacle.position - position) >= minimumSpacing)
    ) {
      obstacles.push({ id: `chapter-${chapter.id}`, position, kind, clearance: clearances[kind] });
    }
  }

  for (let index = 2; index < route.stops.length - 1; index += 3) {
    const stop = route.stops[index];
    const position = (stop.end + route.stops[index + 1].start) / 2;
    if (
      position >= minimumSpacing &&
      position <= route.length - minimumSpacing &&
      obstacles.every((obstacle) => Math.abs(obstacle.position - position) >= minimumSpacing)
    ) {
      obstacles.push({
        id: `transition-${chapters[index].id}`,
        position,
        kind: 'buoy',
        clearance: 40,
      });
    }
  }

  return {
    obstacles: obstacles.sort((first, second) => first.position - second.position),
    // Acceleration costs less than a second. Two mistakes still leave a little room;
    // three or a ride straight through the obstacles cannot earn the reward.
    targetSeconds: Math.ceil(route.length / (MAX_SPEED * TRIAL_SPEED)) + FINISH_ALLOWANCE_SECONDS,
  };
}

export const initialTrial = (): TrialState => ({
  elapsed: 0,
  penalty: 0,
  hits: 0,
  cleared: 0,
  resolved: [],
  finished: false,
  lastHit: null,
  lastHitAge: 0,
});

type TrialRide = Pick<RideState, 'position' | 'height'>;

/** Advance with active time only. The caller pauses hidden/blurred scenes. */
export function advanceTrial(
  current: TrialState,
  previousRide: TrialRide,
  nextRide: TrialRide,
  dt: number,
  course: TrialCourse,
  routeLength: number,
): TrialState {
  if (
    current.finished ||
    !Number.isFinite(dt) ||
    dt <= 0 ||
    !Number.isFinite(routeLength) ||
    routeLength <= 0 ||
    ![previousRide.position, previousRide.height, nextRide.position, nextRide.height].every(
      Number.isFinite,
    )
  ) {
    return current;
  }

  const distance = nextRide.position - previousRide.position;
  const finished =
    distance > 0 && previousRide.position < routeLength && nextRide.position >= routeLength;
  const finishFraction = finished
    ? Math.min(1, (routeLength - previousRide.position) / distance)
    : 1;
  const activeSeconds = dt * finishFraction;
  const next = {
    ...current,
    elapsed: current.elapsed + activeSeconds,
    lastHitAge: current.lastHitAge + activeSeconds,
    resolved: [...current.resolved],
    finished,
  };

  if (distance <= 0) return next;

  for (const obstacle of course.obstacles) {
    if (
      next.resolved.includes(obstacle.id) ||
      obstacle.position <= previousRide.position ||
      obstacle.position > Math.min(nextRide.position, routeLength)
    ) {
      continue;
    }
    // Sampling the crossing itself avoids frame-rate-dependent collisions when
    // the hull rises or lands between two rendered positions.
    const fraction = (obstacle.position - previousRide.position) / distance;
    const height = previousRide.height + (nextRide.height - previousRide.height) * fraction;
    next.resolved.push(obstacle.id);
    if (height >= obstacle.clearance) {
      next.cleared += 1;
    } else {
      next.hits += 1;
      next.penalty += PENALTY_SECONDS;
      next.lastHit = obstacle.id;
      next.lastHitAge = dt * (finishFraction - fraction);
    }
  }
  return next;
}

export const trialScore = (trial: TrialState): number => trial.elapsed + trial.penalty;

export function qualifiesForTrialReward(trial: TrialState, course: TrialCourse): boolean {
  return (
    trial.finished &&
    Number.isFinite(trial.elapsed) &&
    trial.elapsed > 0 &&
    Number.isFinite(trial.penalty) &&
    trial.penalty >= 0 &&
    Number.isFinite(course.targetSeconds) &&
    course.targetSeconds > 0 &&
    course.obstacles.length > 0 &&
    course.obstacles.every((obstacle) => trial.resolved.includes(obstacle.id)) &&
    trialScore(trial) <= course.targetSeconds
  );
}
