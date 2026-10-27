import './arcade-loader.css';

export default function ArcadeLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`arcade-loader${compact ? ' arcade-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="arcade-loader-label">Loading...</span>
    </div>
  );
}
