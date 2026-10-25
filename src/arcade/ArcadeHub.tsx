import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import ArcadeBackdrop from './ArcadeBackdrop';
import ArcadeCabinet from './ArcadeCabinet';
import { arcadeProjects } from './projects';

const count = arcadeProjects.length;
const wrap = (value: number) => ((value % count) + count) % count;

export default function ArcadeHub() {
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [details, setDetails] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const selected = wrap(turn);
  const project = arcadeProjects[selected];
  const detailProject = details === null ? null : arcadeProjects[details];

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (details === null || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [details]);

  const choose = (index: number) => {
    setTurn((current) => {
      let distance = wrap(index - wrap(current));
      if (distance > count / 2) distance -= count;
      return current + distance;
    });
  };

  const start = () => {
    if (project.href) window.location.assign(project.href);
    else setDetails(selected);
  };

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      details !== null
    )
      return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setTurn((value) => value + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setTurn((value) => value - 1);
    }
    if (event.key.toLowerCase() === 'a' || event.key === 'Enter') {
      event.preventDefault();
      start();
    }
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      setDetails(selected);
    }
  };

  const beginSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' || (event.target as Element).closest('button, a')) return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || from.id !== event.pointerId) return;
    const dx = event.clientX - from.x;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(event.clientY - from.y) * 1.3) {
      setTurn((value) => value + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div
      className="arcade-page"
      data-motion={paused || reduced || details !== null ? 'paused' : 'running'}
      style={{ '--active-accent': project.accent } as CSSProperties}
    >
      <a className="arcade-skip" href="#cabinets">
        Skip to the cabinets
      </a>
      <ArcadeBackdrop paused={paused || details !== null} reduced={reduced} />
      <div className="arcade-memory" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ '--pillar': i } as CSSProperties} />
        ))}
      </div>

      <header className="arcade-header">
        <a className="arcade-home" href={import.meta.env.BASE_URL}>
          <b>
            JC<span>↗</span>
          </b>
          <span>Back to the homepage</span>
        </a>
        <span className="arcade-header-label">JAKE COSTELLO / EXPERIMENTS & PLAY</span>
        <button
          className="arcade-motion"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          disabled={reduced}
          aria-label={paused ? 'Resume motion' : 'Pause motion'}
        >
          <span aria-hidden="true">{paused || reduced ? '▷' : 'Ⅱ'}</span>
          {reduced ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion'}
        </button>
      </header>

      <main>
        <div className="arcade-intro">
          <p className="arcade-eyebrow">
            <span /> SOME IDEAS ARE BETTER PLAYED.
          </p>
          <h1>
            Project <span>Arcade</span>
            <sup>↗</sup>
          </h1>
          <p>Pick a cabinet. Find out what’s inside.</p>
        </div>

        <section
          id="cabinets"
          className="arcade-selector"
          role="region"
          aria-label="Project cabinet selector"
          aria-describedby="arcade-instructions"
          tabIndex={0}
          onKeyDown={handleKeys}
        >
          <div
            className="arcade-stage"
            onPointerDown={beginSwipe}
            onPointerUp={endSwipe}
            onPointerCancel={() => {
              swipe.current = null;
            }}
          >
            <div className="arcade-floor" aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
            <div className="arcade-orbit-scale">
              <div
                className="arcade-orbit"
                style={{
                  transform: `translateZ(calc(-1 * var(--orbit-radius))) rotateY(${-turn * 90}deg)`,
                }}
              >
                {arcadeProjects.map((item, index) => {
                  const angle = ((index - turn) * Math.PI) / 2;
                  const facing = (turn - index) * 90 - Math.sin(angle) * 22;
                  return (
                    <div
                      className={`arcade-station${index === selected ? ' is-current' : ''}${wrap(index - selected) === 2 ? ' is-rear' : ''}`}
                      key={item.id}
                      style={{
                        transform: `rotateY(${index * 90}deg) translateZ(var(--orbit-radius)) rotateY(${facing}deg)`,
                      }}
                    >
                      <div className="arcade-cabinet-shadow" aria-hidden="true" />
                      <ArcadeCabinet
                        project={item}
                        selected={index === selected}
                        onSelect={() =>
                          index === selected ? setTurn((value) => value + 1) : choose(index)
                        }
                        onStart={start}
                        onInfo={() => setDetails(index)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              className="arcade-arrow arcade-arrow-prev"
              aria-label="Previous cabinet"
              onClick={() => setTurn((value) => value - 1)}
            >
              ←
            </button>
            <button
              className="arcade-arrow arcade-arrow-next"
              aria-label="Next cabinet"
              onClick={() => setTurn((value) => value + 1)}
            >
              →
            </button>
          </div>

          <div className="arcade-selection-copy" aria-live="polite" aria-atomic="true">
            <div className="arcade-selection-meta">
              <span>{project.number} / 04</span>
              <span className={`arcade-status ${project.status}`}>
                {project.status === 'live' ? 'READY TO PLAY' : 'IN DEVELOPMENT'}
              </span>
            </div>
            <h2>{project.title}</h2>
            <p>{project.tagline}</p>
          </div>
          <nav className="arcade-choices" aria-label="Choose a project">
            {arcadeProjects.map((item, index) => (
              <button
                key={item.id}
                onClick={() => choose(index)}
                aria-label={`Choose ${item.title}`}
                aria-pressed={index === selected}
                style={{ '--choice-accent': item.accent } as CSSProperties}
              >
                <span>{item.number}</span>
                <b>{item.title}</b>
                <i aria-hidden="true" />
              </button>
            ))}
          </nav>
          <p id="arcade-instructions" className="arcade-instructions">
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> Choose a cabinet
            </span>
            <span>
              <kbd>A</kbd> {project.status === 'live' ? 'Start' : 'Preview'}
            </span>
            <span>
              <kbd>B</kbd> The project
            </span>
            <span className="arcade-touch-hint">Swipe or tap to explore</span>
          </p>
        </section>
      </main>

      <footer className="arcade-footer">
        <span>BUILT TO BE EXPLORED.</span>
        <span>
          NO COINS REQUIRED<span className="arcade-footer-star">✳</span>
        </span>
      </footer>

      <dialog
        ref={dialog}
        className="arcade-dialog"
        aria-labelledby="arcade-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          setDetails(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              setDetails(null);
          }
        }}
      >
        {detailProject && (
          <>
            <button
              className="arcade-dialog-close"
              aria-label="Close project details"
              onClick={() => setDetails(null)}
            >
              ×
            </button>
            <p className="arcade-eyebrow">
              CABINET {detailProject.number} /{' '}
              {detailProject.status === 'live' ? 'LIVE PROJECT' : 'CONCEPT PREVIEW'}
            </p>
            <h2 id="arcade-dialog-title">{detailProject.title}</h2>
            <p className="arcade-dialog-genre">{detailProject.genre}</p>
            <p className="arcade-dialog-description">{detailProject.description}</p>
            <ol>
              {detailProject.steps.map((step, index) => (
                <li key={step}>
                  <span>0{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="arcade-dialog-skills-label">
              {detailProject.status === 'live' ? 'UNDER THE HOOD' : 'PLANNED UNDER THE HOOD'}
            </p>
            <div className="arcade-dialog-skills">
              {detailProject.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
            {detailProject.href ? (
              <a className="arcade-dialog-start" href={detailProject.href}>
                Open the {detailProject.id === 'protein' ? 'lab' : 'jetski tour'} <span>↗</span>
              </a>
            ) : (
              <p className="arcade-coming-note">
                <span />
                The cabinet is ready. The game is in development and isn’t playable yet.
              </p>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
