type Point = readonly [number, number];
type Pose = 'address' | 'backswing' | 'downswing' | 'followthrough';

const ink = '#18201e';
const skin = '#f0cfb7';

function Limb({ points, color, width }: { points: Point[]; color: string; width: number }) {
  const vertices = points.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <g fill="none" strokeLinejoin="bevel" strokeLinecap="square">
      <polyline points={vertices} stroke={ink} strokeWidth={width + 5} />
      <polyline points={vertices} stroke={color} strokeWidth={width} />
    </g>
  );
}

function Flower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M3 0h3v3h3v3H6v3H3V6H0V3h3z" fill="#fffdf5" />
      <path d="M4 4h1v1H4z" fill="#dfff7f" />
    </g>
  );
}

function Shoe({ x, y, raised = false }: { x: number; y: number; raised?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})${raised ? ' rotate(24 27 10)' : ''}`}>
      <path d="M0 0h18v4h11v4h5v8H-3V5h3z" fill={ink} />
      <path d="M3 3h12v5h13v3h3v2H0V7h3z" fill="#c6a078" />
      <path d="M3 3h12v3H3zm11 5h11v2H14z" fill="#e2c59b" />
      <path d="M0 13h31v2H0z" fill="#efe0c5" />
    </g>
  );
}

function Head({ finish }: { finish: boolean }) {
  // The cap, single visible eye, ear, and nose show the left side of the head.
  // The downward angle follows the eyes toward the ball rather than the viewer.
  return (
    <g transform={`${finish ? 'translate(-10 -9) ' : ''}rotate(12 285 228)`}>
      <path d="M280 187h22v5h8v13h5v6h-6v12h-9v7h-12v-5h-9v-12h-6v-17h7z" fill={ink} />
      <path d="M282 193h16v5h8v10h5v2h-6v11h-9v5h-6v-6h-9v-10h-5v-10h6z" fill={skin} />
      <path d="M279 201h7v12h-7zm6 15h8v6h-8z" fill="#d8ac91" />
      <path d="M281 204h3v5h-3z" fill="#bb876e" />
      <path d="M299 205h4v3h-4z" fill={ink} />
      <path d="M301 218h6v2h-6z" fill="#ab745d" />
      <path d="M279 182h20v4h8v7h5v10h-17v-5h-23v-10h7z" fill={ink} />
      <path d="M280 186h17v4h7v5h-9v-3h-18v-4h3z" fill="#343b38" />
      <path d="M297 198h20v4h8v5h-20v-4h-8z" fill={ink} />
      <path d="M307 202h10v2h-10z" fill="#454b47" />
      <path d="M281 221h13v16h-13z" fill={ink} />
      <path d="M285 225h6v10h-6z" fill={skin} />
    </g>
  );
}

function Torso({ finish, coil }: { finish: boolean; coil: boolean }) {
  return (
    <g transform={finish ? 'rotate(-12 242 287)' : coil ? 'rotate(-3 242 287)' : undefined}>
      {/* Hips sit back; the spine inclines toward the ball. The near left sleeve
          hides most of the far shoulder, unlike the previous front-facing shirt. */}
      <path
        d="M270 227h17v8h9v16h-10v14h-10v15h-12v16h-28v-5h-14v-17h8v-19h10v-13h14v-9h16z"
        fill={ink}
      />
      <path
        d="M269 232h14v8h8v8h-11v17h-10v15h-12v11h-20v-5h-11v-11h8v-19h10v-10h14v-9h10z"
        fill="#428dcc"
      />
      <path d="M239 268h8v12h15v7h-5v4h-19v-5h-11v-11h8v-12h4z" fill="#2d6598" />
      <path d="M254 242h18v9h-18v9h-11v-11h11z" fill="#75b5e4" />
      <path d="M266 239h18v5h8v17h-21v-5h-8v-13h3z" fill={ink} />
      <path d="M269 242h12v5h7v11h-15v-5h-7v-8h3z" fill="#589ed5" />
      <Flower x={256} y={250} />
      <Flower x={273} y={247} />
      <Flower x={243} y={271} />
      <Flower x={261} y={267} />
      <path d="M232 289h28v5h-28z" fill={ink} />
    </g>
  );
}

function GolferPose({ pose, clubColor }: { pose: Pose; clubColor: string }) {
  const finish = pose === 'followthrough';
  const back = pose === 'backswing';
  const down = pose === 'downswing';
  const grip: Point = back ? [276, 211] : down ? [297, 288] : finish ? [252, 206] : [285, 300];
  const clubEnd: Point = back ? [233, 144] : down ? [346, 336] : finish ? [317, 170] : [313, 368];
  const frontArm: Point[] = back
    ? [[279, 257], [288, 235], grip]
    : down
      ? [[279, 257], [291, 277], grip]
      : finish
        ? [[272, 244], [266, 214], grip]
        : [[279, 258], [281, 281], grip];
  const farArm: Point[] = back
    ? [[268, 248], [259, 229], grip]
    : down
      ? [[268, 248], [287, 268], grip]
      : finish
        ? [[261, 233], [247, 216], grip]
        : [[268, 248], [287, 274], grip];
  return (
    <g className={`golf-scene__pose golf-scene__pose--${pose}`}>
      {/* The far right foot is set back in depth. The near left leg carries the
          finish, while the trail heel rises. Both knees are flexed at address. */}
      <Limb
        points={
          finish
            ? [
                [246, 289],
                [268, 316],
                [262, 348],
              ]
            : [
                [242, 287],
                [264, 316],
                [255, 345],
              ]
        }
        color="#313934"
        width={17}
      />
      <Shoe x={248} y={345} raised={finish} />
      <Limb
        points={
          finish
            ? [
                [242, 290],
                [247, 324],
                [239, 363],
              ]
            : [
                [232, 289],
                [249, 325],
                [237, 365],
              ]
        }
        color="#202825"
        width={21}
      />
      <path d="M231 310h4v15h-4zm-4 35h3v16h-3z" fill="#3c4540" />
      <Shoe x={228} y={364} />
      <Limb points={farArm} color="#d9af95" width={8} />
      <Torso finish={finish} coil={back} />
      <Head finish={finish} />
      <Limb points={frontArm} color={skin} width={10} />
      <Limb points={[grip, clubEnd]} color="#ccd4d7" width={2} />
      <path d={`M${grip[0] - 6} ${grip[1] - 6}h12v13h-12z`} fill={ink} />
      <path d={`M${grip[0] - 3} ${grip[1] - 4}h7v9h-7z`} fill="#fffdf5" />
      <g
        transform={`translate(${clubEnd[0]} ${clubEnd[1]})${back ? ' rotate(-40)' : finish ? ' rotate(65)' : ''}`}
      >
        <path d="M-8-4h16v3h4v7H-6v-3h-2z" fill={ink} />
        <path d="M-5-1H6v2h3v2H-5z" fill="#d9e1e2" />
        <path d="M-3 1h7v2h-7z" fill={clubColor} />
      </g>
    </g>
  );
}

export default function Golfer({ clubColor }: { clubColor: string }) {
  return (
    <g className="golf-scene__golfer">
      <path d="M228 378h39v5h-39zm20-18h35v4h-35z" fill="#6f914e" opacity=".5" />
      {(['address', 'backswing', 'downswing', 'followthrough'] as const).map((pose) => (
        <GolferPose key={pose} pose={pose} clubColor={clubColor} />
      ))}
    </g>
  );
}
