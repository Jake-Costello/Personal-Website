import { useEffect, useRef, useState } from 'react';
import type { ArcadeInput } from '../input';
import {
  CARDS,
  RELICS,
  ENCOUNTERS,
  WORLDS,
  beginEncounter,
  cardFor,
  chooseRelic,
  chooseReward,
  createRun,
  currentIntent,
  endTurn,
  playCard,
} from './deckbuilder-model';
import type { RelicKey, Run } from './deckbuilder-model';
import './deckbuilder.css';

const relicKeys = Object.keys(RELICS) as RelicKey[];
function confirm(run: Run, cursor: number, skip = false, seed = run.seed): Run {
  if (run.phase === 'map')
    return skip ? run : beginEncounter(run.floor === 0 ? createRun(seed) : run);
  if (run.phase === 'combat')
    return skip ? endTurn(run) : playCard(run, run.hand[Math.min(cursor, run.hand.length - 1)]);
  if (run.phase === 'reward') return chooseReward(run, skip ? -1 : Math.min(cursor, 2));
  if (run.phase === 'relic') return skip ? run : chooseRelic(run, relicKeys[Math.min(cursor, 2)]);
  return run;
}
function CardMark({ kind }: { kind: 'attack' | 'block' | 'utility' }) {
  return (
    <svg
      className="db-card-art"
      viewBox="0 0 64 64"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'attack' ? (
        <>
          <path d="M36 27 49 9l7 5-14 17M47 12l6 4M25 27c-8-5-17 2-15 11-8 8-1 21 10 18 10 2 18-7 14-15 8-2 10-10 3-14-3 5-7 6-12 0Z" />
          <path d="m22 44 28-30M18 48l8 5M19 37l5 4" />
        </>
      ) : kind === 'block' ? (
        <>
          <ellipse cx="32" cy="30" rx="23" ry="8" />
          <path d="M9 30v17c0 11 46 11 46 0V30M18 37v14m14-12v16m14-18v14M15 7l30 16M49 6 23 24" />
        </>
      ) : (
        <>
          <rect x="25" y="8" width="29" height="47" rx="3" />
          <path d="M31 14h17v11H31zM32 32h2m7 0h2m-11 7h2m7 0h2m-11 7h2m7 0h2M17 14c-10 5-10 24 0 30l4-8-6-4v-6l6-4Z M17 45c-10 18 15 3 14 15" />
        </>
      )}
    </svg>
  );
}
export default function DeckbuilderGame({
  input,
  active,
}: {
  input: ArcadeInput;
  active: boolean;
}) {
  const [seed, setSeed] = useState('encore');
  const [run, setRun] = useState(() => createRun('encore'));
  const [cursor, setCursor] = useState(0);
  const [showDeck, setShowDeck] = useState(false);
  const current = useRef({ run, cursor, seed });
  current.current = { run, cursor, seed };
  const heading = useRef<HTMLHeadingElement>(null);
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    setCursor(0);
    heading.current?.focus({ preventScroll: true });
  }, [run.phase, run.floor, showDeck]);
  useEffect(() => {
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const presses = [...input.pressed].filter((x) => !previous.has(x));
      previous = new Set(input.pressed);
      if (!active) return;
      for (const action of presses) {
        if (action === 'reset') {
          setRun(createRun(current.current.run.seed));
          setShowDeck(false);
        } else if (['left', 'right', 'up', 'down'].includes(action)) {
          const n = current.current.run.phase === 'combat' ? current.current.run.hand.length : 3;
          const delta = action === 'left' || action === 'up' ? -1 : 1;
          const next = (current.current.cursor + delta + Math.max(1, n)) % Math.max(1, n);
          setCursor(next);
          queueMicrotask(() => cardButtons.current[next]?.focus({ preventScroll: true }));
        } else if (!showDeck && (action === 'action' || action === 'secondary')) {
          setRun((s) =>
            confirm(s, current.current.cursor, action === 'secondary', current.current.seed),
          );
        }
      }
    });
  }, [input, active, showDeck]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !active ||
        showDeck ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target as Element)?.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (/^[1-9]$/.test(e.key) && current.current.run.phase === 'combat' && !e.repeat) {
        e.preventDefault();
        setRun((s) => playCard(s, s.hand[Number(e.key) - 1]));
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, showDeck]);
  const battle = ENCOUNTERS[run.floor];
  const intent = currentIntent(run);
  const intentText = `${intent.damage ? `Attack ${intent.damage}` : ''}${intent.damage && intent.block ? ' + ' : ''}${intent.block ? `Block ${intent.block}` : ''}`;
  const newRun = () => {
    setRun(createRun(seed));
    setShowDeck(false);
    setCursor(0);
  };
  const nextSeed = () => {
    const value = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    setSeed(value);
  };
  return (
    <section
      className="db-game"
      aria-label="Encore deckbuilder prototype"
      data-phase={run.phase}
      data-floor={run.floor}
      data-health={run.hp}
      data-enemy-health={run.enemyHp}
      data-energy={run.energy}
      data-turn={run.turn}
      data-seed={run.seed}
    >
      <header className="db-topbar">
        <b>
          ENCORE <small>DECKBUILDER PROTOTYPE</small>
        </b>
        <button onClick={() => setShowDeck((v) => !v)} disabled={!active} aria-expanded={showDeck}>
          {showDeck ? 'Close deck' : `Deck (${run.deck.length})`}
        </button>
      </header>
      {showDeck ? (
        <div className="db-panel db-deck">
          <h2>Current deck</h2>
          <ul>
            {run.deck.map((c) => (
              <li key={c.id}>
                <b>{CARDS[c.key].name}</b>
                <span>
                  {CARDS[c.key].cost} beats · {CARDS[c.key].text}
                </span>
              </li>
            ))}
          </ul>
          <button onClick={() => setShowDeck(false)}>Back to run</button>
        </div>
      ) : (
        <>
          <div className="db-status">
            <span>
              HP{' '}
              <b>
                {run.hp}/{run.maxHp}
              </b>
            </span>
            <span>
              {WORLDS[battle.world - 1]} <b>{battle.world}/3</b>
            </span>
            <span>
              {run.phase === 'combat' ? (
                <>
                  Beats <b>{run.energy}</b>
                </>
              ) : (
                `${Math.min(10, run.floor + (['reward', 'relic', 'won'].includes(run.phase) ? 1 : 0))}/10 battles`
              )}
            </span>
            {run.relics.length > 0 && (
              <span
                className="db-relics"
                title={run.relics.map((r) => `${RELICS[r].name}: ${RELICS[r].text}`).join('\n')}
              >
                Relics <b>{run.relics.length}</b>
              </span>
            )}
          </div>
          {run.phase === 'combat' ? (
            <>
              <div className="db-opponent">
                <div
                  className={`db-emblem db-world-${battle.world}${battle.final ? ' db-final' : ''}`}
                  aria-hidden="true"
                >
                  <span>{battle.final ? 'IV' : battle.world}</span>
                </div>
                <div>
                  <h2 ref={heading} tabIndex={-1}>
                    {battle.name}
                  </h2>
                  <div className="db-intent">
                    Intent: <b>{intentText}</b>
                    {run.weakened && <span> · weakened</span>}
                  </div>
                  <meter aria-label="Enemy health" min={0} max={battle.hp} value={run.enemyHp} />
                  <span className="db-enemy-stats">
                    {run.enemyHp}/{battle.hp} HP
                    {run.enemyBlock > 0 ? ` · ${run.enemyBlock} block` : ''}
                  </span>
                </div>
                <div className="db-player-block">
                  <b>{run.block}</b>
                  <span>Block</span>
                  {run.strength > 0 && <small>+{run.strength} attack</small>}
                </div>
              </div>
              <div className="db-hand" role="group" aria-label="Your hand">
                {run.hand.map((id, i) => {
                  const card = cardFor(run, id);
                  return (
                    <button
                      key={id}
                      ref={(el) => {
                        cardButtons.current[i] = el;
                      }}
                      className={`db-card${card.effect.damage ? ' db-attack' : ' db-skill'}`}
                      data-card={run.deck.find((c) => c.id === id)!.key}
                      data-selected={i === Math.min(cursor, run.hand.length - 1)}
                      disabled={!active || card.cost > run.energy}
                      aria-label={`${card.name}. ${card.cost} beats. ${card.text}`}
                      onFocus={() => setCursor(i)}
                      onClick={() => setRun((s) => playCard(s, id))}
                    >
                      <span className="db-card-cost">{card.cost}</span>
                      <b>{card.name}</b>
                      <CardMark
                        kind={
                          card.effect.damage ? 'attack' : card.effect.block ? 'block' : 'utility'
                        }
                      />
                      <strong>{card.mark}</strong>
                      {card.effect.weaken && (
                        <span className="db-card-text">Next attack deals 3 less.</span>
                      )}
                      {card.effect.strength && (
                        <span className="db-card-text">For this battle.</span>
                      )}
                      {card.exhaust && <small>Exhaust</small>}
                    </button>
                  );
                })}
              </div>
              <div className="db-turnbar">
                <span>
                  Turn {run.turn} · Draw {run.draw.length} · Discard {run.discard.length}
                  {run.exhaust.length ? ` · Exhaust ${run.exhaust.length}` : ''}
                </span>
                <button className="db-primary" disabled={!active} onClick={() => setRun(endTurn)}>
                  End turn
                </button>
              </div>
            </>
          ) : run.phase === 'reward' || run.phase === 'relic' ? (
            <div className="db-panel db-rewards">
              <h2 ref={heading} tabIndex={-1}>
                {run.phase === 'relic' ? 'Choose a relic' : 'Choose a card'}
              </h2>
              <p>
                {run.phase === 'relic'
                  ? 'Boss defeated. Recovered up to 20 HP. Relics last for this run.'
                  : 'Add one card to your deck, or skip to keep it small.'}
              </p>
              <div className="db-choices">
                {(run.phase === 'relic' ? relicKeys : run.rewards).map((key, i) => {
                  const def =
                    run.phase === 'relic'
                      ? RELICS[key as RelicKey]
                      : CARDS[key as keyof typeof CARDS];
                  return (
                    <button
                      key={key}
                      ref={(el) => {
                        cardButtons.current[i] = el;
                      }}
                      data-selected={i === cursor}
                      disabled={!active}
                      onFocus={() => setCursor(i)}
                      onClick={() =>
                        setRun((s) =>
                          s.phase === 'relic'
                            ? chooseRelic(s, key as RelicKey)
                            : chooseReward(s, i),
                        )
                      }
                    >
                      <b>{def.name}</b>
                      <span>{def.text}</span>
                    </button>
                  );
                })}
              </div>
              {run.phase === 'reward' && (
                <button disabled={!active} onClick={() => setRun((s) => chooseReward(s, -1))}>
                  Skip card
                </button>
              )}
            </div>
          ) : run.phase === 'won' || run.phase === 'lost' ? (
            <div className="db-panel db-ending">
              <h2 ref={heading} tabIndex={-1}>
                {run.phase === 'won' ? 'Final boss defeated' : 'Run ended'}
              </h2>
              <p>
                {run.phase === 'won'
                  ? 'You completed all three worlds and the final battle.'
                  : `You reached ${battle.name.toLowerCase()}. Your next run starts with a fresh deck.`}
              </p>
              <p>Seed: {run.seed}</p>
              <button className="db-primary" disabled={!active} onClick={newRun}>
                New run
              </button>
            </div>
          ) : (
            <div className="db-panel db-map">
              <div
                className="db-map-content"
                role="group"
                aria-label="Run details"
                tabIndex={0}
                data-arcade-native
              >
                <h2 ref={heading} tabIndex={-1}>
                  {run.floor === 0
                    ? 'Three venues. Four bosses.'
                    : battle.final
                      ? 'The final battle'
                      : battle.name}
                </h2>
                <ol className="db-route" aria-label="Run route">
                  {ENCOUNTERS.map((e, i) => (
                    <li
                      key={i}
                      aria-current={i === run.floor ? 'step' : undefined}
                      data-cleared={i < run.floor}
                      data-boss={e.boss}
                      title={e.name}
                    >
                      <span>
                        {i < run.floor ? (
                          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                            <path
                              d="m3 10 4 4 10-10"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        ) : e.final ? (
                          'IV'
                        ) : e.boss ? (
                          'B'
                        ) : (
                          '·'
                        )}
                      </span>
                      <span className="arcade-sr-only">{e.name}</span>
                    </li>
                  ))}
                </ol>
                {run.floor === 0 ? (
                  <>
                    <p>Spend beats to play cards. Block the enemy’s next attack.</p>
                    <div className="db-seed">
                      <label>
                        Run seed{' '}
                        <input
                          value={seed}
                          maxLength={64}
                          disabled={!active}
                          onChange={(e) => setSeed(e.target.value)}
                        />
                      </label>
                      <button disabled={!active} onClick={nextSeed}>
                        New seed
                      </button>
                    </div>
                    <p className="db-note">
                      <a href={`${import.meta.env.BASE_URL}#project-payphone`}>
                        Payphone senior project
                      </a>{' '}
                      · Runs are not saved when you leave.
                    </p>
                  </>
                ) : (
                  <p>
                    {battle.final
                      ? 'All three world bosses are down.'
                      : 'Health, cards and relics carry into the next battle.'}
                  </p>
                )}
              </div>
              <button
                className="db-primary"
                disabled={!active}
                onClick={() => setRun((s) => beginEncounter(s.floor === 0 ? createRun(seed) : s))}
              >
                {battle.final ? 'Challenge final boss' : 'Start battle'}
              </button>
            </div>
          )}
          <p className="db-announcement" role="status" aria-live="polite">
            {run.log.at(-1)}
          </p>
        </>
      )}
    </section>
  );
}
