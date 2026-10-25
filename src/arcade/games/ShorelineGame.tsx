import { useEffect, useId, useRef, useState } from 'react';
import ClevelandSkyline from '../../components/ClevelandSkyline';
import JetskiSprite from '../../components/JetskiSprite';
import { JetskiSplash } from '../../components/JetskiWater';
import TrialObstacles from '../../components/TrialObstacles';
import { experience } from '../../data/experience';
import { advanceRide, initialRide, MAX_SPEED, type RideState } from '../../game/model';
import { buildJourneyRoute, getJourneyFrame } from '../../game/route';
import {
  advanceTrial,
  buildTrialCourse,
  initialTrial,
  qualifiesForTrialReward,
  trialScore,
  TRIAL_SPEED,
} from '../../game/trial';
import { markStoryFinished, recordTrialResult, useAchievements } from '../../lib/achievements';
import type { ArcadeInput } from '../input';
import './shoreline-game.css';

const route = buildJourneyRoute(experience, MAX_SPEED);
const course = buildTrialCourse(route, experience);
const WIDTH = 960;
const HEIGHT = 600;
const WATERLINE = HEIGHT - 155;
const BOAT_X = WIDTH * 0.28;
type Mode = 'story' | 'trial';
type Phase = 'ready' | 'running' | 'paused' | 'finished';

function clock(seconds: number) {
  const tenths = Math.max(0, Math.floor(seconds * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor((tenths % 600) / 10)).padStart(2, '0')}.${tenths % 10}`;
}

function ShorelineScene({
  ride,
  racing,
  reduced,
  lastHit,
}: {
  ride: RideState;
  racing: boolean;
  reduced: boolean;
  lastHit: string | null;
}) {
  const waterId = useId();
  const progress = ride.position / route.length;
  const revision = route.stops[experience.findIndex((chapter) => chapter.id === 'revision')];
  const shopX = 820 - ((ride.position - revision.start) / (revision.end - revision.start)) * 1200;
  const finalStop = route.stops.at(-1)!;
  const finishProgress = Math.max(
    0,
    (ride.position - finalStop.start) / (route.length - finalStop.start),
  );
  const finishX = 1100 - finishProgress * (1100 - BOAT_X);

  return (
    <svg className="shoreline-scene" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <defs>
        <pattern
          id={waterId}
          width="120"
          height="38"
          patternUnits="userSpaceOnUse"
          x={-(ride.position * 0.35) % 120}
        >
          <path d="M12 6h24m30 21h31" fill="none" stroke="#92c6cd" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#dcece6" />
      <path d="M794 84h52v9h16v16h8v52h-8v16h-16v9h-52v-9h-16v-16h-8v-52h8V93h16z" fill="#e7f7a0" />
      <path d="M674 197h25v-12h31v12h23v12h-79zm163 41h26v-13h29v8h23v17h-78z" fill="#f5f3ed" />
      <ClevelandSkyline
        width={WIDTH}
        waterline={WATERLINE}
        progress={progress}
        reduced={reduced}
        blimpStartedAt={null}
      />
      <path d={`M0 ${WATERLINE - 3}h${WIDTH}v5H0z`} fill="#728f80" />
      <rect y={WATERLINE + 2} width={WIDTH} height="155" fill="#b9e5ee" />
      <rect y={WATERLINE + 5} width={WIDTH} height="155" fill={`url(#${waterId})`} />
      <path d={`M0 ${WATERLINE + 9}h${WIDTH}`} stroke="#dbf3f0" strokeWidth="5" />
      {shopX > -220 && shopX < 1100 && (
        <g transform={`translate(${shopX} ${WATERLINE + 40})`} shapeRendering="crispEdges">
          <path d="M0-155h166V0H0z" fill="#f5f3ed" />
          <path d="M-8-165h181v14H-8zM17-109h100V0H17z" fill="#17251e" />
          <path
            d="M22-103h90v9H22zm0 18h90v9H22zm0 18h90v9H22zm0 18h90v9H22zm0 18h90v9H22z"
            fill="#789082"
          />
          <path d="M130-102h24v44h-24z" fill="#b9e5ee" stroke="#17251e" strokeWidth="5" />
          <path d="M12-143h143v25H12z" fill="#dfff7f" />
          <text
            x="83"
            y="-126"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#17251e"
            fontFamily="monospace"
          >
            REVISION MARINE
          </text>
          <path d="M-40-4h226v10H-40zM-26 6h10v34h-10zm176 0h10v34h-10z" fill="#496356" />
        </g>
      )}
      {finishProgress > 0 && (
        <g transform={`translate(${finishX} ${WATERLINE + 25})`} shapeRendering="crispEdges">
          <path d="M-90-126h7V85h-7zm173 0h7V85h-7zM-94-126H94v39H-94z" fill="#17251e" />
          <path d="M-86-120H86v27H-86z" fill="#f5f3ed" />
          <text
            x="0"
            y="-100"
            textAnchor="middle"
            fontSize="21"
            letterSpacing="4"
            fontWeight="800"
            fill="#17251e"
            fontFamily="monospace"
          >
            FINISH
          </text>
          <path d="M-82 69H82" stroke="#f5f3ed" strokeWidth="4" strokeDasharray="9 7" />
        </g>
      )}
      {racing && (
        <TrialObstacles
          obstacles={course.obstacles}
          position={ride.position}
          width={WIDTH}
          height={HEIGHT}
          reduced={reduced}
          lastHit={lastHit}
        />
      )}
      <ellipse
        cx={BOAT_X}
        cy={WATERLINE + 111}
        rx={ride.height ? 44 : 66}
        ry="5"
        fill="#75b2b7"
        opacity={ride.height ? 0.3 : 0.55}
      />
      <JetskiSprite
        state={ride}
        x={BOAT_X}
        y={WATERLINE + 86}
        reduced={reduced}
        scale={1.8}
        fullJumpHeight
      />
      <JetskiSplash state={ride} x={BOAT_X} y={WATERLINE + 111} scale={1.8} reduced={reduced} />
    </svg>
  );
}

