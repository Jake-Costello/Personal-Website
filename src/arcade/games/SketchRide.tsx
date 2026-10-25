import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ArcadeInput } from '../input';
import {
  advanceSketchRide,
  beginRide,
  buildTrail,
  defaultTrail,
  TRAIL_FINISH,
  TRAIL_START,
  trailHeight,
} from './sketchRideModel';
import type { SketchRideState, Trail } from './sketchRideModel';
import './sketch-ride.css';

type Phase = 'drawing' | 'riding' | 'crashed' | 'finished';
const WIDTH = 960;
const HEIGHT = 600;

function line(ctx: CanvasRenderingContext2D, points: number[][], color: string, width: number) {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawRider(
  ctx: CanvasRenderingContext2D,
  ride: SketchRideState,
  clock: number,
  crashed: boolean,
) {
  ctx.save();
  ctx.translate(ride.x, ride.y);
  ctx.rotate(ride.angle + (crashed ? -0.7 : 0));
  const ink = '#173c37';
  const coral = '#e77750';
  for (const x of [-22, 22]) {
    ctx.beginPath();
    ctx.arc(x, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#e6efdb';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    const spin = ride.x / 12;
    line(
      ctx,
      [
        [x - Math.cos(spin) * 8, -Math.sin(spin) * 8],
        [x + Math.cos(spin) * 8, Math.sin(spin) * 8],
      ],
      '#9ab299',
      1.5,
    );
  }
  line(
    ctx,
    [
      [-22, 0],
      [-9, -20],
      [3, 0],
      [-22, 0],
      [13, -20],
      [22, 0],
    ],
    coral,
    4.5,
  );
  line(
    ctx,
    [
      [-9, -20],
      [13, -20],
      [17, -27],
      [25, -27],
    ],
    coral,
    4,
  );
  line(
    ctx,
    [
      [-15, -24],
      [-4, -24],
    ],
    ink,
    4,
  );
  const bob = ride.grounded ? Math.sin(clock * 8) * 1.5 : -3;
  const pedal = ride.grounded ? Math.sin(clock * 12) * 6 : 2;
  line(
    ctx,
    [
      [-5, -43 + bob],
      [-12, -27],
      [3, -17 + pedal],
      [3, -1],
    ],
    ink,
    6,
  );
  line(
    ctx,
    [
      [-6, -43 + bob],
      [8, -31],
      [19, -28],
    ],
    ink,
    5,
  );
  line(
    ctx,
    [
      [-7, -42 + bob],
      [-12, -30],
    ],
    coral,
    9,
  );
  ctx.beginPath();
  ctx.arc(-1, -51 + bob, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-2, -52 + bob, 9, Math.PI, Math.PI * 2);
  ctx.fillStyle = coral;
  ctx.fill();
  line(
    ctx,
    [
      [-11, -52 + bob],
      [9, -52 + bob],
    ],
    coral,
    3,
  );
  ctx.restore();
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  trail: Trail,
  ride: SketchRideState,
  phase: Phase,
  stroke: Trail,
  clock: number,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#e8eedf';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#acc2ae';
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  for (let x = 0; x <= WIDTH; x += 30) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = 0; y <= HEIGHT; y += 30) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(776, 170, 39, 0, Math.PI * 2);
  ctx.fillStyle = '#ecba78';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-40, 330);
  [
    [130, 139],
    [238, 272],
    [398, 130],
    [576, 326],
    [686, 224],
    [828, 345],
    [975, 238],
    [1000, 600],
    [-40, 600],
  ].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.fillStyle = '#cad9c6';
  ctx.fill();
  ctx.beginPath();
  [
    [99, 174],
    [130, 139],
    [166, 184],
    [135, 170],
    [123, 180],
  ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fillStyle = '#f6f5e6';
  ctx.fill();
  ctx.beginPath();
  [
    [355, 176],
    [398, 130],
    [445, 183],
    [407, 166],
    [386, 182],
  ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, 365);
  ctx.bezierCurveTo(170, 255, 217, 340, 335, 315);
  ctx.bezierCurveTo(530, 250, 643, 436, 980, 335);
  ctx.lineTo(980, 600);
  ctx.lineTo(-10, 600);
  ctx.fillStyle = '#b0c7ab';
  ctx.fill();

  ctx.beginPath();
  trail.forEach(({ x, y }, index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fillStyle = '#789e82';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.25;
  for (let y = 240; y < 590; y += 27) {
    for (let x = 12; x < WIDTH; x += 37) {
      const offset = (y % 2) * 14;
      line(
        ctx,
        [
          [x + offset, y],
          [x + 6 + offset, y + 3],
        ],
        '#335b45',
        1.4,
      );
    }
  }
  ctx.restore();
  const road = trail.map(({ x, y }) => [x, y]);
  line(ctx, road, '#20433b', 9);
  line(ctx, road, '#e2ed9e', 4);

  // Trackside pine silhouettes remain behind the route.
  for (const x of [314, 582, 789]) {
    const base = trailHeight(trail, x) + 65;
    line(
      ctx,
      [
        [x, base],
        [x, base - 38],
      ],
      '#3a6652',
      4,
    );
    ctx.beginPath();
    ctx.moveTo(x, base - 56);
    ctx.lineTo(x - 18, base - 18);
    ctx.lineTo(x + 18, base - 18);
    ctx.fillStyle = '#456f58';
    ctx.fill();
  }

  const startY = trailHeight(trail, TRAIL_START);
  line(
    ctx,
    [
      [TRAIL_START - 22, startY - 5],
      [TRAIL_START - 22, startY - 62],
    ],
    '#375c4e',
    3,
  );
  ctx.fillStyle = '#e9eecf';
  ctx.fillRect(TRAIL_START - 22, startY - 62, 29, 17);
  ctx.fillStyle = '#36584d';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('GO', TRAIL_START - 15, startY - 50);
  const finishY = trailHeight(trail, TRAIL_FINISH);
  line(
    ctx,
    [
      [TRAIL_FINISH, finishY - 5],
      [TRAIL_FINISH, finishY - 78],
    ],
    '#21463c',
    3,
  );
  for (let row = 0; row < 3; row += 1)
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? '#eaf0db' : '#21463c';
      ctx.fillRect(TRAIL_FINISH + col * 9, finishY - 78 + row * 9, 9, 9);
    }
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#24493d';
  ctx.fillText('FINISH', TRAIL_FINISH - 18, finishY + 30);

  if (stroke.length > 1) {
    line(
      ctx,
      stroke.map(({ x, y }) => [x, y]),
      '#fff6de',
      9,
    );
    line(
      ctx,
      stroke.map(({ x, y }) => [x, y]),
      '#e8744e',
      4,
    );
    const end = stroke[stroke.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#e8744e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  drawRider(ctx, ride, phase === 'riding' ? clock : 0, phase === 'crashed');
  if (phase === 'riding' && ride.grounded) {
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 4; i += 1) {
      const drift = (clock * 70 + i * 10) % 38;
      ctx.beginPath();
      ctx.arc(ride.x - 27 - drift, ride.y + 10 - drift * 0.12, 1.5 + drift * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = '#ebedc5';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (phase === 'finished') {
    for (let i = 0; i < 28; i += 1) {
      ctx.fillStyle = i % 2 ? '#e37d53' : '#e0ec9c';
      ctx.save();
      ctx.translate(520 + Math.sin(i * 14.6) * 270, 150 + ((i * 29) % 250));
      ctx.rotate(i);
      ctx.fillRect(0, 0, 4, 10);
      ctx.restore();
    }
  }
}

export default function SketchRide({ input, active }: { input: ArcadeInput; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Trail>(defaultTrail());
  const rideRef = useRef(beginRide(trailRef.current));
  const phaseRef = useRef<Phase>('drawing');
  const strokeRef = useRef<Trail>([]);
  const drawingRef = useRef(false);
  const jumpRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('drawing');
  const [message, setMessage] = useState('Draw a downhill trail, or ride this one.');
  const [stats, setStats] = useState({ progress: 0, time: 0, jumps: 0 });

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const startRide = useCallback(() => {
    strokeRef.current = [];
    drawingRef.current = false;
    jumpRef.current = false;
    rideRef.current = beginRide(trailRef.current);
    setStats({ progress: 0, time: 0, jumps: 0 });
    changePhase('riding');
    setMessage('Find your flow. Jump the dips; balance in the air.');
  }, [changePhase]);

  const editTrail = useCallback(() => {
    changePhase('drawing');
    rideRef.current = beginRide(trailRef.current);
    jumpRef.current = false;
    setMessage('Drag from left to right. Smooth slopes make a great ride.');
    setStats({ progress: 0, time: 0, jumps: 0 });
  }, [changePhase]);

  const resetTrail = useCallback(() => {
    trailRef.current = defaultTrail();
    strokeRef.current = [];
    drawingRef.current = false;
    editTrail();
    setMessage('Fresh trail. Draw your own line or take it for a spin.');
  }, [editTrail]);

  useEffect(() => {
    if (!active) return;
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const justPressed = (key: string) => input.pressed.has(key) && !previous.has(key);
      if (justPressed('reset')) {
        if (phaseRef.current === 'drawing') resetTrail();
        else startRide();
      } else if (justPressed('secondary')) editTrail();
      else if (justPressed('action') || justPressed('up')) {
        if (phaseRef.current === 'riding') jumpRef.current = true;
        else startRide();
      }
      previous = new Set(input.pressed);
    });
  }, [active, editTrail, input, resetTrail, startRide]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let last = 0;
    let hud = 0;
    const draw = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (active && phaseRef.current === 'riding' && dt > 0) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let step = 0; step < steps; step += 1) {
          rideRef.current = advanceSketchRide(
            rideRef.current,
            trailRef.current,
            {
              left: input.pressed.has('left') || input.pressed.has('down'),
              right: input.pressed.has('right'),
              jump: jumpRef.current,
            },
            dt / steps,
          );
          jumpRef.current = false;
        }
        const ride = rideRef.current;
        if (ride.status !== 'riding') {
          changePhase(ride.status);
          setMessage(
            ride.status === 'finished'
              ? 'Trail complete. That line is yours.'
              : 'Took a tumble. Try a smoother line or balance your landing.',
          );
        }
        if (now - hud > 90 || ride.status !== 'riding') {
          setStats({
            progress: Math.min(
              100,
              Math.round(((ride.x - TRAIL_START) / (TRAIL_FINISH - TRAIL_START)) * 100),
            ),
            time: ride.time,
            jumps: ride.jumps,
          });
          hud = now;
        }
      }
      renderScene(
        ctx,
        trailRef.current,
        rideRef.current,
        phaseRef.current,
        strokeRef.current,
        now / 1000,
      );
      if (active) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, changePhase, input]);

  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        TRAIL_START,
        Math.min(TRAIL_FINISH, ((event.clientX - bounds.left) / bounds.width) * WIDTH),
      ),
      y: Math.max(165, Math.min(490, ((event.clientY - bounds.top) / bounds.height) * HEIGHT)),
    };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!active || phaseRef.current !== 'drawing' || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    strokeRef.current = [pointerPosition(event)];
    drawingRef.current = true;
    setMessage('Keep drawing toward the finish flag.');
  };
  const continueDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = pointerPosition(event);
    const last = strokeRef.current[strokeRef.current.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) > 3) strokeRef.current.push(point);
  };
  const finishDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const trail = buildTrail(strokeRef.current);
    strokeRef.current = [];
    if (trail) {
      trailRef.current = trail;
      rideRef.current = beginRide(trail);
      setMessage('Your line is ready. Let’s ride.');
    } else setMessage('Make a longer stroke from left to right, then ride.');
  };

  return (
    <section
      className={`sr-game sr-game--${phase}`}
      data-game="sketch-ride"
      data-phase={phase}
      data-game-phase={phase}
      data-game-status={phase}
      data-progress={stats.progress}
      aria-label="Sketch to Ride game"
    >
      <canvas
        ref={canvasRef}
        className="sr-canvas"
        width={WIDTH}
        height={HEIGHT}
        aria-label="Draw a downhill trail by dragging across this canvas from left to right"
        onPointerDown={startDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
      />
      <div className="sr-topline">
        <div className="sr-title-group">
          <span className="sr-eyebrow">SKETCH TO RIDE · 01</span>
          <h2>
            {phase === 'drawing'
              ? 'Draw a downhill trail'
              : phase === 'finished'
                ? 'A very good line.'
                : phase === 'crashed'
                  ? 'Dust yourself off.'
                  : 'Just follow your line.'}
          </h2>
        </div>
        <div className="sr-readout">
          <span>{phase === 'drawing' ? 'TRAIL BUILDER' : 'TIME / SEC'}</span>
          <strong>{phase === 'drawing' ? '✎' : stats.time.toFixed(1).padStart(4, '0')}</strong>
        </div>
      </div>
      {(phase === 'finished' || phase === 'crashed') && (
        <div className="sr-result">
          <span>{phase === 'finished' ? 'FINISH LINE' : 'BACK ON THE BIKE'}</span>
          <strong>
            {phase === 'finished'
              ? `${stats.time.toFixed(1)} sec. Pure downhill.`
              : 'One more run?'}
          </strong>
          <p>
            {phase === 'finished'
              ? `${stats.jumps} ${stats.jumps === 1 ? 'jump' : 'jumps'} · your next line is waiting.`
              : 'Lean with ← →. Land with the trail.'}
          </p>
          <button type="button" onClick={startRide}>
            {phase === 'finished' ? 'Ride again' : 'Try again'} <span>↗</span>
          </button>
        </div>
      )}
      <div className="sr-bottom">
        <p className="sr-message" role="status" aria-live="polite">
          {message}
        </p>
        <div className="sr-toolbar">
          <div className="sr-actions">
            <button
              type="button"
              className={phase === 'drawing' ? 'sr-selected' : ''}
              onClick={editTrail}
              aria-pressed={phase === 'drawing'}
            >
              ✎ Draw
            </button>
            <button
              type="button"
              className="sr-ride-button"
              onClick={
                phase === 'riding'
                  ? () => {
                      jumpRef.current = true;
                    }
                  : startRide
              }
            >
              {phase === 'riding' ? '↑ Jump' : '↗ Ride'}
            </button>
            <button type="button" onClick={resetTrail} aria-label="Reset to the starter trail">
              ↺ Reset
            </button>
          </div>
          <div className="sr-instructions">
            {phase === 'riding' ? (
              <>
                <kbd>←</kbd>
                <kbd>→</kbd>
                <span>balance</span>
                <kbd>SPACE</kbd>
                <span>jump</span>
              </>
            ) : (
              <>
                <span>DRAW. DROP. RIDE.</span>
                <i />
              </>
            )}
          </div>
        </div>
      </div>
      {phase === 'riding' && (
        <div
          className="sr-progress"
          role="progressbar"
          aria-label="Trail progress"
          aria-valuenow={stats.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${stats.progress}%` }} />
        </div>
      )}
    </section>
  );
}
