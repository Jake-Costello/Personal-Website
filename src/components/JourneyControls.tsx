import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { RideInput } from '../game/model';

type Control = keyof RideInput;
type SetInput = (key: Control, active: boolean, cancelled?: boolean) => void;

function RideButton({
  control,
  symbol,
  label,
  setInput,
}: {
  control: Control;
  symbol: string;
  label: string;
  setInput: SetInput;
}) {
  const pressed = useRef(false);
  const ignoreClick = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  function press() {
    if (pressed.current) return;
    pressed.current = true;
    setInput(control, true);
  }

  function release(cancelled = false) {
    if (!pressed.current) return;
    pressed.current = false;
    setInput(control, false, cancelled);
  }

  function allowAssistiveClick() {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    // A native click follows its key/pointer release in the same task. Ignore
    // that click while still accepting later screen-reader-only activations.
    clickTimer.current = setTimeout(() => {
      ignoreClick.current = false;
    }, 0);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    ignoreClick.current = true;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) {
        ignoreClick.current = true;
        press();
      }
    }
  }

  return (
    <button
      className="journey-ride-button"
      type="button"
      aria-label={label}
      data-control={control}
      onPointerDown={pointerDown}
      onPointerUp={() => {
        release();
        allowAssistiveClick();
      }}
      onPointerCancel={() => {
        release(true);
        allowAssistiveClick();
      }}
      onLostPointerCapture={() => release(true)}
      onKeyDown={keyDown}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          release();
          allowAssistiveClick();
        }
      }}
      onBlur={() => {
        release(true);
        ignoreClick.current = false;
      }}
      onClick={(event) => {
        if (event.detail === 0 && !ignoreClick.current) {
          press();
          if (releaseTimer.current) clearTimeout(releaseTimer.current);
          releaseTimer.current = setTimeout(() => release(), 50);
        }
      }}
    >
      <span aria-hidden="true">{symbol}</span>
      <span>{label}</span>
    </button>
  );
}

export default function JourneyControls({
  setInput,
  speed,
  atDestination,
  onRestart,
  instructionsId,
}: {
  setInput: SetInput;
  speed: number;
  atDestination: boolean;
  onRestart: () => void;
  instructionsId: string;
}) {
  return (
    <div className="journey-controls">
      <div className="journey-speed" role="status" aria-label="Ride speed" aria-atomic="true">
        <span aria-hidden="true">Speed</span>
        <strong>{speed}×</strong>
      </div>
      <div className="journey-buttons" role="group" aria-label="Jetski controls">
        <RideButton control="left" symbol="←" label="Left" setInput={setInput} />
        <RideButton control="right" symbol="→" label="Right" setInput={setInput} />
        <RideButton control="down" symbol="↓" label="Pump" setInput={setInput} />
        <RideButton control="jump" symbol="↑" label="Jump" setInput={setInput} />
      </div>
      <p id={instructionsId} className="journey-control-hints">
        <span className="journey-sr-only">
          Focus the scene to use arrow keys, or hold the buttons to ride.
        </span>
        <span>Hold ← → to ride</span>
        <span>Tap → 3×: faster</span>
        <span>Tap ← 3×: slower</span>
        <span>↓ then ↑ to jump</span>
      </p>
      {atDestination && (
        <button className="journey-restart" type="button" onClick={onRestart}>
          <span aria-hidden="true">↶</span> Back to start
        </button>
      )}
    </div>
  );
}
