import './golf-scene.css';

export type GolfPhase = 'idle' | 'swing' | 'flight' | 'reading' | 'falling';

// The HTML controls share these coordinates so they stay aligned as the scene resizes.
export const GOLF_SCENE_GEOMETRY = {
  width: 600,
  height: 480,
  tee: { x: 313, y: 375 },
  golferDrop: { x: 215, y: 165, width: 150, height: 220 },
  bagAnchor: { x: 463, y: 313 },
  clubSlots: [
    { x: 385, y: 225 },
    { x: 415, y: 187 },
    { x: 444, y: 165 },
    { x: 488, y: 165 },
    { x: 515, y: 187 },
    { x: 545, y: 225 },
  ],
} as const;

export function GolfClubIcon({
  color,
  className,
  kind = 'iron',
}: {
  color: string;
  className?: string;
  kind?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 140"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M20 15h5v117h-5z" fill="#17251e" />
      <path d="M21 19h2v107h-2z" fill="#dce3de" />
      <path d="M19 120h7v20h-7z" fill="#17251e" />
      <path d="M20 123h2v14h-2z" fill={color} />
      {kind === 'driver' || kind === 'wood' ? (
        <>
          <path d="M8 3h23v4h7v14h-7v4H9v-4H5V7h3z" fill="#17251e" />
          <path d="M10 6h19v4h6v8h-6v4H11v-4H8V9h2z" fill={color} />
          <path d="M12 7h15v3H12z" fill="#f5f3ed" />
          <path d="M27 13h6v5h-6z" fill="#17251e" opacity=".2" />
        </>
      ) : kind === 'putter' ? (
        <>
          <path d="M3 6h38v15H3z" fill="#17251e" />
          <path d="M6 9h32v8H6z" fill={color} />
          <path d="M20 9h4v8h-4z" fill="#f5f3ed" />
        </>
      ) : (
        <>
          <path d="M5 4h31v14H25v7h-7v-7H5z" fill="#17251e" />
          <path d="M8 7h25v8H22v7h-2v-7H8z" fill={color} />
          <path d="M10 9h17v2H10z" fill="#f5f3ed" />
        </>
      )}
    </svg>
  );
}

function GolfBag() {
  return (
    <g className="golf-scene__bag">
      <path d="M428 378h70v5h-70zm8 5h54v4h-54z" fill="#719656" opacity=".6" />
      <path d="M438 312h5v62h-5zm44 2h5v61h-5z" fill="#17251e" />
      <path d="M434 292h50v8h5v64h-4v16h-43v-6h-8z" fill="#17251e" />
      <path d="M438 301h42v58h-3v16h-31v-5h-8z" fill="#355a74" />
      <path d="M466 301h14v58h-3v16h-11z" fill="#274559" />
      <path d="M438 296h42v7h-42z" fill="#f5f3ed" />
      <path d="M440 296h36v3h-36z" fill="#c4cdbf" />
      <path d="M438 315h22v42h-22z" fill="#17251e" />
      <path d="M442 319h14v34h-14z" fill="#f5f3ed" />
      <path d="M442 329h14v4h-14z" fill="#bfa7db" />
      <path d="M470 310h4v37h-4zm-2 40h8v4h-8z" fill="#b9c8c4" />
      <path d="M485 307h13v6h-8v38h-5z" fill="#17251e" />
      <path d="M444 367h16v3h-16z" fill="#517e95" />
    </g>
  );
}

// Repaint the bag over the interactive club shafts, keeping the heads unobstructed.
export function GolfBagOverlay({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 480"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
      style={{ pointerEvents: 'none' }}
    >
      <GolfBag />
    </svg>
  );
}

function Flower({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M3 0h4v3h3v4H7v3H3V7H0V3h3z" fill="#f5f3ed" />
      <path d="M4 4h2v2H4z" fill="#dfff7f" />
    </g>
  );
}

