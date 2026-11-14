import { useEffect, useRef, useState } from 'react';
import type { ArcadeInput } from '../input';
import {
  CARDS,
  RECORDS,
  encounterAt,
  chooseVenue,
  WORLDS,
  beginEncounter,
  cardFor,
  cardCost,
  chooseRecord,
  chooseReward,
  createRun,
  currentIntent,
  endTurn,
  playCard,
  performance,
  legalTargets,
  enterShop,
  skipStop,
  leaveShop,
} from './deckbuilder-model';
import { RARITY_LABEL } from './band-cards';
import type { Run, ShopKind } from './deckbuilder-model';
import { EnemyArt, ScoreBoardArt } from './EncoreArt';
import EncoreTown from './EncoreTown';
import { combatFeedback } from './deckbuilder-feedback';
import CardArtwork, { ReplaceableArtwork } from './CardArtwork';
import { VENUE_ART } from './encore-art-registry';
import { CardFace, RecordRack, RecordSlot, ShopPanel, SHOP_NAMES } from './BandPanels';
import './deckbuilder.css';

function focusChoice(button: HTMLButtonElement | null | undefined) {
  if (!button) return;
  button.focus({ preventScroll: true });
  button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
function startBattle(run: Run, seed: string) {
  return beginEncounter(run.floor === 0 ? chooseVenue(createRun(seed), run.route[0]) : run);
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
  const [catalog, setCatalog] = useState(false);
  const [targetCard, setTargetCard] = useState<number | null>(null);
  const [recordSlot, setRecordSlot] = useState(0);
  const section = useRef<HTMLElement>(null);
  const focusedChoice = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = useRef({ run, cursor, seed, targetCard });
  current.current = { run, cursor, seed, targetCard };
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
      if (legalTargets(s, id).length) {
        setTargetCard(id);
        setCursor(0);
      }
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
    setCursor(0);
    focusedChoice.current = null;
    setTargetCard(null);
    heading.current?.focus({ preventScroll: true });
  }, [run.phase, run.floor, showDeck, catalog]);
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
        const { run: s, seed: currentSeed, targetCard: pending } = current.current;
        if (action === 'reset') {
          setRun(createRun(s.seed));
          setShowDeck(false);
          setTargetCard(null);
        } else if (['left', 'right', 'up', 'down'].includes(action)) {
          const options = Array.from(
            section.current?.querySelectorAll<HTMLButtonElement>('[data-choice]:not(:disabled)') ??
              [],
          );
          const selected = Math.max(0, options.indexOf(focusedChoice.current!));
          const next =
            (selected +
              (action === 'left' || action === 'up' ? -1 : 1) +
              Math.max(1, options.length)) %
            Math.max(1, options.length);
          setCursor(next);
          focusChoice(options[next]);
          if (s.phase === 'map') options[next]?.click();
        } else if (action === 'secondary') {
          if (pending !== null) cancelTarget();
          else if (s.phase === 'combat') setRun(endTurn);
          else if (s.phase === 'reward') setRun((v) => chooseReward(v, -1));
          else if (s.phase === 'record') setRun((v) => chooseRecord(v, null));
          else if (s.phase === 'stop') setRun(skipStop);
          else if (s.phase === 'shop') setRun(leaveShop);
        } else if (action === 'action') {
          if (s.phase === 'map') setRun((v) => startBattle(v, currentSeed));
          else {
            const options = section.current?.querySelectorAll<HTMLButtonElement>(
              '[data-choice]:not(:disabled)',
            );
            const focused = document.activeElement as HTMLButtonElement | null;
            if (focused?.matches('[data-choice]') && section.current?.contains(focused))
              focused.click();
            else if (
              focusedChoice.current &&
              Array.from(options ?? []).includes(focusedChoice.current)
            )
              focusedChoice.current.click();
            else options?.[0]?.click();
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
    ) {
      const next = section.current?.querySelector<HTMLButtonElement>(
        '.db-hand button:not(:disabled), .db-turnbar button:not(:disabled)',
      );
      focusChoice(next);
    }
  }, [run, targetCard, active]);
  const battle = encounterAt(run),
    band = performance(run),
    intent = currentIntent(run);
  const targets = targetCard === null ? [] : legalTargets(run, targetCard);
  const pending = targetCard === null ? null : cardFor(run, targetCard);
  const intentText = [
    intent.damage ? `Attack ${intent.damage}` : '',
    intent.block ? `Block ${intent.block}` : '',
  ]
    .filter(Boolean)
    .join(' + ');
  const priorRun = useRef(run),
    feedbackId = useRef(0);
  const [feedback, setFeedback] = useState<{ id: number; kind: string; text: string } | null>(null);
  useEffect(() => {
    const prior = priorRun.current;
    priorRun.current = run;
    if (run === prior) return;
    const event = combatFeedback(prior, run);
    setFeedback(event ? { id: ++feedbackId.current, ...event } : null);
  }, [run]);
  const newRun = () => {
    setRun(createRun(seed));
    setShowDeck(false);
    setTargetCard(null);
    setCursor(0);
  };
  const nextSeed = () => setSeed(crypto.getRandomValues(new Uint32Array(1))[0].toString(36));
  const inspector = catalog
    ? Object.entries(CARDS).map(([key, card]) => ({ key, card, level: 0 }))
    : run.deck.map((c) => ({ key: String(c.id), card: cardFor(run, c.id), level: c.level }));
  return (
    <section
      ref={section}
      onFocusCapture={(e) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('button[data-choice]')) focusedChoice.current = target;
      }}
      className="db-game"
      aria-label="Encore deckbuilder prototype"
      data-phase={run.phase}
      data-world={battle.world}
      data-final={Boolean(battle.final)}
      data-active={active}
      data-feedback={feedback?.kind}
      data-floor={run.floor}
      data-health={run.hp}
      data-enemy-health={run.enemyHp}
      data-energy={run.energy}
      data-turn={run.turn}
      data-seed={run.seed}
      data-cash={run.cash}
      data-targeting={targetCard !== null}
    >
      <header className="db-topbar">
        <b>
          ENCORE <small>BELLWETHER TOUR</small>
        </b>
        <button
          onClick={() => {
            setShowDeck((v) => !v);
            setCatalog(false);
          }}
          disabled={!active}
          aria-expanded={showDeck}
        >
          {showDeck ? 'Close deck' : `Deck (${run.deck.length})`}
        </button>
      </header>
      {showDeck ? (
        <div className="db-panel db-deck">
          <h2 ref={heading} tabIndex={-1}>
            {catalog ? 'Card catalog' : 'Current deck'}
          </h2>
          <p>
            {catalog
              ? 'All 18 prototype cards, including cards not in your deck. No permanent collection yet.'
              : 'Cards and upgrades last this tour. Musicians and equipped Gear stay on stage between turns.'}
          </p>
          <button disabled={!active} onClick={() => setCatalog((v) => !v)}>
            {catalog ? 'Show owned deck' : 'Browse card catalog'}
          </button>
          <RecordRack run={run} />
          <ul className="db-owned-perks" aria-label="Owned Record effects">
            {run.records.map((key, i) => (
              <li key={i}>
                <b>{RECORDS[key].name}</b> {RECORDS[key].text}
              </li>
            ))}
          </ul>
          <div className="db-catalog">
            {inspector.map((c) => (
              <article
                key={c.key}
                className="db-card"
                data-rarity={c.card.rarity}
                data-type={c.card.type}
              >
                <CardFace card={c.card} level={c.level} />
              </article>
            ))}
          </div>
          <button disabled={!active} onClick={() => setShowDeck(false)}>
            Back to run
          </button>
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
              {battle.final ? 'Crown Hall' : WORLDS[battle.world - 1]}{' '}
              <b>{battle.final ? 'FINAL' : `${battle.world}/3`}</b>
            </span>
            <span>
              {run.phase === 'combat' ? (
                <>
                  Beats <b>{run.energy}</b>
                </>
              ) : (
                `${Math.min(10, run.floor + (['reward', 'record', 'won'].includes(run.phase) ? 1 : 0))}/10 battles`
              )}
            </span>
            <span>
              Cash <b>{run.cash}</b>
            </span>
          </div>
          {run.phase === 'combat' ? (
            <>
              <div className="db-battlefield" role="group" aria-label="Guitar score battle board">
                <ReplaceableArtwork
                  asset={
                    VENUE_ART[
                      battle.final ? 'crown' : ['house', 'garage', 'venue'][battle.world - 1]
                    ]
                  }
                  className="db-venue-art"
                  fallback={<ScoreBoardArt />}
                />
                <div className="db-board-label" aria-hidden="true">
                  {battle.venue}
                  <span>{battle.boss ? 'BOSS SHOW' : 'LIVE'}</span>
                </div>
                <div className="db-stage-character" data-boss={battle.boss}>
                  <div
                    key={feedback?.id ?? 0}
                    className="db-character-motion"
                    data-motion={feedback?.kind}
                  >
                    <EnemyArt enemy={battle} />
                  </div>
                </div>
                {feedback && (
                  <div
                    key={feedback.id}
                    className={`db-feedback db-feedback-${feedback.kind}`}
                    aria-hidden="true"
                  >
                    <span>{feedback.text}</span>
                    <i />
                    <i />
                    <i />
                  </div>
                )}
                <div className="db-opponent">
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
                    <span>Guard now</span>
                  </div>
                </div>
              </div>
              <div className="db-band-summary">
                Your band · <b data-band-power={band.power}>{band.power} power</b> ·{' '}
                <b data-band-guard={band.guard}>{band.guard} guard</b>
                <span> each performance</span>
              </div>
              {pending && (
                <div className="db-target-prompt" role="status">
                  <span>
                    {pending.type === 'gear' ? 'Equip' : 'Replace a musician with'}{' '}
                    <b>{pending.name}</b>. Choose a highlighted musician. Replaced cards go to
                    discard.
                  </span>
                  <button disabled={!active} onClick={cancelTarget}>
                    Cancel target
                  </button>
                </div>
              )}
              <div className="db-stage" role="group" aria-label="Your three musician slots">
                {[0, 1, 2].map((i) => {
                  const id = run.stage[i];
                  if (id === undefined)
                    return (
                      <div key={i} className="db-stage-slot db-empty">
                        Slot {i + 1}
                        <span>Stage a musician</span>
                      </div>
                    );
                  const unit = cardFor(run, id),
                    attachment = run.attachments.find((a) => a.musician === id),
                    gear = attachment ? cardFor(run, attachment.gear) : null;
                  const content = (
                    <>
                      <CardArtwork artKey={unit.artKey} className="db-stage-art" />
                      <div>
                        <b>{unit.name}</b>
                        <span>
                          {unit.role} · {unit.power} power · {unit.guard} guard
                        </span>
                        <small>
                          {gear
                            ? `${gear.name}: +${gear.power} power / +${gear.guard} guard`
                            : 'No Gear'}
                        </small>
                      </div>
                    </>
                  );
                  return pending ? (
                    <button
                      key={i}
                      className="db-stage-slot"
                      data-choice
                      data-stage-id={id}
                      data-role={unit.role}
                      data-key={run.deck.find((c) => c.id === id)!.key}
                      data-power={unit.power}
                      data-guard={unit.guard}
                      data-gear-power={gear?.power ?? 0}
                      data-gear-guard={gear?.guard ?? 0}
                      disabled={!active || !targets.includes(id)}
                      onClick={() => {
                        setRun((s) => playCard(s, targetCard!, id));
                        setTargetCard(null);
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      key={i}
                      className="db-stage-slot"
                      data-stage-id={id}
                      data-role={unit.role}
                      data-key={run.deck.find((c) => c.id === id)!.key}
                      data-power={unit.power}
                      data-guard={unit.guard}
                      data-gear-power={gear?.power ?? 0}
                      data-gear-guard={gear?.guard ?? 0}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
              <div className="db-hand" role="group" aria-label="Your hand">
                {run.hand.map((id, i) => {
                  const card = cardFor(run, id),
                    instance = run.deck.find((c) => c.id === id)!,
                    noTarget = card.type === 'gear' && !legalTargets(run, id).length;
                  return (
                    <button
                      key={id}
                      className="db-card"
                      data-choice={pending ? undefined : ''}
                      data-id={id}
                      data-card={instance.key}
                      data-level={instance.level}
                      data-type={card.type}
                      data-rarity={card.rarity}
                      data-selected={i === Math.min(cursor, run.hand.length - 1)}
                      disabled={
                        !active || pending !== null || cardCost(run, id) > run.energy || noTarget
                      }
                      aria-label={`${card.name}${instance.level ? ` +${instance.level}` : ''}. ${card.type}. ${RARITY_LABEL[card.rarity]}. ${cardCost(run, id)} beats. ${card.text}${noTarget ? ' Stage a compatible musician first.' : ''}`}
                      onFocus={() => setCursor(i)}
                      onClick={() => chooseCard(id)}
                    >
                      <CardFace card={card} level={instance.level} cost={cardCost(run, id)} />
                      {card.compatibleRoles && (
                        <small className="db-compatibility">{card.compatibleRoles.join('/')}</small>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="db-turnbar">
                <span>
                  Turn {run.turn} · Draw {run.draw.length} · Discard {run.discard.length}
                  {run.exhaust.length ? ` · Exhaust ${run.exhaust.length}` : ''}
                </span>
                <button
                  className="db-primary"
                  disabled={!active || pending !== null}
                  onClick={() => setRun(endTurn)}
                >
                  Perform / end turn
                </button>
              </div>
            </>
          ) : run.phase === 'reward' || run.phase === 'record' ? (
            <div className="db-panel db-rewards">
              <h2 ref={heading} tabIndex={-1}>
                {run.phase === 'record' ? 'Choose a Record' : 'Choose a card'}
              </h2>
              <p>
                {run.phase === 'record'
                  ? 'Boss defeated. Recovered up to 20 HP. Records are tour-long perks.'
                  : 'Add one card, or skip to keep the deck small.'}
              </p>
              {run.phase === 'record' && (
                <>
                  <RecordRack run={run} />
                  <RecordSlot
                    active={active}
                    run={run}
                    slot={recordSlot}
                    onChange={setRecordSlot}
                  />
                </>
              )}
              <div className="db-choices">
                {run.phase === 'record'
                  ? run.recordRewards.map((key) => (
                      <button
                        key={key}
                        data-choice
                        data-record={key}
                        data-rarity={RECORDS[key].rarity}
                        disabled={!active}
                        onClick={() => setRun((s) => chooseRecord(s, key, recordSlot))}
                      >
                        <b>{RECORDS[key].name}</b>
                        <small>{RARITY_LABEL[RECORDS[key].rarity]} Record</small>
                        <span>{RECORDS[key].text}</span>
                      </button>
                    ))
                  : run.rewards.map((key, i) => (
                      <button
                        key={key}
                        data-choice
                        className="db-card"
                        data-rarity={CARDS[key].rarity}
                        data-reward={key}
                        disabled={!active}
                        onClick={() => setRun((s) => chooseReward(s, i))}
                      >
                        <CardFace card={CARDS[key]} />
                      </button>
                    ))}
              </div>
              <button
                disabled={!active}
                onClick={() =>
                  setRun((s) =>
                    s.phase === 'record' ? chooseRecord(s, null) : chooseReward(s, -1),
                  )
                }
              >
                {run.phase === 'record' ? 'Keep current Records' : 'Skip card'}
              </button>
            </div>
          ) : run.phase === 'stop' ? (
            <div className="db-panel db-stop">
              <h2 ref={heading} tabIndex={-1}>
                Between shows
              </h2>
              <p>Choose one stop, or head straight to the next show. Cash: {run.cash}.</p>
              <RecordRack run={run} />
              <div className="db-choices">
                {(['record', 'tattoo', 'music'] as ShopKind[]).map((key) => (
                  <button
                    key={key}
                    data-choice
                    data-shop={key}
                    disabled={!active}
                    onClick={() => setRun((s) => enterShop(s, key))}
                  >
                    <b>{SHOP_NAMES[key]}</b>
                    <span>
                      {key === 'record'
                        ? 'Tour perks and one mystery pull.'
                        : key === 'tattoo'
                          ? 'One lasting bonus with a maximum-HP tradeoff.'
                          : 'Buy Gear. Upgrade musicians and instruments.'}
                    </span>
                  </button>
                ))}
              </div>
              <button disabled={!active} onClick={() => setRun(skipStop)}>
                Head to next show
              </button>
            </div>
          ) : run.phase === 'shop' ? (
            <div className="db-panel db-shop">
              <h2 ref={heading} tabIndex={-1}>
                {SHOP_NAMES[run.shop!]}
              </h2>
              <ShopPanel
                run={run}
                active={active}
                setRun={setRun}
                slot={recordSlot}
                setSlot={setRecordSlot}
              />
            </div>
          ) : run.phase === 'won' || run.phase === 'lost' ? (
            <div className="db-panel db-ending">
              <h2 ref={heading} tabIndex={-1}>
                {run.phase === 'won' ? 'Final boss defeated' : 'Run ended'}
              </h2>
              <p>
                {run.phase === 'won'
                  ? 'You completed all three worlds and the final battle.'
                  : `You reached ${battle.name}. Start again with a fresh band.`}
              </p>
              <RecordRack run={run} />
              <p>
                Seed: {run.seed} · Cash earned {run.cashEarned} · Spent {run.cashSpent}
              </p>
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
                <div className="db-map-title">
                  <h2 ref={heading} tabIndex={-1}>
                    {battle.final ? 'Crown Hall' : 'Bellwether'}
                  </h2>
                  <span>{battle.final ? 'THE LAST SHOW' : 'TOWN TOUR'}</span>
                </div>
                <EncoreTown
                  run={run}
                  active={active}
                  buttons={cardButtons}
                  onChoose={(index) => {
                    setCursor(index);
                    setRun((s) => chooseVenue(s, index));
                  }}
                />
                {run.floor === 0 ? (
                  <>
                    <p>
                      Stage up to three Musicians. Crew plays once; Gear equips to a musician.
                      Perform deals your band’s power, adds its guard, then the enemy responds.
                      Unspent beats and guard reset each turn.
                    </p>
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
                  <>
                    <RecordRack run={run} />
                    <p>
                      {battle.final
                        ? 'All three world bosses are down.'
                        : 'Health, cards, Records and tattoos carry into the next show.'}
                    </p>
                  </>
                )}
              </div>
              <button
                className="db-primary"
                disabled={!active}
                onClick={() => setRun((s) => startBattle(s, seed))}
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
