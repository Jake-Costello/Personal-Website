import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { experience } from '../data/experience';
import { advanceRide, chapterAt, idleInput, initialRide, WORLD_LENGTH } from '../game/model';
import type { RideInput, RideState } from '../game/model';
import './jetski.css';

type Control = keyof RideInput;

function Jetski({
  state,
  x,
  y,
  reduced,
  scale,
}: {
  state: RideState;
  x: number;
  y: number;
  reduced: boolean;
  scale: number;
}) {
  const turnScale = state.turn > 0 && !reduced ? 0.42 + Math.abs(state.turn / 0.3 - 0.5) * 1.16 : 1;
  const pitch = state.height > 0 ? Math.max(-12, Math.min(13, -state.lift / 35)) : state.charge * 8;
  return (
    <g transform={`translate(${x} ${y - (reduced ? state.height * 0.35 : state.height)})`}>
      <g
        transform={`scale(${state.facing * turnScale * scale} ${scale}) rotate(${reduced ? 0 : pitch})`}
        shapeRendering="crispEdges"
      >
        {Math.abs(state.velocity) > 25 && (
          <g fill="#f5f3ed">
            <path d="M-39 8h-8v-4h-6V0h-5v-4h-4v8h6v6h10v4h11z" />
            <path d="M-64 2h-5v5h5zm-9-8h4v4h-4zm16-7h4v4h-4z" />
          </g>
        )}
        <path fill="#17251e" d="M-23-5h12v-8H3v-6h18v5h9v5h12v6h10v9h-6v7H-29V8h-9V1h15z" />
        <path fill="#f399bf" d="M-30 2h34v-9h21v5h17v5h7v4h-7v4h-65V7h-7z" />
        <path fill="#f8c6d8" d="M4-7h21v5h13v4H-9v-4H4z" />
        <path fill="#dfff7f" d="M-26 7h64v4h-59z" />
        <path fill="#17251e" d="M-10-27H1v8h-5v10h-10v8h-9v-5h5v-10h8z" />
        <path fill="#f0aa74" d="M-5-42h14v14H-5zM6-28h6v5h9v-4h5v10H9v-5H6z" />
        <path fill="#17251e" d="M-6-44H7v4h5v7H4v-4H-6zM4-34h10v4H4z" />
        <path fill="#dfff7f" d="M-8-29H5v5H9v11H-10v-9z" />
        <path fill="#17251e" d="M-6-28h4v14h-4zM22-24h9v4h-9z" />
        <path fill="#f5f3ed" d="M-17-8h7v4h-7z" />
      </g>
    </g>
  );
}

