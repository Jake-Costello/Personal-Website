import Golfer from './GolfGolfer';
import './golf-scene.css';

export type GolfPhase = 'idle' | 'swing' | 'flight' | 'reading' | 'falling';

// Mirror the golfer and ball together about the center of the drop target.
const GOLFER_MIRROR_X = 580;

// The HTML controls share these coordinates so they stay aligned as the scene resizes.
export const GOLF_SCENE_GEOMETRY = {
  width: 600,
  height: 480,
  tee: { x: GOLFER_MIRROR_X - 313, y: 375 },
  golferDrop: { x: 215, y: 165, width: 150, height: 220 },
  bagAnchor: { x: 463, y: 313 },
  clubSlots: [
    { x: 423, y: 196 },
    { x: 429, y: 233 },
    { x: 459, y: 204 },
    { x: 465, y: 244 },
    { x: 495, y: 237 },
    { x: 489, y: 193 },
  ],
} as const;

function ClubHead({ color, kind = 'iron' }: { color: string; kind?: string }) {
  if (kind === 'driver' || kind === 'wood') {
    return (
      <g transform={kind === 'wood' ? 'translate(5 4) scale(.85)' : undefined}>
        <path d="M10 2h17v3h7v5h4v13h-5v5H12v-3H6v-6H3V9h3V5h4z" fill="#17251e" />
        <path d="M11 5h14v3h7v5h3v8h-5v4H13v-3H9v-5H6v-7h5z" fill="#42565c" />
        <path d="M11 5h14v3h6v3H10V8h1z" fill={color} />
        <path d="M8 13h3v7h-3zm6 10h14v2H14z" fill="#819292" />
        <path d="M31 23h6v9h-6z" fill="#17251e" />
        <path d="M33 25h2v7h-2z" fill="#d2dbdb" />
      </g>
    );
  }
  if (kind === 'putter') {
    return (
      <>
        <path d="M6 16h33v8H6z" fill="#17251e" />
        <path d="M9 18h27v4H9z" fill="#c5d0d0" />
        <path d="M12 18h19v1H12z" fill="#f5f3ed" />
        <path d="M31 23h6v9h-6z" fill="#17251e" />
        <path d="M33 24h2v8h-2z" fill="#d2dbdb" />
        <path d="M25 18h3v4h-3z" fill={color} />
      </>
    );
  }
  return (
    <>
      <path d="M5 8h10v3h9v4h12v17h-6v-7H12v-4H5z" fill="#17251e" />
      <path d="M8 11h6v3h9v4h10v4H14v-4H8z" fill="#c5d0d0" />
      <path d="M9 11h4v3h9v2H12v-2H9z" fill="#f5f3ed" />
      <path d="M12 17h13v1H12zm3 3h14v1H15z" fill="#758a8c" />
      <path d="M32 24h2v8h-2z" fill="#d2dbdb" />
      <path d="M27 18h4v3h-4z" fill={color} />
    </>
  );
}

export function GolfClubHeadIcon({
  color,
  className,
  kind,
}: {
  color: string;
  className?: string;
  kind?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 32"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <ClubHead color={color} kind={kind} />
    </svg>
  );
}

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
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M31 27h6v107h-6z" fill="#17251e" />
      <path d="M33 29h2v102h-2z" fill="#dce3de" />
      <path d="M30 121h8v19h-8z" fill="#17251e" />
      <path d="M32 123h2v14h-2z" fill={color} />
      <ClubHead color={color} kind={kind} />
    </svg>
  );
}

function GolfBag({ frontOnly = false }: { frontOnly?: boolean }) {
  return (
    <g className="golf-scene__bag">
      {!frontOnly && (
        <>
          <path d="M424 382h99v6h-99zm11 6h78v4h-78z" fill="#719656" opacity=".6" />
          <path d="M431 263h70v4h13v13h-89v-13h6z" fill="#17251e" />
          <path d="M433 267h65v3h10v9h-77v-9h2z" fill="#091712" />
          <path d="M433 267h65v2h-65z" fill="#8b9b93" />
        </>
      )}
      <path d="M425 275h89v11h-7v66h-5v31h-63v-7h-5v-30h-4v-59h-5z" fill="#17251e" />
      <path d="M434 285h68v65h-5v27h-53v-5h-5v-29h-5z" fill="#355a74" />
      <path d="M481 285h21v65h-5v27h-16z" fill="#274559" />
      <path d="M430 278h79v4h-79z" fill="#b9c8c4" />
      <path d="M437 286h8v83h-4v-29h-4z" fill="#517e95" />
      <path d="M445 307h22v5h5v42h-5v9h-22v-6h-5v-43h5z" fill="#17251e" />
      <path d="M447 311h16v5h5v34h-5v8h-16v-5h-3v-36h3z" fill="#426e86" />
      <path d="M448 318h2v30h-2zm-2 31h6v4h-6z" fill="#dce3de" />
      <path d="M455 326h8v12h-8z" fill="#bfa7db" />
      <path d="M485 310h16v8h6v39h-6v9h-16z" fill="#17251e" />
      <path d="M489 315h8v7h6v31h-6v8h-8z" fill="#355a74" />
      <path d="M492 321h2v23h-2zm-2 24h6v4h-6z" fill="#b9c8c4" />
      <path d="M503 290h13v7h6v45h-6v17h-8v-7h5v-14h4v-35h-5v-6h-9z" fill="#17251e" />
      <path d="M447 370h26v3h-26z" fill="#517e95" />
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
      <GolfBag frontOnly />
    </svg>
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
      <g transform={`translate(${GOLFER_MIRROR_X} 0) scale(-1 1)`}>
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
      </g>
    </svg>
  );
}
