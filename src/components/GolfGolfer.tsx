import { useId, useLayoutEffect, useState } from 'react';
import { ClubHead, GOLF_CLUB_HOSEL } from './GolfClub';
import GolfTrailingFoot, { trailingFootAnkle } from './GolfTrailingFoot';
import GolfLeadingFoot from './GolfLeadingFoot';
import GolfHead, { GolfHeadSilhouette } from './GolfHead';
import {
  armChain,
  add,
  mix,
  scale,
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
  footTurn: number;
}
interface Skeleton extends BodyPose {
  leadArm: Chain;
  trailArm: Chain;
  back: number;
  finish: number;
}
const ink = '#18201e';
const skin = '#f0cfb7';

// Original pixel-art body silhouettes. Hands, elbows and club are computed by
// the inclined-plane rig; these keys only turn the torso, head and lower body.
const poses: Record<'address' | 'backswing' | 'impact' | 'followthrough', BodyPose> = {
  address: {
    head: [282, 195],
    tilt: 16,
    shirt: [
      [250, 232],
      [279, 229],
      [261, 282],
      [231, 279],
    ],
    leadShoulder: [263, 236],
    trailShoulder: [276, 236],
    leadLeg: [
      [237, 283],
      [241, 325],
      [239, 364],
    ],
    trailLeg: [
      [251, 278],
      [262, 315],
      [258, 347],
    ],
    heel: 0,
    footTurn: 0,
  },
  backswing: {
    head: [280, 195],
    tilt: 16,
    shirt: [
      [240, 229],
      [281, 233],
      [264, 280],
      [232, 283],
    ],
    leadShoulder: [275, 237],
    trailShoulder: [246, 235],
    leadLeg: [
      [239, 283],
      [244, 326],
      [239, 364],
    ],
    trailLeg: [
      [253, 281],
      [259, 317],
      [258, 347],
    ],
    heel: 0,
    footTurn: 0,
  },
  impact: {
    head: [281, 195],
    tilt: 16,
    shirt: [
      [246, 231],
      [281, 231],
      [270, 283],
      [241, 283],
    ],
    leadShoulder: [266, 238],
    trailShoulder: [276, 237],
    leadLeg: [
      [246, 285],
      [240, 326],
      [239, 364],
    ],
    trailLeg: [
      [263, 280],
      [257, 317],
      [258, 347],
    ],
    heel: 0,
    footTurn: 0,
  },
  followthrough: {
    head: [259, 187],
    face: 'front',
    tilt: -3,
    shirt: [
      [233, 222],
      [280, 221],
      [273, 278],
      [236, 283],
    ],
    leadShoulder: [277, 232],
    trailShoulder: [238, 230],
    leadLeg: [
      [247, 284],
      [243, 325],
      [239, 364],
    ],
    trailLeg: [
      [263, 279],
      [272, 313],
      [258, 347],
    ],
    heel: 48,
    footTurn: 1,
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
const SLEEVE_FRACTION = 0.4;
function sleeve(arm: Chain, fraction = SLEEVE_FRACTION): readonly Point[] {
  return [
    arm[0],
    [
      arm[0][0] + (arm[1][0] - arm[0][0]) * fraction,
      arm[0][1] + (arm[1][1] - arm[0][1]) * fraction,
    ],
  ];
}
function sleeveOutline(arm: Chain): readonly Point[] {
  const [shoulder, cuff] = sleeve(arm);
  const dx = cuff[0] - shoulder[0];
  const dy = cuff[1] - shoulder[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  // Carry the sleeve into the shoulder instead of attaching a short band below
  // it. Its cap overlaps the shirt; only the outer sides and cuff are outlined.
  const cap: Point = [shoulder[0] - (dx / length) * 7, shoulder[1] - (dy / length) * 7];
  return [
    [cap[0] + nx * 8, cap[1] + ny * 8],
    [cuff[0] + nx * 7, cuff[1] + ny * 7],
    [cuff[0] - nx * 7, cuff[1] - ny * 7],
    [cap[0] - nx * 8, cap[1] - ny * 8],
  ];
}
function Sleeve({ arm, color }: { arm: Chain; color: string }) {
  const outline = sleeveOutline(arm);
  return (
    <g className="golf-golfer-sleeve">
      <polygon points={vertices(outline)} fill={color} />
      {/* The shoulder edge joins the shirt instead of making a boxed patch. */}
      <polyline points={vertices(outline)} fill="none" stroke={ink} strokeWidth={3} />
    </g>
  );
}
function trouserPanels({ shirt, leadLeg, trailLeg, finish }: Skeleton) {
  const [, , right, left] = shirt;
  // Move the pelvis seam around the opened lead hip without changing the
  // approved shirt hem or adding a separate waist patch.
  const waist: Point = [(left[0] + right[0]) / 2 + 3 * finish, (left[1] + right[1]) / 2];
  const crotch: Point = [waist[0] + 3 - 5 * finish, Math.max(left[1], right[1]) + 23];
  const trail: readonly Point[] = [
    waist,
    right,
    [trailLeg[1][0] + 8, trailLeg[1][1]],
    [trailLeg[2][0] + 7, trailLeg[2][1] + 2],
    [trailLeg[2][0] - 7, trailLeg[2][1] + 2],
    [trailLeg[1][0] - 7, trailLeg[1][1]],
    crotch,
  ];
  const lead: readonly Point[] = [
    left,
    [waist[0] + 4, waist[1]],
    crotch,
    [leadLeg[1][0] + 10, leadLeg[1][1]],
    [leadLeg[2][0] + 10, leadLeg[2][1] + 2],
    [leadLeg[2][0] - 10, leadLeg[2][1] + 2],
    [leadLeg[1][0] - 10, leadLeg[1][1]],
  ];
  return { lead, trail };
}
function Trousers({ skeleton, mask = false }: { skeleton: Skeleton; mask?: boolean }) {
  const { lead, trail } = trouserPanels(skeleton);
  return (
    <g
      className={mask ? undefined : 'golf-golfer-trousers'}
      stroke={mask ? 'black' : ink}
      strokeWidth={4}
      strokeLinejoin="bevel"
    >
      <polygon points={vertices(trail)} fill={mask ? 'black' : '#313934'} />
      <polygon points={vertices(lead)} fill={mask ? 'black' : '#202825'} />
    </g>
  );
}
function Torso({ shirt, leadArm, trailArm, back }: Skeleton) {
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
        opacity={1 - back}
      />
      {/* The broad back and shoulder yoke turn into view during the coil;
          the front collar returns as the hips lead the chest through impact. */}
      <g opacity={back}>
        <polygon points={vertices(shirt)} fill="#347caf" />
        <polygon
          points={vertices([left, right, panelPoint(1, 0.22), panelPoint(0, 0.22)])}
          fill="#2d6598"
        />
        <polyline
          points={vertices([panelPoint(0.16, 0.21), panelPoint(0.5, 0.24), panelPoint(0.86, 0.21)])}
          fill="none"
          stroke="#75a8cf"
          strokeWidth={2}
        />
      </g>
      <path
        d={`M${left[0] + 7} ${left[1] + 3}l8 5 5-8`}
        fill="none"
        stroke="#75b5e4"
        strokeWidth={4}
        opacity={1 - back}
      />
      <Sleeve arm={trailArm} color="#2d6598" />
      <Sleeve arm={leadArm} color="#428dcc" />
      <g opacity={back}>
        <Sleeve arm={leadArm} color="#2d6598" />
        <Sleeve arm={trailArm} color="#428dcc" />
      </g>
      {[
        [0.42, 0.2],
        [0.77, 0.44],
        [0.24, 0.65],
        [0.62, 0.8],
      ].map(([u, v], index) => {
        const [x, y] = panelPoint(u + (0.5 - u) * 0.3 * back, v);
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

function Hands({
  rig,
  lead,
  trail,
  maskId,
}: {
  rig: ReturnType<typeof sampleGolfSwing>;
  lead: GolfPoint;
  trail: GolfPoint;
  maskId: string;
}) {
  const grip = projected(rig.grip);
  const angle = (Math.atan2(rig.direction[1], rig.direction[0]) * 180) / Math.PI - 90;
  const hand = (point: GolfPoint, gloved: boolean) => (
    <g
      className={`golf-golfer-hand--${gloved ? 'lead' : 'trail'}`}
      mask={point[2] <= BODY_FRONT ? undefined : `url(#${maskId})`}
    >
      <g transform={`translate(${point[0]} ${point[1]}) rotate(${angle})`}>
        <path d="M-5-5h10v10H-5z" fill={ink} />
        <path d="M-3-3h6v6H-3z" fill={gloved ? '#fffdf5' : skin} />
        <path d="M1-2h3v5H1z" fill={gloved ? '#d6ded8' : '#d8ac91'} />
      </g>
    </g>
  );
  return (
    <g className="golf-golfer-hands" data-x={grip[0]} data-y={grip[1]}>
      {hand(trail, false)}
      {hand(lead, true)}
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
    footTurn: from.footTurn + (to.footTurn - from.footTurn) * t,
  };
}

function BodyMask({ skeleton, id }: { skeleton: Skeleton; id: string }) {
  const {
    head: [x, y],
    tilt,
    face,
    shirt,
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
        <Trousers skeleton={skeleton} mask />
        <polygon points={vertices(shirt)} strokeWidth="6" />
        {[trailArm, leadArm].map((arm, index) => (
          <g key={index}>
            <polygon points={vertices(sleeveOutline(arm))} stroke="none" />
            <polyline points={vertices(sleeveOutline(arm))} fill="none" strokeWidth="3" />
          </g>
        ))}
        <GolfHeadSilhouette head={[x, y]} face={face} tilt={tilt} />
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
  const handle = [add(grip, scale(rig.direction, -10)), add(grip, scale(rig.direction, 10))];
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
        <DepthLimb points={handle} front={false} color="#273530" width={3} />
      </g>
      <DepthLimb points={[grip, tip]} front color="#ccd4d7" width={2} />
      <DepthLimb points={handle} front color="#273530" width={3} />
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
  const sleeveMaskId = `${maskId}-sleeves`;
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
  if (timeMs > 900) body = interpolateBody(poses.impact, poses.followthrough, rig.finish);
  const trailFootOffset: Point = [5 * rig.finish, 14 * rig.finish];
  const trailAnkle = trailingFootAnkle(body.heel, body.footTurn);
  body.trailLeg = [
    body.trailLeg[0],
    body.trailLeg[1],
    [trailAnkle[0] + trailFootOffset[0], trailAnkle[1] + trailFootOffset[1]],
  ];
  // A conventional right-handed grip: left/gloved hand nearer the butt,
  // right/bare hand below it toward the head, both carried by the same shaft.
  const leadGrip = add(rig.grip, scale(rig.direction, -4.5));
  const trailGrip = add(rig.grip, scale(rig.direction, 4.5));
  const lead = armChain([...body.leadShoulder, -10 + 22 * rig.chest], leadGrip, false, rig.finish);
  const trail = armChain([...body.trailShoulder, 10 - 22 * rig.chest], trailGrip, true, rig.finish);
  const skeleton: Skeleton = {
    ...body,
    back: rig.chest,
    finish: rig.finish,
    leadArm: lead.map(projected) as unknown as Chain,
    trailArm: trail.map(projected) as unknown as Chain,
  };
  const { head, shirt, heel, footTurn } = skeleton;
  const arm = (points: readonly GolfPoint[], leading: boolean) => (
    <g className={`golf-golfer-arm--${leading ? 'lead' : 'trail'}`}>
      {[false, true].map((front) => (
        <g key={String(front)} mask={`url(#${front ? sleeveMaskId : maskId})`}>
          <DepthLimb
            points={[mix(points[0], points[1], SLEEVE_FRACTION), points[1], points[2]]}
            front={front}
            color={leading ? skin : '#d9af95'}
            width={leading ? 10 : 8}
          />
        </g>
      ))}
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
        <mask id={sleeveMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="480">
          <rect width="600" height="480" fill="white" />
          <g fill="black">
            <polygon points={vertices(sleeveOutline(skeleton.trailArm))} />
            <polygon points={vertices(sleeveOutline(skeleton.leadArm))} />
          </g>
        </mask>
      </defs>
      <Trousers skeleton={skeleton} />
      <GolfTrailingFoot
        heel={heel}
        turn={footTurn}
        x={248 + trailFootOffset[0]}
        y={345 + trailFootOffset[1]}
      />
      <GolfLeadingFoot turn={rig.finish} />
      <Limb
        points={[
          [head[0] - 3, head[1] + 19],
          [(shirt[0][0] + shirt[1][0]) / 2, shirt[0][1] + 8],
        ]}
        color={skin}
        width={10}
      />
      <Torso {...skeleton} />
      <GolfHead {...skeleton} />
      <MovingClub rig={rig} color={clubColor} kind={clubKind} maskId={maskId} />
      <g className="golf-golfer-arms">
        {arm(trail, false)}
        {arm(lead, true)}
      </g>
      <Hands rig={rig} lead={leadGrip} trail={trailGrip} maskId={maskId} />
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
