import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ArcadeInput } from '../input';
import {
  advanceSketchRide,
  beginRide,
  bikeGroundClearance,
  buildTrail,
  defaultTrail,
  riderPose,
  TRAIL_FINISH,
  TRAIL_START,
  trailHeight,
} from './sketchRideModel';
import type { SketchRideState, Trail, TrailObstacle } from './sketchRideModel';
import {
  advanceTrailEditor,
  completeLevel,
  initialLevelProgress,
  initialTrailEditor,
  nextLevel,
  SKETCH_LEVELS,
} from './sketchLevels';
import type { SketchLevel } from './sketchLevels';
import './sketch-ride.css';

type Phase = 'ready' | 'drawing' | 'riding' | 'crashed' | 'finished' | 'won';
type RideMode = 'custom' | 'levels';
type Camera = { x: number; y: number; zoom: number };
type CourseView = {
  finishX: number;
  obstacles: TrailObstacle[];
  ramps: number[];
  cautionZones: SketchLevel['cautionZones'];
};
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

function drawRider(ctx: CanvasRenderingContext2D, ride: SketchRideState) {
  ctx.save();
  ctx.translate(ride.x, ride.y);
  ctx.rotate(ride.angle);
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
  const pose = riderPose(ride);
  const point = ({ x, y }: { x: number; y: number }) => [x, y];
  line(ctx, [point(pose.hip), point(pose.knee), point(pose.foot)], ink, 6);
  line(ctx, [point(pose.shoulder), point(pose.elbow), point(pose.hand)], ink, 5);
  line(ctx, [point(pose.shoulder), point(pose.hip)], coral, 9);
  ctx.beginPath();
  ctx.arc(pose.head.x, pose.head.y, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pose.head.x, pose.head.y, 9, Math.PI, Math.PI * 2);
  ctx.fillStyle = coral;
  ctx.fill();
  line(
    ctx,
    [
      [pose.head.x - 9, pose.head.y],
      [pose.head.x + 9, pose.head.y],
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
  camera: Camera,
  course: CourseView,
  cursor: { x: number; y: number } | null,
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

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  const viewRight = camera.x + WIDTH / camera.zoom;
  const viewBottom = camera.y + HEIGHT / camera.zoom;
  const visibleTrail = trail.filter(
    (point) => point.x >= camera.x - 10 && point.x <= viewRight + 10,
  );
  ctx.beginPath();
  visibleTrail.forEach(({ x, y }, index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineTo(viewRight + 10, viewBottom + 100);
  ctx.lineTo(camera.x - 10, viewBottom + 100);
  ctx.closePath();
  ctx.fillStyle = '#789e82';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.25;
  for (let y = Math.floor(camera.y / 27) * 27; y < viewBottom + 20; y += 27) {
    for (let x = Math.floor(camera.x / 37) * 37; x < viewRight + 20; x += 37) {
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
  const road = visibleTrail.map(({ x, y }) => [x, y]);
  line(ctx, road, '#20433b', 9);
  line(ctx, road, '#e2ed9e', 4);

  // Trackside pine silhouettes remain behind the route.
  for (let x = Math.floor(camera.x / 270) * 270 + 220; x < viewRight + 100; x += 270) {
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
  const finishY = trailHeight(trail, course.finishX);
  line(
    ctx,
    [
      [course.finishX, finishY - 5],
      [course.finishX, finishY - 78],
    ],
    '#21463c',
    3,
  );
  for (let row = 0; row < 3; row += 1)
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? '#eaf0db' : '#21463c';
      ctx.fillRect(course.finishX + col * 9, finishY - 78 + row * 9, 9, 9);
    }
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#24493d';
  ctx.fillText('FINISH', course.finishX - 18, finishY + 30);

  for (const lip of course.ramps) {
    const x = lip - 95;
    if (x < camera.x - 80 || x > viewRight + 80) continue;
    const y = trailHeight(trail, x);
    line(
      ctx,
      [
        [x, y],
        [x, y - 40],
      ],
      '#315a48',
      2,
    );
    ctx.fillStyle = '#e7eaa7';
    ctx.fillRect(x - 21, y - 52, 44, 17);
    ctx.fillStyle = '#355343';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('JUMP ↗', x - 17, y - 40);
  }
  for (const zone of course.cautionZones) {
    if (zone.from < camera.x - 100 || zone.from > viewRight + 100) continue;
    const y = trailHeight(trail, zone.from);
    line(
      ctx,
      [
        [zone.from, y],
        [zone.from, y - 46],
      ],
      '#574738',
      2,
    );
    ctx.fillStyle = '#e9b878';
    ctx.fillRect(zone.from - 42, y - 76, 86, 32);
    ctx.fillStyle = '#573f2f';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('LOW BRANCH', zone.from - 33, y - 63);
    ctx.font = '8px monospace';
    ctx.fillText('BRAKE + LEAN →', zone.from - 36, y - 51);
  }
  for (const obstacle of course.obstacles) {
    if (obstacle.x < camera.x - 50 || obstacle.x > viewRight + 50) continue;
    if (obstacle.kind === 'branch') {
      line(
        ctx,
        [
          [obstacle.x + 54, trailHeight(trail, obstacle.x + 54)],
          [obstacle.x + 54, obstacle.y - 44],
          [obstacle.x + 24, obstacle.y - 44],
          [obstacle.x, obstacle.y],
        ],
        '#577852',
        7,
      );
      ctx.fillStyle = '#96734e';
    } else ctx.fillStyle = '#d38b62';
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a664d';
    ctx.lineWidth = 2;
    ctx.stroke();
    line(
      ctx,
      [
        [obstacle.x - obstacle.radius * 0.4, obstacle.y - obstacle.radius * 0.35],
        [obstacle.x + obstacle.radius * 0.25, obstacle.y - obstacle.radius * 0.55],
      ],
      '#e8c29c',
      2,
    );
  }

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
  if (cursor) {
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f3efd2';
    ctx.fill();
    ctx.strokeStyle = '#dc6e46';
    ctx.lineWidth = 3;
    ctx.stroke();
    line(
      ctx,
      [
        [cursor.x - 19, cursor.y],
        [cursor.x + 19, cursor.y],
      ],
      '#dc6e46',
      1.5,
    );
    line(
      ctx,
      [
        [cursor.x, cursor.y - 19],
        [cursor.x, cursor.y + 19],
      ],
      '#dc6e46',
      1.5,
    );
  }
  drawRider(ctx, ride);
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
  ctx.restore();
  if (phase === 'finished' || phase === 'won') {
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

function rideCamera(
  ride: SketchRideState,
  phase: Phase,
  mode: RideMode,
  finishX: number,
  trail: Trail,
): Camera {
  if (mode === 'custom' && phase === 'drawing') return { x: 0, y: 0, zoom: 1 };
  const zoom = 1.5;
  // Leave room for the rider to rise above the trail instead of moving the camera
  // upward by the exact same amount and making a real jump look glued in place.
  const jumpHeight = Math.min(110, Math.max(0, bikeGroundClearance(ride, trail)));
  return {
    x: Math.max(0, Math.min(finishX - WIDTH / zoom + 90, ride.x - 245 / zoom)),
    y: ride.y + jumpHeight - 340 / zoom,
    zoom,
  };
}

export default function SketchRide({ input, active }: { input: ArcadeInput; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const customRef = useRef(initialTrailEditor(defaultTrail()));
  const progressRef = useRef(initialLevelProgress());
  const courseRef = useRef<CourseView>(SKETCH_LEVELS[0]);
  const trailRef = useRef<Trail>(SKETCH_LEVELS[0].trail);
  const rideRef = useRef(beginRide(trailRef.current));
  const phaseRef = useRef<Phase>('ready');
  const modeRef = useRef<RideMode>('levels');
  const activeRef = useRef(active);
  const strokeRef = useRef<Trail>([]);
  const drawingRef = useRef(false);
  const jumpRef = useRef(false);
  const cameraRef = useRef(
    rideCamera(rideRef.current, 'ready', 'levels', courseRef.current.finishX, trailRef.current),
  );
  const [phase, setPhase] = useState<Phase>('ready');
  const [mode, setMode] = useState<RideMode>('levels');
  const [progress, setProgress] = useState(initialLevelProgress);
  const [message, setMessage] = useState(SKETCH_LEVELS[0].hint);
  const [stats, setStats] = useState({
    progress: 0,
    time: 0,
    jumps: 0,
    speed: 0,
    angle: 0,
    crashPart: '',
    crashReason: '',
    worldX: TRAIL_START,
    worldY: rideRef.current.y,
    cameraX: 0,
    cameraY: 0,
    cursorX: TRAIL_START,
    cursorY: customRef.current.cursor.y,
    revision: 0,
    grounded: true,
    clearance: 0,
  });
  activeRef.current = active;

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const syncHud = useCallback(() => {
    const ride = rideRef.current;
    const camera = rideCamera(
      ride,
      phaseRef.current,
      modeRef.current,
      courseRef.current.finishX,
      trailRef.current,
    );
    cameraRef.current = camera;
    setStats({
      progress: Math.min(
        100,
        Math.round(((ride.x - TRAIL_START) / (courseRef.current.finishX - TRAIL_START)) * 100),
      ),
      time: ride.time,
      jumps: ride.jumps,
      speed: phaseRef.current === 'riding' ? ride.vx : 0,
      angle: ride.angle,
      crashPart: ride.crashPart ?? '',
      crashReason: ride.crashReason ?? '',
      worldX: ride.x,
      worldY: ride.y,
      cameraX: camera.x,
      cameraY: camera.y,
      cursorX: customRef.current.cursor.x,
      cursorY: customRef.current.cursor.y,
      revision: customRef.current.revision,
      grounded: ride.grounded,
      clearance: bikeGroundClearance(ride, trailRef.current),
    });
  }, []);

  const startRide = useCallback(() => {
    if (!activeRef.current) return;
    strokeRef.current = [];
    drawingRef.current = false;
    jumpRef.current = false;
    if (modeRef.current === 'custom') trailRef.current = customRef.current.trail;
    rideRef.current = beginRide(trailRef.current);
    changePhase('riding');
    setMessage(
      modeRef.current === 'levels'
        ? SKETCH_LEVELS[progressRef.current.level].hint
        : 'Pedal to build speed. Brake to slow down. Tilt to stay balanced.',
    );
    syncHud();
  }, [changePhase, syncHud]);

  const prepareLevel = useCallback(() => {
    const level = SKETCH_LEVELS[progressRef.current.level];
    courseRef.current = level;
    trailRef.current = level.trail;
    rideRef.current = beginRide(level.trail);
    strokeRef.current = [];
    drawingRef.current = false;
    jumpRef.current = false;
    changePhase('ready');
    setMessage(level.hint);
    syncHud();
  }, [changePhase, syncHud]);

  const editTrail = useCallback(() => {
    if (!activeRef.current || modeRef.current !== 'custom') return;
    trailRef.current = customRef.current.trail;
    customRef.current = {
      ...customRef.current,
      cursor: { x: TRAIL_START, y: trailHeight(trailRef.current, TRAIL_START) },
    };
    rideRef.current = beginRide(trailRef.current);
    strokeRef.current = [];
    drawingRef.current = false;
    jumpRef.current = false;
    changePhase('drawing');
    setMessage('Joystick → draws; ↑ ↓ shape the line; ← revises. Pedal to ride.');
    syncHud();
  }, [changePhase, syncHud]);

  const selectMode = useCallback(
    (next: RideMode) => {
      if (!activeRef.current || modeRef.current === next) return;
      modeRef.current = next;
      setMode(next);
      if (next === 'custom') {
        courseRef.current = { finishX: TRAIL_FINISH, obstacles: [], ramps: [], cautionZones: [] };
        editTrail();
      } else {
        prepareLevel();
        if (progressRef.current.won) changePhase('won');
        else if (progressRef.current.completed > progressRef.current.level) changePhase('finished');
      }
      syncHud();
    },
    [changePhase, editTrail, prepareLevel, syncHud],
  );

  const resetCourse = useCallback(() => {
    if (!activeRef.current) return;
    if (modeRef.current === 'custom') {
      customRef.current = initialTrailEditor(defaultTrail());
      editTrail();
      setMessage('Fresh line. Use the joystick or drag a trail, then Pedal to ride.');
    } else prepareLevel();
  }, [editTrail, prepareLevel]);

  const advanceLevel = useCallback(() => {
    if (!activeRef.current || modeRef.current !== 'levels') return;
    const next = nextLevel(progressRef.current);
    if (next === progressRef.current) return;
    progressRef.current = next;
    setProgress(next);
    prepareLevel();
  }, [prepareLevel]);

  const restartCampaign = useCallback(() => {
    if (!activeRef.current) return;
    progressRef.current = initialLevelProgress();
    setProgress(progressRef.current);
    prepareLevel();
  }, [prepareLevel]);

  useEffect(() => {
    if (!active) return;
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const justPressed = (key: string) => input.pressed.has(key) && !previous.has(key);
      if (justPressed('mode-custom')) selectMode('custom');
      else if (justPressed('mode-levels')) selectMode('levels');
      else if (justPressed('reset')) {
        if (phaseRef.current === 'drawing' || phaseRef.current === 'ready') resetCourse();
        else if (phaseRef.current === 'won') restartCampaign();
        else startRide();
      } else if (
        justPressed('action') &&
        ['ready', 'drawing', 'crashed'].includes(phaseRef.current)
      )
        startRide();
      else if (justPressed('up') && phaseRef.current === 'riding') jumpRef.current = true;
      previous = new Set(input.pressed);
    });
  }, [active, input, resetCourse, restartCampaign, selectMode, startRide]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let last = 0;
    let hud = 0;
    const draw = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      let updateHud = false;
      if (
        active &&
        modeRef.current === 'custom' &&
        phaseRef.current === 'drawing' &&
        !drawingRef.current &&
        dt > 0
      ) {
        const before = customRef.current;
        customRef.current = advanceTrailEditor(
          before,
          {
            left: input.pressed.has('left'),
            right: input.pressed.has('right'),
            up: input.pressed.has('up'),
            down: input.pressed.has('down'),
          },
          dt,
        );
        if (before !== customRef.current) {
          trailRef.current = customRef.current.trail;
          rideRef.current = beginRide(trailRef.current);
          updateHud = true;
        }
      }
      if (active && phaseRef.current === 'riding' && dt > 0) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let step = 0; step < steps; step += 1) {
          rideRef.current = advanceSketchRide(
            rideRef.current,
            trailRef.current,
            {
              left: input.pressed.has('left'),
              right: input.pressed.has('right'),
              pedal: input.pressed.has('action'),
              brake: input.pressed.has('secondary'),
              jump: jumpRef.current,
            },
            dt / steps,
            courseRef.current.finishX,
            courseRef.current.obstacles,
          );
          jumpRef.current = false;
        }
        const ride = rideRef.current;
        if (ride.status === 'finished') {
          if (modeRef.current === 'levels') {
            progressRef.current = completeLevel(progressRef.current);
            setProgress(progressRef.current);
            changePhase(progressRef.current.won ? 'won' : 'finished');
            setMessage(
              progressRef.current.won
                ? 'You win! All ten downhill levels complete.'
                : 'Level complete. The next descent is ready.',
            );
          } else {
            changePhase('finished');
            setMessage('Trail complete. That line is yours.');
          }
        } else if (ride.status === 'crashed') {
          changePhase('crashed');
          setMessage(
            ride.crashReason === 'obstacle'
              ? 'You crashed. Carry speed over rocks; brake and lean forward for low branches.'
              : 'You crashed. Keep your rider clear of the trail and land on your wheels.',
          );
        }
        updateHud = true;
      }
      cameraRef.current = rideCamera(
        rideRef.current,
        phaseRef.current,
        modeRef.current,
        courseRef.current.finishX,
        trailRef.current,
      );
      if (updateHud && (now - hud > 90 || rideRef.current.status !== 'riding')) {
        syncHud();
        hud = now;
      }
      renderScene(
        ctx,
        trailRef.current,
        rideRef.current,
        phaseRef.current,
        strokeRef.current,
        now / 1000,
        cameraRef.current,
        courseRef.current,
        modeRef.current === 'custom' && phaseRef.current === 'drawing'
          ? customRef.current.cursor
          : null,
      );
      if (active) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, changePhase, input, syncHud]);

  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    return {
      x: Math.max(
        TRAIL_START,
        Math.min(TRAIL_FINISH, (event.nativeEvent.offsetX / canvas.clientWidth) * WIDTH),
      ),
      y: Math.max(165, Math.min(490, (event.nativeEvent.offsetY / canvas.clientHeight) * HEIGHT)),
    };
  };
  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      !active ||
      modeRef.current !== 'custom' ||
      phaseRef.current !== 'drawing' ||
      event.button !== 0
    )
      return;
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
    const end = strokeRef.current[strokeRef.current.length - 1];
    strokeRef.current = [];
    if (trail) {
      customRef.current = { cursor: end, trail, revision: customRef.current.revision + 1 };
      trailRef.current = trail;
      rideRef.current = beginRide(trail);
      setMessage('Your line is ready. Pedal to ride, or use the joystick to edit.');
      syncHud();
    } else setMessage('Make a longer stroke from left to right, then ride.');
  };

  const level = SKETCH_LEVELS[progress.level];
  const result = phase === 'crashed' || phase === 'finished' || phase === 'won';
  return (
    <section
      className={'sr-game sr-game--' + phase}
      data-game="sketch-ride"
      data-mode={mode}
      data-phase={phase}
      data-game-phase={phase}
      data-game-status={phase}
      data-level={progress.level + 1}
      data-completed={progress.completed}
      data-course-length={courseRef.current.finishX}
      data-progress={stats.progress}
      data-speed={stats.speed.toFixed(1)}
      data-grounded={stats.grounded}
      data-clearance={stats.clearance.toFixed(1)}
      data-jumps={stats.jumps}
      data-angle={stats.angle.toFixed(3)}
      data-crash-part={stats.crashPart}
      data-crash-reason={stats.crashReason}
      data-world-x={stats.worldX.toFixed(1)}
      data-world-y={stats.worldY.toFixed(1)}
      data-camera-x={stats.cameraX.toFixed(1)}
      data-camera-y={stats.cameraY.toFixed(1)}
      data-cursor-x={stats.cursorX.toFixed(1)}
      data-cursor-y={stats.cursorY.toFixed(1)}
      data-trail-revision={stats.revision}
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
          <span className="sr-eyebrow">
            {mode === 'levels'
              ? 'LEVEL ' + String(progress.level + 1).padStart(2, '0') + ' / 10'
              : 'CUSTOM TRAIL'}
          </span>
          <h2>
            {phase === 'won'
              ? 'Every line. Every level.'
              : phase === 'crashed'
                ? 'Back on the bike.'
                : mode === 'levels'
                  ? level.name
                  : phase === 'drawing'
                    ? 'Draw a downhill trail'
                    : 'Just follow your line.'}
          </h2>
        </div>
        <div className="sr-readout">
          <div className="sr-mode-rocker" role="group" aria-label="Ride mode">
            <button
              type="button"
              aria-pressed={mode === 'custom'}
              disabled={!active}
              onClick={() => input.pulse('mode-custom')}
            >
              Custom
            </button>
            <button
              type="button"
              aria-pressed={mode === 'levels'}
              disabled={!active}
              onClick={() => input.pulse('mode-levels')}
            >
              Levels
            </button>
          </div>
          <span className="sr-timer">
            {phase === 'riding' || result
              ? stats.time.toFixed(1) + ' SEC'
              : mode === 'levels'
                ? progress.completed + ' / 10 COMPLETE'
                : 'JOYSTICK OR POINTER'}
          </span>
        </div>
      </div>
      {phase === 'ready' && mode === 'levels' && (
        <div className="sr-level-intro">
          <span>
            {level.number === 1
              ? 'TEN TRAILS. ONE DESCENT AT A TIME.'
              : 'THE NEXT LINE IS WAITING.'}
          </span>
          <strong>
            {level.ramps.length + (level.ramps.length === 1 ? ' jump' : ' jumps')}
            <i />
            {Math.round(level.finishX / 10) + ' m'}
          </strong>
          <p>{level.hint}</p>
          <button type="button" onClick={startRide}>
            Ride level {level.number}
            <span>↗</span>
          </button>
        </div>
      )}
      {result && (
        <div
          className="sr-result"
          role="region"
          aria-label={
            phase === 'crashed'
              ? 'Crash result'
              : phase === 'won'
                ? 'Campaign result'
                : 'Ride result'
          }
        >
          <span>
            {phase === 'crashed'
              ? 'RIDER DOWN'
              : phase === 'won'
                ? '10 / 10 COMPLETE'
                : mode === 'levels'
                  ? 'LEVEL ' + (progress.level + 1) + ' COMPLETE'
                  : 'FINISH LINE'}
          </span>
          <strong>
            {phase === 'crashed'
              ? 'You crashed'
              : phase === 'won'
                ? 'You win!'
                : stats.time.toFixed(1) + ' sec. Pure downhill.'}
          </strong>
          <p>
            {phase === 'crashed'
              ? stats.crashReason === 'obstacle'
                ? 'Rocks need speed. Low branches need brake + forward tilt.'
                : 'Keep your body off the trail. Land on your wheels.'
              : phase === 'won'
                ? 'All ten trails, all the way down. Beautifully ridden.'
                : mode === 'levels'
                  ? 'A longer, trickier trail is up next.'
                  : 'That line is yours. Make another?'}
          </p>
          <button
            type="button"
            onClick={
              phase === 'won'
                ? restartCampaign
                : phase === 'finished' && mode === 'levels'
                  ? advanceLevel
                  : startRide
            }
          >
            {phase === 'crashed'
              ? 'Try again'
              : phase === 'won'
                ? 'Ride all 10 again'
                : mode === 'levels'
                  ? 'Next level'
                  : 'Ride again'}
            <span>↗</span>
          </button>
        </div>
      )}
      <div className="sr-bottom">
        <p className="sr-message" role="status" aria-live="polite">
          {message}
        </p>
        <div className="sr-toolbar">
          <div className="sr-actions">
            {mode === 'custom' && (
              <button
                type="button"
                className={phase === 'drawing' ? 'sr-selected' : ''}
                onClick={editTrail}
                aria-pressed={phase === 'drawing'}
              >
                ✎ Draw
              </button>
            )}
            <button type="button" className="sr-ride-button" onClick={startRide}>
              {phase === 'riding' ? '↺ Retry' : '↗ Ride'}
            </button>
            <button
              type="button"
              onClick={resetCourse}
              aria-label={mode === 'custom' ? 'Reset to the starter trail' : 'Reset current level'}
            >
              ↺ Reset
            </button>
          </div>
          <div className="sr-instructions">
            {mode === 'levels' && phase !== 'riding' ? (
              <>
                <span>{progress.completed + ' / 10 CLEARED'}</span>
                <i />
              </>
            ) : phase === 'riding' ? (
              <>
                <kbd>←</kbd>
                <kbd>→</kbd>
                <span>tilt</span>
                <kbd>SPACE / E</kbd>
                <span>Pedal</span>
                <kbd>Q</kbd>
                <span>Brake</span>
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
      {(phase === 'riding' || (mode === 'levels' && phase !== 'drawing')) && (
        <div
          className="sr-progress"
          role="progressbar"
          aria-label="Trail progress"
          aria-valuenow={stats.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: stats.progress + '%' }} />
        </div>
      )}
    </section>
  );
}
