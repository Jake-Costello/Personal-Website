type Point = readonly [number, number];

const ink = '#18201e';
const toe: Point = [30, 13];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

// All outlines share a stationary toe. Turning changes the actual silhouette
// from a side view into a heel-up sole view, rather than flattening a side sprite.
function footPoint(side: Point, facing: Point, heel: number, turn: number): Point {
  const angle = (Math.max(0, Math.min(60, heel)) * Math.PI) / 180;
  const dx = side[0] - toe[0];
  const dy = side[1] - toe[1];
  const raised: Point = [
    toe[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
    toe[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
  ];
  const lift = 0.25 + 0.75 * clamp(heel / 48);
  const front: Point = [facing[0], toe[1] + (facing[1] - toe[1]) * lift];
  const amount = clamp(turn);
  return [raised[0] + (front[0] - raised[0]) * amount, raised[1] + (front[1] - raised[1]) * amount];
}

function outline(side: readonly Point[], facing: readonly Point[], heel: number, turn: number) {
  return side
    .map((point, index) => footPoint(point, facing[index], heel, turn).join(','))
    .join(' ');
}

/** The trouser cuff endpoint in the default scene coordinates, before mirroring. */
export function trailingFootAnkle(heel: number, turn: number): Point {
  const [x, y] = footPoint([10, 2], [28, -18], heel, turn);
  return [248 + x, 345 + y];
}

const profile: readonly Point[] = [
  [0, 0],
  [18, 0],
  [18, 4],
  [29, 4],
  [29, 8],
  [34, 8],
  [34, 13],
  [30, 13],
  [-3, 13],
  [-3, 5],
  [0, 5],
  [0, 0],
];
const facing: readonly Point[] = [
  [21, -20],
  [35, -20],
  [35, -17],
  [37, -17],
  [37, -3],
  [35, -3],
  [35, 9],
  [30, 13],
  [24, 10],
  [24, 2],
  [20, 2],
  [20, -17],
];
const upperProfile: readonly Point[] = [
  [3, 3],
  [15, 3],
  [15, 7],
  [27, 7],
  [27, 9],
  [31, 9],
  [31, 11],
  [29, 11],
  [0, 11],
  [0, 7],
  [3, 7],
  [3, 3],
];
const upperFacing: readonly Point[] = [
  [23, -17],
  [33, -17],
  [33, -14],
  [35, -14],
  [35, -5],
  [33, -5],
  [33, 7],
  [30, 10],
  [27, 8],
  [26, 0],
  [23, 0],
  [23, -14],
];
const soleProfile: readonly Point[] = [
  [0, 11],
  [31, 11],
  [31, 12],
  [30, 13],
  [0, 13],
  [0, 12],
];
const soleFacing: readonly Point[] = [
  [25, -14],
  [32, -14],
  [34, 3],
  [30, 10],
  [26, 7],
  [24, -4],
];

export default function GolfTrailingFoot({
  heel,
  turn,
  x = 248,
  y = 345,
}: {
  heel: number;
  turn: number;
  x?: number;
  y?: number;
}) {
  const [ankleX, ankleY] = trailingFootAnkle(heel, turn);
  const points = (side: readonly Point[], front: readonly Point[]) =>
    outline(side, front, heel, turn);
  return (
    <g
      className="golf-golfer-trailing-foot"
      transform={`translate(${x} ${y})`}
      data-ankle-x={ankleX + x - 248}
      data-ankle-y={ankleY + y - 345}
    >
      {/* The collar overlaps the trouser endpoint, including its angled cuff. */}
      <polygon
        points={points(
          [
            [1, -4],
            [18, -4],
            [18, 6],
            [1, 6],
          ],
          [
            [20, -25],
            [36, -25],
            [36, -14],
            [20, -14],
          ],
        )}
        fill={ink}
      />
      <polygon points={points(profile, facing)} fill={ink} />
      <polygon points={points(upperProfile, upperFacing)} fill="#c6a078" />
      <polygon
        points={points(
          [
            [3, 3],
            [15, 3],
            [15, 5],
            [3, 5],
          ],
          [
            [23, -17],
            [33, -17],
            [33, -14],
            [23, -14],
          ],
        )}
        fill="#e2c59b"
      />
      <polygon points={points(soleProfile, soleFacing)} fill="#efe0c5" />
      {/* Tread becomes visible as the sole turns into view. */}
      <g fill="#927858" opacity={clamp(turn)}>
        {[0, 1, 2].map((index) => {
          const top = -10 + index * 6;
          return (
            <polygon
              key={index}
              points={points(
                [
                  [19 + index * 3, 11],
                  [23 + index * 3, 11],
                  [23 + index * 3, 12],
                  [19 + index * 3, 12],
                ],
                [
                  [26, top],
                  [31, top],
                  [31, top + 2],
                  [26, top + 2],
                ],
              )}
            />
          );
        })}
      </g>
    </g>
  );
}
