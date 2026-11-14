import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { CARDS, RECORDS, TATTOOS, SHOP_PRICES, RARITY_LABEL } from './band-cards';
import type { CardDef, CardKey, RecordKey, TattooKey } from './band-cards';
import {
  buyMystery,
  buyOffer,
  buyTattoo,
  buyUpgrade,
  cardFor,
  leaveShop,
  upgradeCost,
  buyPromotion,
  PROMOTIONS,
  SHOP_NAMES,
} from './deckbuilder-model';
import type { Run, PromotionKey } from './deckbuilder-model';
import CardArtwork from './CardArtwork';
export { SHOP_NAMES };
export function CardFace({
  card,
  level = 0,
  cost = card.cost,
}: {
  card: CardDef;
  level?: number;
  cost?: number;
}) {
  return (
    <>
      <span className="db-card-heading">
        <span className="db-card-cost">{cost}</span>
        <small>{card.type}</small>
        {level > 0 && <small>+{level}</small>}
      </span>
      <b>{card.name}</b>
      <CardArtwork artKey={card.artKey} />
      <strong>{card.mark}</strong>
      <span className="db-card-text">{card.text}</span>
      <span className="db-card-footer">
        <small className="db-rarity" aria-label={RARITY_LABEL[card.rarity]}>
          <span className="db-rarity-long">{RARITY_LABEL[card.rarity]}</span>
          <span className="db-rarity-short">
            {card.rarity === 'common' ? 'C' : card.rarity === 'rare' ? 'R' : 'SR'}
          </span>
        </small>
        {card.exhaust && <small>Exhaust</small>}
      </span>
    </>
  );
}
export function Pages({
  children,
  pageSize,
  columns,
  label,
  resetKey,
  action,
}: {
  children: ReactNode[];
  pageSize: number;
  columns: number;
  label: string;
  resetKey: string;
  action?: ReactNode;
}) {
  const [page, setPage] = useState(0),
    max = Math.max(1, Math.ceil(children.length / pageSize));
  const current = Math.min(page, max - 1);
  useEffect(() => setPage(0), [resetKey, pageSize]);
  return (
    <>
      <div
        className="db-pages-grid"
        role="group"
        aria-label={label}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
          gridTemplateRows: `repeat(${Math.ceil(pageSize / columns)},minmax(0,1fr))`,
        }}
      >
        {children.slice(current * pageSize, (current + 1) * pageSize)}
      </div>
      {(max > 1 || action) && (
        <nav className="db-pagination" aria-label={`${label} pages`}>
          {max > 1 && (
            <>
              <button
                data-choice
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={current === 0}
                aria-label="Previous page"
              >
                ←
              </button>
              <span>
                {current + 1} / {max}
              </span>
              <button
                data-choice
                onClick={() => setPage((p) => Math.min(max - 1, p + 1))}
                disabled={current === max - 1}
                aria-label="Next page"
              >
                →
              </button>
            </>
          )}
          {action}
        </nav>
      )}
    </>
  );
}
export function RecordSlot({
  run,
  slot,
  onChange,
  active,
}: {
  run: Run;
  slot: number;
  onChange: (n: number) => void;
  active: boolean;
}) {
  return run.records.length < 3 ? (
    <span className="db-slot-count">Records {run.records.length}/3</span>
  ) : (
    <label className="db-replace-record">
      Replace{' '}
      <select
        disabled={!active}
        value={slot}
        onChange={(e) => onChange(Number(e.target.value))}
        data-arcade-native
      >
        {run.records.map((key, i) => (
          <option key={i} value={i}>
            {i + 1}. {RECORDS[key].name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ShopPanel({
  run,
  active,
  setRun,
  slot,
  setSlot,
  pageSize,
  columns,
}: {
  run: Run;
  active: boolean;
  setRun: Dispatch<SetStateAction<Run>>;
  slot: number;
  setSlot: (n: number) => void;
  pageSize: number;
  columns: number;
}) {
  const [tab, setTab] = useState<'gear' | 'upgrades'>('gear');
  useEffect(() => setTab('gear'), [run.currentNode]);
  let items: ReactNode[] = [];
  if (run.shop === 'record') {
    items = run.offers.map((o) => {
      const d = RECORDS[o.key as RecordKey];
      return (
        <button
          className="db-page-card db-offer"
          key={o.id}
          data-choice
          data-offer={o.key}
          data-rarity={d.rarity}
          disabled={!active || o.sold || run.cash < o.price}
          onClick={() => setRun((s) => buyOffer(s, o.id, slot))}
        >
          <small>{RARITY_LABEL[d.rarity]} Record</small>
          <b>{d.name}</b>
          <span className="db-record-disc" aria-hidden="true">
            ●
          </span>
          <span>{d.text}</span>
          <strong>{o.sold ? 'Sold' : `${o.price} cash`}</strong>
        </button>
      );
    });
    items.push(
      <button
        className="db-page-card db-offer"
        key="mystery"
        data-choice
        data-mystery
        disabled={!active || run.mysteryUsed || run.cash < 30}
        onClick={() => setRun((s) => buyMystery(s, slot))}
      >
        <small>Record</small>
        <b>Mystery pull</b>
        <span className="db-record-disc" aria-hidden="true">
          ?
        </span>
        <span>
          70% common
          <br />
          27% rare
          <br />
          3% super rare
        </span>
        <strong>{run.mysteryUsed ? 'Used' : `${SHOP_PRICES.mystery} cash`}</strong>
      </button>,
    );
  } else if (run.shop === 'tattoo') {
    items = (Object.keys(TATTOOS) as TattooKey[]).map((key) => {
      const d = TATTOOS[key];
      return (
        <button
          className="db-page-card db-offer"
          key={key}
          data-choice
          data-tattoo={key}
          disabled={!active || Boolean(run.tattoo) || run.cash < 40}
          onClick={() => setRun((s) => buyTattoo(s, key))}
        >
          <small>Tattoo · one per tour</small>
          <b>{d.name}</b>
          <span className="db-tattoo-mark" aria-hidden="true">
            ✦
          </span>
          <span>{d.text}</span>
          <span>Max HP −{d.hpCost}</span>
          <strong>{run.tattoo === key ? 'Owned' : run.tattoo ? 'Unavailable' : '40 cash'}</strong>
        </button>
      );
    });
  } else if (run.shop === 'studio') {
    items = (Object.keys(PROMOTIONS) as PromotionKey[]).map((key) => {
      const p = PROMOTIONS[key];
      return (
        <button
          className="db-page-card db-offer"
          key={key}
          data-choice
          data-promotion={key}
          disabled={!active || Boolean(run.promotion) || run.cash < p.fee}
          onClick={() => setRun((s) => buyPromotion(s, key))}
        >
          <small>Next show only</small>
          <b>{p.name}</b>
          <span className="db-promotion-mark" aria-hidden="true">
            ◖
          </span>
          <span>
            Crowd ×{p.crowd}
            <br />
            Pressure +{p.pressure}
            <br />
            Rise +{p.growth}/turn
            <br />
            Win bonus +{p.bonus}
          </span>
          <strong>
            {run.promotion === key ? 'Booked' : run.promotion ? 'Booked' : `${p.fee} cash`}
          </strong>
        </button>
      );
    });
  } else if (tab === 'upgrades') {
    items = run.deck
      .filter((c) => CARDS[c.key].type !== 'crew')
      .map((c) => {
        const d = cardFor(run, c.id),
          price = upgradeCost(run, c.id);
        return (
          <button
            className="db-page-card db-card"
            key={c.id}
            data-choice
            data-upgrade={c.id}
            data-level={c.level}
            data-rarity={d.rarity}
            disabled={!active || c.level >= 2 || run.cash < price}
            onClick={() => setRun((s) => buyUpgrade(s, c.id))}
          >
            <CardFace card={d} level={c.level} />
            <strong>{c.level >= 2 ? 'Max +2' : `Upgrade ${price}`}</strong>
          </button>
        );
      });
  } else
    items = run.offers.map((o) => {
      const d = CARDS[o.key as CardKey];
      return (
        <button
          className="db-page-card db-card"
          key={o.id}
          data-choice
          data-offer={o.key}
          data-rarity={d.rarity}
          disabled={!active || o.sold || run.cash < o.price}
          onClick={() => setRun((s) => buyOffer(s, o.id))}
        >
          <CardFace card={d} />
          <strong>{o.sold ? 'Sold' : `${o.price} cash`}</strong>
        </button>
      );
    });
  return (
    <>
      {run.shop === 'record' && (
        <RecordSlot run={run} slot={slot} onChange={setSlot} active={active} />
      )}{' '}
      {run.shop === 'music' && (
        <nav className="db-tabs" aria-label="Backline stock">
          <button disabled={!active} aria-pressed={tab === 'gear'} onClick={() => setTab('gear')}>
            Gear
          </button>
          <button
            disabled={!active}
            aria-pressed={tab === 'upgrades'}
            onClick={() => setTab('upgrades')}
          >
            Upgrades
          </button>
        </nav>
      )}
      <Pages
        pageSize={pageSize}
        columns={columns}
        label="Shop stock"
        resetKey={`${run.currentNode}:${tab}`}
        action={
          <button
            className="db-primary db-leave"
            data-choice
            disabled={!active}
            onClick={() => setRun(leaveShop)}
          >
            Leave
          </button>
        }
      >
        {items}
      </Pages>
    </>
  );
}
