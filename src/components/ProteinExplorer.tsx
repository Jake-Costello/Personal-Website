import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { communityColors, demoNetwork, proteinStructures } from '../data/proteins';
import { parseNetwork, projectNode } from '../lib/protein';
import type { ProteinNetwork } from '../lib/protein';
import './protein.css';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
const initialView = { yaw: -0.15, pitch: 0.1, zoom: 1 };

export default function ProteinExplorer() {
  const [network, setNetwork] = useState<ProteinNetwork>(demoNetwork);
  const [confidence, setConfidence] = useState(0.4);
  const [selection, setSelection] = useState('TP53');
  const [pair, setPair] = useState('TP53,CDK2');
  const [view, setView] = useState(initialView);
  const [showLabels, setShowLabels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isDemo = network.source.mode === 'demo';
  const selected = network.nodes.find((node) => node.id === selection) ?? network.nodes[0];
  const structure = selected ? proteinStructures[selected.label] : undefined;
  const edges = useMemo(
    () => network.edges.filter((edge) => edge.score >= confidence),
    [network, confidence],
  );
  const projected = useMemo(
    () => network.nodes.map((node) => projectNode(node, view.yaw, view.pitch, view.zoom)),
    [network, view],
  );
  const positions = new Map(projected.map((node) => [node.id, node]));
  const selectedEdges = selected
    ? edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
    : [];

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function fetchNetwork() {
    if (!apiBase) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 35_000);
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ proteins: pair, confidence: confidence.toString() });
      const response = await fetch(`${apiBase}/api/network?${query}`, {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'The playground is busy. Wait a minute and try again; your current network is still available.'
            : response.status === 504
              ? 'The data source took too long. Your current network is still available; try again.'
              : 'The live network is unavailable. Your current network is still available; try again.',
        );
      const next = parseNetwork(await response.json());
      setNetwork(next);
      setSelection(
        next.nodes.find((node) => node.label === pair.split(',')[0])?.id ?? next.nodes[0]?.id ?? '',
      );
      setView(initialView);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== 'AbortError'
          ? failure.message
          : 'The request timed out. Your current network is still available; try again.',
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function startDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
    setView((previous) => ({
      ...previous,
      yaw: previous.yaw + dx * 0.008,
      pitch: Math.max(-1.2, Math.min(1.2, previous.pitch + dy * 0.008)),
    }));
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  }

  return (
    <div className="protein-explorer">
      <div className="protein-topbar">
        <span className="protein-app-label">
          <span aria-hidden="true">✳</span> THE PROTEIN PLAYGROUND
        </span>
        <span className={`protein-status${isDemo ? '' : ' is-live'}`}>
          <i aria-hidden="true" />
          {isDemo
            ? 'ILLUSTRATIVE DEMO'
            : network.source.cached
              ? 'CACHED STRING DATA'
              : 'LIVE STRING DATA'}
        </span>
      </div>
      <div className="protein-layout">
        <div className="protein-canvas-panel">
          <div className="protein-canvas-heading">
            <div>
              <span className="protein-eyebrow">HOMO SAPIENS / 9606</span>
              <h3>A little connected thinking.</h3>
            </div>
            <span className="protein-orbit-symbol" aria-hidden="true">
              ↗
            </span>
          </div>
          <svg
            className={`protein-graph${showLabels ? ' is-labels-visible' : ''}`}
            viewBox="0 0 660 420"
            role="group"
            aria-label="Rotatable protein association network. Select proteins using the list below or the graph."
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={() => {
              window.setTimeout(() => {
                drag.current = null;
              }, 0);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <defs>
              <pattern id="protein-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="#b9e5ee" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="660" height="420" fill="url(#protein-grid)" />
            <ellipse cx="330" cy="210" rx="264" ry="152" className="protein-orbit" />
            <ellipse
              cx="330"
              cy="210"
              rx="175"
              ry="180"
              className="protein-orbit"
              transform="rotate(40 330 210)"
            />
            {edges.map((edge) => {
              const start = positions.get(edge.source);
              const end = positions.get(edge.target);
              if (!start || !end) return null;
              const active = edge.source === selected?.id || edge.target === selected?.id;
              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={start.px}
                  y1={start.py}
                  x2={end.px}
                  y2={end.py}
                  stroke={
                    active
                      ? communityColors[selected!.community % communityColors.length]
                      : '#a9c6b7'
                  }
                  opacity={active ? 0.85 : 0.22}
                  strokeWidth={active ? 1.7 : 1}
                />
              );
            })}
            {[...projected]
              .sort((a, b) => a.depth - b.depth)
              .map((node) => (
                <g
                  key={node.id}
                  className="protein-node"
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, group ${node.community + 1}`}
                  aria-pressed={selected?.id === node.id}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    if (!drag.current?.moved) setSelection(node.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelection(node.id);
                    }
                  }}
                >
                  <circle
                    cx={node.px}
                    cy={node.py}
                    r={Math.max(18, node.radius + 7)}
                    fill="transparent"
                  />
                  {selected?.id === node.id && (
                    <circle
                      cx={node.px}
                      cy={node.py}
                      r={node.radius + 6}
                      fill="none"
                      stroke={communityColors[node.community % communityColors.length]}
                      strokeWidth="1"
                    />
                  )}
                  <circle
                    className="protein-dot"
                    cx={node.px}
                    cy={node.py}
                    r={node.radius}
                    fill={communityColors[node.community % communityColors.length]}
                    stroke="#17251e"
                    strokeWidth="2"
                  />
                  <text
                    x={node.px}
                    y={node.py - node.radius - 9}
                    textAnchor="middle"
                    fill="#f5f3ed"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            {network.nodes.length === 0 && (
              <text x="330" y="210" textAnchor="middle" fill="#f5f3ed">
                No proteins returned. Try the other example.
              </text>
            )}
          </svg>
          <div className="protein-graph-footer">
            <span>
              DRAG TO ROTATE <span aria-hidden="true">↔</span>
            </span>
            <div className="protein-view-controls" aria-label="Network view controls">
              <button
                type="button"
                aria-label="Rotate network left"
                onClick={() => setView((previous) => ({ ...previous, yaw: previous.yaw - 0.3 }))}
              >
                ↶
              </button>
              <button
                type="button"
                aria-label="Rotate network right"
                onClick={() => setView((previous) => ({ ...previous, yaw: previous.yaw + 0.3 }))}
              >
                ↷
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                disabled={view.zoom <= 0.65}
                onClick={() =>
                  setView((previous) => ({
                    ...previous,
                    zoom: Math.max(0.65, previous.zoom - 0.1),
                  }))
                }
              >
                −
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={view.zoom >= 1.35}
                onClick={() =>
                  setView((previous) => ({
                    ...previous,
                    zoom: Math.min(1.35, previous.zoom + 0.1),
                  }))
                }
              >
                +
              </button>
              <button
                type="button"
                aria-label="Reset network view"
                onClick={() => setView(initialView)}
              >
                RESET
              </button>
              <button
                type="button"
                aria-label="Show all protein labels"
                aria-pressed={showLabels}
                onClick={() => setShowLabels(!showLabels)}
              >
                LABELS
              </button>
            </div>
          </div>
        </div>
        <aside className="protein-sidebar" aria-label="Network controls and selected protein">
          <div className="protein-readout">
            <div>
              <strong>{network.nodes.length}</strong>
              <span>PROTEINS</span>
            </div>
            <div>
              <strong>{edges.length}</strong>
              <span>CONNECTIONS</span>
            </div>
            <div>
              <strong>{network.communities}</strong>
              <span>{isDemo ? 'DEMO GROUPS' : 'COMMUNITIES'}</span>
            </div>
          </div>
          <div className="protein-control-block">
            <div className="protein-label-row">
              <label htmlFor="protein-confidence">Connection confidence</label>
              <output htmlFor="protein-confidence">{confidence.toFixed(2)}</output>
            </div>
            <input
              id="protein-confidence"
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
            <p>
              {isDemo
                ? 'Raise the threshold to filter this illustrative network.'
                : confidence < network.confidence
                  ? `This result starts at ${network.confidence.toFixed(2)} confidence. Fetch again to include lower-confidence connections.`
                  : `Links are filtered locally. Communities were computed at ${network.confidence.toFixed(2)}; fetch again to recompute them.`}
            </p>
          </div>
          <div className="protein-selection" aria-live="polite">
            <span className="protein-eyebrow">SELECTED PROTEIN</span>
            <div className="protein-selected-heading">
              <h4>{selected?.label ?? 'None'}</h4>
              {selected && (
                <span
                  style={{
                    background: communityColors[selected.community % communityColors.length],
                  }}
                >
                  GROUP {selected.community + 1}
                </span>
              )}
            </div>
            <p>
              {selected
                ? `${selectedEdges.length} visible connections in this network. Select another node to follow its relationships.`
                : 'No proteins are available for this query.'}
            </p>
            {structure ? (
              <a
                href={`https://www.rcsb.org/structure/${structure.code}`}
                target="_blank"
                rel="noreferrer"
              >
                View {structure.code} structure at RCSB <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="protein-unavailable">
                No curated structure link for this protein.
              </span>
            )}
            {structure && <p className="protein-structure-caption">{structure.description}</p>}
          </div>
          <div className="protein-source">
            {apiBase ? (
              <>
                <label htmlFor="protein-example">Starting proteins</label>
                <select
                  id="protein-example"
                  value={pair}
                  onChange={(event) => setPair(event.target.value)}
                  disabled={loading}
                >
                  <option value="TP53,CDK2">TP53 + CDK2</option>
                  <option value="BRCA1,BRCA2">BRCA1 + BRCA2</option>
                </select>
                <button
                  className="protein-fetch"
                  type="button"
                  onClick={fetchNetwork}
                  disabled={loading}
                >
                  {loading ? 'Fetching & finding communities…' : 'Fetch live network ↗'}
                </button>
              </>
            ) : (
              <p>
                <strong>Explore the prototype.</strong> Live STRING data will be available when the
                Python service is connected.
              </p>
            )}
            {error && (
              <p role="alert" className="protein-error">
                {error}
              </p>
            )}
          </div>
        </aside>
      </div>
      <div className="protein-notes">
        <p>
          {isDemo ? (
            'Demo data: connections, scores, and groups are illustrative.'
          ) : (
            <>
              <a href={network.source.url} target="_blank" rel="noreferrer">
                {network.source.name}
              </a>{' '}
              · Retrieved {new Date(network.source.retrievedAt!).toLocaleString()}
              {network.source.cached ? ' · cached response' : ''}.
            </>
          )}{' '}
          Positions show a network layout, not molecular structure.
        </p>
        <details>
          <summary>
            Explore the data & how it works <span aria-hidden="true">+</span>
          </summary>
          <div className="protein-details-grid">
            <div>
              <h4>Follow a protein</h4>
              <div className="protein-node-list">
                {network.nodes.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    aria-pressed={selected?.id === node.id}
                    onClick={() => setSelection(node.id)}
                  >
                    <i
                      style={{
                        background: communityColors[node.community % communityColors.length],
                      }}
                      aria-hidden="true"
                    />
                    {node.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4>From data to discovery</h4>
              <p>
                The Python service resolves identifiers with STRING, cleans the data with pandas,
                and finds communities using seeded Louvain clustering in NetworkX. Associations can
                be functional; they do not always mean physical contact.
              </p>
              <p>
                Communities are algorithmic groups, not established biological pathways.
                Source-grounded AI explanations are a future stage; no AI service is connected.
              </p>
              <a href="https://string-db.org/help/api/" target="_blank" rel="noreferrer">
                Read the STRING API documentation ↗
              </a>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
