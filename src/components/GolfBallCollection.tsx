import { selectGolfBall, useAchievements } from '../lib/achievements';
import './golf-ball-collection.css';

export default function GolfBallCollection() {
  const { selectedBall, yellowBallUnlocked } = useAchievements();
  return (
    <fieldset className="golf-ball-collection">
      <legend>Golf balls</legend>
      <div className="golf-ball-options">
        <label className="golf-ball-option">
          <input
            type="radio"
            name="golf-ball"
            value="white"
            checked={selectedBall === 'white'}
            onChange={() => selectGolfBall('white')}
            aria-label="White ball"
          />
          <span className="golf-ball-swatch" aria-hidden="true" />
          <span className="golf-ball-name">White</span>
          <span className="golf-ball-status">
            {selectedBall === 'white' ? 'Selected' : 'Available'}
          </span>
        </label>
        <label className={`golf-ball-option${yellowBallUnlocked ? '' : ' is-locked'}`}>
          <input
            type="radio"
            name="golf-ball"
            value="yellow"
            checked={selectedBall === 'yellow'}
            onChange={() => selectGolfBall('yellow')}
            disabled={!yellowBallUnlocked}
            aria-label={yellowBallUnlocked ? 'Yellow ball' : 'Yellow ball, locked'}
            aria-describedby="yellow-ball-unlock"
          />
          <span className="golf-ball-swatch golf-ball-swatch--yellow" aria-hidden="true">
            {!yellowBallUnlocked && <LockIcon />}
          </span>
          <span className="golf-ball-name">Bright yellow</span>
          <span className="golf-ball-status">
            {selectedBall === 'yellow' ? 'Selected' : yellowBallUnlocked ? 'Unlocked' : 'Locked'}
          </span>
          <span className="golf-ball-unlock" id="yellow-ball-unlock">
            {yellowBallUnlocked
              ? 'Time-trial reward'
              : 'Reach the finish under the time-trial target'}
          </span>
        </label>
        <label className="golf-ball-option is-locked">
          <input
            type="radio"
            name="golf-ball"
            value="mystery"
            disabled
            aria-label="Mystery achievement, locked"
          />
          <span className="golf-ball-swatch" aria-hidden="true">
            <LockIcon />
          </span>
          <span className="golf-ball-name">Mystery achievement</span>
          <span className="golf-ball-status">Locked</span>
        </label>
      </div>
    </fieldset>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
      <path d="M12 14v3" />
    </svg>
  );
}