function Dock({ x, waterline, scale }: { x: number; waterline: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${waterline}) scale(${scale})`} shapeRendering="crispEdges">
      <path d="M18-93h142v94H18z" fill="#f5f3ed" />
      <path d="M7-101h11v-10h141v10h12v15H7z" fill="#17251e" />
      <path d="M36-57h105V0H36z" fill="#496356" />
      <path d="M39-53h99v5H39zm0 12h99v5H39zm0 12h99v5H39z" fill="#789082" />
      <path d="M31-82h117v19H31z" fill="#dfff7f" />
      <text
        x="89"
        y="-69"
        textAnchor="middle"
        fill="#17251e"
        fontSize={scale < 1 ? 12 : 9}
        fontWeight="800"
        fontFamily="monospace"
        letterSpacing={scale < 1 ? 0.3 : 1}
      >
        REVISION MARINE
      </text>
      <path d="M-52-5h244v11H-52z" fill="#17251e" />
      <path d="M-45 6h10v45h-10zm67 0h10v57H22zm122 0h10v57h-10zm32 0h10v45h-10z" fill="#77847a" />
      <path d="M-51-24h5v19h-5zm32 0h5v19h-5zm-29 5h31v4h-31z" fill="#17251e" />
      <path d="M182-64h5V-5h-5z" fill="#17251e" />
      <path d="M187-64h30v19h-30z" fill="#f399bf" />
      <path d="M-34 64h47v3h-47zm123-11h64v3H89zm-38 26h29v3H51z" fill="#99d0d3" />
    </g>
  );
}

function Scene({
  state,
  width,
  height,
  reduced,
}: {
  state: RideState;
  width: number;
  height: number;
  reduced: boolean;
}) {
  const waterline = height - 108;
  const progress = state.position / WORLD_LENGTH;
  const offset = (state.position * 0.11) % 370;
  const docking = Math.max(0, (progress - 0.7) / 0.3);
  const boatX = width < 560 ? width * 0.26 : width * 0.28 + docking * (width * 0.42 - 175);
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
      <g
        transform={`translate(${-offset} ${waterline})`}
        fill="#b3c9bd"
        shapeRendering="crispEdges"
      >
        {Array.from({ length: Math.ceil(width / 370) + 2 }, (_, i) => (
          <path
            key={i}
            transform={`translate(${i * 370} 0)`}
            d="M0 0v-21h29v-17h27v-14h37v-19h34v-17h29v12h35v26h31v-15h37v22h35v13h25v12h51V0z"
          />
        ))}
      </g>
      <g
        fill="#8eac9c"
        shapeRendering="crispEdges"
        transform={`translate(${width - 230 - progress * 120} ${waterline})`}
      >
        <path d="M0 0v-44h32v-19h15v19h16V0zm77 0v-31h22v-17h12v17h34V0zm81 0v-52h5v-18h8v18h6V0z" />
        <path d="M152-40h33v5h-33z" />
      </g>
      <path d={`M0 ${waterline - 3}h${width}v5H0z`} fill="#728f80" />
      <rect y={waterline + 2} width={width} height="110" fill="#b9e5ee" />
      <rect y={waterline + 5} width={width} height="110" fill="url(#journey-water)" />
      <path d={`M0 ${waterline + 9}h${width}`} stroke="#dbf3f0" strokeWidth="5" />
      <g
        fill="#17251e"
        opacity="0.75"
        transform={`translate(${width * 0.71 - progress * 80} ${waterline - 84})`}
      >
        <path d="m0 0 7-3 7 3-7-1zm28-17 7-3 7 3-7-1z" />
      </g>
      <Dock
        x={width * (width < 560 ? 0.62 : 0.7) + (1 - progress) * 1500}
        waterline={waterline + 29}
        scale={width < 560 ? 0.64 : 1}
      />
      <ellipse
        cx={boatX}
        cy={waterline + 60}
        rx={state.height > 0 ? 48 : 73}
        ry="5"
        fill="#75b2b7"
        opacity={state.height > 0 ? 0.3 : 0.55}
      />
      <Jetski
        state={state}
        x={boatX}
        y={waterline + 39}
        reduced={reduced}
        scale={width < 560 ? 1.7 : 2.35}
      />
      <g
        transform={`translate(${width - 27} ${waterline + 70})`}
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
  const [overview, setOverview] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [size, setSize] = useState({ width: 1100, height: 455 });
  const stage = useRef<HTMLDivElement>(null);
  const simulation = useRef(initialRide());
  const input = useRef(idleInput());
  const instructionsId = useId();
  const chapterIndex = chapterAt(ride.position, experience.length);
  const chapter = experience[chapterIndex];

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
      simulation.current = advanceRide(simulation.current, input.current, dt);
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
    input.current[key] = active;
  }

  function navigate(index: number) {
    input.current = idleInput();
    const next = initialRide((index / (experience.length - 1)) * WORLD_LENGTH);
    simulation.current = next;
    setRide(next);
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
    <div className="journey">
      <div className="journey-topline">
        <span className="journey-mini-label">
          <span className="journey-status-dot" /> A FEW STOPS ALONG THE WAY
        </span>
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
            <Scene state={ride} width={size.width} height={size.height} reduced={reduced} />
            <article className="journey-story" aria-live="polite" aria-atomic="true">
              <p className="journey-place">
                <span>{chapter.date}</span>
                <span>{chapter.place}</span>
              </p>
              <h3>{chapter.title}</h3>
              <p className="journey-story-body">{chapter.story}</p>
              <div className="journey-story-bottom">
                <ul className="journey-skills" aria-label="Skills">
                  {chapter.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
                {chapter.link && (
                  <a className="journey-story-link" href={chapter.link.href}>
                    {chapter.link.label} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </article>
            <div className="journey-stage-caption" aria-hidden="true">
              <span>
                {chapterIndex === experience.length - 1
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
                  <a className="journey-story-link" href={item.link.href}>
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
