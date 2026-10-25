import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, PointerEvent } from 'react';
import ArcadeBackdrop from './ArcadeBackdrop';
import { arcadeProjects } from './projects';
import { createArcadeInput } from './input';

const ArcadeScene = lazy(() => import('./ArcadeScene'));
const ShorelineGame = lazy(() => import('./games/ShorelineGame'));
const SketchRide = lazy(() => import('./games/SketchRide'));
const WarehouseShift = lazy(() => import('./games/WarehouseShift'));
const games = { shoreline: ShorelineGame, sketch: SketchRide, warehouse: WarehouseShift };

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas').getContext('webgl2');
    if (!c) return false;
    c.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function ArcadeHub() {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ambiencePaused, setAmbiencePaused] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [visible, setVisible] = useState(!document.hidden);
  const [webgl, setWebgl] = useState(() => hasWebGL());
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState('');
  const screen = useRef<HTMLDivElement>(null);
  const machineButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const room = useRef<HTMLElement>(null);
  const input = useMemo(createArcadeInput, []);
  const project = arcadeProjects[selected];
  const Game = games[project.id];

  const exit = () => {
    input.clear();
    setPlaying(false);
    setExpanded(false);
    setGamePaused(false);
    room.current?.focus();
  };
  const choose = (index: number) => {
    input.clear();
    setSelected((index + arcadeProjects.length) % arcadeProjects.length);
  };
  const enter = (index: number) => {
    choose(index);
    setGamePaused(false);
    setPlaying(true);
    room.current?.focus();
  };

  useEffect(() => input.subscribe(() => setHeld([...input.pressed].join('|'))), [input]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => {
      setVisible(!document.hidden);
      input.clear();
    };
    const blur = () => input.clear();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
      input.clear();
    };
  }, [input]);
  useEffect(() => {
    const mapping: Record<string, string> = {
      ArrowLeft: 'left',
      a: 'left',
      ArrowRight: 'right',
      d: 'right',
      ArrowUp: 'up',
      w: 'up',
      ArrowDown: 'down',
      s: 'down',
      ' ': 'action',
      e: 'action',
      q: 'secondary',
      r: 'reset',
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape' && playing) {
        event.preventDefault();
        exit();
        return;
      }
      if ((event.target as Element)?.closest('input, select, textarea, [contenteditable="true"]'))
        return;
      if (event.key === ' ' && (event.target as Element)?.closest('button, a')) return;
      if (!playing) {
        if (!room.current?.contains(document.activeElement)) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (!event.repeat) choose(selected + (event.key === 'ArrowRight' ? 1 : -1));
          room.current?.focus();
        }
        if (event.key === 'Enter' && event.target === room.current) {
          event.preventDefault();
          enter(selected);
        }
        return;
      }
      const action = mapping[event.key] ?? mapping[event.key.toLowerCase()];
      if (action && !gamePaused) {
        event.preventDefault();
        input.set(action, true);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      const action = mapping[event.key] ?? mapping[event.key.toLowerCase()];
      if (action) input.set(action, false);
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      input.clear();
    };
  }, [selected, playing, gamePaused, input]);

  // Restart after the resumed game's input subscriptions have been attached.
  useEffect(() => {
    if (restartCount > 0) input.pulse('reset');
  }, [restartCount, input]);

  const hold = (action: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    input.set(action, true);
  };
  const release = (action: string) => input.set(action, false);
  const control = (action: string, label: string, text: string) => (
    <button
      key={action}
      type="button"
      aria-label={label}
      aria-pressed={held.split('|').includes(action)}
      onPointerDown={(event) => hold(action, event)}
      onPointerUp={() => release(action)}
      onPointerCancel={() => release(action)}
      onLostPointerCapture={() => release(action)}
      onClick={(event) => {
        if (event.detail === 0) input.pulse(action);
      }}
      disabled={gamePaused}
    >
      {text}
    </button>
  );

  return (
    <div
      className={`arcade-page${playing ? ' is-playing' : ''}${expanded ? ' is-expanded' : ''}${!webgl ? ' is-fallback' : ''}`}
      data-renderer={webgl ? (ready ? 'three' : 'loading') : 'fallback'}
      data-game={playing ? project.id : 'selection'}
      data-selected={project.id}
      style={{ '--active-accent': project.accent } as CSSProperties}
    >
      <ArcadeBackdrop paused={ambiencePaused || playing || !visible} reduced={reduced} />
      <header className="arcade-header">
        <a className="arcade-home" href={import.meta.env.BASE_URL} aria-label="Back to portfolio">
          <b>
            JC<span>↗</span>
          </b>
          <span>PORTFOLIO</span>
        </a>
        <span className="arcade-header-center">
          PROJECT ARCADE<span> / </span>JAKE COSTELLO
        </span>
        <button
          className="arcade-ambience"
          onClick={() => setAmbiencePaused((value) => !value)}
          aria-pressed={ambiencePaused}
          disabled={reduced}
        >
          {reduced ? 'Reduced motion' : ambiencePaused ? 'Resume ambience' : 'Pause ambience'}
        </button>
      </header>
      <main
        ref={room}
        className="arcade-room"
        tabIndex={0}
        aria-label="Project arcade"
        data-playing={playing}
      >
        {!playing && <h1 className="arcade-sr-only">Project Arcade</h1>}
        {playing && (
          <div className="arcade-play-header">
            <button onClick={exit} className="arcade-back">
              ← Back to machines <kbd>Esc</kbd>
            </button>
            <div>
              <span>{project.number} / NOW PLAYING</span>
              <h1>{project.title}</h1>
            </div>
            <div className="arcade-play-tools">
              <button
                onClick={() => {
                  input.clear();
                  setGamePaused((v) => !v);
                }}
              >
                {gamePaused ? 'Resume game' : 'Pause game'}
              </button>
              <button onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Cabinet view' : 'Expand screen'}
              </button>
              <button
                onClick={() => {
                  input.clear();
                  setGamePaused(false);
                  setRestartCount((count) => count + 1);
                }}
              >
                Restart game
              </button>
            </div>
          </div>
        )}
        <div className="arcade-room-scene">
          {webgl && (
            <SceneBoundary
              onFailure={() => {
                input.clear();
                setWebgl(false);
                setReady(false);
              }}
            >
              <Suspense
                fallback={
                  <div className="arcade-loading">
                    POWERING UP THE MACHINES
                    <span />
                  </div>
                }
              >
                <ArcadeScene
                  selected={selected}
                  playing={playing}
                  reduced={reduced}
                  input={input}
                  screenRef={screen}
                  machineRefs={machineButtons}
                  onSelect={enter}
                  onReady={() => setReady(true)}
                  onFailure={() => {
                    input.clear();
                    setWebgl(false);
                  }}
                />
              </Suspense>
            </SceneBoundary>
          )}
          {!webgl && !playing && (
            <div className="arcade-fallback-machines">
              {arcadeProjects.map((item, i) => (
                <button
                  key={item.id}
                  aria-label={`Play ${item.title}`}
                  onClick={() => enter(i)}
                  style={{ '--machine-accent': item.accent } as CSSProperties}
                >
                  <span>{item.number}</span>
                  <b>{item.title}</b>
                  <small>Play on this screen ↗</small>
                </button>
              ))}
              <p>The 3D room is unavailable on this device. All three games still work here.</p>
            </div>
          )}
          <div
            className="arcade-live-screen"
            ref={screen}
            aria-label={`${project.title} game screen`}
            inert={!playing}
          >
            {playing && (
              <Suspense
                fallback={<div className="arcade-game-loading">Loading {project.title}…</div>}
              >
                <Game key={project.id} input={input} active={visible && !gamePaused} />
              </Suspense>
            )}
            {gamePaused && playing && (
              <div className="arcade-paused">
                <span>PAUSED</span>
                <button onClick={() => setGamePaused(false)}>Resume game</button>
              </div>
            )}
          </div>
        </div>
        {!playing && (
          <>
            {webgl && (
              <div className="arcade-machine-hotspots" role="group" aria-label="Arcade machines">
                {arcadeProjects.map((item, i) => (
                  <button
                    key={item.id}
                    ref={(element) => {
                      machineButtons.current[i] = element;
                    }}
                    aria-label={`Play ${item.title}`}
                    onClick={() => enter(i)}
                  >
                    <span className="arcade-sr-only">Play {item.title}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="arcade-select-arrows">
              <button aria-label="Previous machine" onClick={() => choose(selected - 1)}>
                ←
              </button>
              <button aria-label="Next machine" onClick={() => choose(selected + 1)}>
                →
              </button>
            </div>
            <p className="arcade-sr-only" aria-live="polite">
              {project.title} selected. Use left and right to choose a machine, then Enter to play.
            </p>
          </>
        )}
        {playing && (
          <div className="arcade-player-controls" aria-label={`${project.title} cabinet controls`}>
            <div className={`arcade-dpad ${project.id !== 'sketch' ? 'four-way' : ''}`}>
              {project.id !== 'sketch' &&
                control('up', project.id === 'shoreline' ? 'Jump' : 'Move up', '↑')}
              {control('left', project.id === 'sketch' ? 'Tilt back' : 'Move left', '←')}
              {project.id !== 'sketch' &&
                control('down', project.id === 'shoreline' ? 'Pump' : 'Move down', '↓')}
              {control('right', project.id === 'sketch' ? 'Tilt forward' : 'Move right', '→')}
            </div>
            {project.id !== 'shoreline' && (
              <div className="arcade-game-actions">
                {project.controls.map((item) => (
                  <div key={item.action}>
                    {control(item.action, item.label, item.label)}
                    <kbd>{item.key}</kbd>
                  </div>
                ))}
              </div>
            )}
            <p>
              {project.id === 'shoreline'
                ? 'Hold Pump, then Jump.'
                : project.id === 'sketch'
                  ? '← → tilt · Space / E pedal · Q brake'
                  : 'Arrows / WASD to move. E to interact.'}
            </p>
          </div>
        )}
      </main>
      <footer className="arcade-footer">
        <span>PLAY / MAKE / REPEAT</span>
        <span>{playing ? 'YOUR GAME. YOUR CONTROLS.' : 'THREE MACHINES. NO COINS REQUIRED.'}</span>
      </footer>
    </div>
  );
}
