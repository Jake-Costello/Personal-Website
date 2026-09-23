import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { experience } from '../data/experience';
import { advanceRide, idleInput, initialRide, MAX_SPEED } from '../game/model';
import type { RideInput, RideState } from '../game/model';
import { buildJourneyRoute, getJourneyFrame } from '../game/route';
import ClevelandSkyline from './ClevelandSkyline';
import JetskiSprite from './JetskiSprite';
import { JetskiSplash } from './JetskiWater';
import JourneyStory from './JourneyStory';
import JourneyProgress from './JourneyProgress';
import './jetski.css';

const route = buildJourneyRoute(experience, MAX_SPEED);

type Control = keyof RideInput;

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

function Scene({
  state,
  width,
  height,
  reduced,
  blimpStartedAt,
}: {
  state: RideState;
  width: number;
  height: number;
  reduced: boolean;
  blimpStartedAt: number | null;
}) {
  const waterline = height - 155;
  const progress = state.position / route.length;
  const dockScale = width < 560 ? 0.98 : width < 1000 ? 1.25 : 1.65;
  const dockX = width - 204 * dockScale - (width < 560 ? 10 : 24);
  const startX = width * 0.28;
  const dockedX = Math.max(startX, dockX - 100 * dockScale);
  const boatXAt = (position: number) => {
    const docking = Math.max(0, (position / route.length - 0.7) / 0.3);
    return width < 560 ? width * 0.26 : startX + docking * (dockedX - startX);
  };
  const boatX = boatXAt(state.position);
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
      <Dock x={dockX + (1 - progress) * 1500} waterline={waterline + 52} scale={dockScale} />
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
      />
      <JetskiSplash
        state={state}
        x={boatXAt(state.splash?.position ?? state.position)}
        y={waterline + 111}
        scale={width < 560 ? 1.65 : 2.3}
        reduced={reduced}
      />
      <g
        transform={`translate(${width - 27} ${waterline + 117})`}
        stroke="#17251e"
        strokeWidth="2"
        fill="none"
      >
        <circle r="13" />
        <path d="M-5 0h10M1-4l4 4-4 4" />
      </g>
    </svg>
  );
}

function RideButton({
  control,
  symbol,
  label,
  setInput,
}: {
  control: Control;
  symbol: string;
  label: string;
  setInput: (key: Control, active: boolean) => void;
}) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setInput(control, true);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      setInput(control, true);
    }
  }
  return (
    <button
      className="journey-ride-button"
      type="button"
      aria-label={label}
      onPointerDown={pointerDown}
      onPointerUp={() => setInput(control, false)}
      onPointerCancel={() => setInput(control, false)}
      onLostPointerCapture={() => setInput(control, false)}
      onKeyDown={keyDown}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setInput(control, false);
        }
      }}
      onBlur={() => setInput(control, false)}
      onClick={(event) => {
        // Screen readers can dispatch a click without pointer or keyboard events.
        if (event.detail === 0) {
          setInput(control, true);
          if (timeout.current) clearTimeout(timeout.current);
          timeout.current = setTimeout(
            () => setInput(control, false),
            control === 'jump' ? 100 : 300,
          );
        }
      }}
    >
      <span aria-hidden="true">{symbol}</span>
      <span>{label}</span>
    </button>
  );
}

