import { MAX_SPEED } from '../game/model';
import type { TrialObstacle } from '../game/trial';

function Buoy() {
  return (
    <>
      <path d="M-7-41h14v7H7v17h9v9h9v10h-50V-8h9v-9h9v-17h-7z" fill="#17251e" />
      <path d="M-4-31h8v14h9v8h8v8h-42v-8h8v-8h9z" fill="#ef876f" />
      <path d="M-4-26h8v8h-8zm-9 15h26v7h-26z" fill="#f5f3ed" />
      <path d="M-9-42H6v5H-9z" fill="#dfff7f" />
      <path d="M-21 3h42v4h-42z" fill="#75b2b7" />
    </>
  );
}

function ToyPlane() {
  return (
    <>
      <path
        d="M-38-18h11l-8-23h12l12 24H4L-5-34H8l15 17h9l10 8v9H13L-2 13h-18l8-13h-18v-8h-8z"
        fill="#17251e"
      />
      <path d="M-33-14h13l-10-24h5l13 25h42l8 6v3h-65v-8h-6z" fill="#f5f3ed" />
      <path d="M1-31h6l14 18H9z" fill="#e8bc62" />
      <path d="M-8-5h19L-4 9h-10z" fill="#e8bc62" />
      <path d="M-7-2H8L3 3H-10z" fill="#f5f3ed" />
      <path d="M19-12h10l5 5H19z" fill="#4e83a0" />
      <path d="M-14-10h4v4h-4zm10 0h4v4h-4zm10 0h4v4H6z" fill="#496356" />
      <path d="M-29-30h8l3 6h-9z" fill="#b99acb" />
      <path d="M-30 1H35v5H-30z" fill="#98cbd0" opacity="0.75" />
      <path d="M-38 7h19m21 2h31" stroke="#dbf3f0" strokeWidth="3" />
    </>
  );
}

function BobcatFloat() {
  return (
    <>
      {/* A little bobcat riding safely inside its own pool ring. */}
      <path d="M-27-10h10v-5h34v5h10v7h6v10h-66V-3h6z" fill="#17251e" />
      <path d="M-26-6h14v-5h24v5h14v11h-52z" fill="#f399bf" />
      <path d="M-12-6h24v8h-24z" fill="#789082" />
      <path d="M-23-4h8v8h-8zm38 0h8v8h-8z" fill="#fac6da" />
      <path d="M-14-34v-12h8l4 6h6l4-6h8v12h4v20h-5v9h-29v-9h-5v-20z" fill="#17251e" />
      <path d="M-10-40h4v7H6v-7h5v10h5v13h-5v9h-21v-9h-5v-13h5z" fill="#c59a63" />
      <path d="M-6-35H7v15H-6z" fill="#e8c792" />
      <path d="M-13-23h7v10h-7zm19 0h8v10H6z" fill="#f5e0b8" />
      <path d="M-9-28h4v5h-4zm15 0h4v5H6zM-3-21h7v4h-7z" fill="#17251e" />
      <path d="M-18-14h7v5h-7zm29 0h7v5h-7z" fill="#e8c792" />
      <path d="M-25 7h50v4h-50z" fill="#75b2b7" />
    </>
  );
}

function PaintCans() {
  return (
    <>
      <g transform="translate(-13 -2) rotate(-8)">
        <path d="M-10-31H9v5h4V4h-27v-30h4z" fill="#17251e" />
        <path d="M-10-24H9V0h-19z" fill="#f5f3ed" />
        <path d="M-10-18H9v12h-19z" fill="#4e83a0" />
        <path d="M-9-28H8v4H-9z" fill="#abc9c5" />
        <path d="M-3-16h6v7h-6z" fill="#b99acb" />
        <path d="M-14-23h-4v15h4" stroke="#17251e" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(15 2) rotate(9)">
        <path d="M-9-25H8v5h3V3h-24v-23h4z" fill="#17251e" />
        <path d="M-9-18H7V0H-9z" fill="#f5f3ed" />
        <path d="M-9-14H7v9H-9z" fill="#e8bc62" />
        <path d="M-8-22H6v4H-8z" fill="#abc9c5" />
        <path d="M11-16h4v12h-4" stroke="#17251e" strokeWidth="2" fill="none" />
      </g>
      <path d="M-31 6h21m13 3h30" stroke="#dbf3f0" strokeWidth="3" />
    </>
  );
}

const obstacleArt = { buoy: Buoy, plane: ToyPlane, bobcat: BobcatFloat, paint: PaintCans };

export default function TrialObstacles({
  obstacles,
  position,
  width,
  height,
  reduced,
  lastHit = null,
}: {
  obstacles: readonly TrialObstacle[];
  position: number;
  width: number;
  height: number;
  reduced: boolean;
  lastHit?: string | null;
}) {
  const boatX = width * 0.28;
  const projection = (width - boatX - 35) / (MAX_SPEED * 2 * 3);
  const scale = width < 560 ? 0.9 : 1.2;

  return (
    <g className="trial-obstacles" aria-hidden="true" shapeRendering="crispEdges">
      {obstacles.map((obstacle) => {
        const x = boatX + (obstacle.position - position) * projection;
        if (x < -60 || x > width + 60) return null;
        const Art = obstacleArt[obstacle.kind];
        const bob = reduced ? 0 : Math.sin((obstacle.position - position) / 220) * 2;
        return (
          <g
            key={obstacle.id}
            className={`trial-obstacle${lastHit === obstacle.id ? ' is-hit' : ''}`}
            data-obstacle={obstacle.id}
            data-kind={obstacle.kind}
            data-passed={position >= obstacle.position}
            data-distance={obstacle.position - position}
            transform={`translate(${x} ${height - 44 + bob}) scale(${scale})`}
          >
            <ellipse cy="7" rx="38" ry="4" fill="#75b2b7" opacity="0.6" />
            <Art />
          </g>
        );
      })}
    </g>
  );
}
