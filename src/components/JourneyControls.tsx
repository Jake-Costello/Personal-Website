import { useEffect, useRef, useState } from 'react';
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
  const pointer = useRef<number | null>(null);
  const keyboardPressed = useRef(false);
  const inputSetter = useRef(setInput);
  inputSetter.current = setInput;
  const [held, setHeld] = useState(false);
  const ignoreClick = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function stop() {
      pointer.current = null;
      keyboardPressed.current = false;
      ignoreClick.current = false;
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (pressed.current) {
        pressed.current = false;
        setHeld(false);
        inputSetter.current(control, false, true);
      }
    }
    function visibilityChanged() {
      if (document.hidden) stop();
    }
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', visibilityChanged);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (pressed.current) inputSetter.current(control, false, true);
    };
  }, [control]);

  function press() {
    if (pressed.current) return;
    pressed.current = true;
    setHeld(true);
    setInput(control, true);
  }

  function release(cancelled = false) {
    if (!pressed.current) return;
    pressed.current = false;
    setHeld(false);
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
    if (event.button !== 0 || pointer.current !== null) return;
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    ignoreClick.current = true;
    // Keep touch focus on the scene so a second finger can pump or jump while
    // the first keeps riding. Moving focus between buttons cancels a held key.
    const focusTarget =
      event.pointerType === 'touch'
        ? event.currentTarget.closest<HTMLElement>('.journey-stage')
        : event.currentTarget;
    focusTarget?.focus({ preventScroll: true });
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (!keyboardPressed.current) release(cancelled);
    allowAssistiveClick();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) {
        ignoreClick.current = true;
        keyboardPressed.current = true;
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
      data-pressed={held}
      onPointerDown={pointerDown}
      onPointerUp={(event) => pointerUp(event)}
      onPointerCancel={(event) => pointerUp(event, true)}
      onLostPointerCapture={(event) => pointerUp(event, true)}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={keyDown}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          keyboardPressed.current = false;
          if (pointer.current === null) release();
          allowAssistiveClick();
        }
      }}
      onBlur={(event) => {
        keyboardPressed.current = false;
        const nextTarget = event.relatedTarget;
        const scene = event.currentTarget.closest('.journey-stage');
        if (
          pointer.current === null ||
          !(nextTarget instanceof Node) ||
          !scene?.contains(nextTarget)
        ) {
          pointer.current = null;
          release(true);
        }
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
  trial = false,
  onTimeTrial,
}: {
  setInput: SetInput;
  speed: number;
  atDestination: boolean;
  onRestart: () => void;
  instructionsId: string;
  trial?: boolean;
  onTimeTrial?: () => void;
}) {
  return (
    <div className={`journey-controls${trial ? ' journey-controls--trial' : ''}`}>
      <div className="journey-speed" role="status" aria-label="Ride speed" aria-atomic="true">
        <span aria-hidden="true">{trial ? 'Auto cruise' : 'Speed'}</span>
        <strong>{trial ? 2 : speed}×</strong>
      </div>
      <div className="journey-buttons" role="group" aria-label="Jetski controls">
        {!trial && <RideButton control="left" symbol="←" label="Left" setInput={setInput} />}
        {!trial && <RideButton control="right" symbol="→" label="Right" setInput={setInput} />}
        <RideButton control="down" symbol="↓" label="Pump" setInput={setInput} />
        <RideButton control="jump" symbol="↑" label="Jump" setInput={setInput} />
      </div>
      <p id={instructionsId} className="journey-control-hints">
        <span className="journey-sr-only">
          {trial
            ? 'Cruise is automatic. Use the down and up arrow keys or the Pump and Jump buttons.'
            : 'Focus the scene to use arrow keys, or hold the buttons to ride.'}
        </span>
        {!trial && <span>Hold ← / → to ride</span>}
        {!trial && <span>Tap → 3×: faster</span>}
        {!trial && <span>Tap ← 3×: slower</span>}
        <span>Hold ↓, then ↑ to jump</span>
      </p>
      {atDestination && (
        <>
          <button
            className="journey-restart"
            type="button"
            onClick={onRestart}
            aria-label="Back to start"
          >
            <span aria-hidden="true">↶</span> Start over
          </button>
          {onTimeTrial && (
            <button className="journey-time-trial" type="button" onClick={onTimeTrial}>
              Time trial →
            </button>
          )}
        </>
      )}
    </div>
  );
}