export default function JetskiJourney() {
  const [ride, setRide] = useState(initialRide);
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
    if (!visible || overview) return;
    let frame: number;
    let previous = 0;
    let lastPaint = 0;
    function animate(now: number) {
      const dt = previous ? (now - previous) / 1000 : 0;
      previous = now;
      simulation.current = advanceRide(simulation.current, input.current, dt, route.length);
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
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    function stop() {
      input.current = idleInput();
    }
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      cancelAnimationFrame(frame);
      input.current = idleInput();
      simulation.current = { ...simulation.current, velocity: 0 };
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [visible, overview]);

  function setInput(key: Control, active: boolean) {
    // Queue a jump until the next simulation frame, even for a very quick tap.
    if (key === 'jump' && !active) return;
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
    const next = initialRide(position);
    simulation.current = next;
    setRide(next);
  }

  function navigate(index: number) {
    resetRide(index === experience.length - 1 ? route.length : route.stops[index].start);
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>, active: boolean) {
    const keys: Record<string, Control> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowUp: 'jump',
    };
    const control = keys[event.key];
    if (control && event.target === event.currentTarget) {
      event.preventDefault();
      if (control !== 'jump' || !event.repeat) setInput(control, active);
    }
  }

  return (
    <div className="journey" ref={journey}>
      <div className="journey-topline">
        <span className="journey-mini-label">
          <span className="journey-status-dot" /> LAKE ERIE / A FEW STOPS ALONG THE WAY
        </span>
        <div className="journey-view-actions">
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
          <button
            className="journey-view-toggle"
            type="button"
            aria-pressed={overview}
            onClick={() => {
              input.current = idleInput();
              simulation.current = { ...simulation.current, velocity: 0 };
              setOverview(!overview);
            }}
          >
            {overview ? '↳ Back to the ride' : 'Read as a timeline ↗'}
          </button>
        </div>
      </div>
      {fullscreenError && (
        <p className="journey-fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}

      {!overview ? (
        <>
          <div
            className="journey-chapters"
            aria-label="Experience chapters"
            style={{ gridTemplateColumns: `repeat(${experience.length}, minmax(58px, 1fr))` }}
          >
            {experience.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`journey-chapter${index === chapterIndex ? ' is-current' : ''}`}
                onClick={() => navigate(index)}
                aria-current={index === chapterIndex ? 'step' : undefined}
                aria-label={`${item.year}: ${item.place}`}
              >
                <span className="journey-chapter-number">{String(index + 1).padStart(2, '0')}</span>
                <span>{item.year}</span>
                <span className="journey-chapter-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <JourneyProgress route={route} position={ride.position} chapters={experience} />
          <div
            className="journey-stage"
            ref={stage}
            tabIndex={0}
            role="group"
            aria-label="Playable jetski experience. Use left and right arrows to ride between chapters."
            aria-describedby={instructionsId}
            onKeyDown={(event) => handleKeys(event, true)}
            onKeyUp={(event) => handleKeys(event, false)}
            onBlur={() => {
              input.current = idleInput();
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
            />
            <JourneyStory
              frame={journeyFrame}
              visible={visible}
              reduced={reduced}
              onFollowLink={() => {
                if (document.fullscreenElement === journey.current) void document.exitFullscreen();
              }}
            />
            <div className="journey-stage-caption" aria-hidden="true">
              <span>
                {!journeyFrame.stop
                  ? 'OPEN WATER / THE NEXT CHAPTER IS AHEAD'
                  : chapterIndex === experience.length - 1
                    ? 'DESTINATION: REVISION MARINE'
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
          </div>
          <div className="journey-controls">
            <p id={instructionsId}>
              <span className="journey-control-heading">A career path. With a little wake.</span>
              <span>
                Click the scene. <kbd>←</kbd> <kbd>→</kbd> to ride. <kbd>↓</kbd> then <kbd>↑</kbd>{' '}
                to jump.
              </span>
            </p>
            {atDestination && (
              <button
                className="journey-restart"
                type="button"
                onClick={() => {
                  setBlimpStartedAt(null);
                  resetRide(0);
                  stage.current?.focus({ preventScroll: true });
                }}
              >
                <span aria-hidden="true">↶</span> Back to start
              </button>
            )}
            <div className="journey-buttons" role="group" aria-label="Jetski controls">
              <RideButton control="left" symbol="←" label="Left" setInput={setInput} />
              <RideButton control="right" symbol="→" label="Right" setInput={setInput} />
              <span className="journey-button-divider" />
              <RideButton control="down" symbol="↓" label="Pump" setInput={setInput} />
              <RideButton control="jump" symbol="↑" label="Jump" setInput={setInput} />
            </div>
          </div>
        </>
      ) : (
        <ol className="journey-overview">
          {experience.map((item, index) => (
            <li key={item.id}>
              <span className="journey-overview-number">{String(index + 1).padStart(2, '0')}</span>
              <article>
                <p className="journey-place">
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
