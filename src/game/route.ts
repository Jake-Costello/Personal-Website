export const WORDS_PER_SECOND = 250 / 60;
export const INTRO_SECONDS = 1.8;

const MIN_READING_SECONDS = 8;
const HOLD_SECONDS = 3;
const DETAILS_FADE_SECONDS = 0.75;
const YEAR_FADE_SECONDS = 0.65;
const TITLE_FADE_SECONDS = 0.85;
const GAP_SECONDS = 1.8;

export type JourneyStop = {
  index: number;
  start: number;
  detailsOut: number;
  yearOut: number;
  titleOut: number;
  end: number;
  readingSeconds: number;
};

export type JourneyRoute = {
  stops: JourneyStop[];
  length: number;
  speed: number;
};

export type JourneyFrame = {
  index: number;
  stop: JourneyStop | null;
  detailsOpacity: number;
  yearOpacity: number;
  titleOpacity: number;
};

/** Give every story enough water to read it, even when riding at full speed. */
export function buildJourneyRoute(
  chapters: readonly { story: string }[],
  speed: number,
): JourneyRoute {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError('Journey speed must be a positive, finite number.');
  }

  let start = 0;
  const stops = chapters.map(({ story }, index): JourneyStop => {
    const wordCount = story.trim().match(/\S+/g)?.length ?? 0;
    const readingSeconds = Math.max(MIN_READING_SECONDS, wordCount / WORDS_PER_SECOND);
    const detailsOut = start + (INTRO_SECONDS + readingSeconds + HOLD_SECONDS) * speed;
    const yearOut = detailsOut + DETAILS_FADE_SECONDS * speed;
    const titleOut = yearOut + YEAR_FADE_SECONDS * speed;
    const end = titleOut + TITLE_FADE_SECONDS * speed;
    const stop = { index, start, detailsOut, yearOut, titleOut, end, readingSeconds };
    start = end + GAP_SECONDS * speed;
    return stop;
  });

  // Cross the finish with the final story still showing. Earlier stops, including
  // the Revision Marine drive-by, have room to fade before the next chapter.
  return { stops, length: stops.at(-1)?.detailsOut ?? 0, speed };
}

const fadeOut = (position: number, start: number, end: number) =>
  Math.max(0, Math.min(1, (end - position) / (end - start)));

/** Pure position sampling means reversing the jetski naturally restores a story. */
export function getJourneyFrame(route: JourneyRoute, position: number): JourneyFrame {
  const empty = (index: number): JourneyFrame => ({
    index,
    stop: null,
    detailsOpacity: 0,
    yearOpacity: 0,
    titleOpacity: 0,
  });
  if (route.stops.length === 0) return empty(-1);

  const boundedPosition = Number.isNaN(position)
    ? 0
    : Math.max(0, Math.min(route.length, position));
  let index = 0;
  for (let next = 1; next < route.stops.length; next += 1) {
    if (route.stops[next].start > boundedPosition) break;
    index = next;
  }

  const stop = route.stops[index];
  const finalStop = index === route.stops.length - 1;
  if (!finalStop && boundedPosition >= stop.end) return empty(index);

  return {
    index,
    stop,
    detailsOpacity: finalStop ? 1 : fadeOut(boundedPosition, stop.detailsOut, stop.yearOut),
    yearOpacity: finalStop ? 1 : fadeOut(boundedPosition, stop.yearOut, stop.titleOut),
    titleOpacity: finalStop ? 1 : fadeOut(boundedPosition, stop.titleOut, stop.end),
  };
}
