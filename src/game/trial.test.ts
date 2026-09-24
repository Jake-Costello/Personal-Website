import test from 'node:test';
import assert from 'node:assert/strict';
import { experience } from '../data/experience.ts';
import { advanceRide, idleInput, initialRide, MAX_SPEED } from './model.ts';
import { buildJourneyRoute } from './route.ts';
import {
  advanceTrial,
  buildTrialCourse,
  initialTrial,
  PENALTY_SECONDS,
  qualifiesForTrialReward,
  TRIAL_SPEED,
  trialScore,
  type TrialCourse,
} from './trial.ts';

const route = buildJourneyRoute(experience, MAX_SPEED);
const course = buildTrialCourse(route, experience);

test('the repeatable course follows chapter themes and leaves time to land and recharge', () => {
  assert.deepEqual(buildTrialCourse(route, experience), course);
  assert.ok(course.obstacles.length >= 16 && course.obstacles.length <= 20);
  assert.equal(course.obstacles.find(({ id }) => id === 'chapter-first-tools')?.kind, 'plane');
  assert.equal(course.obstacles.find(({ id }) => id === 'chapter-ohio-university')?.kind, 'bobcat');
  assert.equal(course.obstacles.find(({ id }) => id === 'chapter-waco')?.kind, 'paint');
  assert.equal(course.obstacles.find(({ id }) => id === 'chapter-revision')?.kind, 'buoy');
  assert.equal(new Set(course.obstacles.map(({ id }) => id)).size, course.obstacles.length);
  const positions = [0, ...course.obstacles.map(({ position }) => position), route.length];
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok((positions[index] - positions[index - 1]) / (MAX_SPEED * TRIAL_SPEED) >= 3);
  }
});

function race(misses = 0) {
  let ride = initialRide();
  let trial = initialTrial();
  for (let frame = 0; !trial.finished && frame < 60 * 300; frame += 1) {
    const upcoming = course.obstacles.find(({ id }) => !trial.resolved.includes(id));
    const distance = upcoming ? upcoming.position - ride.position : Infinity;
    const shouldJump = trial.resolved.length >= misses;
    const next = advanceRide(
      ride,
      {
        ...idleInput(),
        right: true,
        down: shouldJump && distance < 850 && distance > 320,
        jump: shouldJump && distance <= 320 && distance > 0 && ride.height === 0,
      },
      1 / 60,
      route.length,
      TRIAL_SPEED,
    );
    trial = advanceTrial(trial, ride, next, 1 / 60, course, route.length);
    ride = next;
  }
  return { trial, ride };
}

test('the real pump-and-jump physics can clear every obstacle at the fixed 2× pace', () => {
  const { trial, ride } = race();
  assert.equal(ride.position, route.length);
  assert.equal(trial.finished, true);
  assert.equal(trial.hits, 0);
  assert.equal(trial.cleared, course.obstacles.length);
  assert.equal(ride.jumps, course.obstacles.length);
  assert.ok(trial.elapsed > route.length / (MAX_SPEED * TRIAL_SPEED));
  assert.ok(trial.elapsed < route.length / (MAX_SPEED * TRIAL_SPEED) + 1);
  assert.equal(qualifiesForTrialReward(trial, course), true);
});

test('two collisions are forgiving; three mistakes or ignoring all obstacles miss the target', () => {
  const two = race(2).trial;
  assert.equal(two.hits, 2);
  assert.equal(two.penalty, PENALTY_SECONDS * 2);
  assert.equal(qualifiesForTrialReward(two, course), true);
  const three = race(3).trial;
  assert.equal(three.hits, 3);
  assert.equal(qualifiesForTrialReward(three, course), false);
  const noJumps = race(Infinity).trial;
  assert.equal(noJumps.hits, course.obstacles.length);
  assert.equal(noJumps.cleared, 0);
  assert.equal(qualifiesForTrialReward(noJumps, course), false);
});

const shortCourse: TrialCourse = {
  obstacles: [{ id: 'first', position: 100, kind: 'buoy', clearance: 40 }],
  targetSeconds: 20,
};
const sample = (position: number, height = 0) => ({ position, height });

