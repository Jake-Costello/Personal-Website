import { useId, useLayoutEffect, useState } from 'react';
import { ClubHead, GOLF_CLUB_HOSEL } from './GolfClub';
import {
  armChain,
  mix,
  sampleGolfSwing,
  SWING_CONTACT_MS,
  SWING_FINISH_MS,
  type GolfPoint,
} from '../lib/golfSwing';
import type { GolfPhase } from './GolfScene';

type Point = readonly [number, number];
type Chain = readonly [Point, Point, Point];
interface BodyPose {
  head: Point;
  face?: 'front' | 'quarter';
  tilt: number;
  shirt: readonly [Point, Point, Point, Point];
  leadShoulder: Point;
  trailShoulder: Point;
  leadLeg: Chain;
  trailLeg: Chain;
  heel: number;
}
interface Skeleton extends BodyPose {
  leadArm: Chain;
  trailArm: Chain;
}
const ink = '#18201e';
const skin = '#f0cfb7';

// Original pixel-art body silhouettes. Hands, elbows and club are computed by
// the inclined-plane rig; these keys only turn the torso, head and lower body.
const poses: Record<'address' | 'backswing' | 'impact' | 'followthrough', BodyPose> = {
  address: {
    head: [289, 205],
    tilt: 20,
    shirt: [
      [254, 240],
      [283, 237],
      [259, 290],
      [229, 287],
    ],
    leadShoulder: [279, 251],
    trailShoulder: [265, 245],
    leadLeg: [
      [235, 291],
      [244, 326],
      [239, 364],
    ],
    trailLeg: [
      [249, 286],
      [265, 316],
      [258, 347],
    ],
    heel: 0,
  },
  backswing: {
    head: [287, 205],
    tilt: 20,
    shirt: [
      [239, 242],
      [280, 237],
      [258, 290],
      [227, 287],
    ],
    leadShoulder: [277, 251],
    trailShoulder: [246, 248],
    leadLeg: [
      [235, 291],
      [244, 326],
      [239, 364],
    ],
    trailLeg: [
      [248, 286],
      [259, 316],
      [258, 347],
    ],
    heel: 0,
  },
  impact: {
    head: [288, 205],
    tilt: 20,
    shirt: [
      [250, 239],
      [285, 239],
      [268, 291],
      [239, 291],
    ],
    leadShoulder: [282, 251],
    trailShoulder: [264, 245],
    leadLeg: [
      [244, 293],
      [243, 327],
      [239, 364],
    ],
    trailLeg: [
      [261, 288],
      [260, 318],
      [258, 347],
    ],
    heel: 15,
  },
  followthrough: {
    head: [253, 195],
    face: 'front',
    tilt: -3,
    shirt: [
      [233, 230],
      [280, 229],
      [272, 288],
      [240, 291],
    ],
    leadShoulder: [277, 240],
    trailShoulder: [238, 238],
    leadLeg: [
      [244, 292],
      [241, 327],
      [239, 364],
    ],
    trailLeg: [
      [263, 287],
      [251, 319],
      [258, 347],
    ],
    heel: 36,
  },
};

