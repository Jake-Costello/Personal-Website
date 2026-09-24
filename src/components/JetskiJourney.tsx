import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { experience } from '../data/experience';
import { advanceRide, idleInput, initialRide, MAX_SPEED } from '../game/model';
import type { RideInput, RideState } from '../game/model';
import { buildJourneyRoute, getJourneyFrame } from '../game/route';
import { changeRideSpeed, DEFAULT_RIDE_SPEED, emptySpeedTaps, trackSpeedTap } from '../game/speed';
import {
  advanceTrial,
  buildTrialCourse,
  initialTrial,
  qualifiesForTrialReward,
  trialScore,
  TRIAL_SPEED,
} from '../game/trial';
import { markStoryFinished, recordTrialResult, useAchievements } from '../lib/achievements';
import ClevelandSkyline from './ClevelandSkyline';
import JetskiSprite from './JetskiSprite';
import { JetskiSplash } from './JetskiWater';
import JourneyStory from './JourneyStory';
import JourneyProgress from './JourneyProgress';
import JourneyControls from './JourneyControls';
import TrialObstacles from './TrialObstacles';
import TrialHud from './TrialHud';
import './jetski.css';
import './trial.css';

const route = buildJourneyRoute(experience, MAX_SPEED);
const trialCourse = buildTrialCourse(route, experience);
const lifeStageLabels = {
  'high-school': 'High school',
  college: 'College',
  career: 'Professional career',
};

type Control = keyof RideInput;
type TrialPhase = 'ready' | 'running' | 'paused' | 'finished';

function Dock({ x, waterline, scale }: { x: number; waterline: number; scale: number }) {
  return (
    <g
      className="revision-outpost"
      transform={`translate(${x} ${waterline}) scale(${scale})`}
      shapeRendering="crispEdges"
    >
      <path d="M12-164h160V1H12z" fill="#f5f3ed" />
      <path d="M2-172h10v-10h160v10h10v15H2z" fill="#17251e" />
      <path
        d="M15-130h154v3H15zm0 19h154v3H15zm0 19h154v3H15zm0 19h154v3H15zm0 19h154v3H15zm0 19h154v3H15"
        fill="#d5dacf"
      />
      <path d="M26-111h105V0H26z" fill="#496356" />
      <path
        d="M30-104h97v5H30zm0 15h97v5H30zm0 15h97v5H30zm0 15h97v5H30zm0 15h97v5H30zm0 15h97v5H30zm0 15h97v5H30z"
        fill="#789082"
      />
      <path d="M141-107h22v35h-22z" fill="#17251e" />
      <path d="M144-104h16v12h-16zm0 16h16v13h-16z" fill="#b9e5ee" />
      <path d="M24-150h136v25H24z" fill="#dfff7f" />
      <text
        x="92"
        y="-134"
        textAnchor="middle"
        fill="#17251e"
        fontSize="11"
        fontWeight="800"
        fontFamily="monospace"
        letterSpacing="0.4"
      >
        REVISION MARINE
      </text>
      <path d="M-52-5h244v11H-52z" fill="#17251e" />
      <path d="M-45 6h10v45h-10zm67 0h10v57H22zm122 0h10v57h-10zm32 0h10v45h-10z" fill="#77847a" />
      <path d="M-51-24h5v19h-5zm32 0h5v19h-5zm-29 5h31v4h-31z" fill="#17251e" />
      <path d="M178-95h5V-5h-5z" fill="#17251e" />
      <path d="M183-95h24v19h-24z" fill="#f399bf" />
      <path d="M-34 64h47v3h-47zm123-11h64v3H89zm-38 26h29v3H51z" fill="#99d0d3" />
    </g>
  );
}

function FinishLine({ x, waterline, scale }: { x: number; waterline: number; scale: number }) {
  return (
    <g
      className="journey-finish-line"
      transform={`translate(${x} ${waterline}) scale(${scale})`}
      shapeRendering="crispEdges"
    >
      <path d="M-93-127h7V87h-7zm179 0h7V87h-7z" fill="#17251e" />
      <path d="M-99 78h19v8h-19zm179 0h19v8H80z" fill="#f399bf" />
      <g transform="translate(0 -62)">
        <path d="M-97-73H97v42H-97z" fill="#17251e" />
        <path d="M-93-69H93v34H-93z" fill="#f5f3ed" />
        <path
          d="M-93-69h10v10h-10zm10 10h10v10h-10zm-10 10h10v10h-10zm166-20h10v10H73zm10 10h10v10H83zm-10 10h10v10H73z"
          fill="#17251e"
        />
        <text
          x="0"
          y="-45"
          textAnchor="middle"
          fill="#17251e"
          fontSize="21"
          fontWeight="800"
          fontFamily="monospace"
          letterSpacing="3"
        >
          FINISH
        </text>
      </g>
      <path d="M-82 67h164" stroke="#f5f3ed" strokeWidth="3" strokeDasharray="9 7" />
    </g>
  );
}

