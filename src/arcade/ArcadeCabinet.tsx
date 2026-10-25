import type { CSSProperties } from 'react';
import type { ArcadeProject } from './projects';
import './cabinet.css';

type ArcadeCabinetProps = {
  project: ArcadeProject;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onInfo: () => void;
};

function ScreenArt({ id }: { id: ArcadeProject['id'] }) {
  if (id === 'sketch') {
    return (
      <svg viewBox="0 0 440 250" className="arcade-screen-art" aria-hidden="true">
        <rect width="440" height="250" fill="#d9e7d6" />
        <path
          d="M0 40H440M0 80H440M0 120H440M0 160H440M0 200H440M40 0V250M80 0V250M120 0V250M160 0V250M200 0V250M240 0V250M280 0V250M320 0V250M360 0V250M400 0V250"
          stroke="#aac4b0"
          strokeWidth="1"
          opacity=".45"
        />
        <path d="M0 131 68 48 131 111 206 44 300 120 360 64 440 136V250H0Z" fill="#b0c9b1" />
        <path d="m52 67 16-19 22 22-18-6-10 9Z M184 64l22-20 26 23-20-6-13 8Z" fill="#f2f1df" />
        <path
          d="M-20 104C49 78 78 86 106 116S144 173 192 165 229 132 263 154 302 224 352 204 390 163 460 191V270H-20Z"
          fill="#759b7a"
        />
        <path
          d="M-20 104C49 78 78 86 106 116S144 173 192 165 229 132 263 154 302 224 352 204 390 163 460 191"
          fill="none"
          stroke="#203b35"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M-20 104C49 78 78 86 106 116S144 173 192 165 229 132 263 154 302 224 352 204 390 163 460 191"
          fill="none"
          stroke="#effc91"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g transform="translate(175 143) rotate(-11)">
          <circle cx="-17" cy="13" r="11" fill="#203b35" stroke="#effc91" strokeWidth="3" />
          <circle cx="23" cy="13" r="11" fill="#203b35" stroke="#effc91" strokeWidth="3" />
          <path
            d="m-17 13 15-19 11 19H-17L-2-6H12l11 19M9 13 18-14h7"
            fill="none"
            stroke="#f27d54"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="m-2-28-5 14 10 9-5 14M-2-28 11-15h9"
            fill="none"
            stroke="#203b35"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="1" cy="-36" r="7" fill="#203b35" />
          <path d="M-8-39Q2-51 11-37" fill="#f27d54" />
        </g>
        <path
          className="arcade-sketch-stroke"
          d="m306 107 11-15 9 4 10-17 16 5"
          fill="none"
          stroke="#f27d54"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="5 8"
        />
        <path d="m357 71 13 5-9 18-13-5Z" fill="#f5efde" stroke="#203b35" strokeWidth="2" />
        <path d="m348 89-1 11 9-8Z" fill="#203b35" />
        <text x="20" y="27" fill="#203b35" fontSize="12" fontFamily="monospace" letterSpacing="2">
          DRAW. DROP. RIDE.
        </text>
      </svg>
    );
  }

  if (id === 'warehouse') {
    return (
      <svg viewBox="0 0 440 250" className="arcade-screen-art" aria-hidden="true">
        <rect width="440" height="250" fill="#182c32" />
        <path
          d="M0 50H440M0 100H440M0 150H440M0 200H440M50 0V250M100 0V250M150 0V250M200 0V250M250 0V250M300 0V250M350 0V250M400 0V250"
          stroke="#304950"
          strokeWidth="1"
        />
        <path d="M83 31v190M355 31v190" stroke="#b4c0a9" strokeWidth="2" strokeDasharray="10 8" />
        <path
          d="M99 126h44m112 0h83"
          fill="none"
          stroke="#d1f978"
          strokeWidth="3"
          strokeDasharray="5 6"
          className="arcade-warehouse-route"
        />
        {[48, 156].map((y) => (
          <g key={y} transform={`translate(18 ${y})`}>
            <rect x="2" y="4" width="42" height="62" rx="2" fill="#d8e4dc" />
            <rect x="44" y="20" width="20" height="35" rx="3" fill="#f09256" />
            <path d="M50 25h9v13h-9z" fill="#23434b" />
            <path d="M7 13h30M7 22h30M7 31h30M7 40h30M7 49h30" stroke="#8caaa6" strokeWidth="2" />
            <path d="M48 17h12M48 57h12" stroke="#080f15" strokeWidth="6" />
          </g>
        ))}
        {[117, 186, 255].map((x) => (
          <g key={x} transform={`translate(${x} 45)`}>
            <rect width="46" height="62" fill="#6a8990" />
            <rect y="101" width="46" height="62" fill="#6a8990" />
            {[6, 27].map((bx) => (
              <path
                key={bx}
                d={`M${bx} 6h15v20H${bx}z M${bx} 35h15v20H${bx}z M${bx} 107h15v20H${bx}z M${bx} 136h15v20H${bx}z`}
                fill="#d0ad79"
                stroke="#aa885d"
                strokeWidth="2"
              />
            ))}
            <path d="M-3 0v62m52-62v62M-3 101v62m52-62v62" stroke="#92a8a6" strokeWidth="3" />
          </g>
        ))}
        <g transform="translate(371 85)">
          <rect width="51" height="84" rx="3" fill="#d1f978" />
          <rect x="8" y="8" width="35" height="58" fill="#a2be6a" />
          <path d="M0 72h51M11 76h28" stroke="#263b33" strokeWidth="3" />
        </g>
        <g className="arcade-warehouse-worker" transform="translate(218 127)">
          <ellipse cy="7" rx="12" ry="7" fill="#091619" opacity=".45" />
          <path d="M-8 2h16v12H-8z" fill="#f09256" />
          <circle r="7" fill="#e0c08d" />
          <path d="M-8-1q0-12 16 0" fill="#e8ee93" />
        </g>
        <text x="18" y="24" fill="#adc3ba" fontSize="11" fontFamily="monospace" letterSpacing="1">
          INBOUND
        </text>
        <text x="338" y="24" fill="#d1f978" fontSize="11" fontFamily="monospace" letterSpacing="1">
          OUTBOUND
        </text>
        <text x="18" y="238" fill="#b5c9bd" fontSize="10" fontFamily="monospace" letterSpacing="2">
          BUILD A BETTER FLOW
        </text>
      </svg>
    );
  }

  if (id === 'protein') {
    const points = [
      [64, 111],
      [112, 52],
      [155, 124],
      [121, 207],
      [223, 45],
      [242, 153],
      [294, 93],
      [352, 39],
      [380, 145],
      [310, 211],
      [212, 220],
    ];
    const links = [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 4],
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [3, 10],
      [4, 6],
      [5, 6],
      [5, 8],
      [5, 9],
      [5, 10],
      [6, 7],
      [6, 8],
      [7, 8],
      [8, 9],
      [9, 10],
    ];
    return (
      <svg viewBox="0 0 440 250" className="arcade-screen-art" aria-hidden="true">
        <rect width="440" height="250" fill="#192a29" />
        <ellipse
          cx="220"
          cy="125"
          rx="178"
          ry="101"
          fill="none"
          stroke="#47615b"
          strokeDasharray="2 8"
        />
        <ellipse
          cx="220"
          cy="125"
          rx="106"
          ry="101"
          fill="none"
          stroke="#47615b"
          strokeDasharray="2 8"
        />
        <ellipse
          cx="220"
          cy="125"
          rx="178"
          ry="46"
          fill="none"
          stroke="#47615b"
          strokeDasharray="2 8"
        />
        {links.map(([a, b]) => (
          <path
            key={`${a}-${b}`}
            d={`M${points[a][0]} ${points[a][1]} ${points[b][0]} ${points[b][1]}`}
            stroke={a === 2 ? '#c8f477' : '#758e83'}
            strokeWidth={a === 2 ? 2 : 1.2}
            opacity=".8"
          />
        ))}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 2 || i === 5 ? 11 : 7}
            fill={i < 5 ? '#d4fb80' : i < 9 ? '#ed9cc7' : '#e3e7cf'}
          />
        ))}
        <circle
          cx="155"
          cy="124"
          r="18"
          className="arcade-protein-ring"
          fill="none"
          stroke="#d4fb80"
          strokeWidth="1"
        />
        <text
          x="155"
          y="95"
          textAnchor="middle"
          fill="#f2f0dc"
          fontSize="11"
          fontFamily="monospace"
        >
          BRCA1
        </text>
        <text x="16" y="23" fill="#bdd39c" fontSize="10" fontFamily="monospace" letterSpacing="2">
          LIVE CONNECTIONS
        </text>
        <text x="16" y="235" fill="#9caf9e" fontSize="10" fontFamily="monospace">
          HOMO SAPIENS / 9606
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 440 250"
      className="arcade-screen-art"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect width="440" height="250" fill="#adc9c5" />
      <circle cx="354" cy="53" r="25" fill="#f1f1b6" />
      <path
        d="M0 129V99h25V86h21v43h18V70h26V51h9V32h5v19h9v78h16V80h37v49h16V95h19v34h17V71h24v58h18V88h38v41h15V109h42v20h27V79h21v50h34v-22h35v22Z"
        fill="#769690"
      />
      <path
        d="M0 136V117h35v19h13v-22h52v22h40v-15h31v15h29v-25h32v25h42v-22h60v22h22v-11h84v125H0Z"
        fill="#557a73"
      />
      <rect y="144" width="440" height="106" fill="#205c5c" />
      <path
        d="M7 167h47m17 12h32m16-21h52m33 25h67m26-23h41m14 28h73M19 213h54m29 14h47m20-24h62m29 24h36m29-20h75"
        stroke="#629a8d"
        strokeWidth="3"
      />
      <g transform="translate(201 164)">
        <path d="m-53 27-35 2-14-7 31-1-11-8 32 8-8-13 29 13" fill="#d9edbd" />
        <path d="m-41 13 57 3 14-9h12L31 23l-15 8h-48Z" fill="#c9f271" />
        <path d="m-34 27 50 4 15-8H-37Z" fill="#122e32" />
        <path
          d="M-16 11-8-10l13 4 8 20M-8-10 3-29l12 3 3 17 12-2"
          fill="none"
          stroke="#172b32"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path d="m3-29 12 3 3 17-14-3Z" fill="#f0a0c8" />
        <path d="M5-38h12v10H5Z" fill="#e6c49c" />
        <path d="M3-41h14v6H3Z" fill="#172b32" />
        <path d="m27-13 6 1-8 25" fill="none" stroke="#142b2e" strokeWidth="4" />
      </g>
      <text x="16" y="25" fill="#234039" fontSize="11" fontFamily="monospace" letterSpacing="2">
        A LIFE ON THE LAKE
      </text>
      <path d="M18 235h139" stroke="#d0f67b" strokeWidth="3" />
      <path d="M157 235h266" stroke="#53887a" strokeWidth="3" />
    </svg>
  );
}

