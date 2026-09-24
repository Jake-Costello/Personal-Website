import { useEffect, useRef } from 'react';
import type { ExperienceChapter } from '../data/experience';
import { getJourneyFrame } from '../game/route';
import type { JourneyRoute } from '../game/route';

type ProgressChapter = Pick<ExperienceChapter, 'id' | 'year' | 'place' | 'title' | 'lifeStage'>;

const lifeStages = [
  { id: 'high-school', label: 'High school' },
  { id: 'college', label: 'College' },
  { id: 'career', label: 'Professional career' },
] as const;

export default function JourneyProgress({
  route,
  position,
  chapters,
  onNavigate,
}: {
  route: JourneyRoute;
  position: number;
  chapters: readonly ProgressChapter[];
  onNavigate: (index: number) => void;
}) {
  const yearTrack = useRef<HTMLElement>(null);
  const boundedPosition = Number.isNaN(position)
    ? 0
    : Math.max(0, Math.min(route.length, position));
  const percentage = route.length > 0 ? (boundedPosition / route.length) * 100 : 0;
  const current = getJourneyFrame(route, boundedPosition);
  const chapter = chapters[current.index];
  const next = route.stops.find((stop) => stop.start > boundedPosition);
  const checkpointLabel = (index: number) => {
    const chapter = chapters[index];
    return chapter ? `${chapter.year}: ${chapter.place}` : `Checkpoint ${index + 1}`;
  };
  const valueText = [
    `${Math.round(percentage)}% along the shoreline.`,
    chapter
      ? `${chapter.year}. ${lifeStages.find((stage) => stage.id === chapter.lifeStage)?.label}.`
      : '',
    next
      ? `Next checkpoint: ${checkpointLabel(next.index)}.`
      : route.stops.length > 0
        ? 'Final checkpoint reached.'
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    const track = yearTrack.current;
    const active = track?.querySelector<HTMLButtonElement>('[aria-current="step"]');
    if (!track || !active) return;
    // Keep the current year in view without moving the page or stealing focus.
    const trackBox = track.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    if (activeBox.left < trackBox.left || activeBox.right > trackBox.right) {
      track.scrollLeft += activeBox.left - trackBox.left - (trackBox.width - activeBox.width) / 2;
    }
  }, [current.index]);

  return (
    <div className="journey-timelines">
      <div className="journey-year-heading">
        <span className="journey-timeline-label">Year</span>
        <strong className="journey-current-year">{chapter?.year}</strong>
        <span className="journey-timeline-count">
          {String(current.index + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
        </span>
      </div>
      <nav className="journey-chapters" aria-label="Experience chapters" ref={yearTrack}>
        {route.stops.map((stop) => {
          const item = chapters[stop.index];
          return (
            <button
              type="button"
              key={item?.id ?? stop.index}
              className={`journey-chapter${boundedPosition >= stop.start ? ' is-reached' : ''}${current.index === stop.index ? ' is-current' : ''}`}
              onClick={() => onNavigate(stop.index)}
              aria-current={current.index === stop.index ? 'step' : undefined}
              aria-label={`${checkpointLabel(stop.index)}. ${item?.title ?? ''}`}
              title={item?.title}
              data-chapter={item?.id}
            >
              <span
                className="journey-progress-marker"
                data-checkpoint={stop.index}
                aria-hidden="true"
              />
              <span>{item?.year}</span>
            </button>
          );
        })}
      </nav>
      <div
        className="journey-progress"
        role="progressbar"
        aria-label="Shoreline progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentage)}
        aria-valuetext={valueText}
      >
        <span className="journey-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <div className="journey-life-row">
        <span className="journey-timeline-label">Life stage</span>
        <nav className="journey-life-stages" aria-label="Life stages">
          {lifeStages.map((stage) => {
            const first = chapters.findIndex((item) => item.lifeStage === stage.id);
            if (first < 0) return null;
            return (
              <button
                type="button"
                key={stage.id}
                className={`journey-life-stage${chapter?.lifeStage === stage.id ? ' is-current' : ''}`}
                aria-current={chapter?.lifeStage === stage.id ? 'step' : undefined}
                onClick={() => onNavigate(first)}
                data-life-stage={stage.id}
              >
                <span aria-hidden="true" className="journey-life-stage-dot" />
                {stage.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