/** The cabinet owns keyboard/touch input. This game only subscribes to its input bus. */
export default function ShorelineGame({ input, active }: { input: ArcadeInput; active: boolean }) {
  const achievements = useAchievements();
  const [mode, setMode] = useState<Mode>('story');
  const [phase, setPhase] = useState<Phase>('ready');
  const [ride, setRide] = useState(initialRide);
  const [trial, setTrial] = useState(initialTrial);
  const [reading, setReading] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const simulation = useRef(initialRide());
  const trialSimulation = useRef(initialTrial());
  const jumpQueued = useRef(false);
  const readButton = useRef<HTMLButtonElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const frame = getJourneyFrame(route, ride.position);
  const chapter = experience[frame.index];
  const atFinish = ride.position >= route.length - 1;
  const unlocked = achievements.storyFinished || atFinish;
  const qualified = qualifiesForTrialReward(trial, course);

  function resetRide(position = 0) {
    jumpQueued.current = false;
    simulation.current = initialRide(position);
    setRide(simulation.current);
  }

  function closeStory() {
    input.clear();
    setReading(false);
    readButton.current?.focus({ preventScroll: true });
  }

  function prepareTrial() {
    if (!unlocked) return;
    setReading(false);
    setMode('trial');
    setPhase('ready');
    trialSimulation.current = initialTrial();
    setTrial(trialSimulation.current);
    resetRide();
  }

  function restart() {
    setReading(false);
    if (mode === 'trial') prepareTrial();
    else resetRide();
  }

  function leaveTrial() {
    setMode('story');
    setPhase('ready');
    resetRide(route.length);
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reading) {
      input.clear();
      resumeButton.current?.focus({ preventScroll: true });
    }
  }, [reading, input]);

  useEffect(() => {
    if (mode === 'story' && atFinish) markStoryFinished();
  }, [mode, atFinish]);

  useEffect(() => {
    if (mode === 'trial' && phase === 'finished') {
      const result = trialSimulation.current;
      recordTrialResult(trialScore(result), qualifiesForTrialReward(result, course));
    }
  }, [mode, phase]);

  // React state is only painted at 30 fps; input edges are retained between frames.
  // In particular a short cabinet-button pulse cannot disappear before a physics step.
  const commands = useRef({ restart, prepareTrial });
  commands.current = { restart, prepareTrial };
  useEffect(() => {
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const pressed = input.pressed;
      const rising = (key: string) => pressed.has(key) && !previous.has(key);
      if (active && rising('reset')) commands.current.restart();
      if (active && !reading) {
        if (rising('up') || rising('action')) jumpQueued.current = true;
        if (rising('secondary')) {
          if (mode === 'story' || phase === 'finished') commands.current.prepareTrial();
          else setPhase((current) => (current === 'running' ? 'paused' : 'running'));
        }
      }
      previous = new Set(pressed);
    });
  }, [input, active, mode, phase, reading]);

  useEffect(() => {
    if (!active || reading || (mode === 'trial' && phase !== 'running')) return;
    let animation = 0;
    let previous = 0;
    let lastPaint = 0;
    function animate(now: number) {
      // Never catch up a sleeping tab or a long frame: the trial uses active time.
      const elapsed = !previous || document.hidden ? 0 : Math.min(0.05, (now - previous) / 1000);
      previous = now;
      let remaining = elapsed;
      while (remaining > 0 && !(mode === 'trial' && trialSimulation.current.finished)) {
        const step = Math.min(remaining, 1 / 60);
        const before = simulation.current;
        simulation.current = advanceRide(
          before,
          {
            left: mode === 'story' && input.pressed.has('left'),
            right: mode === 'trial' || input.pressed.has('right'),
            down: input.pressed.has('down'),
            jump: jumpQueued.current,
          },
          step,
          route.length,
          mode === 'trial' ? TRIAL_SPEED : 1,
        );
        if (mode === 'trial') {
          trialSimulation.current = advanceTrial(
            trialSimulation.current,
            before,
            simulation.current,
            step,
            course,
            route.length,
          );
        }
        jumpQueued.current = false;
        remaining -= step;
      }
      if (now - lastPaint >= 1000 / 30) {
        setRide(simulation.current);
        if (mode === 'trial') setTrial(trialSimulation.current);
        lastPaint = now;
      }
      if (mode === 'trial' && trialSimulation.current.finished) {
        setRide(simulation.current);
        setTrial(trialSimulation.current);
        setPhase('finished');
      } else animation = requestAnimationFrame(animate);
    }
    animation = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animation);
      jumpQueued.current = false;
      simulation.current = { ...simulation.current, velocity: 0 };
    };
  }, [active, input, mode, phase, reading]);

  const nextObstacle = course.obstacles.find((obstacle) => obstacle.position > ride.position);
  return (
    <div
      className="shoreline-game"
      data-mode={mode}
      data-phase={phase}
      data-position={ride.position}
      data-jumps={ride.jumps}
      data-elapsed={trial.elapsed}
      data-reading={reading}
      aria-label="Resume Run jetski game"
    >
      <ShorelineScene
        ride={ride}
        racing={mode === 'trial'}
        reduced={reduced}
        lastHit={trial.lastHitAge < 0.7 ? trial.lastHit : null}
      />
      <header className="shoreline-topbar" inert={reading}>
        <div>
          <span className="shoreline-status-light" /> RESUME RUN{' '}
          <span className="shoreline-topbar-sub">
            / {mode === 'story' ? 'THE STORY SO FAR' : 'TIME TRIAL'}
          </span>
        </div>
        <div className="shoreline-top-actions">
          {mode === 'story' && unlocked && (
            <button type="button" onClick={prepareTrial}>
              Time trial
            </button>
          )}
          {mode === 'trial' && (
            <button type="button" onClick={leaveTrial}>
              Story
            </button>
          )}
          <button type="button" onClick={restart}>
            Restart
          </button>
        </div>
      </header>
      <nav className="shoreline-progress" aria-label="Journey chapters" inert={reading}>
        {experience.map((item, index) => (
          <button
            key={item.id}
            type="button"
            title={`${item.year}: ${item.title}`}
            aria-label={`Chapter ${index + 1}: ${item.title}`}
            aria-current={frame.index === index ? 'step' : undefined}
            disabled={mode === 'trial'}
            onClick={() => resetRide(route.stops[index].start)}
            className={frame.index >= index ? 'is-passed' : ''}
          >
            <span />
          </button>
        ))}
      </nav>
      {mode === 'story' ? (
        <>
          <div className="shoreline-compact-story" inert={reading}>
            <div>
              <strong>{chapter.year}</strong>
              <span>
                {String(frame.index + 1).padStart(2, '0')} / {experience.length}
              </span>
              <button type="button" ref={readButton} onClick={() => setReading(true)}>
                Read story
              </button>
            </div>
            <h2>{chapter.title}</h2>
          </div>
          <article
            className={`shoreline-story${reading ? ' is-reading' : ''}`}
            data-story-id={chapter.id}
            aria-label={`${chapter.title} Chapter story`}
            role={reading ? 'dialog' : undefined}
            aria-modal={reading ? true : undefined}
            onKeyDown={
              reading
                ? (event) => {
                    event.stopPropagation();
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeStory();
                    }
                    if (event.key === 'Tab') {
                      const buttons = Array.from(
                        event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]'),
                      );
                      const first = buttons[0];
                      const last = buttons.at(-1);
                      if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last?.focus();
                      } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first?.focus();
                      }
                    }
                  }
                : undefined
            }
          >
            {reading && (
              <div className="shoreline-reader-tools">
                <span>{chapter.year} / STORY PAUSED</span>
                <button ref={resumeButton} type="button" onClick={closeStory}>
                  Resume ride ×
                </button>
              </div>
            )}
            <p className="shoreline-eyebrow">{chapter.date}</p>
            <h2>{chapter.title}</h2>
            <p className="shoreline-story-place">{chapter.place}</p>
            <p className="shoreline-story-body">{chapter.story}</p>
            <ul className="shoreline-skills" aria-label="Skills">
              {chapter.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
            {chapter.link?.href.startsWith('https://') && (
              <a
                className="shoreline-story-link"
                href={chapter.link.href}
                target="_blank"
                rel="noreferrer"
              >
                {chapter.link.label} ↗
              </a>
            )}
          </article>
          <aside className="shoreline-journey-nav" inert={reading}>
            <span className="shoreline-eyebrow">A LIFE ON THE LAKE</span>
            <strong className="shoreline-year">{chapter.year}</strong>
            <label className="shoreline-chapter-label" htmlFor="shoreline-chapter">
              CHAPTER {String(frame.index + 1).padStart(2, '0')} / {experience.length}
            </label>
            <select
              id="shoreline-chapter"
              value={frame.index}
              onChange={(event) => resetRide(route.stops[Number(event.target.value)].start)}
              aria-label="Choose a story chapter"
            >
              {experience.map((item, index) => (
                <option key={item.id} value={index}>
                  {String(index + 1).padStart(2, '0')} · {item.place}
                </option>
              ))}
            </select>
            <div className="shoreline-chapter-buttons">
              <button
                type="button"
                aria-label="Previous chapter"
                disabled={frame.index === 0}
                onClick={() => resetRide(route.stops[frame.index - 1].start)}
              >
                ← Previous
              </button>
              <button
                type="button"
                aria-label={
                  frame.index === experience.length - 1 ? 'Ride to finish' : 'Next chapter'
                }
                disabled={atFinish}
                onClick={() =>
                  resetRide(
                    frame.index === experience.length - 1
                      ? route.length
                      : route.stops[frame.index + 1].start,
                  )
                }
              >
                {frame.index === experience.length - 1 ? 'Finish →' : 'Next →'}
              </button>
            </div>
            <p className="shoreline-riding-tip">
              Hold ← / → to explore.
              <br />
              Pump ↓, then jump ↑.
            </p>
            {atFinish && (
              <div className="shoreline-finish-message">
                <strong>Story complete.</strong>
                <span>Take the shoreline sprint?</span>
                <button type="button" onClick={prepareTrial}>
                  Unlock the time trial →
                </button>
              </div>
            )}
          </aside>
        </>
      ) : (
        <>
          <div className="shoreline-scoreboard">
            <div className="shoreline-clock">
              <span className="shoreline-eyebrow">SHORELINE SPRINT</span>
              <strong role="timer" aria-label="Trial time">
                {clock(trialScore(trial))}
              </strong>
            </div>
            <dl>
              <div>
                <dt>TARGET</dt>
                <dd>{clock(course.targetSeconds)}</dd>
              </div>
              <div>
                <dt>PENALTY</dt>
                <dd>+{trial.penalty}s</dd>
              </div>
              <div>
                <dt>CLEARED</dt>
                <dd>
                  {trial.cleared}/{course.obstacles.length}
                </dd>
              </div>
              <div>
                <dt>BEST</dt>
                <dd>
                  {achievements.bestTrialSeconds === null
                    ? '—'
                    : clock(achievements.bestTrialSeconds)}
                </dd>
              </div>
            </dl>
            {phase === 'running' && (
              <button type="button" onClick={() => setPhase('paused')}>
                Pause
              </button>
            )}
          </div>
          {phase === 'running' ? (
            <div className="shoreline-trial-story">
              <span className="shoreline-eyebrow">{chapter.year} / ALONG THE WAY</span>
              <h2>{chapter.title}</h2>
              <p>{chapter.place}</p>
              <span className="shoreline-next-obstacle">
                {nextObstacle
                  ? `Next obstacle in ${Math.max(0, (nextObstacle.position - ride.position) / (MAX_SPEED * TRIAL_SPEED)).toFixed(1)}s`
                  : 'The finish line is ahead'}
              </span>
            </div>
          ) : (
            <section
              className="shoreline-trial-card"
              aria-label={
                phase === 'finished'
                  ? 'Time trial result'
                  : phase === 'paused'
                    ? 'Time trial paused'
                    : 'Time trial instructions'
              }
            >
              <span className="shoreline-eyebrow">
                {phase === 'finished'
                  ? qualified
                    ? 'ACHIEVEMENT UNLOCKED'
                    : 'ANOTHER LAP?'
                  : phase === 'paused'
                    ? 'TAKE A BREATH'
                    : 'A LITTLE FRIENDLY COMPETITION'}
              </span>
              <h2>
                {phase === 'finished'
                  ? qualified
                    ? 'Hello, yellow.'
                    : 'A few seconds to find.'
                  : phase === 'paused'
                    ? 'Paused on the water.'
                    : 'Jump the shoreline.'}
              </h2>
              <p>
                {phase === 'finished'
                  ? `${trial.cleared} obstacles cleared. ${trial.hits} hits added ${trial.penalty} seconds. ${qualified ? 'Your yellow golf ball is unlocked on the main site.' : 'Pump before each obstacle, then jump as it approaches.'}`
                  : phase === 'paused'
                    ? 'Your clock is stopped. Pick up where you left off.'
                    : `Cruise forward automatically. Hold ↓ to pump, then press ↑ to jump. Each hit adds 4 seconds. Beat ${clock(course.targetSeconds)} to unlock the yellow golf ball.`}
              </p>
              <div className="shoreline-trial-actions">
                <button
                  type="button"
                  onClick={phase === 'finished' ? prepareTrial : () => setPhase('running')}
                >
                  {phase === 'finished'
                    ? 'Try again →'
                    : phase === 'paused'
                      ? 'Resume ride →'
                      : 'Start sprint →'}
                </button>
                <button type="button" onClick={leaveTrial}>
                  Back to story
                </button>
              </div>
            </section>
          )}
        </>
      )}
      <div className="shoreline-water-hud" aria-hidden="true">
        <span>
          {!active
            ? 'PAUSED'
            : mode === 'trial'
              ? 'AUTO CRUISE / 2×'
              : atFinish
                ? 'FINISH / LOOKING AHEAD'
                : 'LAKE ERIE / CLEVELAND'}
        </span>
        <div className="shoreline-pump">
          <span>{ride.charge > 0.1 ? '↑ JUMP!' : '↓ HOLD TO PUMP'}</span>
          <i>
            <b style={{ width: `${ride.charge * 100}%` }} />
          </i>
        </div>
        <span>
          {Math.round((ride.position / route.length) * 100)}% / {ride.jumps} JUMPS
        </span>
      </div>
    </div>
  );
}
