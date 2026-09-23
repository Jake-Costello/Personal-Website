import { SPLASH_SECONDS } from '../game/model';
import type { RideState } from '../game/model';

// Three hand-drawn frames: a narrow jet at the nozzle, broken spray above it,
// and flatter foam where it returns to the lake.
const wakeFrames = [
  {
    jet: 'M-48 7h-12V3h-13v-5h-12v-5h-10v-4h-7v5h6v5h10v5h12v5h15v3h11z',
    foam: 'M-63 16h-22v3h22zm-30 2h-21v3h21zm-32 3h-12v2h12z',
    drops: 'M-94-16h4v4h-4zm-15 5h5v4h-5zm-8 13h4v4h-4zm-20 10h4v3h-4z',
  },
  {
    jet: 'M-48 7h-12V2h-12v-5h-10v-6h-11v-5h-7v5h5v5h10v6h12v5h13v5h12z',
    foam: 'M-61 15h-18v3h18zm-28 3h-27v3h27zm-38 1h-15v3h15z',
    drops: 'M-99-21h4v4h-4zm-15 10h4v5h-4zm-12 10h5v4h-5zm-19 12h4v3h-4z',
  },
  {
    jet: 'M-48 7h-13V4h-12V0h-13v-5h-13v-4h-8v5h7v4h12v5h12v4h15v3h13z',
    foam: 'M-65 17h-24v3h24zm-34 1h-17v3h17zm-27 3h-22v2h22z',
    drops: 'M-103-15h5v4h-5zm-17 8h4v4h-4zm-16 10h4v4h-4zm-19 10h5v3h-5z',
  },
];

export function JetskiWake({ state, reduced }: { state: RideState; reduced: boolean }) {
  if (Math.abs(state.velocity) <= 25 || state.height > 0) return null;
  const frame = reduced ? 0 : Math.floor(state.wakeTime * 8) % wakeFrames.length;
  const art = wakeFrames[frame];
  return (
    <g className="jetski-wake" data-frame={frame} fill="#f5f3ed">
      <path d={art.jet} opacity="0.92" />
      <path d={art.foam} opacity="0.8" />
      <path d={art.drops} opacity="0.9" />
      <path d="M-49 9h-14v3h14zm-26-4h-9v3h9z" fill="#dbf3f0" />
    </g>
  );
}

const droplets = [
  { x: -43, vx: -55, vy: -80, size: 4 },
  { x: -29, vx: -37, vy: -106, size: 3 },
  { x: -15, vx: -26, vy: -74, size: 4 },
  { x: 13, vx: 29, vy: -89, size: 3 },
  { x: 28, vx: 42, vy: -112, size: 4 },
  { x: 44, vx: 61, vy: -72, size: 3 },
  { x: -51, vx: -69, vy: -47, size: 3 },
  { x: 52, vx: 72, vy: -45, size: 4 },
];
const pixel = (value: number) => Math.round(value / 2) * 2;

export function JetskiSplash({
  state,
  x,
  y,
  scale,
  reduced,
}: {
  state: RideState;
  x: number;
  y: number;
  scale: number;
  reduced: boolean;
}) {
  const splash = state.splash;
  if (!splash) return null;
  const progress = splash.age / SPLASH_SECONDS;
  const strength = splash.kind === 'landing' ? 1 : 0.7;
  // x is the hull's screen position at the splash event. Scroll with the lake
  // even while the rider's screen position shifts toward the dock.
  const lakeX = x + (splash.position - state.position) * 0.35;
  const spread = reduced ? 1 : 0.75 + progress * 0.75;
  const rise = reduced ? 0.25 : Math.max(0.15, Math.sin((0.2 + progress * 0.8) * Math.PI));
  return (
    <g
      className="jetski-splash"
      data-splash={splash.kind}
      data-motion={reduced ? 'reduced' : 'animated'}
      transform={`translate(${lakeX} ${y}) scale(${scale * strength * splash.facing} ${scale * strength})`}
      opacity={reduced ? 0.75 : Math.min(1, (1 - progress) * 2)}
      fill="#f5f3ed"
      shapeRendering="crispEdges"
    >
      <g transform={`scale(${spread} ${rise})`}>
        <path d="M-9 1h-35v-5h-13v-8h-10v-10h-6v-10h5v7h9v8h11v6h13v5h16zM9 1h35v-5h13v-8h10v-10h6v-10h-5v7h-9v8H48v6H35v5H19z" />
        <path d="M-48 2h29v3h-29zm66 0h34v3H18zM-35-6h16v3h-16zm54 0h16v3H19z" fill="#dbf3f0" />
      </g>
      <path d={`M${-60 * spread} 4h${120 * spread}v3h${-120 * spread}z`} opacity="0.65" />
      {!reduced &&
        droplets.map(({ x: start, vx, vy, size }, index) => (
          <rect
            key={index}
            x={pixel(start + vx * splash.age)}
            y={Math.min(5, pixel(-5 + vy * splash.age + 140 * splash.age ** 2))}
            width={size}
            height={size}
          />
        ))}
    </g>
  );
}
