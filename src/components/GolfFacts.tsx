import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { personalFactsByBall } from '../data/personal';
import type { PersonalFact } from '../data/personal';
import { useAchievements } from '../lib/achievements';
import GolfScene, {
  GolfBagOverlay,
  GolfClubIcon,
  GolfClubHeadIcon,
  GOLF_SCENE_GEOMETRY,
} from './GolfScene';
import './golf-facts.css';

type Phase = 'idle' | 'swing' | 'flight' | 'reading' | 'falling';

interface ClubDrag {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  fact: PersonalFact;
  element: HTMLButtonElement;
}

export default function GolfFacts() {
  const { selectedBall } = useAchievements();
  const personalFacts = personalFactsByBall[selectedBall];
  const [shotBall, setShotBall] = useState(selectedBall);
  const [shot, setShot] = useState(personalFacts[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [held, setHeld] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [dragging, setDragging] = useState(false);
  const [dropHot, setDropHot] = useState(false);
  const [dragFact, setDragFact] = useState(personalFacts[0]);
  const [sceneWidth, setSceneWidth] = useState(600);
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<ClubDrag | null>(null);
  const suppressClick = useRef(false);
  const nextShotTouchRef = useRef<number | null>(null);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId))
      drag.element.releasePointerCapture(drag.pointerId);
    if (ghostRef.current) ghostRef.current.style.visibility = 'hidden';
    setDragging(false);
    setDropHot(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(media.matches);
    const onVisibility = () => setPageVisible(!document.hidden);
    media.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(([entry]) => setSceneWidth(entry.contentRect.width));
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => {
      media.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.element.hasPointerCapture(drag.pointerId))
        drag.element.releasePointerCapture(drag.pointerId);
    };
  }, []);

  useLayoutEffect(() => {
    if (phase !== 'flight') return;
    const svg = sceneRef.current?.querySelector<SVGSVGElement>('.golf-scene');
    const transform = svg?.getScreenCTM();
    if (!transform || !layerRef.current) return;
    const tee = new DOMPoint(GOLF_SCENE_GEOMETRY.tee.x, GOLF_SCENE_GEOMETRY.tee.y).matrixTransform(
      transform,
    );
    layerRef.current.style.setProperty('--golf-launch-x', `${tee.x - window.innerWidth / 2}px`);
    layerRef.current.style.setProperty('--golf-launch-y', `${tee.y - window.innerHeight / 2}px`);
  }, [phase]);

  useEffect(() => {
    if (reducedMotion && phase !== 'idle' && phase !== 'reading') {
      changePhase(phase === 'falling' ? 'idle' : 'reading');
      return;
    }
    let timer: number | undefined;
    if (phase === 'swing') timer = window.setTimeout(() => changePhase('flight'), 900);
    if (phase === 'flight') timer = window.setTimeout(() => changePhase('reading'), 650);
    if (phase === 'reading' && !reducedMotion && !held && !focused && pageVisible)
      timer = window.setTimeout(() => changePhase('falling'), 7000);
    if (phase === 'falling') timer = window.setTimeout(() => changePhase('idle'), 1100);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, held, focused, pageVisible, changePhase]);

  function startShot(fact: PersonalFact, origin: HTMLButtonElement) {
    if (phaseRef.current !== 'idle') return;
    endDrag();
    originRef.current = origin;
    // A visitor can change balls while holding a club. Resolve its story from
    // the selection at launch, then keep that story and ball together in flight.
    setShot(personalFacts.find((currentFact) => currentFact.id === fact.id) ?? fact);
    setShotBall(selectedBall);
    setHeld(false);
    setFocused(false);
    nextShotTouchRef.current = null;
    changePhase(reducedMotion ? 'reading' : 'swing');
  }

  function dismissShot() {
    if (phaseRef.current === 'idle') return;
    nextShotTouchRef.current = null;
    originRef.current?.focus({ preventScroll: true });
    setFocused(false);
    changePhase(reducedMotion ? 'idle' : 'falling');
  }

  function nextShotPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'touch' || !event.isPrimary || event.button !== 0) return;
    nextShotTouchRef.current = event.pointerId;
    // A touch drag can suppress the next synthesized click. Handle the complete
    // touch gesture directly, and prevent a compatibility click after dismissal.
    event.preventDefault();
  }

  function nextShotPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (nextShotTouchRef.current !== event.pointerId) return;
    nextShotTouchRef.current = null;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      return;
    suppressClick.current = true;
    dismissShot();
  }

  function isOverGolfer(x: number, y: number) {
    const bounds = dropRef.current?.getBoundingClientRect();
    return Boolean(
      bounds &&
      x >= bounds.left - 14 &&
      x <= bounds.right + 14 &&
      y >= bounds.top - 14 &&
      y <= bounds.bottom + 14,
    );
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, fact: PersonalFact) {
    if (phaseRef.current !== 'idle' || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      fact,
      element: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragFact(fact);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8)
      return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
    }
    if (ghostRef.current) {
      ghostRef.current.style.visibility = 'visible';
      ghostRef.current.style.transform = `translate(${event.clientX - 20}px, ${event.clientY - 12}px) rotate(-16deg)`;
    }
    setDropHot(isOverGolfer(event.clientX, event.clientY));
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const validDrop = drag.moved && isOverGolfer(event.clientX, event.clientY);
    suppressClick.current = drag.moved;
    endDrag();
    if (validDrop) startShot(drag.fact, drag.element);
  }

  function cancelDrag() {
    if (!dragRef.current) return;
    suppressClick.current = true;
    endDrag();
  }

  function onEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    if (dragRef.current || phaseRef.current !== 'idle') {
      event.stopPropagation();
      cancelDrag();
      dismissShot();
    }
  }

  const busy = phase !== 'idle';
  const showingBall = phase === 'flight' || phase === 'reading' || phase === 'falling';
  const paused = held || focused || reducedMotion;
  const geometry = GOLF_SCENE_GEOMETRY;
  const scale = sceneWidth / geometry.width;

  return (
    <div
      ref={rootRef}
      className="golf-facts"
      role="region"
      aria-label="Personal facts golf"
      data-phase={phase}
      data-ball-color={selectedBall}
      onKeyDown={onEscape}
    >
      <div className="golf-scene-frame">
        <div ref={sceneRef} className={`golf-facts-scene${dragging ? ' is-dragging' : ''}`}>
          <GolfScene
            phase={phase}
            clubColor={shot.color}
            clubKind={shot.kind}
            ballColor={busy ? shotBall : selectedBall}
          />
          <div
            ref={dropRef}
            className={`golf-drop-zone${dropHot ? ' is-over' : ''}`}
            style={{
              left: `${(geometry.golferDrop.x / geometry.width) * 100}%`,
              top: `${(geometry.golferDrop.y / geometry.height) * 100}%`,
              width: `${(geometry.golferDrop.width / geometry.width) * 100}%`,
              height: `${(geometry.golferDrop.height / geometry.height) * 100}%`,
            }}
            aria-hidden="true"
          >
            <span>OVER HERE ↓</span>
          </div>
          <div className="golf-clubs" role="group" aria-label="Choose a club">
            {personalFacts.map((fact, index) => {
              const slot = geometry.clubSlots[index];
              const head = { x: slot.x * scale, y: slot.y * scale };
              return (
                <button
                  key={fact.id}
                  type="button"
                  className={`golf-club-button${dragging && dragFact.id === fact.id ? ' is-picked-up' : ''}`}
                  style={
                    {
                      left: head.x,
                      top: head.y,
                      '--club-hit-width': `${Math.max(24, 44 * scale)}px`,
                      '--club-hit-height': `${Math.max(24, 32 * scale)}px`,
                      '--club-head-width': `${44 * scale}px`,
                      '--club-shaft-offset': `${12 * scale}px`,
                      '--club-shaft-start': `${9 * scale}px`,
                      '--club-shaft-width': `${Math.max(1, 5 * scale)}px`,
                      '--club-length': `${(geometry.bagAnchor.y - slot.y - 9) * scale}px`,
                    } as CSSProperties
                  }
                  aria-label={`${fact.club} — ${fact.topic}`}
                  aria-disabled={busy}
                  onPointerDown={(event) => pointerDown(event, fact)}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={cancelDrag}
                  onLostPointerCapture={cancelDrag}
                  onClick={(event) => {
                    if (suppressClick.current && event.detail !== 0) {
                      suppressClick.current = false;
                      return;
                    }
                    startShot(fact, event.currentTarget);
                  }}
                >
                  <span className="golf-club-shaft" aria-hidden="true" />
                  <GolfClubHeadIcon
                    color={fact.color}
                    kind={fact.kind}
                    className="golf-club-icon"
                  />
                  <span className="golf-club-tooltip" aria-hidden="true">
                    <strong>{fact.club}</strong>
                    <span>{fact.topic}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <GolfBagOverlay className="golf-bag-overlay" />
        </div>
      </div>
      <p className="golf-instructions">Drag a club. Meet a different side.</p>
      <details className="golf-readable-facts">
        <summary>Read all 6 facts</summary>
        <div className="golf-facts-list">
          {personalFacts.map((fact) => (
            <article key={fact.id}>
              <span>{fact.topic}</span>
              <h4>{fact.title}</h4>
              <p>{fact.text}</p>
            </article>
          ))}
        </div>
      </details>
      <div className="golf-sr-only" aria-live="polite" aria-atomic="true">
        {phase === 'reading' ? `${shot.topic}. ${shot.text}` : ''}
      </div>
      <div ref={ghostRef} className="golf-drag-ghost" aria-hidden="true">
        <GolfClubIcon color={dragFact.color} kind={dragFact.kind} />
      </div>
      {showingBall &&
        createPortal(
          <div
            ref={layerRef}
            className={`golf-ball-layer golf-ball-${phase}`}
            data-ball-color={shotBall}
            onKeyDown={onEscape}
          >
            <div
              className="golf-fact-ball"
              data-visible={phase === 'reading' ? 'true' : 'false'}
              role="region"
              aria-label="Personal fact"
              onFocusCapture={(event) => setFocused(event.target.matches(':focus-visible'))}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
              }}
            >
              {shotBall === 'striped' && <span className="golf-fact-stripes" aria-hidden="true" />}
              <div
                className="golf-fact-content"
                aria-hidden={phase !== 'reading'}
                inert={phase !== 'reading'}
              >
                <span className="golf-fact-kicker">
                  {shot.club} / {shot.topic}
                </span>
                <h4 className="golf-fact-title">{shot.title}</h4>
                <p className="golf-fact-copy">{shot.text}</p>
                <div className="golf-fact-actions">
                  {!reducedMotion && (
                    <button
                      type="button"
                      aria-pressed={held}
                      onClick={(event) => {
                        if (event.detail > 0) setFocused(false);
                        setHeld(!held);
                      }}
                    >
                      {held ? 'Reading paused' : 'Keep reading'}
                    </button>
                  )}
                  <button
                    type="button"
                    onPointerDown={nextShotPointerDown}
                    onPointerUp={nextShotPointerUp}
                    onPointerCancel={() => {
                      nextShotTouchRef.current = null;
                    }}
                    onClick={dismissShot}
                  >
                    Next shot <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <span className="golf-reading-note">
                  {reducedMotion
                    ? 'Take the next shot when you’re ready.'
                    : paused
                      ? 'No rush. The ball can wait.'
                      : 'Here for 7 seconds. Keep reading to stay a while.'}
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
