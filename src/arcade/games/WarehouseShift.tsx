import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ArcadeInput } from '../input';
import {
  RACKS,
  STATIONS,
  UPGRADE_COST,
  buyUpgrade,
  canStand,
  capacity,
  newWarehouse,
  nextStation,
  routeTo,
  stationNear,
  workAt,
} from './warehouse-model';
import type { Point, WarehouseState, WarehouseStation, WarehouseUpgrade } from './warehouse-model';
import './warehouse-shift.css';

const START = { x: 202, y: 438 };
const LABELS: Record<WarehouseStation, string> = {
  receiving: 'RECEIVE',
  racks: 'STOCK / PICK',
  dispatch: 'DISPATCH',
};

function Crate({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const size = small ? 18 : 25;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect y="3" width={size} height={size} rx="2" fill="#523c2d" opacity=".18" />
      <rect width={size} height={size} rx="2" fill="#cf9062" stroke="#a46d4b" strokeWidth="1.5" />
      <path d={`M${size / 2} 0v${size}`} stroke="#efd0a3" strokeWidth="5" />
      <path d={`M3 ${size - 5}h5`} stroke="#8a6044" strokeWidth="2" />
    </g>
  );
}

function Truck({ outbound = false, count }: { outbound?: boolean; count: number }) {
  const x = outbound ? 817 : 34;
  return (
    <g transform={`translate(${x} 230)`}>
      <rect x="-3" y="11" width="112" height="158" rx="13" fill="#1e3031" opacity=".14" />
      <rect x="-5" y="23" width="12" height="29" rx="4" fill="#263434" />
      <rect x="-5" y="116" width="12" height="29" rx="4" fill="#263434" />
      <rect x="98" y="23" width="12" height="29" rx="4" fill="#263434" />
      <rect x="98" y="116" width="12" height="29" rx="4" fill="#263434" />
      <rect
        width="105"
        height="157"
        rx="9"
        fill={outbound ? '#648678' : '#d8ad63'}
        stroke="#364d49"
        strokeWidth="3"
      />
      <rect x="6" y="6" width="93" height="31" rx="6" fill={outbound ? '#95b3a0' : '#f1ca7e'} />
      <rect x="14" y="12" width="77" height="15" rx="3" fill="#344f51" />
      <path d="M42 12l-9 15m24-15-9 15" stroke="#73938d" strokeWidth="3" />
      <rect
        x="8"
        y="43"
        width="89"
        height="105"
        rx="2"
        fill="#f0eee1"
        stroke="#576c60"
        strokeWidth="2"
      />
      <path d="M13 49h79M13 142h79" stroke="#c6cdc0" strokeWidth="3" />
      {Array.from({ length: outbound ? Math.min(count, 6) : 6 }, (_, index) => (
        <Crate key={index} x={16 + (index % 3) * 26} y={58 + Math.floor(index / 3) * 40} small />
      ))}
      <rect
        x={outbound ? -8 : 100}
        y="69"
        width="13"
        height="64"
        fill="#aeb9a5"
        stroke="#526b5a"
        strokeWidth="2"
      />
    </g>
  );
}

