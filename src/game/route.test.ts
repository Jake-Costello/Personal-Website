import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJourneyRoute, getJourneyFrame, INTRO_SECONDS, WORDS_PER_SECOND } from './route.ts';

const SPEED = 440;
const story = (words: number) => ({ story: Array(words).fill('experience').join(' ') });
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to be near ${expected}`);

test('full-speed travel gives every chapter a reading window and time to settle', () => {
  const route = buildJourneyRoute([story(80), story(12), { story: ' \n\t ' }], SPEED);
  const first = route.stops[0];
  assert.equal(WORDS_PER_SECOND, 250 / 60);
  assert.equal(first.readingSeconds, 19.2);
  near((first.detailsOut - first.start) / SPEED, INTRO_SECONDS + 19.2 + 3);
  assert.equal(route.stops[1].readingSeconds, 8);
  assert.equal(route.stops[2].readingSeconds, 8);
  assert.equal(getJourneyFrame(route, first.detailsOut).detailsOpacity, 1);

  const slowerRoute = buildJourneyRoute([story(80)], SPEED / 2);
  near(slowerRoute.length / slowerRoute.speed, first.detailsOut / route.speed);
});

test('departure fades details, then year, then title, without overlap', () => {
  const route = buildJourneyRoute([story(50), story(50)], SPEED);
  const stop = route.stops[0];
  const details = getJourneyFrame(route, (stop.detailsOut + stop.yearOut) / 2);
  near(details.detailsOpacity, 0.5);
  assert.equal(details.yearOpacity, 1);
  assert.equal(details.titleOpacity, 1);

  const year = getJourneyFrame(route, (stop.yearOut + stop.titleOut) / 2);
  assert.equal(year.detailsOpacity, 0);
  near(year.yearOpacity, 0.5);
  assert.equal(year.titleOpacity, 1);

  const title = getJourneyFrame(route, (stop.titleOut + stop.end) / 2);
  assert.equal(title.detailsOpacity, 0);
  assert.equal(title.yearOpacity, 0);
  near(title.titleOpacity, 0.5);
  near((stop.yearOut - stop.detailsOut) / SPEED, 0.75);
  near((stop.titleOut - stop.yearOut) / SPEED, 0.65);
  near((stop.end - stop.titleOut) / SPEED, 0.85);
});

test('the empty water between stories lasts 1.8 seconds and preserves the previous index', () => {
  const route = buildJourneyRoute([story(40), story(40), story(40)], SPEED);
  const [first, second] = route.stops;
  near((second.start - first.end) / SPEED, 1.8);
  for (const position of [first.end, (first.end + second.start) / 2, second.start - 0.001]) {
    assert.deepEqual(getJourneyFrame(route, position), {
      index: 0,
      stop: null,
      detailsOpacity: 0,
      yearOpacity: 0,
      titleOpacity: 0,
    });
  }
  const arrival = getJourneyFrame(route, second.start);
  assert.equal(arrival.index, 1);
  assert.equal(arrival.stop, second);
  assert.equal(arrival.titleOpacity, 1);
});

test('sampling the same route backwards restores identical stories and fades', () => {
  const route = buildJourneyRoute([story(30), story(70), story(40)], SPEED);
  const positions = route.stops.flatMap((stop) => [
    stop.start,
    (stop.detailsOut + stop.yearOut) / 2,
    stop.end,
  ]);
  const forwardFrames = positions.map((position) => getJourneyFrame(route, position));
  const backwardFrames = positions
    .slice()
    .reverse()
    .map((position) => getJourneyFrame(route, position));
  assert.deepEqual(backwardFrames.reverse(), forwardFrames);
});

test('bounds and nonfinite positions resolve safely to the start or finish', () => {
  const route = buildJourneyRoute([story(30), story(30)], SPEED);
  const atStart = getJourneyFrame(route, 0);
  assert.deepEqual(getJourneyFrame(route, -100), atStart);
  assert.deepEqual(getJourneyFrame(route, -Infinity), atStart);
  assert.deepEqual(getJourneyFrame(route, NaN), atStart);
  const atEnd = getJourneyFrame(route, route.length);
  assert.deepEqual(getJourneyFrame(route, route.length + 100), atEnd);
  assert.deepEqual(getJourneyFrame(route, Infinity), atEnd);
});

test('new checkpoints extend the route without changing earlier reading windows', () => {
  const original = buildJourneyRoute([story(45), story(80)], SPEED);
  const extended = buildJourneyRoute([story(45), story(80), story(150), story(30)], SPEED);
  assert.deepEqual(extended.stops.slice(0, 2), original.stops);
  assert.ok(extended.length > original.length);
  assert.ok(extended.stops[2].readingSeconds > extended.stops[1].readingSeconds);
  for (const stop of extended.stops) {
    assert.equal(getJourneyFrame(extended, stop.start).index, stop.index);
  }
});

test('one chapter still has a full ride and the final story never fades at the destination', () => {
  for (const chapters of [[story(55)], [story(20), story(55)]]) {
    const route = buildJourneyRoute(chapters, SPEED);
    const last = route.stops.at(-1)!;
    assert.equal(route.length, last.detailsOut);
    assert.ok(route.length > last.start);
    for (const position of [last.start, route.length - 1, route.length, route.length + 10000]) {
      const frame = getJourneyFrame(route, position);
      assert.equal(frame.stop, last);
      assert.equal(frame.detailsOpacity, 1);
      assert.equal(frame.yearOpacity, 1);
      assert.equal(frame.titleOpacity, 1);
    }
  }
});

test('empty routes have no active chapter and invalid speeds fail clearly', () => {
  const route = buildJourneyRoute([], SPEED);
  assert.equal(route.length, 0);
  for (const position of [-10, 0, 100, NaN, Infinity]) {
    assert.deepEqual(getJourneyFrame(route, position), {
      index: -1,
      stop: null,
      detailsOpacity: 0,
      yearOpacity: 0,
      titleOpacity: 0,
    });
  }
  for (const speed of [0, -1, NaN, Infinity]) {
    assert.throws(() => buildJourneyRoute([story(10)], speed), RangeError);
  }
});