function Scene({
  state,
  width,
  height,
  reduced,
  blimpStartedAt,
  racing,
  lastHit,
}: {
  state: RideState;
  width: number;
  height: number;
  reduced: boolean;
  blimpStartedAt: number | null;
  racing: boolean;
  lastHit: string | null;
}) {
  const waterline = height - 155;
  const progress = state.position / route.length;
  const dockScale = width < 560 ? 0.98 : width < 1000 ? 1.25 : 1.65;
  const boatX = width * 0.28;
  const revisionStop = route.stops[experience.findIndex((chapter) => chapter.id === 'revision')];
  const driveBy = revisionStop
    ? (state.position - revisionStop.start) / (revisionStop.end - revisionStop.start)
    : -1;
  // The store is a landmark along the route, not its destination. It passes
  // behind the rider while Revision's story plays and is gone before the finish.
  const dockX = width * 0.72 - driveBy * (width + 250 * dockScale);
  const finalStop = route.stops.at(-1);
  const finishApproach = finalStop
    ? Math.max(
        0,
        Math.min(1, (state.position - finalStop.start) / (route.length - finalStop.start)),
      )
    : 0;
  const finishX = width + 140 - finishApproach * (width + 140 - boatX);
  return (
    <svg
      className="journey-scene"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="journey-water"
          width="120"
          height="38"
          patternUnits="userSpaceOnUse"
          x={-(state.position * 0.35) % 120}
        >
          <path d="M12 6h24m30 21h31" fill="none" stroke="#98cbd0" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#dcece6" />
      <g
        fill="#dfff7f"
        shapeRendering="crispEdges"
        transform={`translate(${width - (width < 560 ? 73 : 123)} ${width < 560 ? 48 : 98})`}
      >
        <path d="M-26-50h52v8h16v16h8v52h-8v16H26v8h-52v-8h-16V26h-8v-52h8v-16h16z" />
      </g>
      <g fill="#f5f3ed" opacity="0.8" shapeRendering="crispEdges">
        <path d={`M${width - 266} 99h24V87h30v12h22v12h-76z`} />
        <path d={`M${width - 113} 173h26v-13h29v8h23v17h-78z`} />
      </g>
      <ClevelandSkyline
        width={width}
        waterline={waterline}
        progress={progress}
        blimpStartedAt={blimpStartedAt}
        reduced={reduced}
      />
      <path d={`M0 ${waterline - 3}h${width}v5H0z`} fill="#728f80" />
      <rect y={waterline + 2} width={width} height="160" fill="#b9e5ee" />
      <rect y={waterline + 5} width={width} height="160" fill="url(#journey-water)" />
      <path d={`M0 ${waterline + 9}h${width}`} stroke="#dbf3f0" strokeWidth="5" />
      <g
        fill="#17251e"
        opacity="0.75"
        transform={`translate(${width * 0.71 - progress * 80} ${waterline - 84})`}
      >
        <path d="m0 0 7-3 7 3-7-1zm28-17 7-3 7 3-7-1z" />
      </g>
      {revisionStop && <Dock x={dockX} waterline={waterline + 52} scale={dockScale} />}
      <FinishLine x={finishX} waterline={waterline + 24} scale={width < 560 ? 0.8 : 1.15} />
      {racing && (
        <TrialObstacles
          obstacles={trialCourse.obstacles}
          position={state.position}
          width={width}
          height={height}
          reduced={reduced}
          lastHit={lastHit}
        />
      )}
      <ellipse
        cx={boatX}
        cy={waterline + 111}
        rx={state.height > 0 ? 48 : 73}
        ry="5"
        fill="#75b2b7"
        opacity={state.height > 0 ? 0.3 : 0.55}
      />
      <JetskiSprite
        state={state}
        x={boatX}
        y={waterline + 86}
        reduced={reduced}
        scale={width < 560 ? 1.65 : 2.3}
        fullJumpHeight={racing}
      />
      <JetskiSplash
        state={state}
        x={boatX}
        y={waterline + 111}
        scale={width < 560 ? 1.65 : 2.3}
        reduced={reduced}
      />
    </svg>
  );
}

