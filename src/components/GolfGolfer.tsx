import { ClubHead, GOLF_CLUB_HOSEL } from './GolfClub';

type Point = readonly [number, number];
type Chain = readonly [Point, Point, Point];
type Pose =
  | 'address'
  | 'takeaway'
  | 'backswing'
  | 'transition'
  | 'downswing'
  | 'impact'
  | 'release'
  | 'followthrough';

interface Skeleton {
  head: Point;
  face?: 'front' | 'quarter';
  tilt: number;
  // These corners turn with the shoulders and pelvis, rather than tilting
  // one address silhouette through the whole swing.
  shirt: readonly [Point, Point, Point, Point];
  leadArm: Chain;
  trailArm: Chain;
  leadLeg: Chain;
  trailLeg: Chain;
  club: Point;
  heel?: number;
}
const ink = '#18201e';
const skin = '#f0cfb7';

// GolfScene mirrors these source poses into Jacob's requested right-handed orientation.
// The head stays over the ball through contact; the chest opens and rises after it.
const poses: Record<Pose, Skeleton> = {
  address: {
    head: [289, 205],
    tilt: 20,
    shirt: [
      [254, 240],
      [283, 237],
      [259, 290],
      [229, 287],
    ],
    leadArm: [
      [279, 251],
      [281, 278],
      [285, 301],
    ],
    trailArm: [
      [265, 245],
      [285, 273],
      [285, 301],
    ],
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
    club: [313, 370],
  },
  takeaway: {
    head: [288, 205],
    tilt: 20,
    shirt: [
      [249, 240],
      [282, 237],
      [258, 290],
      [228, 287],
    ],
    leadArm: [
      [278, 251],
      [274, 271],
      [268, 285],
    ],
    trailArm: [
      [260, 245],
      [252, 265],
      [268, 285],
    ],
    leadLeg: [
      [235, 291],
      [244, 326],
      [239, 364],
    ],
    trailLeg: [
      [248, 286],
      [263, 316],
      [258, 347],
    ],
    club: [206, 256],
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
    leadArm: [
      [277, 251],
      [263, 229],
      [246, 203],
    ],
    trailArm: [
      [246, 248],
      [230, 231],
      [246, 203],
    ],
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
    club: [337, 180],
  },
  transition: {
    head: [287, 205],
    tilt: 20,
    shirt: [
      [242, 241],
      [282, 237],
      [261, 290],
      [231, 288],
    ],
    leadArm: [
      [278, 251],
      [267, 231],
      [255, 215],
    ],
    trailArm: [
      [250, 246],
      [241, 233],
      [255, 215],
    ],
    leadLeg: [
      [239, 292],
      [244, 326],
      [239, 364],
    ],
    trailLeg: [
      [252, 287],
      [259, 317],
      [258, 347],
    ],
    club: [321, 149],
  },
  downswing: {
    head: [288, 205],
    tilt: 20,
    shirt: [
      [251, 239],
      [284, 237],
      [264, 292],
      [235, 290],
    ],
    leadArm: [
      [281, 250],
      [286, 270],
      [291, 289],
    ],
    trailArm: [
      [263, 244],
      [260, 270],
      [291, 289],
    ],
    leadLeg: [
      [242, 293],
      [244, 327],
      [239, 364],
    ],
    trailLeg: [
      [256, 288],
      [260, 317],
      [258, 347],
    ],
    club: [348, 235],
    heel: 8,
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
    leadArm: [
      [282, 251],
      [283, 279],
      [286, 302],
    ],
    trailArm: [
      [264, 245],
      [271, 278],
      [286, 302],
    ],
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
    club: [313, 374],
    heel: 15,
  },
  release: {
    head: [276, 200],
    face: 'quarter',
    tilt: 4,
    shirt: [
      [239, 236],
      [284, 235],
      [273, 289],
      [241, 291],
    ],
    leadArm: [
      [282, 246],
      [299, 251],
      [315, 253],
    ],
    trailArm: [
      [247, 243],
      [278, 259],
      [315, 253],
    ],
    leadLeg: [
      [244, 293],
      [241, 327],
      [239, 364],
    ],
    trailLeg: [
      [263, 287],
      [258, 318],
      [258, 347],
    ],
    club: [354, 179],
    heel: 26,
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
    leadArm: [
      [277, 240],
      [258, 251],
      [279, 215],
    ],
    trailArm: [
      [238, 238],
      [257, 231],
      [279, 215],
    ],
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
    club: [196, 243],
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
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
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
    <g strokeLinejoin="bevel">
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
function Club({ skeleton, color, kind }: { skeleton: Skeleton; color: string; kind: string }) {
  const grip = skeleton.leadArm[2];
  const head = skeleton.club;
  // The shared head's shaft leaves its hosel along +Y. Point that direction
  // back toward the hands and attach the hosel exactly to the held shaft.
  const angle = (Math.atan2(grip[1] - head[1], grip[0] - head[0]) * 180) / Math.PI - 90;
  return (
    <g className="golf-held-club" data-club-kind={kind}>
      <Limb points={[grip, head]} color="#ccd4d7" width={2} />
      <g
        transform={`translate(${head.join(' ')}) rotate(${angle}) scale(.68) translate(${-GOLF_CLUB_HOSEL.x} ${-GOLF_CLUB_HOSEL.y})`}
      >
        <ClubHead color={color} kind={kind} />
      </g>
    </g>
  );
}
function Hands({ grip }: { grip: Point }) {
  return (
    <g>
      <path d={`M${grip[0] - 6} ${grip[1] - 6}h12v13h-12z`} fill={ink} />
      <path d={`M${grip[0] - 3} ${grip[1] - 4}h7v9h-7z`} fill="#fffdf5" />
    </g>
  );
}

function GolferPose({
  pose,
  clubColor,
  clubKind,
}: {
  pose: Pose;
  clubColor: string;
  clubKind: string;
}) {
  const skeleton = poses[pose];
  const { head, shirt, leadArm, trailArm, leadLeg, trailLeg, heel } = skeleton;
  const grip = leadArm[2];
  const finish = pose === 'followthrough';
  const armsBehind = pose === 'backswing' || pose === 'transition';
  const clubBehind = armsBehind || finish;
  return (
    <g className={`golf-scene__pose golf-scene__pose--${pose}`}>
      {/* Lifted forearms, hands, and shaft pass behind the torso and head at
          the top of the swing; the near upper arm still crosses the shirt. */}
      {clubBehind && <Club skeleton={skeleton} color={clubColor} kind={clubKind} />}
      <Limb points={trailLeg} color="#313934" width={17} />
      <Shoe x={248} y={345} angle={heel} />
      <Limb points={leadLeg} color="#202825" width={21} />
      <Shoe x={228} y={364} />
      <Limb points={trailArm} color="#d9af95" width={8} />
      {armsBehind && (
        <>
          <Limb points={leadArm} color={skin} width={10} />
          <Hands grip={grip} />
        </>
      )}
      <Limb
        points={[
          [head[0] - 3, head[1] + 19],
          [(shirt[0][0] + shirt[1][0]) / 2, shirt[0][1] + 8],
        ]}
        color={skin}
        width={10}
      />
      <Torso {...skeleton} />
      {armsBehind && (
        <>
          <Limb points={[leadArm[0], leadArm[1]]} color={skin} width={10} />
          <Limb points={sleeve(leadArm, 0.3)} color="#589ed5" width={16} />
        </>
      )}
      <Head {...skeleton} />
      {!armsBehind && (
        <>
          <Limb points={leadArm} color={skin} width={10} />
          <Limb points={sleeve(leadArm, 0.3)} color="#589ed5" width={16} />
        </>
      )}
      {!clubBehind && <Club skeleton={skeleton} color={clubColor} kind={clubKind} />}
      {!armsBehind && <Hands grip={grip} />}
    </g>
  );
}
export default function Golfer({
  clubColor,
  clubKind = 'driver',
}: {
  clubColor: string;
  clubKind?: string;
}) {
  return (
    <g className="golf-scene__golfer" data-club-kind={clubKind}>
      <path d="M228 378h39v5h-39zm20-18h35v4h-35z" fill="#6f914e" opacity=".5" />
      {(Object.keys(poses) as Pose[]).map((pose) => (
        <GolferPose key={pose} pose={pose} clubColor={clubColor} clubKind={clubKind} />
      ))}
    </g>
  );
}