function vertices(points: readonly Point[]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}
function Limb({
  points,
  color,
  width,
}: {
  points: readonly Point[];
  color: string;
  width: number;
}) {
  return (
    <g fill="none" strokeLinejoin="bevel" strokeLinecap="square">
      <polyline points={vertices(points)} stroke={ink} strokeWidth={width + 5} />
      <polyline points={vertices(points)} stroke={color} strokeWidth={width} />
    </g>
  );
}
function Flower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
      <path d="M3 0h3v3h3v3H6v3H3V6H0V3h3z" fill="#fffdf5" />
      <path d="M4 4h1v1H4z" fill="#dfff7f" />
    </g>
  );
}
function Shoe({ x, y, angle = 0 }: { x: number; y: number; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle} 30 13)`}>
      <path d="M0 0h18v4h11v4h5v8H-3V5h3z" fill={ink} />
      <path d="M3 3h12v5h13v3h3v2H0V7h3z" fill="#c6a078" />
      <path d="M3 3h12v3H3zm11 5h11v2H14z" fill="#e2c59b" />
      <path d="M0 13h31v2H0z" fill="#efe0c5" />
    </g>
  );
}
function Head({ head: [x, y], face, tilt }: Skeleton) {
  return (
    <g className="golf-golfer-head" transform={`translate(${x} ${y}) rotate(${tilt})`}>
      {face === 'front' ? (
        <>
          <path d="M-16-12h31v9h5v14h-5v11h-7v5H-8v-5h-7V11h-5V-3h4z" fill={ink} />
          <path d="M-12-8h23v9h5v7h-5v11H5v5H-6v-5h-6V8h-5V1h5z" fill={skin} />
          <path d="M-12 7h4v12h-4zm18 12h5v3H6z" fill="#d8ac91" />
          <path d="M-9 3h4v3h-4zm14 0h4v3H5z" fill={ink} />
          <path d="M0 6h3v7h-5v-3h2zm-4 12h10v2H-4z" fill="#b7866c" />
          <path d="M-12-25h23v4h7v10h4v10h-43v-10h3v-9h6z" fill={ink} />
          <path d="M-10-21H9v4h6v6h-30v-7h5z" fill="#343b38" />
          <path d="M-21-8h43v6h-43z" fill="#101916" />
          <path d="M-16-8h31v2h-31z" fill="#454b47" />
        </>
      ) : (
        <>
          <path d="M-10-17h22v5h8V1h5v6h-6v12h-9v7H-2v-5h-9V9h-6V-8h7z" fill={ink} />
          <path d="M-8-11H8v5h8V4h5v2h-6v11H6v5H0v-6h-9V6h-5V-4h6z" fill={skin} />
          <path d="M-11-3h7V9h-7zm6 15h8v6h-8z" fill="#d8ac91" />
          <path d="M-9 0h3v5h-3z" fill="#bb876e" />
          <path d="M9 1h4v3H9z" fill={ink} />
          {face === 'quarter' && <path d="M-1 1h3v3h-3z" fill={ink} />}
          <path d="M11 14h6v2h-6z" fill="#ab745d" />
          <path d="M-11-22H9v4h8v7h5v10H5v-5h-23v-10h7z" fill={ink} />
          <path d="M-10-18H7v4h7v5H5v-3h-18v-4h3z" fill="#343b38" />
          <path d="M7-6h20v4h8v5H15v-4H7z" fill={ink} />
          <path d="M17-2h10v2H17z" fill="#454b47" />
        </>
      )}
    </g>
  );
}
function sleeve(arm: Chain, fraction = 0.32): readonly Point[] {
  return [
    arm[0],
    [
      arm[0][0] + (arm[1][0] - arm[0][0]) * fraction,
      arm[0][1] + (arm[1][1] - arm[0][1]) * fraction,
    ],
  ];
}
function Torso({ shirt, leadArm, trailArm }: Skeleton) {
  const [left, right, bottomRight, bottomLeft] = shirt;
  function panelPoint(u: number, v: number): Point {
    return [
      (left[0] * (1 - u) + right[0] * u) * (1 - v) +
        (bottomLeft[0] * (1 - u) + bottomRight[0] * u) * v,
      (left[1] * (1 - u) + right[1] * u) * (1 - v) +
        (bottomLeft[1] * (1 - u) + bottomRight[1] * u) * v,
    ];
  }
  return (
    <g className="golf-golfer-torso" strokeLinejoin="bevel">
      <polygon points={vertices(shirt)} fill="#428dcc" stroke={ink} strokeWidth={6} />
      <polygon
        points={vertices([left, panelPoint(0.25, 0.04), panelPoint(0.25, 1), bottomLeft])}
        fill="#2d6598"
      />
      <path
        d={`M${left[0] + 7} ${left[1] + 3}l8 5 5-8`}
        fill="none"
        stroke="#75b5e4"
        strokeWidth={4}
      />
      <Limb points={sleeve(trailArm)} color="#2d6598" width={16} />
      <Limb points={sleeve(leadArm)} color="#589ed5" width={16} />
      {[
        [0.42, 0.2],
        [0.77, 0.44],
        [0.24, 0.65],
        [0.62, 0.8],
      ].map(([u, v], index) => {
        const [x, y] = panelPoint(u, v);
        return <Flower key={index} x={x - 4} y={y - 4} />;
      })}
      <path d={`M${bottomLeft.join(' ')}L${bottomRight.join(' ')}`} stroke={ink} strokeWidth={5} />
    </g>
  );
}

const projected = (p: GolfPoint): Point => [p[0], p[1]];
const BODY_FRONT = -6;

function depthParts(points: readonly GolfPoint[], front: boolean): Point[][] {
  const pieces: Point[][] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const aFront = a[2] <= BODY_FRONT;
    const bFront = b[2] <= BODY_FRONT;
    if (aFront === bFront) {
      if (aFront === front) pieces.push([projected(a), projected(b)]);
    } else {
      const crossing = mix(a, b, (BODY_FRONT - a[2]) / (b[2] - a[2]));
      pieces.push(
        front === aFront
          ? [projected(a), projected(crossing)]
          : [projected(crossing), projected(b)],
      );
    }
  }
  return pieces;
}

function DepthLimb({
  points,
  front,
  color,
  width,
}: {
  points: readonly GolfPoint[];
  front: boolean;
  color: string;
  width: number;
}) {
  return (
    <>
      {depthParts(points, front).map((part, index) => (
        <Limb key={index} points={part} color={color} width={width} />
      ))}
    </>
  );
}

function Hands({ grip }: { grip: Point }) {
  return (
    <g className="golf-golfer-hands" data-x={grip[0]} data-y={grip[1]}>
      <path d={`M${grip[0] - 6} ${grip[1] - 6}h12v13h-12z`} fill={ink} />
      <path d={`M${grip[0] - 3} ${grip[1] - 4}h7v9h-7z`} fill="#fffdf5" />
    </g>
  );
}

function interpolateBody(from: BodyPose, to: BodyPose, t: number): BodyPose {
  const point = (a: Point, b: Point): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const chain = (a: Chain, b: Chain): Chain => [
    point(a[0], b[0]),
    point(a[1], b[1]),
    point(a[2], b[2]),
  ];
  return {
    head: point(from.head, to.head),
    tilt: from.tilt + (to.tilt - from.tilt) * t,
    face: t < 0.5 ? from.face : to.face,
    shirt: from.shirt.map((p, i) => point(p, to.shirt[i])) as unknown as Skeleton['shirt'],
    leadShoulder: point(from.leadShoulder, to.leadShoulder),
    trailShoulder: point(from.trailShoulder, to.trailShoulder),
    leadLeg: chain(from.leadLeg, to.leadLeg),
    trailLeg: chain(from.trailLeg, to.trailLeg),
    heel: (from.heel ?? 0) + ((to.heel ?? 0) - (from.heel ?? 0)) * t,
  };
}

function BodyMask({ skeleton, id }: { skeleton: Skeleton; id: string }) {
  const {
    head: [x, y],
    tilt,
    face,
    shirt,
    leadLeg,
    trailLeg,
    leadArm,
    trailArm,
  } = skeleton;
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="480">
      <rect width="600" height="480" fill="white" />
      <g fill="black" stroke="black" strokeLinejoin="bevel">
        <polyline
          points={vertices([
            [x - 3, y + 19],
            [(shirt[0][0] + shirt[1][0]) / 2, shirt[0][1] + 8],
          ])}
          fill="none"
          strokeWidth="15"
          strokeLinecap="square"
        />
        <polyline points={vertices(leadLeg)} fill="none" strokeWidth="26" />
        <polyline points={vertices(trailLeg)} fill="none" strokeWidth="22" />
        <polygon points={vertices(shirt)} strokeWidth="6" />
        <polyline points={vertices(sleeve(leadArm))} fill="none" strokeWidth="21" />
        <polyline points={vertices(sleeve(trailArm))} fill="none" strokeWidth="21" />
        <g transform={`translate(${x} ${y}) rotate(${tilt})`} stroke="none">
          {face === 'front' ? (
            <>
              <path d="M-16-12h31v9h5v14h-5v11h-7v5H-8v-5h-7V11h-5V-3h4z" />
              <path d="M-12-25h23v4h7v10h4v10h-43v-10h3v-9h6z" />
            </>
          ) : (
            <>
              <path d="M-10-17h22v5h8V1h5v6h-6v12h-9v7H-2v-5h-9V9h-6V-8h7z" />
              <path d="M-11-22H9v4h8v7h5v10H5v-5h-23v-10h7zM7-6h20v4h8v5H15v-4H7z" />
            </>
          )}
        </g>
      </g>
    </mask>
  );
}

function MovingClub({
  rig,
  color,
  kind,
  maskId,
}: {
  rig: ReturnType<typeof sampleGolfSwing>;
  color: string;
  kind: string;
  maskId: string;
}) {
  const { grip, tip, face } = rig;
  const angle = (Math.atan2(grip[1] - tip[1], grip[0] - tip[0]) * 180) / Math.PI - 90;
  const headFront = tip[2] <= BODY_FRONT;
  // Face rotation has its own cue: the shared head narrows edge-on and exposes
  // its grooved face toward the camera. It does not stay pasted flat to the shaft.
  const faceWidth = 0.28 + 0.72 * Math.abs(face[2]);
  return (
    <g
      className="golf-held-club"
      data-club-kind={kind}
      data-tip-x={tip[0]}
      data-tip-y={tip[1]}
      data-face-z={face[2]}
    >
      <g mask={`url(#${maskId})`}>
        <DepthLimb points={[grip, tip]} front={false} color="#ccd4d7" width={2} />
      </g>
      <DepthLimb points={[grip, tip]} front color="#ccd4d7" width={2} />
      <g mask={headFront ? undefined : `url(#${maskId})`}>
        <g
          transform={`translate(${tip[0]} ${tip[1]}) rotate(${angle}) scale(${0.68 * faceWidth} .68) translate(${-GOLF_CLUB_HOSEL.x} ${-GOLF_CLUB_HOSEL.y})`}
        >
          <ClubHead color={color} kind={kind} />
          {face[2] < -0.15 && (
            <path
              d={
                kind === 'driver' || kind === 'wood'
                  ? 'M10 16h19v2H10zm2 4h16v1H12z'
                  : 'M13 18h14v1H13zm2 3h12v1H15z'
              }
              fill="#e2e9e6"
              opacity=".75"
            />
          )}
        </g>
      </g>
    </g>
  );
}

