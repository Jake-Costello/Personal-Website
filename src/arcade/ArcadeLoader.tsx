import './arcade-loader.css';

const letterJ = 'M32 38H99V103C99 129 86 145 62 145C37 145 26 129 26 112';
const letterC =
  'M208 51C198 39 183 32 168 37C146 41 131 62 131 90C131 121 148 143 173 143C187 143 201 136 210 125';
const depths = [-15, -12, -9, -6, -3, 0];

export default function ArcadeLoader({
  label = 'Loading the arcade…',
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`arcade-loader${compact ? ' arcade-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="arcade-loader-icon" aria-hidden="true">
        <span className="arcade-loader-shadow" />
        <div className="arcade-loader-float">
          <div className="arcade-loader-mark">
            {depths.map((depth, index) => (
              <svg
                key={depth}
                className={`arcade-loader-layer${depth === 0 ? ' arcade-loader-face' : ''}`}
                viewBox="0 0 240 180"
                fill="none"
                focusable="false"
                style={{ transform: `translateZ(${depth}px)` }}
              >
                <g strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
                  <path className="arcade-loader-j" d={letterJ} />
                  <path className="arcade-loader-c" d={letterC} />
                </g>
                {index === depths.length - 1 && (
                  <g
                    className="arcade-loader-shine"
                    transform="translate(-3 -5)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M35 38H94M89 116C84 132 74 137 60 137" />
                    <path d="M196 47C188 41 178 39 169 43C151 47 139 65 139 84" />
                  </g>
                )}
              </svg>
            ))}
          </div>
        </div>
      </div>
      <span className="arcade-loader-label">{label}</span>
    </div>
  );
}
