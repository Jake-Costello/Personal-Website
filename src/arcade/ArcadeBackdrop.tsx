import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// The cabinets and fallback remain usable while the optional GPU renderer loads.
// Reduced-motion and no-WebGL visitors skip the optional backdrop renderer.
const ArcadeShader = lazy(() => import('./ArcadeShader'));

type BackdropProps = {
  paused: boolean;
  reduced: boolean;
};

type BoundaryProps = {
  children: ReactNode;
  onFailure: () => void;
};

class GradientBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { powerPreference: 'low-power' });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function ArcadeBackdrop({ paused, reduced }: BackdropProps) {
  const root = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Reduced-motion visitors do not allocate a second context for the backdrop.
    if (!reduced) setSupported(supportsWebGL());
  }, [reduced]);

  useEffect(() => {
    const onVisibility = () => {
      setVisible(!document.hidden);
      setReady(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const element = root.current;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    // This event does not bubble; capture also covers canvases mounted after this effect.
    element?.addEventListener('webglcontextlost', onContextLost, true);
    return () => element?.removeEventListener('webglcontextlost', onContextLost, true);
  }, []);

  const renderShader = supported && visible && !reduced && !failed;

  useEffect(() => {
    if (!renderShader) setReady(false);
  }, [renderShader]);

  return (
    <div
      ref={root}
      className="arcade-backdrop"
      aria-hidden="true"
      data-renderer={renderShader && ready ? 'shader' : 'static'}
    >
      <div
        className="arcade-backdrop__fallback"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 10% 42%, #20346b 0, transparent 47%), radial-gradient(ellipse at 92% 34%, #44315e 0, transparent 48%), #050610',
        }}
      />
      {renderShader && (
        <div className="arcade-backdrop__gradient" style={{ position: 'absolute', inset: 0 }}>
          <GradientBoundary onFailure={() => setFailed(true)}>
            <Suspense fallback={null}>
              <ArcadeShader paused={paused} onReady={() => setReady(true)} />
            </Suspense>
          </GradientBoundary>
        </div>
      )}
      <div className="arcade-backdrop__veil" />
    </div>
  );
}