test('collision checks use height at the crossing, including an exact clearance', () => {
  const clear = advanceTrial(
    initialTrial(),
    sample(80, 0),
    sample(120, 80),
    0.05,
    shortCourse,
    300,
  );
  assert.equal(clear.cleared, 1);
  assert.equal(clear.hits, 0);
  // The final frame is above the buoy, but the hull was too low as it passed it.
  const hit = advanceTrial(initialTrial(), sample(90, 0), sample(130, 80), 0.05, shortCourse, 300);
  assert.equal(hit.hits, 1);
  assert.equal(hit.penalty, PENALTY_SECONDS);
  assert.equal(hit.lastHit, 'first');
  assert.ok(Math.abs(hit.lastHitAge - 0.0375) < 1e-9);
});

test('reversing and crossing the same obstacle again never adds another hit or clear', () => {
  const initial = initialTrial();
  const hit = advanceTrial(initial, sample(90), sample(110), 0.05, shortCourse, 300);
  assert.deepEqual(initial, initialTrial(), 'advancing must not mutate the previous frame');
  const reverse = advanceTrial(hit, sample(110), sample(90), 0.05, shortCourse, 300);
  const again = advanceTrial(reverse, sample(90, 100), sample(110, 100), 0.05, shortCourse, 300);
  assert.equal(again.hits, 1);
  assert.equal(again.cleared, 0);
  assert.equal(again.penalty, PENALTY_SECONDS);
  assert.deepEqual(again.resolved, ['first']);
  assert.ok(again.elapsed > hit.elapsed, 'braking or reversing still uses active race time');
});

test('the active timer is not clamped and freezes when the finish is crossed', () => {
  const waiting = advanceTrial(initialTrial(), sample(0), sample(0), 2, shortCourse, 300);
  assert.equal(waiting.elapsed, 2);
  const crossed = advanceTrial(waiting, sample(0, 100), sample(400, 100), 4, shortCourse, 300);
  assert.equal(crossed.elapsed, 5, 'count only the fraction before the finish crossing');
  assert.equal(crossed.finished, true);
  assert.equal(crossed.cleared, 1);
  assert.equal(trialScore(crossed), 5);
  assert.equal(advanceTrial(crossed, sample(300), sample(300), 30, shortCourse, 300), crossed);
});

test('unstarted, unfinished, skipped, and nonfinite scores cannot earn the reward', () => {
  const clean = race().trial;
  assert.equal(qualifiesForTrialReward(initialTrial(), course), false);
  assert.equal(qualifiesForTrialReward({ ...clean, finished: false }, course), false);
  assert.equal(qualifiesForTrialReward({ ...clean, resolved: [] }, course), false);
  for (const elapsed of [0, -1, NaN, Infinity]) {
    assert.equal(qualifiesForTrialReward({ ...clean, elapsed }, course), false);
  }
  for (const penalty of [-1, NaN, Infinity]) {
    assert.equal(qualifiesForTrialReward({ ...clean, penalty }, course), false);
  }
  assert.equal(qualifiesForTrialReward(clean, { ...course, targetSeconds: Infinity }), false);
  assert.equal(qualifiesForTrialReward(clean, { obstacles: [], targetSeconds: 10 }), false);
  const jumpedToFinish = advanceTrial(
    initialTrial(),
    sample(299),
    sample(300),
    0.01,
    shortCourse,
    300,
  );
  assert.equal(jumpedToFinish.finished, true);
  assert.equal(qualifiesForTrialReward(jumpedToFinish, shortCourse), false);
});

test('invalid frame values do not poison a race and empty routes cannot award anything', () => {
  const trial = initialTrial();
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.equal(advanceTrial(trial, sample(0), sample(100), dt, shortCourse, 300), trial);
  }
  for (const ride of [sample(NaN), sample(Infinity), sample(100, NaN)]) {
    assert.equal(advanceTrial(trial, sample(0), ride, 0.05, shortCourse, 300), trial);
  }
  assert.deepEqual(buildTrialCourse(buildJourneyRoute([], MAX_SPEED), []), {
    obstacles: [],
    targetSeconds: 0,
  });
  assert.throws(() => buildTrialCourse({ ...route, length: Infinity }, experience), RangeError);
  assert.throws(() => buildTrialCourse(route, []), RangeError);
});