// Exporting the pure drawing lets visual review render exact instants of the
// same rig used in the browser, without a second set of review-only poses.
export function GolferFrame({
  timeMs,
  clubColor,
  clubKind = 'driver',
}: {
  timeMs: number;
  clubColor: string;
  clubKind?: string;
}) {
  const maskId = useId().replaceAll(':', '');
  const rig = sampleGolfSwing(timeMs);
  let body = interpolateBody(
    timeMs > 630 ? poses.impact : poses.address,
    poses.backswing,
    rig.chest,
  );
  const hips = interpolateBody(
    timeMs > 630 ? poses.impact : poses.address,
    poses.backswing,
    rig.hips,
  );
  body.shirt = [body.shirt[0], body.shirt[1], hips.shirt[2], hips.shirt[3]];
  body.leadLeg = hips.leadLeg;
  body.trailLeg = hips.trailLeg;
  body.heel = timeMs > 630 ? 15 * Math.min(1, (timeMs - 630) / 270) : 0;
  if (timeMs > 900) body = interpolateBody(poses.impact, poses.followthrough, rig.finish);
  const lead = armChain([...body.leadShoulder, -10], rig.grip, false, rig.finish);
  const trail = armChain([...body.trailShoulder, 10], rig.grip, true, rig.finish);
  const skeleton: Skeleton = {
    ...body,
    leadArm: lead.map(projected) as unknown as Chain,
    trailArm: trail.map(projected) as unknown as Chain,
  };
  const { head, shirt, leadLeg, trailLeg, heel } = skeleton;
  const grip = projected(rig.grip);
  const handsFront = rig.grip[2] <= BODY_FRONT;
  const arms = (front: boolean) => (
    <g className={`golf-golfer-arms golf-golfer-arms--${front ? 'front' : 'rear'}`}>
      <DepthLimb points={trail} front={front} color="#d9af95" width={8} />
      <DepthLimb points={lead} front={front} color={skin} width={10} />
    </g>
  );
  const stage =
    timeMs >= SWING_FINISH_MS
      ? 'followthrough'
      : timeMs >= 900
        ? 'release'
        : timeMs < 90
          ? 'address'
          : timeMs <= 630
            ? 'backswing'
            : 'downswing';
  return (
    <g className={`golf-scene__pose golf-scene__pose--${stage}`} data-swing-time={timeMs}>
      <defs>
        <BodyMask skeleton={skeleton} id={maskId} />
      </defs>
      <g className="golf-golfer-rear">
        {arms(false)}
        {!handsFront && <Hands grip={grip} />}
      </g>
      <Limb points={trailLeg} color="#313934" width={17} />
      <Shoe x={248} y={345} angle={heel} />
      <Limb points={leadLeg} color="#202825" width={21} />
      <Shoe x={228} y={364} />
      <Limb
        points={[
          [head[0] - 3, head[1] + 19],
          [(shirt[0][0] + shirt[1][0]) / 2, shirt[0][1] + 8],
        ]}
        color={skin}
        width={10}
      />
      <Torso {...skeleton} />
      <Head {...skeleton} />
      <MovingClub rig={rig} color={clubColor} kind={clubKind} maskId={maskId} />
      <g className="golf-golfer-front">
        {arms(true)}
        {handsFront && <Hands grip={grip} />}
      </g>
    </g>
  );
}

export default function Golfer({
  phase,
  clubColor,
  clubKind = 'driver',
}: {
  phase: GolfPhase;
  clubColor: string;
  clubKind?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  useLayoutEffect(() => {
    setElapsed(0);
    if (phase !== 'swing' && phase !== 'flight') return;
    const start = performance.now();
    const duration = phase === 'swing' ? SWING_CONTACT_MS : SWING_FINISH_MS - SWING_CONTACT_MS;
    let frame = 0;
    const draw = (now: number) => {
      const time = Math.min(duration, now - start);
      setElapsed(time);
      if (time < duration) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  const time =
    phase === 'idle'
      ? 0
      : phase === 'swing'
        ? Math.min(elapsed, 900)
        : phase === 'flight'
          ? 900 + Math.min(elapsed, 420)
          : SWING_FINISH_MS;
  return (
    <g className="golf-scene__golfer" data-club-kind={clubKind}>
      <path d="M228 378h39v5h-39zm20-18h35v4h-35z" fill="#6f914e" opacity=".5" />
      <GolferFrame timeMs={time} clubColor={clubColor} clubKind={clubKind} />
    </g>
  );
}