function Golfer({ clubColor }: { clubColor: string }) {
  return (
    <g className="golf-scene__golfer">
      <path d="M238 355h38v4h-38zm36 14h40v5h-40z" fill="#6f914e" opacity=".5" />
      {/* A staggered stance and lower, larger shoulder give the sprite a three-quarter view. */}
      <path
        d="M267 286h36v14h7v25h-9v34h-22v-29h-7v13h-7v7h-20v-11h8v-24h7v-15h7z"
        fill="#17251e"
      />
      <path d="M270 294h12v20h-8v15h-6v16h-17v-5h7v-24h7v-13h5z" fill="#343e39" />
      <path d="M286 298h12v27h-3v30h-11v-27h-5v-8h7z" fill="#27322d" />
      <path d="M245 342h21v5h7v11h-32v-6h4zm33 14h23v5h10v12h-38v-12h5z" fill="#17251e" />
      <path d="M248 346h15v5h7v4h-25v-4h3zm33 14h17v5h10v5h-31v-7h4z" fill="#c4a177" />
      <path d="M248 346h15v3h-15zm33 14h17v3h-17z" fill="#dfc298" />
      <path d="M246 354h24v2h-24zm32 15h30v2h-30z" fill="#f5e6c9" />
      <path d="M273 178h25v6h10v13h6v14h-7v11h-11v9h-23v-9h-7v-29h7z" fill="#17251e" />
      <path d="M276 187h19v7h10v8h5v7h-7v10h-10v8h-17v-10h-6v-17h6z" fill="#f0cfb7" />
      <path d="M271 202h8v13h-8zm6 18h12v7h-12z" fill="#d9aa8c" />
      <path d="M283 203h4v5h-4zm16 3h4v4h-4z" fill="#17251e" />
      <path d="M294 214h8v3h-8z" fill="#ac765e" />
      <path d="M272 173h25v5h9v17h-39v-16h5z" fill="#17251e" />
      <path d="M276 177h17v4h8v9h-30v-9h5z" fill="#29332e" />
      <path d="M276 177h17v3h-17z" fill="#49534a" />
      <path d="M269 191h40v4h7v6h-36v-4h-11z" fill="#17251e" />
      <path d="M283 196h26v2h-26z" fill="#3d4840" />
      <path d="M277 226h18v11h-18z" fill="#17251e" />
      <path d="M281 226h10v10h-10z" fill="#f0cfb7" />
      <path d="M261 233h16v-3h20v7h10v9h8v23h-9v28h-36v-5h-11v-26h-11v-24h7v-5h6z" fill="#17251e" />
      <path d="M262 238h14v5h16v-7h3v6h9v8h7v15h-9v28h-28v-6h-11v-26h-10v-15h9z" fill="#4f97d5" />
      <path d="M293 243h11v7h7v15h-9v28h-9z" fill="#306daa" />
      <path d="M264 239h11v4h-11z" fill="#89bfe6" />
      <Flower x={260} y={246} scale={0.7} />
      <Flower x={278} y={250} />
      <Flower x={296} y={256} scale={0.7} />
      <Flower x={269} y={270} scale={0.8} />
      <Flower x={287} y={281} scale={0.65} />
      <g className="golf-scene__pose golf-scene__pose--address">
        <path
          d="M252 260h12v15h10v11h12v9h17v10h-22v-10h-14v-12h-10v-10h-5zm49 6h12v18h8v19h-11v-15h-9z"
          fill="#17251e"
        />
        <path
          d="M256 264h5v13h10v12h13v10h15v3h-16v-10h-13v-12h-10v-10h-4zm48 6h5v17h8v12h-4v-13h-9z"
          fill="#f0cfb7"
        />
        <path d="M302 298h15v12h-15z" fill="#17251e" />
        <path d="M305 300h9v8h-9z" fill="#f5f3ed" />
        <path d="M308 308h5v53h-5z" fill="#17251e" />
        <path d="M310 316h1v42h-1z" fill="#dce3de" />
        <path d="M302 359h20v11h-20z" fill="#17251e" />
        <path d="M305 362h14v5h-14z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--backswing">
        <path
          d="M251 260h13v-12h-9v-21h-12v-19h11v15h9v22h11v21h-23zm51 6h11v-18h-15v-13h-18v-12h-21v12h16v12h18v13h9z"
          fill="#17251e"
        />
        <path
          d="M255 263h6v-12h-10v-25h-5v-14h5v14h9v22h10v13h-8v4h-7zm51 6h3v-17h-14v-14h-17v-12h-14v6h13v12h19v13h10z"
          fill="#f0cfb7"
        />
        <path d="M241 203h17v12h-17z" fill="#17251e" />
        <path d="M244 205h11v8h-11z" fill="#f5f3ed" />
        <path d="M249 203l-15-58 5-1 15 59z" fill="#17251e" />
        <path d="M249 193l-11-44 1-1 11 45z" fill="#dce3de" />
        <path d="M225 134h19v13h-19z" fill="#17251e" />
        <path d="M228 137h13v7h-13z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--downswing">
        <path
          d="M252 260h12v14h15v11h20v12h-24v-10h-17v-12h-6zm49 6h12v17h10v16h-12v-11h-10z"
          fill="#17251e"
        />
        <path
          d="M256 264h5v13h16v11h18v6h-18v-10h-16v-12h-5zm48 6h5v17h10v8h-5v-11h-10z"
          fill="#f0cfb7"
        />
        <path d="M299 292h17v13h-17z" fill="#17251e" />
        <path d="M302 295h11v7h-11z" fill="#f5f3ed" />
        <path d="M307 302l37 34-3 4-37-34z" fill="#17251e" />
        <path d="M314 310l27 25-1 1-27-25z" fill="#dce3de" />
        <path d="M337 333h19v12h-19z" fill="#17251e" />
        <path d="M340 336h13v6h-13z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--followthrough">
        <path
          d="M251 260h13v10h12v-13h17v-15h14v-19h12v24h-17v18h-17v17h-21v-10h-13zm50 6h12v-13h16v-18h-11v14h-17z"
          fill="#17251e"
        />
        <path
          d="M255 264h6v10h12v-13h23v-16h15v-18h5v17h-17v18h-17v16h-15v-10h-12zm50 5h4v-16h16v-14h-4v13h-16z"
          fill="#f0cfb7"
        />
        <path d="M306 217h17v13h-17z" fill="#17251e" />
        <path d="M309 220h11v7h-11z" fill="#f5f3ed" />
        <path d="M314 218l-45-48 4-4 45 49z" fill="#17251e" />
        <path d="M309 209l-35-38 1-1 35 38z" fill="#dce3de" />
        <path d="M260 157h19v13h-19z" fill="#17251e" />
        <path d="M263 160h13v7h-13z" fill={clubColor} />
      </g>
    </g>
  );
}

