import './golf-ball-collection.css';

export default function GolfBallCollection() {
  return (
    <fieldset className="golf-ball-collection">
      <legend>Golf balls</legend>
      <div className="golf-ball-options">
        <label className="golf-ball-option">
          <input
            type="radio"
            name="golf-ball"
            value="white"
            defaultChecked
            aria-label="White ball"
          />
          <span className="golf-ball-swatch" aria-hidden="true" />
          <span className="golf-ball-name">White</span>
          <span className="golf-ball-status">Selected</span>
        </label>
        {[1, 2].map((slot) => (
          <label key={slot} className="golf-ball-option is-locked">
            <input
              type="radio"
              name="golf-ball"
              value={`mystery-${slot}`}
              disabled
              aria-label={`Mystery achievement ${slot}, locked`}
            />
            <span className="golf-ball-swatch" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
                <path d="M12 14v3" />
              </svg>
            </span>
            <span className="golf-ball-name">Mystery achievement</span>
            <span className="golf-ball-status">Locked</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
