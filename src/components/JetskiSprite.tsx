import type { RideState } from '../game/model';

const pixel = (value: number) => Math.round(value / 2) * 2;

export default function JetskiSprite({
  state,
  x,
  y,
  reduced,
  scale,
}: {
  state: RideState;
  x: number;
  y: number;
  reduced: boolean;
  scale: number;
}) {
  const airborne = state.height > 0;
  const extension = airborne ? 1 : 0;
  const crouch = state.crouch;
  const turnScale = state.turn > 0 && !reduced ? 0.42 + Math.abs(state.turn / 0.3 - 0.5) * 1.16 : 1;
  const pitch = airborne ? Math.max(-14, Math.min(12, -state.lift / 35)) : crouch * 5;
  const hip = { x: pixel(-28 - crouch * 12), y: pixel(-34 + crouch * 13 - extension * 10) };
  const knee = {
    x: pixel(-16 + crouch * 12 - extension * 12),
    y: pixel(-20 + crouch * 5 - extension * 5),
  };
  const shoulder = {
    x: pixel(-16 - crouch * 10 - extension * 5),
    y: pixel(hip.y - 20 + crouch * 5),
  };
  const hand = {
    x: pixel(6 - crouch * 4 - extension * 5),
    y: pixel(-44 + crouch * 14 - extension * 10),
  };
  return (
    <g
      className="jetski-sprite"
      data-rider-pose={airborne ? 'extended' : crouch > 0.55 ? 'crouched' : 'cruising'}
      transform={`translate(${x} ${y - (reduced ? state.height * 0.35 : state.height)})`}
    >
      <g
        transform={`scale(${state.facing * turnScale * scale} ${scale}) rotate(${reduced ? 0 : pitch})`}
        shapeRendering="crispEdges"
      >
        {Math.abs(state.velocity) > 25 && !airborne && (
          <g fill="#f5f3ed">
            <path d="M-47 7h-12V3h-10v-5h-8v-7h-6V1h6v7h13v5h17zM-64 16h-29v3h29z" />
            <path d="M-88-6h-5v5h5zm-10-9h4v4h-4zm19-3h4v4h-4z" />
          </g>
        )}
        {/* Low, narrow hull; open rear foot tray; raised engine hood. No seat. */}
        <path
          fill="#17251e"
          d="M-49-8h37v-10h8v-6h21v4h13v6h13v5h12v5h9v9h-8v7H43v5h-76v-5h-12V6h-8V-2h4z"
        />
        <path fill="#f399bf" d="M-47-3h37v-9H0v-7h15v4h13v6h14v5h13v5H43v5h-84V3h-6z" />
        <path fill="#fac6da" d="M-3-14h17v4h13v5H-3zM29-4h13v4H29z" />
        <path fill="#f5f3ed" d="M-42 5h85v4H34v4h-65V9h-11z" />
        <path fill="#dfff7f" d="M-24 5h48v4h-48z" />
        <path fill="#496356" d="M-45-8h31v5h-31z" />
        <path fill="#17251e" d="M2-7h11v4H2zM19-7h5v4h-5zM-47 5h5v4h-5z" />
        {/* Hinged handle pole reaches back from the hood to the standing rider. */}
        <path
          d={`M20-20 14-28 ${hand.x} ${hand.y}`}
          fill="none"
          stroke="#17251e"
          strokeWidth="6"
          strokeLinejoin="bevel"
        />
        <path
          d={`M19-22 12-29 ${hand.x} ${hand.y + 2}`}
          fill="none"
          stroke="#789082"
          strokeWidth="2"
        />
        <path d={`M${hand.x - 7} ${hand.y - 2}h15v4h-15z`} fill="#17251e" />
        {/* Separate feet, shins, knees and hips make the pump readable. */}
        <path
          d={`M${hip.x + 4} ${hip.y} ${knee.x + 8} ${knee.y} -19-9`}
          fill="none"
          stroke="#496356"
          strokeWidth="8"
          strokeLinejoin="bevel"
        />
        <path
          d={`M${hip.x} ${hip.y} ${knee.x} ${knee.y} -32-9`}
          fill="none"
          stroke="#17251e"
          strokeWidth="9"
          strokeLinejoin="bevel"
        />
        <path fill="#17251e" d="M-38-11h13v6h-13zM-23-11h12v6h-12z" />
        <path fill="#f5f3ed" d="M-37-7h12v2h-12zM-22-7h11v2h-11z" />
        <path
          d={`M${hip.x - 6} ${hip.y + 2} ${shoulder.x - 8} ${shoulder.y}h14l4 10L${hip.x + 7} ${hip.y + 2}z`}
          fill="#17251e"
        />
        <path
          d={`M${hip.x - 3} ${hip.y - 3} ${shoulder.x - 5} ${shoulder.y + 2}h8l3 10L${hip.x + 3} ${hip.y - 3}z`}
          fill="#dfff7f"
        />
        <path d={`M${shoulder.x - 3} ${shoulder.y + 10}h12v3h-12z`} fill="#789082" />
        <path
          d={`M${shoulder.x + 4} ${shoulder.y + 5} ${shoulder.x + 13} ${shoulder.y + 17} ${hand.x} ${hand.y}`}
          fill="none"
          stroke="#17251e"
          strokeWidth="8"
          strokeLinejoin="bevel"
        />
        <path
          d={`M${shoulder.x + 5} ${shoulder.y + 6} ${shoulder.x + 13} ${shoulder.y + 16} ${hand.x} ${hand.y}`}
          fill="none"
          stroke="#efae7d"
          strokeWidth="4"
          strokeLinejoin="bevel"
        />
        <g transform={`translate(${shoulder.x - 5} ${shoulder.y - 20})`}>
          <path fill="#17251e" d="M0 3h4V0h12v4h4v15h-6v4H4v-4H0z" />
          <path fill="#f5f3ed" d="M3 5h4V3h8v4h3v5H3z" />
          <path fill="#f399bf" d="M4 5h10v3H4z" />
          <path fill="#efae7d" d="M6 13h11v5h-5v3H6z" />
          <path fill="#17251e" d="M9 10h11v4H9z" />
        </g>
      </g>
    </g>
  );
}