export default function GolfScene({ phase, clubColor }: { phase: GolfPhase; clubColor: string }) {
  return (
    <svg
      className={`golf-scene golf-scene--${phase}`}
      viewBox="0 0 600 480"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {/* An isolated patch of turf sits directly on the page, with no backdrop rectangle. */}
      <path
        d="M174 348h280v7h52v9h26v10h14v20h-14v11h-30v9h-53v8H175v-8h-54v-9H91v-11H77v-20h14v-10h29v-9h54z"
        fill="#a2bf72"
      />
      <path
        d="M179 342h270v7h51v9h28v10h13v20h-15v10h-31v9h-55v8H185v-8h-54v-9h-32v-10H83v-20h15v-10h29v-9h52z"
        fill="#dfff7f"
      />
      <path
        d="M83 381h16v10h33v9h53v8h255v-8h54v-9h32v-10h15v7h-15v10h-31v9h-55v8H185v-8h-54v-9h-32v-10H83z"
        fill="#bfdc7b"
      />
      <path
        d="M126 373h31v3h-31zm56-17h18v3h-18zm-1 40h37v3h-37zm141 0h32v3h-32zm55-42h23v3h-23zm121 27h18v3h-18zm-73 13h21v3h-21zm-203-23h13v3h-13z"
        fill="#b5d273"
      />
      <path
        d="M166 372h4v-8h3v8h5v3h-12zm232 26h4v-9h3v9h6v3h-13zm98-32h3v-7h3v7h5v3h-11z"
        fill="#8db363"
      />
      <path d="M201 379h14v11h-14zm174 8h14v11h-14z" fill="#17251e" />
      <path d="M204 376h8v9h-8zm174 8h8v9h-8z" fill="#f399bf" />
      <path d="M204 376h8v3h-8zm174 8h8v3h-8z" fill="#ffc5dd" />
      <GolfBag />
      <Golfer clubColor={clubColor} />
      <path d="M311 380h4v9h-4zm-3-1h10v3h-10z" fill="#f5f3ed" />
      <g className="golf-scene__tee-ball">
        <path d="M310 369h6v3h3v6h-3v3h-6v-3h-3v-6h3z" fill="#17251e" />
        <path d="M310 372h6v6h-6z" fill="#f5f3ed" />
        <path d="M314 376h2v2h-2z" fill="#b6c5af" />
      </g>
      <g className="golf-scene__impact" fill="#f5f3ed">
        <path d="M294 361h4v8h-4zm32 0h4v8h-4zm-16-12h4v9h-4zm-29 25h10v4h-10zm48 0h12v4h-12z" />
      </g>
    </svg>
  );
}
