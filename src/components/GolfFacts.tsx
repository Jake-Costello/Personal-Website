import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { personalFacts } from '../data/personal';
import type { PersonalFact } from '../data/personal';
import GolfScene, { GolfClubIcon } from './GolfScene';
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
  const [selected, setSelected] = useState(personalFacts[0]);
  const [shot, setShot] = useState(personalFacts[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [discovered, setDiscovered] = useState<Set<string>>(() => new Set());
  const [held, setHeld] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [dragging, setDragging] = useState(false);
  const [dropHot, setDropHot] = useState(false);
  const [dragFact, setDragFact] = useState(personalFacts[0]);
  const [launchOffset, setLaunchOffset] = useState({ x: 85, y: 112 });
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const swingRef = useRef<HTMLButtonElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ClubDrag | null>(null);
  const suppressClick = useRef(false);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) {
      drag.element.releasePointerCapture(drag.pointerId);
    }
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
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    if (sceneRef.current) observer.observe(sceneRef.current);
    const resizeObserver = new ResizeObserver(([entry]) => {
      const scale = Math.max(entry.contentRect.width / 900, entry.contentRect.height / 430);
      setLaunchOffset({ x: 85 * scale, y: 112 * scale });
    });
    if (sceneRef.current) resizeObserver.observe(sceneRef.current);
    return () => {
      media.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      resizeObserver.disconnect();
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.element.hasPointerCapture(drag.pointerId))
        drag.element.releasePointerCapture(drag.pointerId);
    };
  }, []);

  useEffect(() => {
    if (phase === 'reading') {
      setDiscovered((previous) =>
        previous.has(shot.id) ? previous : new Set([...previous, shot.id]),
      );
    }
    if (reducedMotion && phase !== 'idle' && phase !== 'reading') {
      changePhase(phase === 'falling' ? 'idle' : 'reading');
      return;
    }
    let timer: number | undefined;
    if (phase === 'swing') timer = window.setTimeout(() => changePhase('flight'), 900);
    if (phase === 'flight') timer = window.setTimeout(() => changePhase('reading'), 650);
    if (
      phase === 'reading' &&
      !reducedMotion &&
      !held &&
      !hovering &&
      !focused &&
      inView &&
      pageVisible
    ) {
      timer = window.setTimeout(() => changePhase('falling'), 7000);
    }
    if (phase === 'falling') timer = window.setTimeout(() => changePhase('idle'), 1100);
    return () => window.clearTimeout(timer);
  }, [phase, shot.id, reducedMotion, held, hovering, focused, inView, pageVisible, changePhase]);

  function startShot(fact: PersonalFact) {
    if (phaseRef.current !== 'idle') return;
    endDrag();
    setSelected(fact);
    setShot(fact);
    setHeld(false);
    setHovering(false);
    setFocused(false);
    changePhase(reducedMotion ? 'reading' : 'swing');
    const scene = sceneRef.current;
    const bounds = scene?.getBoundingClientRect();
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
      scene?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'instant' : 'smooth' });
    }
  }

  function dismissShot() {
    if (phaseRef.current === 'idle') return;
    if (ballRef.current?.contains(document.activeElement))
      swingRef.current?.focus({ preventScroll: true });
    setHovering(false);
    setFocused(false);
    changePhase(reducedMotion ? 'idle' : 'falling');
  }

  function isOverGolfer(x: number, y: number) {
    const bounds = dropRef.current?.getBoundingClientRect();
    return Boolean(
      bounds &&
      x >= bounds.left - 16 &&
      x <= bounds.right + 16 &&
      y >= bounds.top - 16 &&
      y <= bounds.bottom + 16,
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
      ghostRef.current.style.transform = `translate(${event.clientX - 24}px, ${event.clientY - 72}px) rotate(-16deg)`;
    }
    setDropHot(isOverGolfer(event.clientX, event.clientY));
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const validDrop = drag.moved && isOverGolfer(event.clientX, event.clientY);
    suppressClick.current = drag.moved;
    endDrag();
    if (validDrop) startShot(drag.fact);
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
  const paused = held || hovering || focused || reducedMotion;

  return (
    <div
      ref={rootRef}
      className="golf-facts"
      role="region"
      aria-label="Personal facts golf"
      data-phase={phase}
      onKeyDown={onEscape}
    >
      <div className="golf-facts-heading">
        <div>
          <p className="golf-eyebrow">THE PERSONAL BAG / SIX LITTLE STORIES</p>
          <h3>
            Pick a club.
            <br />
            <span>Meet a different side.</span>
          </h3>
        </div>
        <p className="golf-discovered">
          <strong>{discovered.size.toString().padStart(2, '0')}</strong>
          <span>
            {discovered.size} / {personalFacts.length} discovered
          </span>
        </p>
      </div>

      <div className={`golf-playground${dragging ? ' is-dragging' : ''}`}>
        <div ref={sceneRef} className="golf-facts-scene">
          <GolfScene phase={phase} clubColor={(busy ? shot : selected).color} />
          <span className="golf-scene-stamp" aria-hidden="true">
            JC / OFF THE CLOCK
          </span>
          <div
            ref={dropRef}
            className={`golf-drop-zone${dropHot ? ' is-over' : ''}`}
            aria-hidden="true"
          >
            <span>HAND ME A CLUB ↓</span>
          </div>

          {showingBall && (
            <div
              className={`golf-ball-layer golf-ball-${phase}`}
              style={
                {
                  '--golf-launch-x': `${launchOffset.x}px`,
                  '--golf-launch-y': `${launchOffset.y}px`,
                } as CSSProperties
              }
            >
              <div
                ref={ballRef}
                className="golf-fact-ball"
                data-visible={phase === 'reading' ? 'true' : 'false'}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') setHovering(true);
                }}
                onPointerLeave={() => setHovering(false)}
                onFocusCapture={() => setFocused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
                }}
              >
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
                      <button type="button" aria-pressed={held} onClick={() => setHeld(!held)}>
                        {held ? 'Reading paused' : 'Keep reading'}
                      </button>
                    )}
                    <button type="button" onClick={dismissShot}>
                      Next shot <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                  <span className="golf-reading-note">
                    {reducedMotion
                      ? 'Yours to read. Take the next shot when ready.'
                      : paused
                        ? 'No rush. The ball can wait.'
                        : 'Here for 7 seconds. Keep reading to stay a while.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="golf-scene-caption" aria-hidden="true">
            <span>
              {phase === 'idle'
                ? 'A LITTLE MORE HUMAN.'
                : phase === 'swing' || phase === 'flight'
                  ? 'FORE! A FACT IS ON ITS WAY.'
                  : 'THERE’S A STORY IN EVERY SHOT.'}
            </span>
            <span>EST. OFFLINE</span>
          </div>
        </div>

        <div className="golf-bag-panel">
          <div className="golf-bag-label">
            <span aria-hidden="true">↙</span>
            <p>
              YOUR CLUB SELECTION<small>Different clubs. Different stories.</small>
            </p>
          </div>
          <div className="golf-club-rack" role="group" aria-label="Choose a club">
            {personalFacts.map((fact) => (
              <button
                key={fact.id}
                type="button"
                className="golf-club-button"
                aria-label={`${fact.club} — ${fact.topic}`}
                aria-pressed={selected.id === fact.id}
                aria-disabled={busy}
                data-discovered={discovered.has(fact.id) ? 'true' : 'false'}
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
                  if (phaseRef.current === 'idle') setSelected(fact);
                }}
              >
                <GolfClubIcon color={fact.color} kind={fact.kind} className="golf-club-icon" />
                <span>
                  <strong>{fact.club}</strong>
                  <small>{fact.topic}</small>
                </span>
                <span className="golf-club-seen" aria-hidden="true">
                  {discovered.has(fact.id) ? '✓' : '↗'}
                </span>
              </button>
            ))}
          </div>
          <button
            ref={swingRef}
            className="golf-swing-button"
            type="button"
            aria-disabled={busy}
            onClick={() => startShot(selected)}
          >
            Take a swing <span aria-hidden="true">↗</span>
          </button>
          <p className="golf-instructions">
            Pick a club, then take a swing. Or drag a club over to the golfer.
          </p>
        </div>
      </div>

      <div className="golf-bottom-line">
        <span>NO SCORECARD. JUST A FEW THINGS ABOUT ME.</span>
        <span>
          {discovered.size === personalFacts.length
            ? 'Full bag explored. Thanks for playing.'
            : 'Six clubs. Six sides of life.'}
        </span>
      </div>
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
    </div>
  );
}
