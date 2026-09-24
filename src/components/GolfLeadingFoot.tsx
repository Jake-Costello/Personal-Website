type Point = readonly [number, number];

const ink = '#18201e';
const profile: readonly Point[] = [
  [0, 0],
  [18, 0],
  [18, 4],
  [29, 4],
  [29, 8],
  [34, 8],
  [34, 13],
  [34, 16],
  [29, 16],
  [-3, 16],
  [-3, 5],
  [0, 5],
];
const facing: readonly Point[] = [
  [2, 0],
  [20, 0],
  [20, 4],
  [24, 4],
  [24, 7],
  [29, 10],
  [30, 17],
  [28, 21],
  [24, 22],
  [1, 22],
  [1, 5],
  [2, 5],
];
const upperProfile: readonly Point[] = [
  [3, 3],
  [15, 3],
  [15, 8],
  [22, 8],
  [28, 8],
  [28, 11],
  [31, 11],
  [31, 13],
  [26, 13],
  [0, 13],
  [0, 7],
  [3, 7],
];
const upperFacing: readonly Point[] = [
  [5, 3],
  [17, 3],
  [17, 7],
  [21, 7],
  [22, 10],
  [25, 11],
  [27, 16],
  [24, 19],
  [18, 19],
  [4, 19],
  [3, 8],
  [5, 6],
];

export default function GolfLeadingFoot({
  turn,
  x = 228,
  y = 364,
}: {
  turn: number;
  x?: number;
  y?: number;
}) {
  const amount = Math.max(0, Math.min(1, turn));
  const points = (side: readonly Point[], front: readonly Point[]) =>
    side
      .map(([px, py], index) =>
        [px + (front[index][0] - px) * amount, py + (front[index][1] - py) * amount].join(','),
      )
      .join(' ');
  return (
    <g
      className="golf-golfer-leading-foot"
      transform={`translate(${x} ${y})`}
      data-ankle-x={x + 11}
      data-ankle-y={y}
    >
      {/* The ankle stays fixed as more of the planted shoe's top turns into view. */}
      <polygon points={points(profile, facing)} fill={ink} />
      <polygon points={points(upperProfile, upperFacing)} fill="#c6a078" />
      <polygon
        points={points(
          [
            [3, 3],
            [15, 3],
            [15, 6],
            [3, 6],
          ],
          [
            [5, 3],
            [17, 3],
            [17, 6],
            [5, 6],
          ],
        )}
        fill="#e2c59b"
      />
      <polygon
        points={points(
          [
            [14, 8],
            [25, 8],
            [25, 10],
            [14, 10],
          ],
          [
            [14, 9],
            [22, 10],
            [23, 12],
            [14, 11],
          ],
        )}
        fill="#e2c59b"
      />
      <polygon
        points={points(
          [
            [0, 13],
            [31, 13],
            [31, 15],
            [0, 15],
          ],
          [
            [3, 19],
            [26, 19],
            [24, 21],
            [3, 21],
          ],
        )}
        fill="#efe0c5"
      />
      <g opacity={amount} fill="#efe0c5">
        <path d="M9 9h7v2H9zm1 4h8v2h-8z" />
      </g>
    </g>
  );
}
