import { getJourneyFrame } from '../game/route';
import type { JourneyRoute } from '../game/route';

type ProgressChapter = {
  id: string;
  year: string;
  place: string;
};

export default function JourneyProgress({
  route,
  position,
  chapters,
}: {
  route: JourneyRoute;
  position: number;
  chapters: readonly ProgressChapter[];
}) {
  const boundedPosition = Number.isNaN(position)
    ? 0
    : Math.max(0, Math.min(route.length, position));
  const percentage = route.length > 0 ? (boundedPosition / route.length) * 100 : 0;
  const current = getJourneyFrame(route, boundedPosition);
  const next = route.stops.find((stop) => stop.start > boundedPosition);
  const checkpointLabel = (index: number) => {
    const chapter = chapters[index];
    return chapter ? `${chapter.year}: ${chapter.place}` : `Checkpoint ${index + 1}`;
  };
  const valueText = [
    `${Math.round(percentage)}% along the shoreline.`,
    next
      ? `Next checkpoint: ${checkpointLabel(next.index)}.`
      : route.stops.length > 0
        ? 'Final checkpoint reached.'
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="journey-progress"
      role="progressbar"
      aria-label="Shoreline progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percentage)}
      aria-valuetext={valueText}
    >
      <div className="journey-progress-track" aria-hidden="true">
        <span className="journey-progress-fill" style={{ width: `${percentage}%` }} />
        {route.stops.map((stop) => (
          <span
            key={chapters[stop.index]?.id ?? stop.index}
            className={`journey-progress-marker${boundedPosition >= stop.start ? ' is-reached' : ''}${current.stop?.index === stop.index ? ' is-current' : ''}`}
            style={{ left: `${route.length > 0 ? (stop.start / route.length) * 100 : 0}%` }}
            title={checkpointLabel(stop.index)}
            data-checkpoint={stop.index}
          />
        ))}
      </div>
    </div>
  );
}
