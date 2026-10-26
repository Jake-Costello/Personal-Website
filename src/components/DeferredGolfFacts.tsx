import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';

const hasAboutIntent = () =>
  typeof window !== 'undefined' &&
  (window.location.hash === '#about' || window.location.hash === '#about-title');

export default function DeferredGolfFacts() {
  const [requested, setRequested] = useState(hasAboutIntent);
  const [loaded, setLoaded] = useState<{ View: ComponentType } | null>(null);
  const [failed, setFailed] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const request = useCallback(() => setRequested(true), []);

  useEffect(() => {
    if (requested) return;
    const element = region.current;
    if (!element) return;
    const onHash = () => {
      if (hasAboutIntent()) request();
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest('#about')) request();
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) request();
            },
            { rootMargin: '600px 0px' },
          );
    if (observer) observer.observe(element);
    else request();
    window.addEventListener('hashchange', onHash);
    document.addEventListener('focusin', onFocus);
    onHash();
    return () => {
      observer?.disconnect();
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('focusin', onFocus);
    };
  }, [requested, request]);

  useEffect(() => {
    if (!requested || loaded) return;
    let current = true;
    setFailed(false);
    // Keep the golf SVG, animation rig, trivia and styles off the initial loading path.
    // A local failure leaves the rest of the portfolio intact. Reloading clears a failed
    // module import from the browser's module cache before trying the scene again.
    void import('./GolfFacts')
      .then(({ default: View }) => {
        if (current) setLoaded({ View });
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [requested, loaded]);

  useEffect(() => {
    if (loaded && document.activeElement === region.current)
      region.current?.querySelector<HTMLButtonElement>('.golf-club-button')?.focus({
        preventScroll: true,
      });
  }, [loaded]);

  const View = loaded?.View;
  return (
    <div
      ref={region}
      className="golf-deferred"
      role="group"
      aria-label="Golf stories"
      aria-busy={requested && !loaded && !failed}
      tabIndex={loaded ? -1 : 0}
      onFocusCapture={request}
      data-golf-ready={Boolean(loaded)}
    >
      {View ? (
        <View />
      ) : (
        <div className="golf-loading">
          <div className="golf-loading-scene">
            {failed && (
              <div>
                <p role="status">The golf stories couldn’t load.</p>
                <button onClick={() => window.location.reload()}>Reload page</button>
              </div>
            )}
          </div>
          <p className="golf-loading-caption" role={requested && !failed ? 'status' : undefined}>
            {requested && !failed
              ? 'Getting the clubs ready…'
              : 'Drag a club. Meet a different side.'}
          </p>
        </div>
      )}
    </div>
  );
}
