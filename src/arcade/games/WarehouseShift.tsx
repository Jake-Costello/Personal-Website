import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ArcadeInput } from '../input';
import {
  RACKS,
  RACK_CAPACITY,
  CONVEYOR_SECONDS,
  TRUCK_DEPART_SECONDS,
  TRUCK_ARRIVE_SECONDS,
  nextPickLocations,
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
  stationBounds,
  pickUpAt,
  putDownAt,
} from './warehouse-model';
import type {
  Point,
  RackId,
  InboundLane,
  OutboundTruck,
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

function InboundDock({ lane }: { lane: InboundLane }) {
  const y = STATIONS[lane.id].y;
  const progress = 1 - lane.remaining / CONVEYOR_SECONDS;
  const x = 54 + 96 * Math.max(0, Math.min(1, progress));
  return (
    <g
      transform={`translate(0 ${y})`}
      data-conveyor={lane.id}
      data-sequence={lane.sequence}
      data-remaining={lane.remaining.toFixed(2)}
    >
      <rect
        x="-75"
        y="-43"
        width="111"
        height="86"
        rx="6"
        fill="#c7b489"
        stroke="#6d624b"
        strokeWidth="3"
      />
      <rect x="-68" y="-35" width="96" height="70" fill="#e8debf" />
      <path d="M-65-26H25M-65 26H25" stroke="#a79e83" strokeWidth="3" />
      <rect x="29" y="-36" width="8" height="72" fill="url(#wh-hazard)" />
      <rect
        x="37"
        y="-27"
        width="141"
        height="54"
        rx="4"
        fill="#52675e"
        stroke="#354f43"
        strokeWidth="3"
      />
      <rect x="42" y="-22" width="130" height="44" fill="#a6b2a0" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${46 + i * 11} -20v40`} stroke="#687f6e" strokeWidth="3" />
      ))}
      <path d="M55-31h104m-104 62h104" stroke="#d3bf7b" strokeWidth="4" />
      <g transform={`translate(${x} -13)`}>
        <Crate x={0} y={0} />
        <rect x="-8" y="-23" width="42" height="21" rx="4" fill="#fff8d5" stroke="#a38a45" />
        <text x="13" y="-7" textAnchor="middle" className="wh-box-label">
          {lane.location}
        </text>
      </g>
      <Crate x={46} y={-11} small />
      <path d="M176-25v50" stroke="#c9b779" strokeWidth="6" />
    </g>
  );
}

function OutboundVehicle({ truck, index }: { truck: OutboundTruck; index: number }) {
  const y = STATIONS[truck.id].y;
  const offset =
    truck.phase === 'departing'
      ? 250 * (1 - truck.remaining / TRUCK_DEPART_SECONDS)
      : truck.phase === 'arriving'
        ? (250 * truck.remaining) / TRUCK_ARRIVE_SECONDS
        : 0;
  return (
    <g
      transform={`translate(${803 + Math.max(0, offset)} ${y - 52})`}
      data-truck={truck.id}
      data-phase={truck.phase}
    >
      <rect x="3" y="10" width="151" height="100" rx="8" fill="#20342b" opacity=".18" />
      {[16, 113].map((x) => (
        <g key={x}>
          <rect x={x} y="-5" width="24" height="13" rx="4" fill="#263434" />
          <rect x={x} y="96" width="24" height="13" rx="4" fill="#263434" />
        </g>
      ))}
      <path d="M0 3h106v98H0" fill="#e9e9d7" stroke="#526b58" strokeWidth="5" />
      <path d="M1 9h98M1 95h98" stroke="#99ad94" strokeWidth="3" />
      <rect
        x="111"
        y="5"
        width="44"
        height="93"
        rx="12"
        fill={index ? '#94ad86' : '#c4a96f'}
        stroke="#405d4a"
        strokeWidth="3"
      />
      <path d="M136 16h10v70h-10z" fill="#344f51" />
      <path d="M142 20v23m0 15v23" stroke="#86a89b" strokeWidth="2" />
      <path d="M151 13v11m0 56v11" stroke="#f7e4a3" strokeWidth="5" />
      {truck.order.map((line, slot) => (
        <g key={line.location} transform={`translate(8 ${8 + slot * 29})`}>
          <rect
            width="89"
            height="25"
            rx="3"
            fill={line.delivered === line.required ? '#b9d78d' : '#f7f4df'}
            stroke="#7b9274"
            strokeWidth="1.5"
            strokeDasharray={line.delivered ? undefined : '4 3'}
          />
          <text x="44" y="18" textAnchor="middle" className="wh-order-truck-label">
            {line.location} {line.delivered}/{line.required}
          </text>
        </g>
      ))}
      {!truck.order.length && (
        <text x="51" y="45" textAnchor="middle" className="wh-order-status">
          <tspan x="51">Orders</tspan>
          <tspan x="51" dy="20">
            Complete
          </tspan>
        </text>
      )}
      <path d="M-7 8v87" stroke="#c9b779" strokeWidth="5" />
      <text x="55" y="-15" textAnchor="middle" className="wh-truck-label">
        ORDER {index + 1}
      </text>
    </g>
  );
}

export default function WarehouseShift({ input, active }: { input: ArcadeInput; active: boolean }) {
  const [state, setState] = useState(() => newWarehouse(loadProgress()));
  const [pose, setPose] = useState({ ...START, facing: 0 });
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [compact, setCompact] = useState(false);
  const gameElement = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const position = useRef({ ...START, facing: 0 });
  const menuRef = useRef(false);
  const activeRef = useRef(active);
  const route = useRef<{ points: Point[]; station?: WarehouseStation } | null>(null);
  activeRef.current = active;

  useEffect(() => {
    const element = gameElement.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width <= 500));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
    if (!activeRef.current || stateRef.current.status !== 'day-complete') return;
    route.current = null;
    menuRef.current = !menuRef.current;
    setShowUpgrades(menuRef.current);
  }, []);

  const work = useCallback(
    (action: 'pickup' | 'putdown') => {
      if (!activeRef.current || menuRef.current || stateRef.current.status !== 'working') return;
      route.current = null;
      const station = stationNear(position.current);
      publish(
        station
          ? action === 'pickup'
            ? pickUpAt(stateRef.current, station)
            : putDownAt(stateRef.current, station)
          : {
              ...stateRef.current,
              message: 'Walk to a box, rack or truck, then Pick up or Put down.',
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
      else if (secondary) work('putdown');
      else if (action) {
        if (stateRef.current.status === 'failed') reset();
        else if (stateRef.current.status === 'day-complete' && !menuRef.current) continueDay();
        else work('pickup');
      }
    });
  }, [active, input, work, reset, continueDay]);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    let lastStatePaint = 0;
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
          timed.status !== before.status ||
          (now - lastStatePaint > 32 &&
            (before.inbound.some((lane) => lane.remaining > 0) ||
              before.trucks.some((truck) => truck.phase !== 'loading')))
        ) {
          setState(timed);
          lastStatePaint = now;
        }
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
            publish(putDownAt(stateRef.current, station, true));
          else if (
            (station === 'dispatch' || station === 'dispatch2') &&
            stateRef.current.carried.some(
              (item) =>
                item.kind === 'picked' &&
                stateRef.current.trucks.some(
                  (truck) =>
                    truck.id === station &&
                    truck.phase === 'loading' &&
                    truck.order.some(
                      (line) => line.location === item.location && line.delivered < line.required,
                    ),
                ),
            )
          )
            publish(putDownAt(stateRef.current, station));
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
    if (active && stateRef.current.status === 'day-complete')
      publish(buyUpgrade(stateRef.current, upgrade));
  };
  const goal = nextStation(state);
  const timeLabel = `${Math.floor(Math.ceil(state.remaining) / 60)}:${String(Math.ceil(state.remaining) % 60).padStart(2, '0')}`;
  const near = stationNear(pose);
  const carriedByLocation = new Map<RackId, number>();
  for (const item of state.carried)
    carriedByLocation.set(
      item.location,
      (carriedByLocation.get(item.location) ?? 0) + item.quantity,
    );
  const carriedLabel = [...carriedByLocation]
    .map(([location, quantity]) => `${location} ×${quantity}`)
    .join(', ');
  const pickLocations = nextPickLocations(state).join(', ');
  const finishDay = () => {
    if (active) {
      route.current = null;
      publish(endDay(stateRef.current));
    }
  };

  return (
    <div
      className="wh-game"
      ref={gameElement}
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
      data-inbound-location={state.inbound[0].location}
      data-inbound={JSON.stringify(state.inbound)}
      data-trucks={JSON.stringify(state.trucks)}
      data-order={JSON.stringify(state.trucks[0].order)}
      data-carried={JSON.stringify(state.carried)}
      data-inventory={JSON.stringify(state.inventory)}
      data-quota-met={state.quotaMet}
      data-best-day={state.bestDay}
    >
      <svg
        className="wh-scene"
        viewBox={compact ? '0 143 960 388' : '0 0 960 600'}
        preserveAspectRatio={compact ? 'none' : 'xMidYMid meet'}
        onPointerDown={moveToFloor}
        aria-label="Warehouse Warrior floor. Pick up boxes from conveyors or racks, then put them down at their labeled rack or matching outbound truck. Trash costs five dollars per box."
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
          Warehouse Warrior
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
        <rect y="92" width="960" height="439" fill="url(#wh-floor-grid)" />
        <path
          d="M266 164v348M694 164v348"
          stroke="#f5f4df"
          strokeWidth="3"
          strokeDasharray="12 10"
        />
        <path d="M285 332h399" stroke="#bcc8b7" strokeWidth="2" strokeDasharray="12 12" />
        <text x="104" y="126" className="wh-area-label" textAnchor="middle">
          DOCK
        </text>
        <text x="480" y="126" className="wh-area-label" textAnchor="middle">
          STORAGE
        </text>
        <text x="856" y="126" className="wh-area-label" textAnchor="middle">
          OUTBOUND
        </text>
        {state.inbound.map((lane) => (
          <InboundDock key={lane.id} lane={lane} />
        ))}
        {state.trucks.map((truck, index) => (
          <OutboundVehicle key={truck.id} truck={truck} index={index} />
        ))}
        <g transform="translate(807 470)" className="wh-trash-bin">
          <rect width="49" height="45" rx="4" fill="#667767" stroke="#354a3c" strokeWidth="3" />
          <path d="M-4 0h57M12 10v25m12-25v25m12-25v25" stroke="#a7b494" strokeWidth="4" />
          <text x="64" y="15" className="wh-trash-label">
            TRASH
          </text>
          <text x="64" y="36" className="wh-trash-cost">
            −$5
          </text>
        </g>
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
                      {Array.from(
                        { length: Math.min(RACK_CAPACITY, state.inventory[address]) },
                        (_, box) => (
                          <Crate
                            key={box}
                            x={rack.x + bay * 88 + 8 + box * 18}
                            y={rack.y + side * 30 + 6}
                            small
                          />
                        ),
                      )}
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
                rack
                  ? `Walk to rack ${station}`
                  : station === 'trash'
                    ? 'Walk to trash bin, five dollars per box'
                    : station.startsWith('receiving')
                      ? `Walk to conveyor ${station === 'receiving' ? 1 : 2}`
                      : `Walk to outbound truck ${station === 'dispatch' ? 1 : 2}`
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
              className={`wh-station${rack ? ' wh-station--rack' : ''}${rack && state.inventory[station as RackId] >= RACK_CAPACITY ? ' wh-station--full' : ''}${goal === station ? ' wh-station--goal' : ''}`}
            >
              <rect {...stationBounds(station)} rx={rack ? 7 : 12} className="wh-zone" />
              {rack && (
                <text x={point.x} y={point.y + 6} className="wh-zone-number" textAnchor="middle">
                  {station} {state.inventory[station as RackId]}/{RACK_CAPACITY}
                </text>
              )}
            </g>
          );
        })}
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
        <rect y="531" width="960" height="69" fill="#162c2b" />
        <text x="26" y="558" className="wh-goal-label">
          NEXT PICK
        </text>
        <text
          x="26"
          y="585"
          className={`wh-goal${nextPickLocations(state).length > 3 ? ' wh-goal--many' : ''}`}
        >
          {pickLocations || '—'}
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
      <div className="wh-compact-next" aria-hidden="true">
        <span>Next pick</span>
        <b>{pickLocations || '—'}</b>
      </div>
      <div className="wh-holding" aria-hidden="true">
        <span>Holding</span>
        <strong>{carriedLabel || 'Nothing'}</strong>
      </div>
      {state.quotaMet && state.status === 'working' && (
        <button className="wh-end-day" onClick={finishDay} disabled={!active || showUpgrades}>
          End day
        </button>
      )}
      <button
        className="wh-interact"
        onClick={() => work('pickup')}
        disabled={!active || showUpgrades || state.status !== 'working'}
      >
        Pick up <span>Q</span>
      </button>
      <button
        className="wh-putaway"
        onClick={() => work('putdown')}
        disabled={!active || showUpgrades || state.status !== 'working'}
      >
        Put down <span>E</span>
      </button>
      <p className="wh-sr-only" role="status" aria-live="polite">
        {state.message} Incoming boxes: {state.inbound.map((lane) => lane.location).join(', ')}.
        Carried: {carriedLabel || 'none'}. Cash: ${state.cash}. Stock: {state.stock}. Carrying:{' '}
        {state.carrying} of {capacity(state)}. Day {state.day}: {state.dayShipped} of {state.quota}{' '}
        orders. Best completed day: {state.bestDay}.
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
                <span>BETWEEN DAYS / UPGRADES SAVED</span>
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
                disabled={
                  !active ||
                  state.status !== 'day-complete' ||
                  state.cart ||
                  state.cash < UPGRADE_COST.cart
                }
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
                disabled={
                  !active ||
                  state.status !== 'day-complete' ||
                  state.automation ||
                  state.cash < UPGRADE_COST.automation
                }
              >
                {state.automation ? 'Installed' : '$100 · Buy'}
              </button>
            </div>
            <div className="wh-menu-footer">
              <span>Earn $20 per order. Purchases are permanent.</span>
              <button onClick={toggleUpgrades}>Back to day summary →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