export default function ArcadeCabinet({
  project,
  selected,
  onSelect,
  onStart,
  onInfo,
}: ArcadeCabinetProps) {
  const action = project.status === 'live' ? 'start' : 'preview';
  return (
    <div
      className={`arcade-cabinet${selected ? ' is-selected' : ''}`}
      style={{ '--cabinet-accent': project.accent } as CSSProperties}
      data-project={project.id}
    >
      <div className="cabinet-side cabinet-side-left" aria-hidden="true">
        <span>PLAY / MAKE / REPEAT</span>
      </div>
      <div className="cabinet-side cabinet-side-right" aria-hidden="true">
        <span>PLAY / MAKE / REPEAT</span>
      </div>
      <div className="cabinet-roof" aria-hidden="true" />
      <div className="cabinet-back" aria-hidden="true" />
      <div className="cabinet-front">
        <div className="cabinet-marquee" aria-hidden="true">
          <span className="cabinet-marquee-id">{project.number} / PROJECT ARCADE</span>
          <span className="cabinet-marquee-title">{project.shortTitle}</span>
          <i className="cabinet-marquee-light" />
        </div>
        <div className="cabinet-monitor" aria-hidden="true">
          <div className="cabinet-screen">
            <ScreenArt id={project.id} />
            <div className="cabinet-screen-glass" />
          </div>
          <div className="cabinet-screen-label">
            <span>{project.status === 'live' ? 'READY TO PLAY' : 'IN DEVELOPMENT'}</span>
            <span className="cabinet-power-light" />
          </div>
        </div>
        <div className="cabinet-control-deck">
          <div className="cabinet-deck-art" aria-hidden="true" />
          <button
            className="cabinet-joystick"
            aria-label={selected ? 'Joystick: next cabinet' : `Select ${project.title}`}
            onClick={onSelect}
            tabIndex={selected ? 0 : -1}
            disabled={!selected}
          >
            <span className="cabinet-joystick-base" />
            <span className="cabinet-joystick-shaft" />
            <span className="cabinet-joystick-ball" />
          </button>
          <div className="cabinet-action-buttons">
            <button
              className="cabinet-action cabinet-action-start"
              data-arcade-action="start"
              aria-label={`${project.title}: ${action}`}
              onClick={onStart}
              tabIndex={selected ? 0 : -1}
              disabled={!selected}
            >
              <span>A</span>
            </button>
            <button
              className="cabinet-action cabinet-action-info"
              data-arcade-action="details"
              aria-label={`${project.title}: details`}
              onClick={onInfo}
              tabIndex={selected ? 0 : -1}
              disabled={!selected}
            >
              <span>B</span>
            </button>
          </div>
          <div className="cabinet-button-labels" aria-hidden="true">
            <span>{action}</span>
            <span>details</span>
          </div>
        </div>
        <div className="cabinet-deck-lip" aria-hidden="true">
          <span>MAKE SOMETHING. PLAY SOMETHING.</span>
        </div>
        <div className="cabinet-kickplate" aria-hidden="true">
          <div className="cabinet-coin-door">
            <span className="cabinet-coin-slot" />
            <span className="cabinet-coin-light">
              FREE
              <br />
              PLAY
            </span>
            <i />
          </div>
          <div className="cabinet-speaker">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="cabinet-kick-number">{project.number}</span>
          <div className="cabinet-maker">
            <b>JC</b>
            <span>
              BUILT TO
              <br />
              BE EXPLORED.
            </span>
          </div>
        </div>
        <div className="cabinet-bottom" aria-hidden="true" />
      </div>
      {!selected && (
        <button
          type="button"
          className="cabinet-select-overlay"
          aria-label={`Select ${project.title}`}
          onClick={onSelect}
          tabIndex={-1}
        />
      )}
    </div>
  );
}
