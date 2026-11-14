import { useEffect, useRef, useState } from 'react';
import type { ArcadeInput } from '../input';
import { CARDS, RECORDS, TATTOOS, RARITY_LABEL } from './band-cards';
import {
  createRun,
  visitNode,
  selectNode,
  mapWorld,
  NODE_BY_ID,
  nodeName,
  encounterForNode,
  openingPressure,
  hitChanceForPressure,
  audience,
  mapChoices,
  encounterAt,
  cardFor,
  cardCost,
  performance,
  currentIntent,
  legalTargets,
  playCard,
  endTurn,
  chooseReward,
  chooseRecord,
  chooseRehearsal,
  leaveShop,
  hitChance,
  SHOP_NAMES,
} from './deckbuilder-model';
import type { Run } from './deckbuilder-model';
import { EnemyArt, ScoreBoardArt } from './EncoreArt';
import EncoreTown from './EncoreTown';
import { combatFeedback } from './deckbuilder-feedback';
import CardArtwork, { ReplaceableArtwork } from './CardArtwork';
import { VENUE_ART } from './encore-art-registry';
import { CardFace, Pages, RecordSlot, ShopPanel } from './BandPanels';
import './deckbuilder.css';
function focusChoice(button: HTMLButtonElement | null | undefined) {
  if (!button) return;
  button.focus({ preventScroll: true });
  button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
function startLocation(s: Run, seed: string) {
  if (!s.visited.length) {
    const fresh = createRun(seed);
    return visitNode(selectNode(fresh, s.selectedNode));
  }
  return visitNode(s);
}
export default function DeckbuilderGame({
  input,
  active,
}: {
  input: ArcadeInput;
  active: boolean;
}) {
  const [seed, setSeed] = useState('encore'),
    [run, setRun] = useState(() => createRun('encore')),
    [showDeck, setShowDeck] = useState(false),
    [tab, setTab] = useState<'deck' | 'catalog' | 'perks' | 'rules'>('deck'),
    [targetCard, setTargetCard] = useState<number | null>(null),
    [recordSlot, setRecordSlot] = useState(0),
    [size, setSize] = useState({ width: 960, height: 600 });
  const section = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    focused = useRef<HTMLButtonElement | null>(null),
    current = useRef({ run, seed, targetCard });
  current.current = { run, seed, targetCard };
  useEffect(() => {
    if (!section.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  const compact = size.height < 360,
    pageSize = compact ? 3 : size.width < 550 ? 4 : 6,
    columns = compact ? 3 : size.width < 550 ? 2 : 3;
  const chooseCard = (id: number | undefined) => {
    const s = current.current.run;
    if (
      id === undefined ||
      s.phase !== 'combat' ||
      !s.hand.includes(id) ||
      cardCost(s, id) > s.energy
    )
      return;
    const c = cardFor(s, id);
    if (c.type === 'gear' || (c.type === 'musician' && s.stage.length >= 3)) {
      if (legalTargets(s, id).length) setTargetCard(id);
    } else setRun((v) => playCard(v, id));
  };
  const cancelTarget = () => {
    const id = current.current.targetCard;
    setTargetCard(null);
    queueMicrotask(() =>
      focusChoice(section.current?.querySelector<HTMLButtonElement>(`.db-card[data-id="${id}"]`)),
    );
  };
  useEffect(() => {
    focused.current = null;
    setTargetCard(null);
    heading.current?.focus({ preventScroll: true });
  }, [run.phase, run.currentNode, showDeck, tab]);
  useEffect(() => {
    if (targetCard !== null)
      focusChoice(
        section.current?.querySelector<HTMLButtonElement>('.db-stage button:not(:disabled)'),
      );
  }, [targetCard]);
  useEffect(() => {
    let previous = new Set(input.pressed);
    return input.subscribe(() => {
      const presses = [...input.pressed].filter((x) => !previous.has(x));
      previous = new Set(input.pressed);
      if (!active) return;
      for (const action of presses) {
        if (showDeck && action !== 'reset') continue;
        const { run: s, seed: value, targetCard: pending } = current.current;
        if (action === 'reset') {
          setRun(createRun(s.seed));
          setShowDeck(false);
          setTargetCard(null);
        } else if (['left', 'right', 'up', 'down'].includes(action)) {
          const options = Array.from(
            section.current?.querySelectorAll<HTMLButtonElement>('[data-choice]:not(:disabled)') ??
              [],
          );
          const at = Math.max(0, options.indexOf(focused.current!)),
            next =
              (at + (action === 'left' || action === 'up' ? -1 : 1) + Math.max(1, options.length)) %
              Math.max(1, options.length);
          focusChoice(options[next]);
          if (s.phase === 'map') options[next]?.click();
        } else if (action === 'secondary') {
          if (pending !== null) cancelTarget();
          else if (s.phase === 'combat') setRun(endTurn);
          else if (s.phase === 'reward') setRun((v) => chooseReward(v, -1));
          else if (s.phase === 'record') setRun((v) => chooseRecord(v, null));
          else if (s.phase === 'shop') setRun(leaveShop);
          else if (s.phase === 'event') setRun((v) => chooseRehearsal(v, 'leave'));
        } else if (action === 'action') {
          if (s.phase === 'map') setRun((v) => startLocation(v, value));
          else {
            const options = Array.from(
              section.current?.querySelectorAll<HTMLButtonElement>(
                '[data-choice]:not(:disabled)',
              ) ?? [],
            );
            const choice = options.includes(focused.current!) ? focused.current : options[0];
            choice?.click();
          }
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
      if (
        /^[1-9]$/.test(e.key) &&
        current.current.run.phase === 'combat' &&
        current.current.targetCard === null &&
        !e.repeat
      ) {
        e.preventDefault();
        chooseCard(current.current.run.hand[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, showDeck]);
  useEffect(() => {
    if (
      active &&
      run.phase === 'combat' &&
      targetCard === null &&
      document.activeElement === document.body
    )
      focusChoice(
        section.current?.querySelector<HTMLButtonElement>(
          '.db-hand button:not(:disabled),.db-perform:not(:disabled)',
        ),
      );
  }, [run, targetCard, active]);
  const battle = encounterAt(run),
    band = performance(run),
    intent = currentIntent(run),
    pending = targetCard === null ? null : cardFor(run, targetCard),
    targets = targetCard === null ? [] : legalTargets(run, targetCard),
    selected = NODE_BY_ID[run.selectedNode],
    world =
      run.phase === 'map'
        ? mapWorld(run)
        : (NODE_BY_ID[run.currentNode ?? '']?.world ?? battle.world);
  const prior = useRef(run),
    feedbackId = useRef(0),
    [feedback, setFeedback] = useState<{ id: number; kind: string; text: string } | null>(null);
  useEffect(() => {
    const before = prior.current;
    prior.current = run;
    if (before === run) return;
    const e = combatFeedback(before, run);
    setFeedback(e ? { ...e, id: ++feedbackId.current } : null);
  }, [run]);
  const newRun = () => {
    setRun(createRun(seed));
    setShowDeck(false);
    setTargetCard(null);
  };
  const deckItems =
    tab === 'catalog'
      ? Object.values(CARDS).map((card, i) => ({ id: i, card, level: 0 }))
      : run.deck.map((c) => ({ id: c.id, card: cardFor(run, c.id), level: c.level }));
  const title =
    run.phase === 'map'
      ? world === 4
        ? 'Crown Hall'
        : ['House Shows', 'Garage Circuit', 'Main Venues'][world - 1]
      : run.phase === 'shop'
        ? SHOP_NAMES[run.shop!]
        : run.phase === 'event'
          ? 'Rehearsal'
          : run.phase === 'reward'
            ? 'Choose a card'
            : run.phase === 'record'
              ? 'Choose a Record'
              : run.phase === 'won'
                ? 'Tour complete'
                : 'Run ended';
  const preview = selected?.kind === 'show' ? encounterForNode(selected) : null;
  return (
    <section
      ref={section}
      className="db-game"
      aria-label="Encore deckbuilder prototype"
      onFocusCapture={(e) => {
        const t = e.target as HTMLButtonElement;
        if (t.matches('button[data-choice]')) focused.current = t;
      }}
      data-phase={run.phase}
      data-world={Math.min(3, world)}
      data-final={world === 4}
      data-active={active}
      data-compact={compact}
      data-feedback={feedback?.kind}
      data-floor={run.floor}
      data-health={run.hp}
      data-enemy-health={run.enemyHp}
      data-energy={run.energy}
      data-block={run.block}
      data-turn={run.turn}
      data-seed={run.seed}
      data-cash={run.cash}
      data-pressure={run.pressure}
      data-hit-chance={hitChance(run)}
      data-current-node={run.currentNode ?? ''}
      data-targeting={targetCard !== null}
    >
      <header className="db-topbar">
        <b>ENCORE</b>
        <button
          disabled={!active}
          aria-expanded={showDeck}
          onClick={() => {
            setShowDeck((v) => !v);
            setTab('deck');
          }}
        >
          {showDeck ? 'Close' : `Deck (${run.deck.length})`}
        </button>
      </header>
      <div className="db-status">
        <span>
          HP{' '}
          <b>
            {run.hp}/{run.maxHp}
          </b>
        </span>
        <span>
          Cash <b>{run.cash}</b>
        </span>
        <span>
          {run.phase === 'combat' ? (
            <>
              Beats <b>{run.energy}</b>
            </>
          ) : (
            <>
              Shows <b>{run.showsWon}</b>
            </>
          )}
        </span>
        <span>{world === 4 ? 'Crown Hall' : `${world}/3`}</span>
      </div>
      {showDeck ? (
        <div className="db-panel db-inspector">
          <nav className="db-tabs" aria-label="Inspector">
            <button disabled={!active} aria-pressed={tab === 'deck'} onClick={() => setTab('deck')}>
              Deck
            </button>
            <button
              disabled={!active}
              aria-pressed={tab === 'catalog'}
              onClick={() => setTab('catalog')}
            >
              Catalog
            </button>
            <button
              disabled={!active}
              aria-pressed={tab === 'perks'}
              onClick={() => setTab('perks')}
            >
              Perks
            </button>
            <button
              disabled={!active}
              aria-pressed={tab === 'rules'}
              onClick={() => setTab('rules')}
            >
              Rules
            </button>
          </nav>
          <h2 tabIndex={-1} ref={heading}>
            {tab === 'deck'
              ? 'Current deck'
              : tab === 'catalog'
                ? 'Card catalog'
                : tab === 'perks'
                  ? 'Tour perks'
                  : 'How to play'}
          </h2>
          {tab === 'deck' || tab === 'catalog' ? (
            <Pages
              pageSize={pageSize}
              columns={columns}
              label={tab === 'deck' ? 'Owned cards' : 'Card catalog'}
              resetKey={tab}
            >
              {deckItems.map((c) => (
                <article
                  className="db-page-card db-card"
                  key={c.id}
                  data-rarity={c.card.rarity}
                  data-type={c.card.type}
                  aria-label={`${c.card.name}. ${c.card.text}`}
                >
                  <CardFace card={c.card} level={c.level} />
                </article>
              ))}
            </Pages>
          ) : tab === 'perks' ? (
            <Pages pageSize={pageSize} columns={columns} label="Tour perks" resetKey="perks">
              {[
                ...run.records.map((key, i) => (
                  <article
                    className="db-page-card db-offer"
                    key={i}
                    data-rarity={RECORDS[key].rarity}
                  >
                    <small>Record</small>
                    <b>{RECORDS[key].name}</b>
                    <span>{RECORDS[key].text}</span>
                  </article>
                )),
                ...(run.tattoo
                  ? [
                      <article className="db-page-card db-offer" key="tattoo">
                        <small>Tattoo</small>
                        <b>{TATTOOS[run.tattoo].name}</b>
                        <span>{TATTOOS[run.tattoo].text}</span>
                      </article>,
                    ]
                  : []),
                ...(!run.records.length && !run.tattoo ? [<p key="none">No perks yet.</p>] : []),
              ]}
            </Pages>
          ) : (
            <div className="db-rules">
              <p>
                Stage 3 musicians; attach 1 compatible Gear each. Crew plays once. Perform attacks,
                adds guard, then the enemy responds.
              </p>
              <p>
                Crowds raise pressure; hit chance falls from 100% to 60%. Musicians roll separately.
                Guard and support always work.
              </p>
              <p>Crew and Records calm pressure. New show resets it. No saves.</p>
              <div className="db-seed">
                <label>
                  Run seed{' '}
                  <input
                    disabled={!active}
                    value={seed}
                    maxLength={64}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                </label>
                <button disabled={!active} onClick={newRun}>
                  Restart seed
                </button>
              </div>
            </div>
          )}
          <button
            className="db-primary db-leave"
            disabled={!active}
            onClick={() => setShowDeck(false)}
          >
            Back to run
          </button>
        </div>
      ) : run.phase === 'combat' ? (
        <div className="db-combat">
          <div className="db-battlefield" role="group" aria-label="Guitar score battle board">
            <ReplaceableArtwork
              asset={
                VENUE_ART[battle.final ? 'crown' : ['house', 'garage', 'venue'][battle.world - 1]]
              }
              className="db-venue-art"
              fallback={<ScoreBoardArt />}
            />
            <div className="db-stage-character">
              <div
                key={feedback?.id ?? 0}
                className="db-character-motion"
                data-motion={feedback?.kind}
              >
                <EnemyArt enemy={battle} />
              </div>
            </div>
            <div className="db-opponent">
              <h2 ref={heading} tabIndex={-1}>
                {battle.name}
              </h2>
              <div className="db-intent">
                {[
                  intent.damage ? `Attack ${intent.damage}` : '',
                  intent.block ? `Guard ${intent.block}` : '',
                ]
                  .filter(Boolean)
                  .join(' + ')}
              </div>
              <meter aria-label="Enemy health" min={0} max={battle.hp} value={run.enemyHp} />
              <span className="db-enemy-stats">
                {run.enemyHp}/{battle.hp} HP{run.enemyBlock ? ` · ${run.enemyBlock} guard` : ''}
              </span>
            </div>
            {feedback && (
              <span
                key={feedback.id}
                className={`db-feedback db-feedback-${feedback.kind}`}
                aria-hidden="true"
              >
                {feedback.text}
              </span>
            )}
          </div>
          <div className="db-band-summary">
            <span>
              <b data-band-power={band.power}>{band.power} power</b> ·{' '}
              <b data-band-guard={band.guard}>{run.block + band.guard} guard</b>
            </span>
            <button
              disabled={!active}
              className="db-pressure-info"
              onClick={() => {
                setShowDeck(true);
                setTab('rules');
              }}
              aria-label={`Band pressure ${run.pressure} of 100. Hit chance ${hitChance(run)} percent. View rules.`}
            >
              Pressure <b>{run.pressure}</b> · Hit <b>{hitChance(run)}%</b>
            </button>
          </div>
          <div className="db-stage" role="group" aria-label="Your three musician slots">
            {[0, 1, 2].map((i) => {
              const id = run.stage[i],
                unit = id === undefined ? null : cardFor(run, id),
                attachment = run.attachments.find((a) => a.musician === id),
                gear = attachment ? cardFor(run, attachment.gear) : null,
                last = run.lastAttacks.find((a) => a.id === id),
                selectedUnit = pending?.type === 'musician' && id !== undefined,
                selectGear = pending?.type === 'gear' && id !== undefined;
              const unitContent = unit ? (
                <>
                  <b>{unit.name}</b>
                  {last && !last.hit && <em className="db-stage-result">Miss</em>}
                  <CardArtwork artKey={unit.artKey} className="db-stage-art" />
                  <span>
                    {unit.power} P · {unit.guard} G
                  </span>
                </>
              ) : (
                <>
                  <span>Musician</span>
                  <i aria-hidden="true">＋</i>
                </>
              );
              const gearContent = gear ? (
                <>
                  <b>{gear.name}</b>
                  <CardArtwork artKey={gear.artKey} className="db-gear-art" />
                  <span>
                    +{gear.power} P · +{gear.guard} G
                  </span>
                </>
              ) : (
                <>
                  <span>Gear</span>
                  <i aria-hidden="true">＋</i>
                </>
              );
              const data = {
                className: 'db-stage-slot',
                'data-stage-id': id,
                'data-role': unit?.role,
                'data-key': id === undefined ? undefined : run.deck.find((c) => c.id === id)!.key,
                'data-power': unit?.power,
                'data-guard': unit?.guard,
                'data-gear-power': gear?.power ?? 0,
                'data-gear-guard': gear?.guard ?? 0,
                'data-outcome': last ? (last.hit ? 'hit' : 'miss') : undefined,
              };
              const choose = () => {
                setRun((s) => playCard(s, targetCard!, id));
                setTargetCard(null);
              };
              return (
                <div className="db-band-lane" key={i}>
                  {selectedUnit ? (
                    <button
                      {...data}
                      data-choice
                      aria-label={`Replace slot ${i + 1}: ${unit!.name}. ${gear ? `Attached ${gear.name}.` : 'No Gear.'}`}
                      disabled={!active || !targets.includes(id!)}
                      onClick={choose}
                    >
                      {unitContent}
                    </button>
                  ) : (
                    <div {...data}>{unitContent}</div>
                  )}
                  {selectGear ? (
                    <button
                      className="db-gear-slot"
                      data-choice
                      data-stage-id={id}
                      data-role={unit?.role}
                      aria-label={`Equip ${pending!.name} to slot ${i + 1}: ${unit!.name} (${unit!.role}). ${gear ? `Replace ${gear.name}.` : 'Empty Gear slot.'}`}
                      disabled={!active || !targets.includes(id!)}
                      onClick={choose}
                    >
                      {gearContent}
                    </button>
                  ) : (
                    <div className="db-gear-slot">{gearContent}</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="db-hand" role="group" aria-label="Your hand">
            {run.hand.map((id) => {
              const c = cardFor(run, id),
                instance = run.deck.find((x) => x.id === id)!;
              return (
                <button
                  key={id}
                  className="db-card"
                  data-choice={pending ? undefined : ''}
                  data-id={id}
                  data-card={instance.key}
                  data-level={instance.level}
                  data-type={c.type}
                  data-rarity={c.rarity}
                  disabled={
                    !active ||
                    Boolean(pending) ||
                    cardCost(run, id) > run.energy ||
                    (c.type === 'gear' && !legalTargets(run, id).length)
                  }
                  title={c.text}
                  aria-label={`${c.name}. ${cardCost(run, id)} beats. ${c.text}${c.effect.damage ? ` Hit chance ${hitChance(run)} percent.` : ''}`}
                  onClick={() => chooseCard(id)}
                >
                  <CardFace card={c} level={instance.level} cost={cardCost(run, id)} />
                </button>
              );
            })}
          </div>
          <div className="db-turnbar">
            {pending ? (
              <>
                <b className="db-target-prompt">
                  {pending.type === 'gear' ? 'Choose Gear slot' : 'Replace musician'}
                </b>
                <button className="db-primary" disabled={!active} onClick={cancelTarget}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="db-primary db-perform"
                disabled={!active}
                onClick={() => setRun(endTurn)}
              >
                Perform
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`db-panel db-${run.phase}`}>
          <h2 ref={heading} tabIndex={-1}>
            {title}
          </h2>
          {run.phase === 'map' ? (
            <>
              <EncoreTown
                run={run}
                active={active}
                onChoose={(id) => setRun((s) => selectNode(s, id))}
              />
              <div className="db-map-footer">
                <div>
                  <b>{nodeName(selected)}</b>
                  {preview && (
                    <span>
                      {preview.hp} HP · {audience(run, selected)} crowd · Hit{' '}
                      {hitChanceForPressure(openingPressure(run, selected))}%
                    </span>
                  )}
                </div>
                <button
                  className="db-primary"
                  disabled={!active || !mapChoices(run).length}
                  onClick={() => setRun((s) => startLocation(s, seed))}
                >
                  {selected.kind === 'show' ? 'Play show' : 'Visit'}
                </button>
              </div>
            </>
          ) : run.phase === 'shop' ? (
            <ShopPanel
              run={run}
              active={active}
              setRun={setRun}
              slot={recordSlot}
              setSlot={setRecordSlot}
              pageSize={pageSize}
              columns={columns}
            />
          ) : run.phase === 'event' ? (
            <>
              <div className="db-event-choices">
                <button
                  data-choice
                  disabled={!active}
                  onClick={() => setRun((s) => chooseRehearsal(s, 'rest'))}
                >
                  <b>Rest</b>
                  <span>Recover 10 HP</span>
                </button>
                <button
                  data-choice
                  disabled={!active}
                  onClick={() => setRun((s) => chooseRehearsal(s, 'focus'))}
                >
                  <b>Rehearse</b>
                  <span>Next show: −20 pressure</span>
                </button>
              </div>
              <button
                className="db-primary db-leave"
                disabled={!active}
                onClick={() => setRun((s) => chooseRehearsal(s, 'leave'))}
              >
                Leave
              </button>
            </>
          ) : run.phase === 'reward' ? (
            <>
              <Pages pageSize={3} columns={3} label="Card rewards" resetKey="reward">
                {run.rewards.map((key, i) => (
                  <button
                    key={key}
                    className="db-page-card db-card"
                    data-choice
                    data-reward={key}
                    data-rarity={CARDS[key].rarity}
                    disabled={!active}
                    onClick={() => setRun((s) => chooseReward(s, i))}
                  >
                    <CardFace card={CARDS[key]} />
                  </button>
                ))}
              </Pages>
              <button
                className="db-primary db-leave"
                disabled={!active}
                onClick={() => setRun((s) => chooseReward(s, -1))}
              >
                Skip
              </button>
            </>
          ) : run.phase === 'record' ? (
            <>
              <RecordSlot active={active} run={run} slot={recordSlot} onChange={setRecordSlot} />
              <Pages pageSize={3} columns={3} label="Record rewards" resetKey="record">
                {run.recordRewards.map((key) => (
                  <button
                    key={key}
                    data-choice
                    className="db-page-card db-offer"
                    data-record={key}
                    data-rarity={RECORDS[key].rarity}
                    disabled={!active}
                    onClick={() => setRun((s) => chooseRecord(s, key, recordSlot))}
                  >
                    <small>{RARITY_LABEL[RECORDS[key].rarity]}</small>
                    <b>{RECORDS[key].name}</b>
                    <span>{RECORDS[key].text}</span>
                  </button>
                ))}
              </Pages>
              <button
                className="db-primary db-leave"
                disabled={!active}
                onClick={() => setRun((s) => chooseRecord(s, null))}
              >
                Keep current
              </button>
            </>
          ) : (
            <>
              <div className="db-ending-mark" aria-hidden="true">
                {run.phase === 'won' ? '★' : '◌'}
              </div>
              <b>
                {run.showsWon} shows · {run.cashEarned} cash earned
              </b>
              <button className="db-primary db-leave" disabled={!active} onClick={newRun}>
                New run
              </button>
            </>
          )}
        </div>
      )}
      <p className="arcade-sr-only" role="status" aria-live="polite">
        {run.log.at(-1)}
      </p>
    </section>
  );
}
