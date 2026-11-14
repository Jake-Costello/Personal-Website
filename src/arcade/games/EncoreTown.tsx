import {
  mapChoices,
  mapWorld,
  NODE_BY_ID,
  nodeName,
  TOUR_NODES,
  encounterForNode,
} from './deckbuilder-model';
import type { Run, TourNode } from './deckbuilder-model';
import { VenueArt } from './EncoreArt';
export function LocationIcon({ node }: { node: TourNode }) {
  if (node.kind === 'show') {
    const e = encounterForNode(node);
    return <VenueArt world={e.world} boss={e.boss} final={e.final} />;
  }
  return (
    <svg
      viewBox="0 0 100 80"
      aria-hidden="true"
      fill="var(--art-paper)"
      stroke="var(--art-ink)"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <path d="M12 73V30L50 9l38 21v43Z" fill="var(--art-accent)" />
      <path d="M7 30h86M20 38h60v30H20Z" />
      {node.kind === 'event' ? (
        <>
          <path d="M35 62V43l28-5v20" fill="none" />
          <ellipse cx="30" cy="63" rx="7" ry="4" />
          <ellipse cx="58" cy="59" rx="7" ry="4" />
        </>
      ) : node.shop === 'record' ? (
        <>
          <circle cx="50" cy="52" r="14" fill="var(--art-ink)" />
          <circle cx="50" cy="52" r="4" fill="var(--art-gold)" />
        </>
      ) : node.shop === 'studio' ? (
        <>
          <path d="M30 59V43h40v16Z" fill="var(--art-gold)" />
          <path d="m34 48 27-4-5 12-21-3m8 1v9" fill="none" />
        </>
      ) : node.shop === 'tattoo' ? (
        <path d="m50 39 4 10 11 1-8 7 2 11-9-6-9 6 2-11-8-7 11-1Z" fill="var(--art-gold)" />
      ) : (
        <>
          <rect x="36" y="39" width="28" height="29" />
          <circle cx="50" cy="56" r="8" />
        </>
      )}
    </svg>
  );
}
export default function EncoreTown({
  run,
  active,
  onChoose,
}: {
  run: Run;
  active: boolean;
  onChoose: (id: string) => void;
}) {
  const world = mapWorld(run),
    nodes = TOUR_NODES.filter((n) => n.world === world),
    available = mapChoices(run).map((n) => n.id);
  const point = (n: TourNode) => ({
    x: world === 4 ? (n.kind === 'show' ? 760 : 180) : 100 + n.column * 230,
    y: [85, 250, 415][n.lane],
  });
  const edges = nodes.flatMap((n) =>
    n.next
      .filter((id) => NODE_BY_ID[id].world === world)
      .map((id) => ({ from: n, to: NODE_BY_ID[id] })),
  );
  return (
    <div className="db-town" role="group" aria-label="Town roads" data-map-world={world}>
      <svg
        className="db-town-drawing"
        viewBox="0 0 900 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="db-town-river" d="M0 475Q240 390 450 465T940 420" />
        <g className="db-town-blocks" fill="none" stroke="currentColor">
          <path d="M24 17h160v28H24zm230 0h160v28H254zm230 0h160v28H484zM20 460h130v25H20zm250 0h130v25H270zm230 0h130v25H500z" />
        </g>
        {edges.map(({ from, to }) => {
          const a = point(from),
            b = point(to),
            traveled = run.visited.some((id, i) => id === from.id && run.visited[i + 1] === to.id);
          return (
            <g
              key={from.id + to.id}
              data-edge={`${from.id}:${to.id}`}
              data-traveled={traveled}
              data-open={run.currentNode === from.id && available.includes(to.id)}
            >
              <path
                className="db-road-border"
                d={`M${a.x} ${a.y}C${a.x + 110} ${a.y} ${b.x - 110} ${b.y} ${b.x} ${b.y}`}
              />
              <path
                className="db-road"
                d={`M${a.x} ${a.y}C${a.x + 110} ${a.y} ${b.x - 110} ${b.y} ${b.x} ${b.y}`}
              />
            </g>
          );
        })}
      </svg>
      {nodes.map((node) => {
        const p = point(node),
          reachable = available.includes(node.id),
          visited = run.visited.includes(node.id);
        return (
          <button
            key={node.id}
            data-choice
            data-node={node.id}
            data-kind={node.kind}
            data-shop-node={node.shop}
            className="db-town-node"
            style={{ left: `${p.x / 9}%`, top: `${p.y / 5}%` }}
            disabled={!active || !reachable}
            aria-label={`${nodeName(node)}. ${node.kind === 'show' ? (encounterForNode(node).boss ? 'Boss show' : 'Show') : node.kind === 'shop' ? 'Shop' : 'Event'}. ${visited ? 'Visited' : reachable ? 'Road open' : 'Road closed'}.`}
            aria-pressed={reachable ? run.selectedNode === node.id : undefined}
            data-selected={reachable && run.selectedNode === node.id}
            data-visited={visited}
            data-available={reachable}
            onFocus={() => reachable && onChoose(node.id)}
            onClick={() => onChoose(node.id)}
          >
            <LocationIcon node={node} />
            <span>{nodeName(node)}</span>
            {visited && <i aria-hidden="true">✓</i>}
          </button>
        );
      })}
    </div>
  );
}