export default function JetskiJourney() {
  const achievements = useAchievements();
  const [mode, setMode] = useState<'story' | 'trial'>('story');
  const [trialPhase, setTrialPhase] = useState<TrialPhase>('ready');
  const [trial, setTrial] = useState(initialTrial);
  const trialSimulation = useRef(initialTrial());
  const [ride, setRide] = useState(initialRide);
  const [speed, setSpeed] = useState<number>(DEFAULT_RIDE_SPEED);
  const speedRef = useRef<number>(DEFAULT_RIDE_SPEED);
  const speedTaps = useRef(emptySpeedTaps());
  // Keep the event timestamp outside the scene: chapter navigation and the
  // readable overview must not replay it or stop its clock.
  const [blimpStartedAt, setBlimpStartedAt] = useState<number | null>(null);
  const [overview, setOverview] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [size, setSize] = useState({ width: 1100, height: 680 });
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const journey = useRef<HTMLDivElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const simulation = useRef(initialRide());
  const input = useRef(idleInput());
  const instructionsId = useId();
  const journeyFrame = getJourneyFrame(route, ride.position);
  const chapterIndex = journeyFrame.index;
  const atDestination = ride.position >= route.length - 1;

  useEffect(() => {
    if (mode === 'story' && atDestination) markStoryFinished();
  }, [mode, atDestination]);

  useEffect(() => {
    if (mode === 'trial' && trialPhase === 'finished') {
      recordTrialResult(
        trialScore(trialSimulation.current),
        qualifiesForTrialReward(trialSimulation.current, trialCourse),
      );
    }
  }, [mode, trialPhase]);

  useEffect(() => {
    if (!visible && mode === 'trial' && trialPhase === 'running') setTrialPhase('paused');
  }, [visible, mode, trialPhase]);

  useEffect(() => {
    if (blimpStartedAt === null && ride.position / route.length >= 0.84) {
      setBlimpStartedAt(performance.now());
    }
  }, [ride.position, blimpStartedAt]);

  useEffect(() => {
    setFullscreenAvailable(Boolean(document.fullscreenEnabled));
    function changed() {
      const active = document.fullscreenElement === journey.current;
      setFullscreen(active);
      input.current = idleInput();
      speedTaps.current = emptySpeedTaps();
      if (active) stage.current?.focus({ preventScroll: true });
      else fullscreenButton.current?.focus({ preventScroll: true });
    }
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element) {
      setVisible(false);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width && height) setSize({ width, height });
    });
    const visibility = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting));
    observer.observe(element);
    visibility.observe(element);
    return () => {
      observer.disconnect();
      visibility.disconnect();
    };
  }, [overview]);

  useEffect(() => {
    if (!visible || overview || (mode === 'trial' && trialPhase !== 'running')) return;
    let frame: number;
    let previous = 0;
    let lastPaint = 0;
    function animate(now: number) {
      const dt = previous ? (now - previous) / 1000 : 0;
      previous = now;
      if (mode === 'trial') {
        // Use the same fixed physics steps at every refresh rate. Hidden or
        // unfocused races pause explicitly rather than running off-screen.
        let remaining = dt;
        while (remaining > 0 && !trialSimulation.current.finished) {
          const step = Math.min(remaining, 1 / 60);
          const before = simulation.current;
          simulation.current = advanceRide(
            before,
            { ...input.current, right: true, left: false },
            step,
            route.length,
            TRIAL_SPEED,
          );
          trialSimulation.current = advanceTrial(
            trialSimulation.current,
            before,
            simulation.current,
            step,
            trialCourse,
            route.length,
          );
          input.current.jump = false;
          remaining -= step;
        }
      } else {
        simulation.current = advanceRide(
          simulation.current,
          input.current,
          dt,
          route.length,
          speedRef.current,
        );
      }
      input.current.jump = false;
      if (now - lastPaint > 1000 / 30) {
        const next = simulation.current;
        setRide((current) =>
          Object.keys(next).some(
            (key) => next[key as keyof RideState] !== current[key as keyof RideState],
          )
            ? next
            : current,
        );
        lastPaint = now;
        if (mode === 'trial') setTrial(trialSimulation.current);
      }
      if (mode === 'trial' && trialSimulation.current.finished) {
        input.current = idleInput();
        setRide(simulation.current);
        setTrial(trialSimulation.current);
        setTrialPhase('finished');
        return;
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    function stop() {
      input.current = idleInput();
      speedTaps.current = emptySpeedTaps();
      if (mode === 'trial') setTrialPhase('paused');
    }
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      cancelAnimationFrame(frame);
      input.current = idleInput();
      speedTaps.current = emptySpeedTaps();
      simulation.current = { ...simulation.current, velocity: 0 };
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [visible, overview, mode, trialPhase]);

  function setInput(key: Control, active: boolean, cancelled = false) {
    if (mode === 'trial') {
      if (trialPhase !== 'running' || key === 'left' || key === 'right') return;
      if (key === 'jump' && !active) return;
      input.current[key] = active;
      return;
    }
    if (cancelled) speedTaps.current = emptySpeedTaps();
    // Queue a jump until the next simulation frame, even for a very quick tap.
    if (key === 'jump' && !active) return;
    if (input.current[key] === active) return;
    const gesture = trackSpeedTap(speedTaps.current, key, active, performance.now(), cancelled);
    speedTaps.current = gesture.state;
    if (gesture.change) {
      const next = changeRideSpeed(speedRef.current, gesture.change);
      speedRef.current = next;
      setSpeed(next);
    }
    input.current[key] = active;
  }

  async function toggleFullscreen() {
    setFullscreenError('');
    try {
      if (document.fullscreenElement === journey.current) await document.exitFullscreen();
      else await journey.current?.requestFullscreen();
    } catch {
      setFullscreenError('Full screen is unavailable in this browser. You can keep riding here.');
    }
  }

  function resetRide(position: number) {
    input.current = idleInput();
    speedTaps.current = emptySpeedTaps();
    const next = initialRide(position);
    simulation.current = next;
    setRide(next);
  }

  function navigate(index: number) {
    if (mode === 'trial') return;
    resetRide(index === experience.length - 1 ? route.length : route.stops[index].start);
  }

  function startOver() {
    setMode('story');
    setBlimpStartedAt(null);
    speedRef.current = DEFAULT_RIDE_SPEED;
    setSpeed(DEFAULT_RIDE_SPEED);
    resetRide(0);
    stage.current?.focus({ preventScroll: true });
  }

  function prepareTrial() {
    if (!achievements.storyFinished && !atDestination) return;
    setOverview(false);
    setMode('trial');
    setTrialPhase('ready');
    setBlimpStartedAt(null);
    const fresh = initialTrial();
    trialSimulation.current = fresh;
    setTrial(fresh);
    speedRef.current = TRIAL_SPEED;
    setSpeed(TRIAL_SPEED);
    resetRide(0);
    stage.current?.focus({ preventScroll: true });
  }

  function resumeTrial() {
    input.current = idleInput();
    setTrialPhase('running');
    stage.current?.focus({ preventScroll: true });
  }

  function exitTrial() {
    setMode('story');
    setTrialPhase('ready');
    speedRef.current = DEFAULT_RIDE_SPEED;
    setSpeed(DEFAULT_RIDE_SPEED);
    resetRide(route.length);
    if (document.fullscreenElement === journey.current) void document.exitFullscreen();
    stage.current?.focus({ preventScroll: true });
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>, active: boolean) {
    const keys: Record<string, Control> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowUp: 'jump',
    };
    const control = keys[event.key];
    if (
      control &&
      (event.target === event.currentTarget ||
        (event.target instanceof Element && event.target.closest('.journey-ride-button')) ||
        (!active && input.current[control]))
    ) {
      event.preventDefault();
      if (!event.repeat) setInput(control, active);
    }
  }

  return (
    <div
      className="journey"
      ref={journey}
      data-speed={speed}
      data-mode={mode}
      data-trial-phase={mode === 'trial' ? trialPhase : undefined}
    >
      <div className="journey-topline">
        <span className="journey-mini-label">
          <span className="journey-status-dot" /> LAKE ERIE / A FEW STOPS ALONG THE WAY
        </span>
        <div className="journey-view-actions">
          {mode === 'story' && achievements.storyFinished && !atDestination && !overview && (
            <button className="journey-view-toggle" type="button" onClick={prepareTrial}>
              Time trial ↗
            </button>
          )}
          {fullscreenAvailable && (
            <button
              className="journey-view-toggle"
              type="button"
              ref={fullscreenButton}
              onClick={() => void toggleFullscreen()}
              aria-pressed={fullscreen}
            >
              {fullscreen ? 'Exit full screen ↙' : 'Full screen ↗'}
            </button>
          )}
          {mode === 'story' && (
            <button
              className="journey-view-toggle"
              type="button"
              aria-pressed={overview}
              onClick={() => {
                input.current = idleInput();
                speedTaps.current = emptySpeedTaps();
                simulation.current = { ...simulation.current, velocity: 0 };
                setOverview(!overview);
              }}
            >
              {overview ? '↳ Back to the ride' : 'Read as a timeline ↗'}
            </button>
          )}
        </div>
      </div>
      {fullscreenError && (
        <p className="journey-fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}

      {!overview ? (
        <>
          <JourneyProgress
            route={route}
            position={ride.position}
            chapters={experience}
            onNavigate={navigate}
            disabled={mode === 'trial'}
          />
          <div
            className={`journey-stage${mode === 'trial' ? ' journey-stage--trial' : ''}`}
            ref={stage}
            tabIndex={0}
            role="group"
            aria-label={
              mode === 'trial'
                ? 'Jetski time trial. Use down to pump and up to jump over obstacles.'
                : 'Playable jetski experience. Use left and right arrows to ride between chapters.'
            }
            aria-describedby={
              mode === 'story' || trialPhase === 'running' ? instructionsId : undefined
            }
            onKeyDown={(event) => handleKeys(event, true)}
            onKeyUp={(event) => handleKeys(event, false)}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (
                !(nextTarget instanceof Element) ||
                !event.currentTarget.contains(nextTarget) ||
                (nextTarget !== event.currentTarget && !nextTarget.closest('.journey-ride-button'))
              ) {
                input.current = idleInput();
                speedTaps.current = emptySpeedTaps();
                if (mode === 'trial' && trialPhase === 'running') setTrialPhase('paused');
              }
            }}
            onPointerDown={(event) => {
              if (!(event.target instanceof Element) || !event.target.closest('a, button'))
                event.currentTarget.focus({ preventScroll: true });
            }}
          >
            <Scene
              state={ride}
              width={size.width}
              height={size.height}
              reduced={reduced}
              blimpStartedAt={blimpStartedAt}
              racing={mode === 'trial'}
              lastHit={trial.lastHitAge < 0.7 ? trial.lastHit : null}
            />
            {mode === 'story' ? (
              <JourneyStory
                frame={journeyFrame}
                visible={visible}
                reduced={reduced}
                speed={speed}
                onFollowLink={() => {
                  if (document.fullscreenElement === journey.current)
                    void document.exitFullscreen();
                }}
              />
            ) : (
              <TrialHud
                phase={trialPhase}
                elapsed={trial.elapsed}
                penalty={trial.penalty}
                hits={trial.hits}
                cleared={trial.cleared}
                total={trialCourse.obstacles.length}
                target={trialCourse.targetSeconds}
                best={achievements.bestTrialSeconds}
                qualified={qualifiesForTrialReward(trial, trialCourse)}
                chapter={experience[chapterIndex]}
                onStart={resumeTrial}
                onPause={() => setTrialPhase('paused')}
                onResume={resumeTrial}
                onRetry={prepareTrial}
                onExit={exitTrial}
              />
            )}
            <div className="journey-stage-caption" aria-hidden="true">
              <span>
                {!journeyFrame.stop
                  ? 'OPEN WATER / THE NEXT CHAPTER IS AHEAD'
                  : chapterIndex === experience.length - 1
                    ? 'FINISH / LOOKING AHEAD'
                    : experience[chapterIndex]?.id === 'revision'
                      ? 'PASSING BY / REVISION MARINE'
                      : 'A LITTLE CURIOSITY GOES A LONG WAY'}
              </span>
              <span>
                {String(chapterIndex + 1).padStart(2, '0')} /{' '}
                {String(experience.length).padStart(2, '0')}
              </span>
            </div>
            {ride.charge > 0 && (
              <span className="journey-jump-cue" aria-hidden="true">
                ↑ to jump <span style={{ width: `${ride.charge * 100}%` }} />
              </span>
            )}
            {(mode === 'story' || trialPhase === 'running') && (
              <JourneyControls
                setInput={setInput}
                speed={speed}
                atDestination={mode === 'story' && atDestination}
                instructionsId={instructionsId}
                onRestart={startOver}
                trial={mode === 'trial'}
                onTimeTrial={mode === 'story' && atDestination ? prepareTrial : undefined}
              />
            )}
          </div>
        </>
      ) : (
        <ol className="journey-overview">
          {experience.map((item, index) => (
            <li key={item.id}>
              <span className="journey-overview-number">{String(index + 1).padStart(2, '0')}</span>
              <article>
                <p className="journey-place">
                  <span>{lifeStageLabels[item.lifeStage]}</span>
                  <span>{item.date}</span>
                  <span>{item.place}</span>
                </p>
                <h3>{item.title}</h3>
                <p>{item.story}</p>
                <ul className="journey-skills" aria-label="Skills">
                  {item.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
                {item.link && (
                  <a
                    className="journey-story-link"
                    href={item.link.href}
                    target={item.link.href.startsWith('https://') ? '_blank' : undefined}
                    rel={item.link.href.startsWith('https://') ? 'noreferrer' : undefined}
                  >
                    {item.link.label} ↗
                  </a>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