export default function WarehouseShift({ input, active }: { input: ArcadeInput; active: boolean }) {
  const [state, setState] = useState(newWarehouse);
  const [pose, setPose] = useState({ ...START, facing: 0 });
  const [showUpgrades, setShowUpgrades] = useState(false);
  const stateRef = useRef(state);
  const position = useRef({ ...START, facing: 0 });
  const menuRef = useRef(false);
  const activeRef = useRef(active);
  const route = useRef<{ points: Point[]; station?: WarehouseStation } | null>(null);
  activeRef.current = active;

  const publish = useCallback((next: WarehouseState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const toggleUpgrades = useCallback(() => {
    if (!activeRef.current) return;
    route.current = null;
    menuRef.current = !menuRef.current;
    setShowUpgrades(menuRef.current);
  }, []);

  const interact = useCallback(() => {
    if (!activeRef.current || menuRef.current) return;
    route.current = null;
    const station = stationNear(position.current);
    publish(
      station
        ? workAt(stateRef.current, station)
        : {
            ...stateRef.current,
            message: 'Walk to a glowing work zone, then interact. Or tap a zone to work.',
          },
    );
  }, [publish]);

  const reset = useCallback(() => {
    if (!activeRef.current) return;
    route.current = null;
    position.current = { ...START, facing: 0 };
    setPose(position.current);
    menuRef.current = false;
    setShowUpgrades(false);
    publish(newWarehouse());
  }, [publish]);

  useEffect(() => {
    if (!active) {
      route.current = null;
      return;
    }
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const fresh = (key: string) => input.pressed.has(key) && !previous.has(key);
      const action = fresh('action');
      const secondary = fresh('secondary');
      const restart = fresh('reset');
      previous = new Set(input.pressed);
      if (restart) reset();
      else if (secondary) toggleUpgrades();
      else if (action) interact();
    });
  }, [active, input, interact, reset, toggleUpgrades]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    let lastRendered = { ...position.current };
    const tick = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 0.04);
      last = now;
      if (!menuRef.current) {
        let dx = Number(input.pressed.has('right')) - Number(input.pressed.has('left'));
        let dy = Number(input.pressed.has('down')) - Number(input.pressed.has('up'));
        const manual = dx !== 0 || dy !== 0;
        if (manual) route.current = null;
        const speed = stateRef.current.automation ? 225 : 180;
        let travel = speed * dt;
        if (!manual && route.current) {
          while (
            route.current.points.length &&
            Math.hypot(
              route.current.points[0].x - position.current.x,
              route.current.points[0].y - position.current.y,
            ) < 3
          )
            route.current.points.shift();
          const target = route.current.points[0];
          if (target) {
            dx = target.x - position.current.x;
            dy = target.y - position.current.y;
            travel = Math.min(travel, Math.hypot(dx, dy));
          } else {
            const station = route.current.station;
            route.current = null;
            if (station && stationNear(position.current) === station)
              publish(workAt(stateRef.current, station));
          }
        }
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) {
          const candidateX = {
            ...position.current,
            x: position.current.x + (dx / magnitude) * travel,
          };
          if (canStand(candidateX)) position.current.x = candidateX.x;
          const candidateY = {
            ...position.current,
            y: position.current.y + (dy / magnitude) * travel,
          };
          if (canStand(candidateY)) position.current.y = candidateY.y;
          position.current.facing = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        }
        if (stateRef.current.automation && stateRef.current.carrying) {
          const station = stationNear(position.current);
          if (
            (station === 'racks' && stateRef.current.cargo === 'inbound') ||
            (station === 'dispatch' && stateRef.current.cargo === 'order')
          ) {
            if (route.current?.station === station) route.current.station = undefined;
            publish(workAt(stateRef.current, station));
          }
        }
        if (
          now - lastPaint > 32 &&
          (position.current.x !== lastRendered.x ||
            position.current.y !== lastRendered.y ||
            position.current.facing !== lastRendered.facing)
        ) {
          lastRendered = { ...position.current };
          setPose(lastRendered);
          lastPaint = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, input, publish]);

  const goTo = (station: WarehouseStation) => {
    if (!active || showUpgrades) return;
    if (stationNear(position.current) === station) {
      route.current = null;
      publish(workAt(stateRef.current, station));
      return;
    }
    route.current = { points: routeTo(position.current, STATIONS[station]), station };
  };

  const moveToFloor = (event: PointerEvent<SVGSVGElement>) => {
    if (!active || showUpgrades || (event.target as Element).closest('[data-station]')) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const target = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (target.y < 150 || target.y > 525) return;
    route.current = { points: routeTo(position.current, target) };
  };

  const buy = (upgrade: WarehouseUpgrade) => {
    if (active) publish(buyUpgrade(stateRef.current, upgrade));
  };
  const goal = nextStation(state);
  const phase =
    state.cargo === 'inbound'
      ? 'put-away'
      : state.cargo === 'order'
        ? 'dispatch'
        : state.stock
          ? 'pick'
          : 'receive';
  const step = phase === 'receive' ? 0 : phase === 'put-away' ? 1 : phase === 'pick' ? 2 : 3;
  const near = stationNear(pose);
  const actionLabel =
    near === 'receiving'
      ? 'Unload truck'
      : near === 'dispatch'
        ? 'Ship order'
        : near === 'racks'
          ? state.cargo === 'inbound'
            ? 'Put away'
            : 'Pick order'
          : 'Interact';

  return (
    <div
      className="wh-game"
      data-game="warehouse-shift"
      data-phase={phase}
      data-cash={state.cash}
      data-stock={state.stock}
      data-carrying={state.carrying}
      data-shipped={state.shipped}
      data-x={Math.round(pose.x)}
      data-y={Math.round(pose.y)}
      data-cart={state.cart}
      data-automation={state.automation}
      data-active={active}
    >
      <svg
        className="wh-scene"
        viewBox="0 0 960 600"
        onPointerDown={moveToFloor}
        aria-label="Warehouse floor. Receive goods on the left, stock and pick in the middle, dispatch on the right."
      >
        <defs>
          <pattern id="wh-floor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#a9b7a8" strokeWidth=".8" opacity=".3" />
          </pattern>
          <pattern
            id="wh-hazard"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="14" fill="#cfaf61" />
            <rect x="7" width="7" height="14" fill="#6d745b" />
          </pattern>
        </defs>
        <rect width="960" height="600" fill="#dce1d6" />
        <rect width="960" height="92" fill="#162c2b" />
        <text x="28" y="28" className="wh-eyebrow">
          OPERATIONS / SHIFT 01
        </text>
        <text x="27" y="65" className="wh-title">
          Warehouse Shift
        </text>
        <text x="350" y="48" className="wh-money">
          ${state.cash}
        </text>
        <text x="350" y="71" className="wh-stat-label">
          CASH
        </text>
        <text x="470" y="48" className="wh-stat">
          {state.stock}
        </text>
        <text x="470" y="71" className="wh-stat-label">
          IN STOCK
        </text>
        <text x="584" y="48" className="wh-stat">
          {state.carrying}
          <tspan className="wh-stat-muted">/{capacity(state)}</tspan>
        </text>
        <text x="584" y="71" className="wh-stat-label">
          CARRYING
        </text>
        <text x="704" y="48" className="wh-stat">
          {state.shipped}
        </text>
        <text x="704" y="71" className="wh-stat-label">
          SHIPPED
        </text>
        <rect y="92" width="960" height="51" fill="#eff0e7" />
        {['RECEIVE', 'PUT AWAY', 'PICK ORDER', 'DISPATCH +$20'].map((label, index) => (
          <g
            key={label}
            transform={`translate(${28 + index * 237} 103)`}
            opacity={index === step ? 1 : 0.44}
          >
            <rect width="27" height="27" rx="7" fill={index === step ? '#426b50' : '#bcc5b5'} />
            <text x="13.5" y="18" textAnchor="middle" className="wh-step-number">
              {index + 1}
            </text>
            <text x="37" y="19" className="wh-step-label">
              {label}
            </text>
            {index < 3 && (
              <path d="M199 13h14m-5-4 5 4-5 4" stroke="#798b77" strokeWidth="2" fill="none" />
            )}
          </g>
        ))}
        <rect y="143" width="960" height="388" fill="url(#wh-floor-grid)" />
        <path
          d="M266 164v348M694 164v348"
          stroke="#f5f4df"
          strokeWidth="3"
          strokeDasharray="12 10"
        />
        <path d="M285 332h399" stroke="#bcc8b7" strokeWidth="2" strokeDasharray="12 12" />
        <path d="M416 326l8 6-8 6m124-12 8 6-8 6" stroke="#90a48a" fill="none" strokeWidth="2" />
        <rect
          x="18"
          y="220"
          width="139"
          height="181"
          rx="6"
          fill="none"
          stroke="#abbaa7"
          strokeWidth="2"
        />
        <rect
          x="803"
          y="220"
          width="139"
          height="181"
          rx="6"
          fill="none"
          stroke="#abbaa7"
          strokeWidth="2"
        />
        <text x="88" y="184" className="wh-area-label" textAnchor="middle">
          INBOUND
        </text>
        <text x="480" y="166" className="wh-area-label" textAnchor="middle">
          STORAGE AISLES
        </text>
        <text x="872" y="184" className="wh-area-label" textAnchor="middle">
          OUTBOUND
        </text>
        <Truck count={0} />
        <Truck outbound count={state.shipped} />
        <rect x="151" y="242" width="7" height="141" fill="url(#wh-hazard)" />
        <rect x="802" y="242" width="7" height="141" fill="url(#wh-hazard)" />
        {RACKS.map((rack, index) => (
          <g key={`${rack.x}-${rack.y}`}>
            <rect
              x={rack.x + 5}
              y={rack.y + 7}
              width={rack.w}
              height={rack.h}
              rx="3"
              fill="#213d33"
              opacity=".13"
            />
            <rect
              x={rack.x}
              y={rack.y}
              width={rack.w}
              height={rack.h}
              rx="3"
              fill="#758777"
              stroke="#476354"
              strokeWidth="3"
            />
            {[0, 1].map((row) => (
              <g key={row}>
                <rect
                  x={rack.x + 5}
                  y={rack.y + 6 + row * 48}
                  width="82"
                  height="38"
                  fill="#b7bd9e"
                />
                {[0, 1, 2].map((column) => (
                  <Crate
                    key={column}
                    x={rack.x + 11 + column * 25}
                    y={rack.y + 12 + row * 48}
                    small
                  />
                ))}
              </g>
            ))}
            <path
              d={`M${rack.x} ${rack.y + 47}h92M${rack.x} ${rack.y + 96}h92`}
              stroke="#3f6255"
              strokeWidth="6"
            />
            <rect x={rack.x + 31} y={rack.y + 92} width="30" height="13" rx="2" fill="#f2e9bb" />
            <text x={rack.x + 46} y={rack.y + 102} className="wh-rack-label" textAnchor="middle">
              A{index + 1}
            </text>
          </g>
        ))}
        {(Object.entries(STATIONS) as [WarehouseStation, Point][]).map(
          ([station, point], index) => (
            <g
              key={station}
              data-station={station}
              role="button"
              tabIndex={active && !showUpgrades ? 0 : -1}
              aria-label={
                station === 'receiving'
                  ? 'Walk to receiving and unload goods'
                  : station === 'racks'
                    ? 'Walk to racks and put away or pick goods'
                    : 'Walk to dispatch and ship order'
              }
              onPointerDown={(event) => {
                event.stopPropagation();
                goTo(station);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  goTo(station);
                }
              }}
              className={`wh-station${goal === station ? ' wh-station--goal' : ''}`}
            >
              <rect
                x={point.x - 48}
                y={point.y - 47}
                width="96"
                height="99"
                rx="12"
                className="wh-zone"
              />
              <circle cx={point.x} cy={point.y - 5} r="24" className="wh-zone-circle" />
              <text x={point.x} y={point.y + 2} className="wh-zone-number" textAnchor="middle">
                {index + 1}
              </text>
              <text x={point.x} y={point.y + 37} textAnchor="middle" className="wh-zone-label">
                {LABELS[station]}
              </text>
              {goal === station && (
                <path
                  d={`M${point.x - 5} ${point.y - 61}l5 6 5-6`}
                  stroke="#376344"
                  fill="none"
                  strokeWidth="3"
                />
              )}
            </g>
          ),
        )}
        <text x="87" y="424" className="wh-floor-note" textAnchor="middle">
          SUPPLY READY
        </text>
        <text x="870" y="424" className="wh-floor-note" textAnchor="middle">
          $20 / BOX
        </text>
        {state.automation && (
          <g>
            <rect x="718" y="466" width="204" height="28" rx="7" fill="#bbd3b7" />
            <circle cx="733" cy="480" r="4" fill="#43734b" />
            <text x="744" y="484" className="wh-automation-label">
              ROUTING AUTOMATION ON
            </text>
          </g>
        )}
        <g transform={`translate(${pose.x} ${pose.y})`} className="wh-worker">
          <ellipse cy="9" rx="18" ry="12" fill="#243c2c" opacity=".19" />
          {state.cart && (
            <g transform={`rotate(${pose.facing})`}>
              <rect
                x="-19"
                y="18"
                width="38"
                height="39"
                rx="4"
                fill="#728c7c"
                stroke="#355446"
                strokeWidth="3"
              />
              <path
                d="M-22 26v22m44-22v22M-14 18V9h28v9"
                stroke="#263d35"
                fill="none"
                strokeWidth="4"
              />
              {state.carrying > 0 && <Crate x={-9} y={27} small />}
              {state.carrying > 1 && <Crate x={-15} y={20} small />}
              {state.carrying > 2 && <Crate x={-3} y={15} small />}
            </g>
          )}
          <g transform={`rotate(${pose.facing})`}>
            <rect x="-12" y="3" width="9" height="16" rx="4" fill="#2b4144" />
            <rect x="3" y="3" width="9" height="16" rx="4" fill="#2b4144" />
            <rect
              x="-17"
              y="-11"
              width="34"
              height="28"
              rx="11"
              fill="#d38948"
              stroke="#73472e"
              strokeWidth="2"
            />
            <path d="M-9-9v24M9-9v24" stroke="#e9e69a" strokeWidth="4" />
            <circle cy="-5" r="11" fill="#dca475" />
            <path
              d="M-12-6a12 12 0 0 1 24 0v4h-24z"
              fill="#ead66f"
              stroke="#b59d4b"
              strokeWidth="1.5"
            />
            {!state.cart && state.carrying > 0 && <Crate x={-12} y={-30} />}
          </g>
          <path d="M-6-36l6 5 6-5" stroke="#233c30" strokeWidth="2.5" fill="none" />
        </g>
        <text x="28" y="519" className="wh-feedback">
          {state.message}
        </text>
        <rect y="531" width="960" height="69" fill="#162c2b" />
        <text x="26" y="556" className="wh-goal">
          {phase === 'receive'
            ? 'NEXT: UNLOAD THE INBOUND TRUCK'
            : phase === 'put-away'
              ? 'NEXT: PUT YOUR LOAD INTO STORAGE'
              : phase === 'pick'
                ? 'NEXT: PICK AN ORDER FROM THE RACKS'
                : 'NEXT: SHIP YOUR ORDER FOR CASH'}
        </text>
        <text x="26" y="581" className="wh-help">
          Tap a work zone to walk &amp; work. Or use the stick + Interact.
        </text>
      </svg>
      <div className="wh-compact-hud" aria-hidden="true">
        <span>
          <strong>${state.cash}</strong> cash
        </span>
        <span>
          Carry{' '}
          <b>
            {state.carrying}/{capacity(state)}
          </b>
        </span>
        <span>
          Stock <b>{state.stock}</b>
        </span>
        <span>
          Sent <b>{state.shipped}</b>
        </span>
      </div>
      <div className="wh-compact-zones" aria-hidden="true">
        <span data-current={goal === 'receiving'}>1 Receive</span>
        <span data-current={goal === 'racks'}>2 Stock / pick</span>
        <span data-current={goal === 'dispatch'}>3 Ship</span>
      </div>
      <div className="wh-compact-next" aria-hidden="true">
        {phase === 'receive'
          ? 'Next: Left truck · unload a box'
          : phase === 'put-away'
            ? 'Next: Middle racks · put your load away'
            : phase === 'pick'
              ? 'Next: Middle racks · interact again to pick'
              : `Next: Right truck · ship for $${state.carrying * 20}`}
      </div>
      <button
        className={`wh-upgrade-toggle${state.cash >= 40 && !state.cart ? ' wh-upgrade-toggle--ready' : ''}`}
        onClick={toggleUpgrades}
        disabled={!active}
        aria-expanded={showUpgrades}
      >
        Upgrades <span>↗</span>
      </button>
      <button className="wh-interact" onClick={interact} disabled={!active || showUpgrades}>
        {actionLabel}
        <span> E</span>
      </button>
      <p className="wh-sr-only" role="status" aria-live="polite">
        {state.message} Cash: ${state.cash}. Stock: {state.stock}. Carrying: {state.carrying} of{' '}
        {capacity(state)}. Shipped: {state.shipped}.
      </p>
      {showUpgrades && (
        <div
          className="wh-menu"
          role="dialog"
          aria-label="Warehouse upgrades"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="wh-menu-card">
            <div className="wh-menu-heading">
              <div>
                <span>REINVEST YOUR SHIFT</span>
                <h3>Better tools. Bigger loads.</h3>
              </div>
              <button onClick={toggleUpgrades} aria-label="Close upgrades">
                ×
              </button>
            </div>
            <p className="wh-menu-balance">
              Available cash <strong>${state.cash}</strong>
            </p>
            <div className="wh-upgrade-row">
              <span className="wh-upgrade-icon" aria-hidden="true">
                ▤
              </span>
              <div>
                <h4>Picking carts</h4>
                <p>Carry 3 boxes on every trip.</p>
              </div>
              <button
                onClick={() => buy('cart')}
                disabled={state.cart || state.cash < UPGRADE_COST.cart}
              >
                {state.cart ? 'Installed' : '$40 · Buy'}
              </button>
            </div>
            <div className="wh-upgrade-row">
              <span className="wh-upgrade-icon" aria-hidden="true">
                ⇢
              </span>
              <div>
                <h4>Routing automation</h4>
                <p>Auto stow &amp; dispatch. Move 25% faster.</p>
              </div>
              <button
                onClick={() => buy('automation')}
                disabled={state.automation || state.cash < UPGRADE_COST.automation}
              >
                {state.automation ? 'Installed' : '$100 · Buy'}
              </button>
            </div>
            <div className="wh-menu-footer">
              <span>Earn $20 for every box you ship.</span>
              <button onClick={toggleUpgrades}>Back to shift →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
