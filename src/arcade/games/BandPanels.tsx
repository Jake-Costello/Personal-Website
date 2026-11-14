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
} from './deckbuilder-model';
import type { Run } from './deckbuilder-model';
import type { Dispatch, SetStateAction } from 'react';
import CardArtwork from './CardArtwork';

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
      <small className="db-rarity">{RARITY_LABEL[card.rarity]}</small>
    </>
  );
}
export function RecordRack({ run }: { run: Run }) {
  return (
    <div className="db-record-rack" aria-label="Tour perks">
      <b>Records {run.records.length}/3</b>
      {run.records.map((key, i) => (
        <span key={i} title={RECORDS[key].text}>
          {RECORDS[key].name}
        </span>
      ))}
      {run.tattoo && (
        <span title={TATTOOS[run.tattoo].text}>Tattoo: {TATTOOS[run.tattoo].name}</span>
      )}
    </div>
  );
}
export function RecordSlot({
  run,
  slot,
  onChange,
  active,
}: {
  active: boolean;
  run: Run;
  slot: number;
  onChange: (slot: number) => void;
}) {
  return run.records.length < 3 ? (
    <p>Records last this tour. Three slots; duplicate copies stack.</p>
  ) : (
    <label className="db-replace-record">
      All three slots are full. Replace this Record with your next purchase or reward:
      <select
        disabled={!active}
        value={slot}
        onChange={(e) => onChange(Number(e.target.value))}
        data-arcade-native
      >
        {run.records.map((key, i) => (
          <option key={i} value={i}>
            Slot {i + 1}: {RECORDS[key].name}
          </option>
        ))}
      </select>
    </label>
  );
}
export const SHOP_NAMES = {
  record: 'Record House',
  tattoo: 'Tattoo Parlor',
  music: 'Backline — Music Store',
};
export function ShopPanel({
  run,
  active,
  setRun,
  slot,
  setSlot,
}: {
  run: Run;
  active: boolean;
  setRun: Dispatch<SetStateAction<Run>>;
  slot: number;
  setSlot: (slot: number) => void;
}) {
  return (
    <>
      <p>
        Cash: <b>{run.cash}</b>. Earned at shows; purchases last this tour.
      </p>
      <RecordRack run={run} />
      {run.shop === 'record' && (
        <>
          <RecordSlot active={active} run={run} slot={slot} onChange={setSlot} />
          <div className="db-choices db-shop-offers">
            {run.offers.map((offer) => {
              const def = RECORDS[offer.key as RecordKey];
              return (
                <button
                  key={offer.id}
                  data-choice
                  data-offer={offer.key}
                  data-rarity={def.rarity}
                  disabled={!active || offer.sold || run.cash < offer.price}
                  onClick={() => setRun((s) => buyOffer(s, offer.id, slot))}
                >
                  <b>{def.name}</b>
                  <small>{RARITY_LABEL[def.rarity]} Record</small>
                  <span>{def.text}</span>
                  <strong>{offer.sold ? 'Sold' : `Buy · ${offer.price} cash`}</strong>
                </button>
              );
            })}
          </div>
          <div className="db-mystery">
            <b>Mystery Record · {SHOP_PRICES.mystery} cash</b>
            <p>
              One pull per visit. Common 70% · Rare 27% · Super rare 3%. Shelf stock: three common
              Records, plus a rare 28% or super rare 2% of visits.
            </p>
            {run.records.length >= 3 && (
              <p>
                Blind purchase: replaces {RECORDS[run.records[slot]].name} in slot {slot + 1}, even
                if the new Record is common.
              </p>
            )}
            <button
              data-choice
              disabled={!active || run.mysteryUsed || run.cash < SHOP_PRICES.mystery}
              onClick={() => setRun((s) => buyMystery(s, slot))}
            >
              {run.mysteryUsed ? 'Pull used this visit' : 'Buy mystery Record · 30 cash'}
            </button>
          </div>
        </>
      )}
      {run.shop === 'tattoo' && (
        <>
          <p>
            One tattoo per tour. Each costs {SHOP_PRICES.tattoo} cash and permanently lowers maximum
            HP for this run. Current HP is capped to the new maximum.
          </p>
          <div className="db-choices">
            {(Object.keys(TATTOOS) as TattooKey[]).map((key) => {
              const def = TATTOOS[key];
              return (
                <button
                  key={key}
                  data-choice
                  data-tattoo={key}
                  disabled={!active || Boolean(run.tattoo) || run.cash < SHOP_PRICES.tattoo}
                  onClick={() => setRun((s) => buyTattoo(s, key))}
                >
                  <b>{def.name}</b>
                  <span>{def.text}</span>
                  <span>
                    Max HP: {run.maxHp} → {run.maxHp - def.hpCost} (−{def.hpCost})
                  </span>
                  <strong>
                    {run.tattoo === key
                      ? 'Owned'
                      : run.tattoo
                        ? 'Tattoo already chosen'
                        : 'Get tattoo · 40 cash'}
                  </strong>
                </button>
              );
            })}
          </div>
        </>
      )}
      {run.shop === 'music' && (
        <>
          <p>
            Gear attaches to a compatible musician. One Gear per musician; equipping another
            discards the old Gear.
          </p>
          <div className="db-choices db-shop-offers">
            {run.offers.map((offer) => {
              const def = CARDS[offer.key as CardKey];
              return (
                <button
                  key={offer.id}
                  data-choice
                  data-offer={offer.key}
                  disabled={!active || offer.sold || run.cash < offer.price}
                  onClick={() => setRun((s) => buyOffer(s, offer.id))}
                >
                  <b>{def.name}</b>
                  <span>{def.text}</span>
                  <strong>{offer.sold ? 'Sold' : `Buy · ${offer.price} cash`}</strong>
                </button>
              );
            })}
          </div>
          <h3>Upgrade a card</h3>
          <p>
            Musicians and Gear only. Up to +2; each level adds 1 to every nonzero power/guard stat.
            First upgrade 25 cash, second 40.
          </p>
          <div className="db-upgrades">
            {run.deck
              .filter((c) => CARDS[c.key].type !== 'crew')
              .map((c) => {
                const def = cardFor(run, c.id),
                  price = upgradeCost(run, c.id);
                return (
                  <button
                    key={c.id}
                    data-choice
                    data-upgrade={c.id}
                    disabled={!active || c.level >= 2 || run.cash < price}
                    onClick={() => setRun((s) => buyUpgrade(s, c.id))}
                  >
                    <b>
                      {def.name} {c.level ? `+${c.level}` : ''} <small>copy {c.id + 1}</small>
                    </b>
                    <span>
                      {def.mark}
                      {c.level < 2
                        ? ` → ${(def.power ?? 0) + ((def.power ?? 0) > 0 ? 1 : 0)} power · ${(def.guard ?? 0) + ((def.guard ?? 0) > 0 ? 1 : 0)} guard`
                        : ''}
                    </span>
                    <strong>{c.level >= 2 ? 'Maximum +2' : `Upgrade · ${price} cash`}</strong>
                  </button>
                );
              })}
          </div>
        </>
      )}
      <button
        className="db-primary"
        data-choice
        disabled={!active}
        onClick={() => setRun(leaveShop)}
      >
        Leave shop
      </button>
    </>
  );
}
