import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ArcadeInput } from '../input';
import {
  RACKS,
  STATIONS,
  UPGRADE_COST,
  WAREHOUSE_PROGRESS_KEY,
  advanceWarehouseTime,
  nextDay,
  endDay,
  isRack,
  parseWarehouseProgress,
  warehouseProgress,
  buyUpgrade,
  canStand,
  capacity,
  newWarehouse,
  nextStation,
  routeTo,
  stationNear,
  pickAt,
  putAwayAt,
} from './warehouse-model';
import type {
  Point,
  RackId,
  OrderLine,
  WarehouseState,
  WarehouseStation,
  WarehouseUpgrade,
} from './warehouse-model';
import './warehouse-shift.css';

const START = { x: 202, y: 438 };

function loadProgress() {
  try {
    return parseWarehouseProgress(localStorage.getItem(WAREHOUSE_PROGRESS_KEY));
  } catch {
    return parseWarehouseProgress(null);
  }
}

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

function Truck({
  outbound = false,
  incoming,
  order,
}: {
  outbound?: boolean;
  incoming?: RackId;
  order: OrderLine[];
}) {
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
      {outbound ? (
        order.map((line, index) => (
          <g key={line.location}>
            <rect
              x="14"
              y={50 + index * 30}
              width="77"
              height="25"
              rx="3"
              fill={line.delivered ? '#c5e1a5' : '#e4e9dc'}
              stroke="#718d72"
              strokeDasharray={line.delivered ? undefined : '4 3'}
            />
            <text x="52" y={67 + index * 30} textAnchor="middle" className="wh-order-truck-label">
              {line.location} {line.delivered}/{line.required}
            </text>
          </g>
        ))
      ) : (
        <>
          {[0, 1, 2, 3].map((index) => (
            <Crate
              key={index}
              x={18 + (index % 2) * 41}
              y={53 + Math.floor(index / 2) * 30}
              small
            />
          ))}
          <rect x="15" y="115" width="76" height="25" rx="3" fill="#f4cf7e" stroke="#a17a39" />
          <text x="53" y="132" textAnchor="middle" className="wh-order-truck-label">
            {incoming}
          </text>
        </>
      )}
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
  const [state, setState] = useState(() => newWarehouse(loadProgress()));
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

  useEffect(() => {
    try {
      localStorage.setItem(
        WAREHOUSE_PROGRESS_KEY,
        JSON.stringify(warehouseProgress(stateRef.current)),
      );
    } catch {
      /* Storage is optional; the current attempt remains playable. */
    }
  }, [state.cart, state.automation, state.bestDay]);

  const toggleUpgrades = useCallback(() => {
    if (!activeRef.current || stateRef.current.status === 'failed') return;
    route.current = null;
    menuRef.current = !menuRef.current;
    setShowUpgrades(menuRef.current);
  }, []);

  const work = useCallback(
    (action: 'pick' | 'putaway') => {
      if (!activeRef.current || menuRef.current || stateRef.current.status !== 'working') return;
      route.current = null;
      const station = stationNear(position.current);
      publish(
        station
          ? action === 'pick'
            ? pickAt(stateRef.current, station)
            : putAwayAt(stateRef.current, station)
          : {
              ...stateRef.current,
              message: 'Walk to a rack address or a truck, then choose Pick or Put away.',
            },
      );
    },
    [publish],
  );

  const reset = useCallback(() => {
    if (!activeRef.current) return;
    route.current = null;
    position.current = { ...START, facing: 0 };
    setPose(position.current);
    menuRef.current = false;
    setShowUpgrades(false);
    publish(newWarehouse(warehouseProgress(stateRef.current)));
  }, [publish]);

  const continueDay = useCallback(() => {
    if (!activeRef.current) return;
    route.current = null;
    publish(nextDay(stateRef.current));
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
      else if (secondary) work('putaway');
      else if (action) {
        if (stateRef.current.status === 'failed') reset();
        else if (stateRef.current.status === 'day-complete' && !menuRef.current) continueDay();
        else work('pick');
      }
    });
  }, [active, input, work, reset, continueDay]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    let lastRendered = { ...position.current };
    const tick = (now: number) => {
      const elapsed = (now - (last || now)) / 1000;
      const dt = Math.min(elapsed, 0.04);
      last = now;
      if (!menuRef.current && !document.hidden && stateRef.current.status === 'working') {
        const before = stateRef.current;
        const timed = advanceWarehouseTime(before, elapsed);
        stateRef.current = timed;
        if (
          Math.ceil(before.remaining) !== Math.ceil(timed.remaining) ||
          timed.status !== before.status
        )
          setState(timed);
        if (timed.status !== 'working') {
          route.current = null;
          frame = requestAnimationFrame(tick);
          return;
        }
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
            route.current = null;
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
            station &&
            isRack(station) &&
            stateRef.current.carried.some(
              (item) => item.kind === 'inbound' && item.location === station,
            )
          )
            publish(putAwayAt(stateRef.current, station, true));
          else if (
            station === 'dispatch' &&
            stateRef.current.carried.some(
              (item) =>
                item.kind === 'picked' &&
                stateRef.current.order.some(
                  (line) => line.location === item.location && line.delivered < line.required,
                ),
            )
          )
            publish(pickAt(stateRef.current, station));
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
    const resetClock = () => {
      last = 0;
    };
    document.addEventListener('visibilitychange', resetClock);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resetClock);
    };
  }, [active, input, publish]);

  const goTo = (station: WarehouseStation) => {
    if (!active || showUpgrades || stateRef.current.status !== 'working') return;
    route.current = { points: routeTo(position.current, STATIONS[station]), station };
  };

  const moveToFloor = (event: PointerEvent<SVGSVGElement>) => {
    if (
      !active ||
      showUpgrades ||
      stateRef.current.status !== 'working' ||
      (event.target as Element).closest('[data-station]')
    )
      return;
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
  const timeLabel = `${Math.floor(Math.ceil(state.remaining) / 60)}:${String(Math.ceil(state.remaining) % 60).padStart(2, '0')}`;
  const near = stationNear(pose);
  const carriedLabel = state.carried.map((item) => `${item.location} x${item.quantity}`).join(', ');
  const destination = state.quotaMet
    ? 'Quota met: restock for tomorrow or End day'
    : state.carrying
      ? `Carrying ${carriedLabel}`
      : `Incoming: ${state.inboundLocation} / Pick: ${state.order
          .filter((line) => line.delivered < line.required)
          .map((line) => line.location)
          .join(' + ')}`;
  const finishDay = () => {
    if (active) {
      route.current = null;
      publish(endDay(stateRef.current));
    }
  };

  return (
    <div
      className="wh-game"
      data-game="warehouse-shift"
      data-phase={state.quotaMet ? 'restock' : state.carrying ? 'carrying' : 'working'}
      data-cash={state.cash}
      data-stock={state.stock}
      data-carrying={state.carrying}
      data-shipped={state.shipped}
      data-x={Math.round(pose.x)}
      data-y={Math.round(pose.y)}
      data-cart={state.cart}
      data-automation={state.automation}
      data-active={active}
      data-day={state.day}
      data-quota={state.quota}
      data-day-shipped={state.dayShipped}
      data-remaining={Math.ceil(state.remaining)}
      data-status={state.status}
      data-near={near ?? ''}
      data-inbound-location={state.inboundLocation}
      data-order={JSON.stringify(state.order)}
      data-carried={JSON.stringify(state.carried)}
      data-inventory={JSON.stringify(state.inventory)}
      data-quota-met={state.quotaMet}
      data-best-day={state.bestDay}
    >
      <svg
        className="wh-scene"
        viewBox="0 0 960 600"
        onPointerDown={moveToFloor}
        aria-label="Warehouse floor. Unload labeled boxes at inbound. Every rack address supports picking and putaway. Fill all outbound order slots to ship an order."
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
          OPERATIONS / DAY {state.day} / BEST {state.bestDay}
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
          {state.dayShipped}/{state.quota}
        </text>
        <text x="470" y="71" className="wh-stat-label">
          ORDERS TODAY
        </text>
        <text x="584" y="48" className="wh-stat">
          {state.carrying}
          <tspan className="wh-stat-muted">/{capacity(state)}</tspan>
        </text>
        <text x="584" y="71" className="wh-stat-label">
          CARRYING
        </text>
        <text
          x="900"
          y="48"
          textAnchor="end"
          className={`wh-stat${state.remaining < 15 ? ' wh-time-low' : ''}`}
        >
          {timeLabel}
        </text>
        <text x="900" y="71" textAnchor="end" className="wh-stat-label">
          TIME LEFT
        </text>
        <rect y="92" width="960" height="51" fill="#eff0e7" />
        <text x="28" y="113" className="wh-assignment-label">
          NEXT INBOUND BOX
        </text>
        <text x="28" y="134" className="wh-assignment-value">
          {state.inboundLocation} / PUT AWAY
        </text>
        <text x="285" y="119" className="wh-step-label">
          {state.quotaMet ? 'QUOTA MET' : 'OUTBOUND ORDER'}
        </text>
        {state.order.map((line, index) => (
          <g key={line.location} transform={`translate(${460 + index * 156} 101)`}>
            <rect
              width="144"
              height="33"
              rx="5"
              fill={line.delivered === line.required ? '#d4e9b4' : '#e5e9dc'}
              stroke="#9faf93"
            />
            <text x="72" y="23" textAnchor="middle" className="wh-order-slot">
              {line.location} / {line.delivered}/{line.required}
            </text>
          </g>
        ))}
        {state.quotaMet && (
          <text x="460" y="123" className="wh-step-label">
            RESTOCK NOW. YOUR INVENTORY STAYS.
          </text>
        )}
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
        <Truck incoming={state.inboundLocation} order={[]} />
        <Truck outbound order={state.order} />
        <rect x="151" y="242" width="7" height="141" fill="url(#wh-hazard)" />
        <rect x="802" y="242" width="7" height="141" fill="url(#wh-hazard)" />
        {RACKS.map((rack) => (
          <g key={rack.id} className="wh-rack">
            <rect
              x={rack.x + 4}
              y={rack.y + 5}
              width={rack.w}
              height={rack.h}
              rx="4"
              fill="#213d33"
              opacity=".15"
            />
            <rect
              x={rack.x}
              y={rack.y}
              width={rack.w}
              height={rack.h}
              rx="4"
              fill="#758777"
              stroke="#476354"
              strokeWidth="3"
            />
            {[0, 1, 2, 3].map((bay) => (
              <g key={bay}>
                {[0, 1].map((side) => {
                  const address = `${rack.id}${bay + side * 4 + 1}` as RackId;
                  return (
                    <g key={side}>
                      <rect
                        x={rack.x + bay * 88 + 4}
                        y={rack.y + side * 30 + 4}
                        width="76"
                        height="24"
                        fill="#b7bd9e"
                      />
                      {Array.from({ length: Math.min(3, state.inventory[address]) }, (_, box) => (
                        <Crate
                          key={box}
                          x={rack.x + bay * 88 + 8 + box * 23}
                          y={rack.y + side * 30 + 6}
                          small
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            ))}
            <path d={`M${rack.x} ${rack.y + 31}h${rack.w}`} stroke="#3f6255" strokeWidth="4" />
          </g>
        ))}
        {(Object.entries(STATIONS) as [WarehouseStation, Point][]).map(([station, point]) => {
          const rack = isRack(station);
          return (
            <g
              key={station}
              data-station={station}
              data-stock={rack ? state.inventory[station as RackId] : undefined}
              role="button"
              tabIndex={active && !showUpgrades && state.status === 'working' ? 0 : -1}
              aria-label={
                station === 'receiving'
                  ? 'Walk to receiving'
                  : station === 'dispatch'
                    ? 'Walk to dispatch'
                    : `Walk to rack ${station}`
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
              className={`wh-station${rack ? ' wh-station--rack' : ''}${goal === station ? ' wh-station--goal' : ''}`}
            >
              <rect
                x={point.x - (rack ? 36 : 48)}
                y={point.y - (rack ? 18 : 47)}
                width={rack ? 72 : 96}
                height={rack ? 36 : 99}
                rx={rack ? 7 : 12}
                className="wh-zone"
              />
              {!rack && <circle cx={point.x} cy={point.y - 5} r="24" className="wh-zone-circle" />}
              <text
                x={point.x}
                y={point.y + (rack ? 6 : 2)}
                className="wh-zone-number"
                textAnchor="middle"
              >
                {rack
                  ? `${station} : ${state.inventory[station as RackId]}`
                  : station === 'receiving'
                    ? 'IN'
                    : 'OUT'}
              </text>
              {!rack && (
                <text x={point.x} y={point.y + 37} textAnchor="middle" className="wh-zone-label">
                  {station === 'receiving' ? 'PUT AWAY' : 'PICK'}
                </text>
              )}
            </g>
          );
        })}
        <text x="87" y="424" className="wh-floor-note" textAnchor="middle">
          SUPPLY READY
        </text>
        <text x="870" y="424" className="wh-floor-note" textAnchor="middle">
          $20 / ORDER
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
          NEXT: {destination.toUpperCase()}
        </text>
        <text x="26" y="581" className="wh-help">
          Tap to walk. Pick [E] / Put away [Q]. Every address does both.
        </text>
      </svg>
      <div className="wh-compact-hud" aria-hidden="true">
        <span>
          <b>Day {state.day}</b> / ${state.cash}
        </span>
        <span>
          {state.dayShipped}/{state.quota} orders
        </span>
        <strong className={state.remaining < 15 ? 'wh-time-low' : ''}>{timeLabel}</strong>
      </div>
      <div className="wh-compact-zones" aria-hidden="true">
        <span>
          In: <b>{state.inboundLocation}</b>
        </span>
        <span>
          {state.quotaMet
            ? 'Quota met / Restock for tomorrow'
            : state.order
                .map((line) => `${line.location} ${line.delivered}/${line.required}`)
                .join(' / ')}
        </span>
      </div>
      <div className="wh-compact-next" aria-hidden="true">
        {destination}
      </div>
      <button
        className={`wh-upgrade-toggle${state.cash >= 40 && !state.cart ? ' wh-upgrade-toggle--ready' : ''}`}
        onClick={toggleUpgrades}
        disabled={!active || state.status === 'failed'}
        aria-expanded={showUpgrades}
      >
        Upgrades <span>↗</span>
      </button>
      {state.quotaMet && state.status === 'working' && (
        <button className="wh-end-day" onClick={finishDay} disabled={!active || showUpgrades}>
          End day
        </button>
      )}
      <button
        className="wh-interact"
        onClick={() => work('pick')}
        disabled={!active || showUpgrades || state.status !== 'working'}
      >
        Pick <span>E</span>
      </button>
      <button
        className="wh-putaway"
        onClick={() => work('putaway')}
        disabled={!active || showUpgrades || state.status !== 'working'}
      >
        Put away <span>Q</span>
      </button>
      <p className="wh-sr-only" role="status" aria-live="polite">
        {state.message} Incoming box: {state.inboundLocation}. Carried: {carriedLabel || 'none'}.
        Cash: ${state.cash}. Stock: {state.stock}. Carrying: {state.carrying} of {capacity(state)}.
        Day {state.day}: {state.dayShipped} of {state.quota} orders. Best completed day:{' '}
        {state.bestDay}.
      </p>
      {state.status !== 'working' && !showUpgrades && (
        <div
          className="wh-menu wh-day-result"
          role="dialog"
          aria-label={state.status === 'failed' ? 'Shift over' : `Day ${state.day} complete`}
        >
          <div className="wh-menu-card">
            <span className="wh-result-eyebrow">
              {state.status === 'failed' ? 'TIME IS UP' : 'QUOTA COMPLETE'}
            </span>
            <h3>{state.status === 'failed' ? 'Shift over' : `Day ${state.day} complete`}</h3>
            <p>
              {state.status === 'failed'
                ? `You completed ${state.day - 1} days. Try again and beat your record.`
                : `${state.dayShipped} orders shipped. Next: ${state.quota + 1} orders. Keep the shift moving.`}
            </p>
            <div className="wh-result-stats">
              <span>
                Best <strong>Day {state.bestDay}</strong>
              </span>
              <span>
                Earnings <strong>${state.cash}</strong>
              </span>
            </div>
            <p className="wh-result-note">Purchased upgrades stay installed across attempts.</p>
            <div className="wh-result-actions">
              {state.status === 'day-complete' && (
                <button onClick={toggleUpgrades} disabled={!active}>
                  Shop upgrades
                </button>
              )}
              <button onClick={state.status === 'failed' ? reset : continueDay} disabled={!active}>
                {state.status === 'failed' ? 'Try again · Day 1' : `Start day ${state.day + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
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
                <span>CLOCK PAUSED / UPGRADES SAVED</span>
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
                <p>Carry 3 labeled boxes, including mixed orders. Keep it on every attempt.</p>
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
                <p>Auto stow inbound boxes and deliver picked items. Move 25% faster.</p>
              </div>
              <button
                onClick={() => buy('automation')}
                disabled={state.automation || state.cash < UPGRADE_COST.automation}
              >
                {state.automation ? 'Installed' : '$100 · Buy'}
              </button>
            </div>
            <div className="wh-menu-footer">
              <span>Earn $20 per order. Purchases are permanent.</span>
              <button onClick={toggleUpgrades}>Back to shift →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
