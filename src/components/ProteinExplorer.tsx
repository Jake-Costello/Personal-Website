import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { communityColors, proteinStructures } from '../data/proteins';
import {
  chooseRandomProteinPair,
  parseNetwork,
  parseProteinCatalog,
  projectNode,
} from '../lib/protein';
import type { ProteinCatalog, ProteinNetwork } from '../lib/protein';
import ProteinComparison from './ProteinComparison';
import './protein.css';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
const initialView = { yaw: -0.15, pitch: 0.1, zoom: 1 };

interface NetworkQuery {
  pair: [string, string];
  confidence: number;
  neighbors: number;
}

function serviceError(status: number) {
  return new Error(
    status === 429
      ? 'The playground is busy. Wait a minute, then try again.'
      : status === 504
        ? 'STRING took too long to respond. Please try again.'
        : 'Live protein data is temporarily unavailable. Please try again.',
  );
}

export default function ProteinExplorer() {
  const [catalog, setCatalog] = useState<ProteinCatalog | null>(null);
  const [network, setNetwork] = useState<ProteinNetwork | null>(null);
  const [loadedQuery, setLoadedQuery] = useState<NetworkQuery | null>(null);
  const [requestedQuery, setRequestedQuery] = useState<NetworkQuery | null>(null);
  const [confidence, setConfidence] = useState(0.4);
  const [selection, setSelection] = useState('');
  const [pair, setPair] = useState<[string, string]>(['', '']);
  const [neighbors, setNeighbors] = useState(8);
  const [view, setView] = useState(initialView);
  const [showLabels, setShowLabels] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<'catalog' | 'network'>('catalog');
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const selected = network?.nodes.find((node) => node.id === selection) ?? network?.nodes[0];
  const structure = selected ? proteinStructures[selected.label] : undefined;
  const selectedDescription = catalog?.proteins.find(
    (protein) => protein.symbol === selected?.label,
  )?.name;
  const edges = useMemo(
    () => network?.edges.filter((edge) => edge.score >= confidence) ?? [],
    [network, confidence],
  );
  const projected = useMemo(
    () => network?.nodes.map((node) => projectNode(node, view.yaw, view.pitch, view.zoom)) ?? [],
    [network, view],
  );
  const positions = new Map(projected.map((node) => [node.id, node]));
  const selectedEdges = selected
    ? edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
    : [];
  const pendingChanges =
    loadedQuery &&
    (pair[0] !== loadedQuery.pair[0] ||
      pair[1] !== loadedQuery.pair[1] ||
      neighbors !== loadedQuery.neighbors ||
      confidence !== loadedQuery.confidence);
  const connections = useMemo(() => {
    const scores = new Map<string, number>();
    for (const edge of catalog?.connections ?? []) {
      if (edge.source === pair[0]) scores.set(edge.target, edge.score);
      if (edge.target === pair[0]) scores.set(edge.source, edge.score);
    }
    return scores;
  }, [catalog, pair]);
  const secondOptions = useMemo(() => {
    const options = (catalog?.proteins ?? []).filter((protein) => protein.symbol !== pair[0]);
    return options.sort((a, b) => {
      const aScore = connections.get(a.symbol) ?? 0;
      const bScore = connections.get(b.symbol) ?? 0;
      return (
        Number(bScore >= confidence) - Number(aScore >= confidence) ||
        bScore - aScore ||
        a.symbol.localeCompare(b.symbol)
      );
    });
  }, [catalog, pair, connections, confidence]);

  const fetchNetwork = useCallback(async (query: NetworkQuery) => {
    if (!apiBase) return;
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 35_000);
    setLoading(true);
    setStage('network');
    setRequestedQuery(query);
    setError('');
    try {
      const params = new URLSearchParams({
        proteins: query.pair.join(','),
        confidence: query.confidence.toString(),
        neighbors: query.neighbors.toString(),
      });
      const response = await fetch(`${apiBase}/api/network?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw serviceError(response.status);
      const next = parseNetwork(await response.json());
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      setNetwork(next);
      setLoadedQuery(query);
      setSelection(
        next.nodes.find((node) => node.label === query.pair[0])?.id ?? next.nodes[0]?.id ?? '',
      );
      setView(initialView);
    } catch (failure) {
      if (sequence !== requestSequence.current || (controller.signal.aborted && !timedOut)) return;
      setError(
        timedOut
          ? 'The request timed out. Please try again.'
          : failure instanceof Error && failure.name !== 'TypeError'
            ? failure.message
            : 'Could not reach the live data service. Check your connection and try again.',
      );
    } finally {
      window.clearTimeout(timeout);
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!apiBase) {
      setLoading(false);
      setError('The live data service is not configured yet. Please check back soon.');
      return;
    }
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 35_000);
    setLoading(true);
    setStage('catalog');
    setError('');
    try {
      const response = await fetch(`${apiBase}/api/proteins`, { signal: controller.signal });
      if (!response.ok) throw serviceError(response.status);
      const next = parseProteinCatalog(await response.json());
      if (sequence !== requestSequence.current || controller.signal.aborted) return;
      const nextPair = chooseRandomProteinPair(next.proteins);
      setCatalog(next);
      setPair(nextPair);
      setConfidence(0.4);
      setNeighbors(8);
      window.clearTimeout(timeout);
      await fetchNetwork({ pair: nextPair, confidence: 0.4, neighbors: 8 });
    } catch (failure) {
      if (sequence !== requestSequence.current || (controller.signal.aborted && !timedOut)) return;
      setError(
        timedOut
          ? 'The protein list took too long to load. Please try again.'
          : failure instanceof Error && failure.name !== 'TypeError'
            ? failure.message
            : 'Could not reach the live data service. Check your connection and try again.',
      );
    } finally {
      window.clearTimeout(timeout);
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, [fetchNetwork]);

  useEffect(() => {
    // A queued start lets StrictMode cancel its first setup before any API request.
    const start = window.setTimeout(() => {
      void initialize();
    }, 0);
    return () => {
      window.clearTimeout(start);
      ++requestSequence.current;
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [initialize]);

  function exploreRandomPair() {
    if (!catalog) return;
    const nextPair = chooseRandomProteinPair(catalog.proteins);
    setPair(nextPair);
    void fetchNetwork({ pair: nextPair, confidence, neighbors });
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
        <span className={`protein-status${network ? ' is-live' : ''}`}>
          <i aria-hidden="true" />
          {network
            ? network.source.cached
              ? 'CACHED STRING DATA'
              : 'LIVE STRING DATA'
            : loading
              ? 'LOADING STRING DATA'
              : 'DATA UNAVAILABLE'}
        </span>
      </div>
      <form
        className="protein-query"
        onSubmit={(event) => {
          event.preventDefault();
          if (catalog) void fetchNetwork({ pair: [...pair], confidence, neighbors });
        }}
      >
        <div className="protein-query-fields">
          <div>
            <label htmlFor="protein-first">First protein</label>
            <select
              id="protein-first"
              value={pair[0]}
              disabled={!catalog}
              onChange={(event) => setPair([event.target.value, pair[1]])}
            >
              {!catalog && <option value="">Loading proteins…</option>}
              {catalog?.proteins.map((protein) => (
                <option
                  key={protein.symbol}
                  value={protein.symbol}
                  disabled={protein.symbol === pair[1]}
                  title={protein.name}
                >
                  {protein.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="protein-second">Second protein</label>
            <select
              id="protein-second"
              value={pair[1]}
              disabled={!catalog}
              aria-describedby="protein-connection-hint"
              onChange={(event) => setPair([pair[0], event.target.value])}
            >
              {!catalog && <option value="">Loading proteins…</option>}
              {secondOptions.some(
                (protein) => (connections.get(protein.symbol) ?? 0) >= confidence,
              ) && (
                <optgroup label={`Associated with ${pair[0]} at ≥ ${confidence.toFixed(2)}`}>
                  {secondOptions
                    .filter((protein) => (connections.get(protein.symbol) ?? 0) >= confidence)
                    .map((protein) => (
                      <option key={protein.symbol} value={protein.symbol} title={protein.name}>
                        {protein.symbol} · {connections.get(protein.symbol)!.toFixed(3)}
                      </option>
                    ))}
                </optgroup>
              )}
              {secondOptions.some(
                (protein) => (connections.get(protein.symbol) ?? 0) < confidence,
              ) && (
                <optgroup label="Other proteins">
                  {secondOptions
                    .filter((protein) => (connections.get(protein.symbol) ?? 0) < confidence)
                    .map((protein) => (
                      <option key={protein.symbol} value={protein.symbol} title={protein.name}>
                        {protein.symbol} ·{' '}
                        {connections.has(protein.symbol)
                          ? `Below threshold (${connections.get(protein.symbol)!.toFixed(2)})`
                          : 'No link returned'}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="protein-network-size">Network size</label>
            <select
              id="protein-network-size"
              value={neighbors}
              disabled={!catalog}
              onChange={(event) => setNeighbors(Number(event.target.value))}
            >
              <option value="0">Just these two</option>
              <option value="8">Small neighborhood</option>
              <option value="24">Wider neighborhood</option>
            </select>
          </div>
          <div className="protein-query-actions">
            <button className="protein-fetch" type="submit" disabled={!catalog}>
              Explore network ↗
            </button>
            <button
              className="protein-random"
              type="button"
              onClick={exploreRandomPair}
              disabled={!catalog}
            >
              Random pair
            </button>
          </div>
        </div>
        <p id="protein-connection-hint" className="protein-query-hint">
          {catalog
            ? `${catalog.proteins.length} starting proteins, with association hints from STRING. `
            : ''}
          Scores describe direct associations returned for this list; unlisted links may still
          exist.
        </p>
        <p className="protein-query-status" role="status" aria-live="polite">
          {loading
            ? stage === 'catalog'
              ? 'Loading the protein list from STRING…'
              : `Finding communities for ${requestedQuery?.pair.join(' + ')}…`
            : pendingChanges
              ? 'Selection changed. Explore network to apply it and recompute communities.'
              : network
                ? 'Network ready. Choose proteins or try another random pair.'
                : ''}
          {loading && network ? ' The previous network remains visible below.' : ''}
        </p>
        {error && (
          <div className="protein-error" role="alert">
            <p>
              {error}
              {network ? ' Your previous network is still available below.' : ''}
            </p>
            <button
              className="protein-retry"
              type="button"
              disabled={loading}
              onClick={() => {
                if (catalog) void fetchNetwork({ pair: [...pair], confidence, neighbors });
                else void initialize();
              }}
            >
              Try again
            </button>
          </div>
        )}
      </form>
      <div className="protein-layout">
        <div className="protein-canvas-panel" aria-busy={loading}>
          <div className="protein-canvas-heading">
            <div>
              <span className="protein-eyebrow">HOMO SAPIENS / 9606</span>
              <h3>
                {loadedQuery
                  ? `${loadedQuery.pair[0]} + ${loadedQuery.pair[1]}`
                  : 'Connecting the dots.'}
              </h3>
              <p className="protein-loaded-query">
                {loadedQuery
                  ? `${
                      loadedQuery.neighbors === 0
                        ? 'Two-protein network'
                        : `Up to ${loadedQuery.neighbors} additional proteins`
                    } · computed at ${network!.confidence.toFixed(2)} confidence`
                  : 'Real STRING associations, grouped as they arrive.'}
              </p>
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
            {!network && (
              <text
                className="protein-empty-label"
                x="330"
                y="210"
                textAnchor="middle"
                fill="#f5f3ed"
              >
                {loading ? 'Loading real protein data…' : 'Waiting for live data'}
              </text>
            )}
            {network && network.nodes.length === 0 && (
              <text
                className="protein-empty-label"
                x="330"
                y="210"
                textAnchor="middle"
                fill="#f5f3ed"
              >
                No proteins returned for this query.
              </text>
            )}
          </svg>
          {network && edges.length === 0 && (
            <p className="protein-empty-connections">
              No links meet this confidence in the returned network. Proteins remain visible; this
              does not prove that no biological relationship exists.
            </p>
          )}
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
              <strong>{network?.nodes.length ?? '—'}</strong>
              <span>PROTEINS</span>
            </div>
            <div>
              <strong>{network ? edges.length : '—'}</strong>
              <span>CONNECTIONS</span>
            </div>
            <div>
              <strong>{network?.communities ?? '—'}</strong>
              <span>COMMUNITIES</span>
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
              {!network
                ? 'Higher scores keep stronger STRING associations. Communities are computed when you explore.'
                : confidence < network.confidence
                  ? `This result starts at ${network.confidence.toFixed(2)} confidence. Explore again to include lower-confidence connections.`
                  : `Links are filtered locally. Communities were computed at ${network.confidence.toFixed(2)}; explore again to recompute them.`}
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
                : network
                  ? 'No proteins are available for this query.'
                  : 'Choose a protein once the network loads.'}
            </p>
            {selectedDescription && (
              <details className="protein-annotation" key={selected?.id}>
                <summary>About this protein</summary>
                <p>
                  {selectedDescription.length === 500
                    ? `${selectedDescription.slice(0, selectedDescription.lastIndexOf(' '))}…`
                    : selectedDescription}
                </p>
                <span>Source: STRING{selectedDescription.length === 500 ? ' · excerpt' : ''}</span>
              </details>
            )}
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
        </aside>
      </div>
      <ProteinComparison
        key={
          loadedQuery
            ? loadedQuery.pair.join(',') + loadedQuery.confidence + ':' + loadedQuery.neighbors
            : 'empty'
        }
        apiBase={apiBase}
        query={loadedQuery}
        disabled={loading || Boolean(pendingChanges)}
      />
      <div className="protein-notes">
        <p>
          {network ? (
            <>
              <a href={network.source.url} target="_blank" rel="noreferrer">
                {network.source.name}
              </a>
              {' · '}Retrieved {new Date(network.source.retrievedAt).toLocaleString()}
              {network.source.cached ? ' · cached response' : ''}.
            </>
          ) : (
            'Data will come from STRING. No network has loaded yet.'
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
                {!network && <p>The protein list appears when the network is ready.</p>}
                {network?.nodes.map((node) => (
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
              {catalog && (
                <p>
                  Selector hints:{' '}
                  <a href={catalog.source.url} target="_blank" rel="noreferrer">
                    {catalog.source.name}
                  </a>
                  {' · '}retrieved {new Date(catalog.source.retrievedAt).toLocaleString()}
                  {catalog.source.cached ? ' · cached response' : ''}. Hints cover direct
                  associations in this curated list at scores of 0.40 and above, not all possible
                  relationships.
                </p>
              )}
              <p>
                The Python service resolves identifiers with STRING, cleans the data with pandas,
                and finds communities using seeded Louvain clustering in NetworkX. Associations can
                be functional; they do not always mean physical contact.
              </p>
              <p>
                Communities are algorithmic groups, not established biological pathways. Species
                comparisons use Ensembl orthologues; AI explanations, when enabled, interpret this
                evidence without determining the similarity scores.
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
