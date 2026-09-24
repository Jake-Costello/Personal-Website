import './trial.css';

type TrialPhase = 'ready' | 'running' | 'paused' | 'finished';

function clock(seconds: number) {
  const tenths = Math.max(0, Math.floor(seconds * 10));
  const minutes = Math.floor(tenths / 600);
  const remaining = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(remaining).padStart(2, '0')}.${tenths % 10}`;
}

export default function TrialHud({
  phase,
  elapsed,
  penalty,
  hits,
  cleared,
  total,
  target,
  best,
  qualified,
  chapter,
  onStart,
  onPause,
  onResume,
  onRetry,
  onExit,
}: {
  phase: TrialPhase;
  elapsed: number;
  penalty: number;
  hits: number;
  cleared: number;
  total: number;
  target: number;
  best: number | null;
  qualified: boolean;
  chapter: { year: string; title: string; place: string };
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const score = elapsed + penalty;

  return (
    <div
      className="trial-hud"
      data-trial-phase={phase}
      data-elapsed={elapsed}
      data-score={score}
      data-penalty={penalty}
      data-hits={hits}
      data-cleared={cleared}
      data-target={target}
      data-qualified={qualified}
    >
      <p className="journey-sr-only" role="status" aria-atomic="true">
        {phase === 'paused'
          ? 'Time trial paused. Your clock is stopped.'
          : phase === 'finished'
            ? qualified
              ? 'Time trial complete. Achievement unlocked: bright yellow golf ball.'
              : 'Time trial complete. Target missed. Try again when you are ready.'
            : ''}
      </p>
      <div className="trial-scoreboard">
        <div className="trial-clock" role="timer" aria-label="Trial time" aria-live="off">
          <span className="trial-label">Shoreline sprint</span>
          <strong>{clock(score)}</strong>
        </div>
        <dl className="trial-stats">
          <div>
            <dt>Target</dt>
            <dd>{clock(target)}</dd>
          </div>
          <div>
            <dt>Penalty</dt>
            <dd>+{penalty}s</dd>
          </div>
          <div>
            <dt>Cleared</dt>
            <dd>
              {cleared}/{total}
            </dd>
          </div>
          <div>
            <dt>Best</dt>
            <dd>{best === null ? '—' : clock(best)}</dd>
          </div>
        </dl>
        {phase === 'running' && (
          <button className="trial-small-button" type="button" onClick={onPause}>
            Pause
          </button>
        )}
      </div>
      {(phase === 'running' || phase === 'paused') && (
        <div className="trial-chapter">
          <span className="trial-label">{chapter.year} / Along the way</span>
          <strong>{chapter.title}</strong>
          <span>{chapter.place}</span>
        </div>
      )}
      {phase === 'ready' && (
        <section className="trial-card" aria-label="Time trial instructions">
          <span className="trial-label">A little friendly competition</span>
          <h3>Jump the shoreline.</h3>
          <p>
            You cruise forward automatically at 2×. Hold <kbd>↓</kbd> to pump, then press{' '}
            <kbd>↑</kbd> to jump the obstacles.
          </p>
          <p>
            Each hit adds 4 seconds. Finish under <strong>{clock(target)}</strong> to unlock the
            yellow golf ball.
          </p>
          <div className="trial-actions">
            <button className="trial-primary-button" type="button" onClick={onStart}>
              Start time trial →
            </button>
            <button className="trial-text-button" type="button" onClick={onExit}>
              Back to story
            </button>
          </div>
        </section>
      )}
      {phase === 'paused' && (
        <section className="trial-card" aria-label="Time trial paused">
          <span className="trial-label">Take a breath</span>
          <h3>Paused on the water.</h3>
          <p>Your clock is stopped. Pick up where you left off whenever you’re ready.</p>
          <div className="trial-actions">
            <button className="trial-primary-button" type="button" onClick={onResume}>
              Resume ride →
            </button>
            <button className="trial-text-button" type="button" onClick={onExit}>
              Back to story
            </button>
          </div>
        </section>
      )}
      {phase === 'finished' && (
        <section className="trial-card trial-result" aria-label="Time trial result">
          <span className="trial-label">{qualified ? 'Achievement unlocked' : 'Another lap?'}</span>
          <h3>{qualified ? 'Hello, yellow.' : 'A few seconds to find.'}</h3>
          <p className="trial-result-time">
            {clock(score)} <span>/ {clock(target)} target</span>
          </p>
          <p>
            {cleared} obstacles cleared. {hits} {hits === 1 ? 'hit' : 'hits'}, adding {penalty}{' '}
            seconds.
          </p>
          <p>
            {qualified
              ? 'The yellow golf ball is yours. Choose it from the golf balls below and take a swing.'
              : 'Pump before each obstacle, jump as it approaches, and give the shoreline another run.'}
          </p>
          <div className="trial-actions">
            {qualified && (
              <a className="trial-primary-button" href="#about" onClick={onExit}>
                Try the yellow golf ball ↗
              </a>
            )}
            <button
              className={qualified ? 'trial-text-button' : 'trial-primary-button'}
              type="button"
              onClick={onRetry}
            >
              Try again
            </button>
            <button className="trial-text-button" type="button" onClick={onExit}>
              Back to story
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
