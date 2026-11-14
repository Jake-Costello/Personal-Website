import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CARDS,
  RECORDS,
  ENCOUNTERS,
  WORLDS,
  createRun,
  beginEncounter,
  chooseVenue,
  venueOptions,
  encounterAt,
  playCard,
  endTurn,
  cardFor,
  cardCost,
  performance,
  currentIntent,
  chooseReward,
  chooseRecord,
  skipStop,
  enterShop,
  leaveShop,
  buyOffer,
  buyMystery,
  buyTattoo,
  buyUpgrade,
  rarityForTicket,
} from './deckbuilder-model';
import type { Run, CardKey } from './deckbuilder-model';
import type { Policy } from '../../../tools/encore-balance/policy';
import { invariant, botRun } from '../../../tools/encore-balance/policy';
import { combatFeedback } from './deckbuilder-feedback';
function ready(keys: CardKey[], seed = 'rules'): Run {
  const s = beginEncounter(createRun(seed));
  s.deck = keys.map((key, id) => ({ id, key, level: 0 }));
  s.hand = s.deck.map((c) => c.id);
  s.draw = [];
  s.discard = [];
  s.exhaust = [];
  s.stage = [];
  s.attachments = [];
  s.energy = 30;
  return s;
}
test('three card types and all three finishes have an original eighteen-card pool', () => {
  assert.equal(Object.keys(CARDS).length, 18);
  for (const type of ['musician', 'crew', 'gear']) {
    const pool = Object.values(CARDS).filter((c) => c.type === type);
    assert.equal(pool.length, 6);
    assert.deepEqual(pool.map((c) => c.rarity).sort(), [
      'common',
      'common',
      'common',
      'rare',
      'rare',
      'super-rare',
    ]);
  }
  assert.equal(Object.keys(RECORDS).length, 9);
});
test('town retains three world bosses and a separate Crown Hall final with sixteen opponents', () => {
  assert.deepEqual(WORLDS, ['House Shows', 'Garage Circuit', 'Main Venues']);
  assert.deepEqual(
    ENCOUNTERS.flatMap((e, i) => (e.boss ? [i] : [])),
    [2, 5, 8, 9],
  );
  const all = ENCOUNTERS.flatMap((_, i) => venueOptions(i));
  assert.equal(all.length, 16);
  assert.equal(new Set(all.map((e) => e.character)).size, 16);
  assert.equal(ENCOUNTERS[9].venue, 'Crown Hall');
});
test('seeded openings are repeatable and every starter hand can stage a musician', () => {
  assert.deepEqual(beginEncounter(createRun('opening')), beginEncounter(createRun('opening')));
  for (let i = 0; i < 100; i++) {
    const s = beginEncounter(createRun('opening-' + i));
    invariant(s);
    assert.ok(s.hand.some((id) => cardFor(s, id).type === 'musician'));
  }
});
test('musicians persist and perform once at end turn, making damage and guard before the enemy', () => {
  let s = ready(['guitarist', 'drummer', 'roadie']);
  const hp = s.enemyHp;
  s = playCard(s, 0);
  s = playCard(s, 1);
  assert.equal(s.enemyHp, hp);
  assert.deepEqual(s.stage, [0, 1]);
  assert.deepEqual(performance(s), { power: 5, guard: 4 });
  const next = endTurn(s);
  assert.equal(next.enemyHp, hp - 5);
  assert.equal(next.hp, s.hp - 1);
  assert.equal(next.block, 0);
  assert.deepEqual(next.stage, [0, 1]);
  invariant(next);
});
test('cost and target validation is atomic, including role-specific Gear', () => {
  let s = ready(['guitarist', 'singer', 'drummer', 'kit', 'mic']);
  s = playCard(s, 0);
  s = playCard(s, 1);
  const old = structuredClone(s);
  assert.equal(playCard(s, 3), s);
  assert.equal(playCard(s, 3, 0), s);
  assert.equal(playCard(s, 4, 0), s);
  assert.equal(playCard({ ...s, energy: 0 }, 4, 1).energy, 0);
  assert.deepEqual(s, old);
  s = playCard(s, 2);
  const equipped = playCard(s, 3, 2);
  assert.deepEqual(equipped.attachments, [{ musician: 2, gear: 3 }]);
  invariant(equipped);
});
test('replacing a musician or instrument discards its old cards exactly once', () => {
  let s = ready(['guitarist', 'drummer', 'singer', 'amp', 'bassist', 'monitor']);
  for (const id of [0, 1, 2]) s = playCard(s, id);
  s = playCard(s, 3, 0);
  assert.equal(playCard(s, 4), s);
  s = playCard(s, 4, 0);
  assert.deepEqual(s.stage, [4, 1, 2]);
  assert.ok(s.discard.includes(0) && s.discard.includes(3));
  assert.equal(s.attachments.length, 0);
  invariant(s);
  s = playCard(s, 5, 4);
  assert.deepEqual(s.attachments, [{ musician: 4, gear: 5 }]);
  invariant(s);
});
test('new fights return stage, Gear and exhausted cards to the deck', () => {
  let s = ready(['guitarist', 'amp', 'soundcheck']);
  s = playCard(s, 0);
  s = playCard(s, 1, 0);
  s = playCard(s, 2);
  const next = beginEncounter({ ...s, phase: 'map', floor: 1 });
  assert.equal(next.stage.length, 0);
  assert.equal(next.attachments.length, 0);
  assert.equal(next.exhaust.length, 0);
  invariant(next);
});
test('a resolving draw card cannot draw itself or duplicate other cards', () => {
  const s = ready(['soundcheck', 'guitarist', 'roadie', 'amp']);
  s.hand = [0];
  s.draw = [];
  s.discard = [1, 2, 3];
  const next = playCard(s, 0);
  assert.equal(next.hand.length, 2);
  assert.deepEqual(next.exhaust, [0]);
  assert.ok(!next.hand.includes(0));
  invariant(next);
});
test('enemy block and weakened intent resolve without leaking guard between turns', () => {
  let s = ready(['feedback', 'roadie']);
  s.enemyBlock = 2;
  s = playCard(s, 0);
  assert.equal(s.enemyHp, 21);
  assert.equal(currentIntent(s).damage, 2);
  s = playCard(s, 1);
  const hp = s.hp;
  s = endTurn(s);
  assert.equal(s.hp, hp);
  assert.equal(s.block, 0);
  assert.equal(s.weakened, false);
  invariant(s);
});
test('a killing performance earns one show payout and cannot resolve an enemy response', () => {
  let s = ready(['guitarist']);
  s = playCard(s, 0);
  s.enemyHp = 1;
  const oldHp = s.hp;
  const won = endTurn(s);
  assert.equal(won.phase, 'reward');
  assert.equal(won.hp, oldHp);
  assert.equal(won.cash, 40);
  assert.equal(won.cashEarned, 20);
  assert.equal(endTurn(won), won);
});
test('card rewards create unique identities then offer one town-stop choice', () => {
  const s = {
    ...ready(['riff']),
    phase: 'reward' as const,
    rewards: ['guitarist', 'mic', 'ovation'] as CardKey[],
  };
  assert.equal(chooseReward(s, NaN), s);
  assert.equal(chooseReward(s, 0.5), s);
  const next = chooseReward(s, 0);
  assert.equal(next.deck.length, 2);
  assert.equal(new Set(next.deck.map((c) => c.id)).size, 2);
  assert.equal(next.phase, 'stop');
  assert.equal(next.floor, 1);
  assert.equal(skipStop(next).phase, 'map');
});
test('world boss Records/recovery lead onward; only the separate final boss wins the tour', () => {
  for (const floor of [2, 5, 8]) {
    let s = { ...ready(['guitarist']), floor };
    s = playCard(s, 0);
    s.enemyHp = 1;
    s.hp = 40;
    s = endTurn(s);
    assert.equal(s.phase, 'record');
    assert.equal(s.hp, 60);
    assert.equal(s.cash, 50);
    assert.equal(s.recordRewards.length, 3);
    s = chooseRecord(s, s.recordRewards[0]);
    assert.equal(s.phase, 'map');
    assert.equal(s.floor, floor + 1);
  }
  let s = { ...ready(['guitarist']), floor: 9 };
  s = playCard(s, 0);
  s.enemyHp = 1;
  assert.equal(endTurn(s).phase, 'won');
});
test('Record slots cap at three and replacing one requires an explicit legal slot', () => {
  const s = {
    ...createRun('slots'),
    phase: 'record' as const,
    records: ['edge', 'plating', 'charge'] as Run['records'],
    recordRewards: ['double'] as Run['records'],
  };
  assert.equal(chooseRecord(s, 'double'), s);
  assert.equal(chooseRecord(s, 'double', 3), s);
  const next = chooseRecord(s, 'double', 1);
  assert.deepEqual(next.records, ['edge', 'double', 'charge']);
  assert.equal(s.records[1], 'plating');
});
test('Record effects compose with the visible band; each bandleader buffs only other musicians', () => {
  let s = ready(['guitarist', 'drummer', 'conductor', 'amp']);
  for (const id of [0, 1, 2]) s = playCard(s, id);
  s = playCard(s, 3, 0);
  const baseline = performance(s);
  assert.deepEqual(baseline, { power: 12, guard: 7 });
  s.records = ['edge', 'spotlight', 'backline'];
  assert.deepEqual(performance(s), { power: 22, guard: 8 });
  invariant(s);
});
test('Record House stock is seeded, bounded and separate from combat randomness', () => {
  const stop = { ...createRun('shop'), phase: 'stop' as const, floor: 1 };
  const one = enterShop(stop, 'record'),
    two = enterShop(stop, 'record');
  assert.deepEqual(one, two);
  assert.equal(one.rng, stop.rng);
  assert.ok(one.offers.length >= 3 && one.offers.length <= 4);
  assert.equal(
    one.offers.filter((o) => RECORDS[o.key as keyof typeof RECORDS].rarity === 'common').length,
    3,
  );
  assert.equal(enterShop(one, 'record'), one);
  assert.equal(enterShop(leaveShop(one), 'record').phase, 'map');
});
test('shop purchases check price and identity atomically and cannot buy a sold offer twice', () => {
  const s = enterShop({ ...createRun('cash'), phase: 'stop' }, 'record');
  const old = structuredClone(s);
  assert.equal(buyOffer(s, 'missing'), s);
  assert.equal(buyOffer({ ...s, cash: 0 }, s.offers[0].id).records.length, 0);
  assert.deepEqual(s, old);
  const bought = buyOffer(s, s.offers[0].id);
  assert.equal(bought.cash, 0);
  assert.equal(bought.cashSpent, 20);
  assert.equal(bought.records.length, 1);
  assert.equal(buyOffer(bought, s.offers[0].id), bought);
});
test('mystery pulls have exact 70/27/3 tier boundaries, cost 30 and are limited per visit', () => {
  const counts = { common: 0, rare: 0, 'super-rare': 0 };
  for (let i = 0; i < 100; i++) counts[rarityForTicket(i)]++;
  assert.deepEqual(counts, { common: 70, rare: 27, 'super-rare': 3 });
  for (const n of [-1, 0.5, 100, NaN]) assert.throws(() => rarityForTicket(n));
  const s = enterShop(
    { ...createRun('mystery'), phase: 'stop', cash: 80, cashEarned: 60 },
    'record',
  );
  const old = structuredClone(s);
  const next = buyMystery(s);
  assert.equal(next.cash, 50);
  assert.equal(next.cashSpent, 30);
  assert.equal(next.records.length, 1);
  assert.ok(next.mysteryUsed);
  assert.equal(buyMystery(next), next);
  assert.deepEqual(buyMystery(s), next);
  assert.deepEqual(s, old);
  const full = { ...s, records: ['edge', 'plating', 'charge'] as Run['records'] };
  assert.equal(buyMystery(full), full);
  assert.equal(full.shopRng, s.shopRng);
});
test('Backline upgrades only musicians/Gear, keeps IDs and caps levels without negative cash', () => {
  let s = enterShop({ ...createRun('upgrade'), phase: 'stop', cash: 100, cashEarned: 80 }, 'music');
  const old = structuredClone(s);
  assert.equal(buyUpgrade(s, 6), s);
  assert.equal(buyUpgrade(s, -1), s);
  s = buyUpgrade(s, 0);
  assert.equal(s.deck[0].id, 0);
  assert.equal(s.deck[0].level, 1);
  assert.equal(cardFor(s, 0).power, 5);
  assert.equal(s.cash, 75);
  s = buyUpgrade(s, 0);
  assert.equal(s.deck[0].level, 2);
  assert.equal(s.cash, 35);
  assert.equal(buyUpgrade(s, 0), s);
  assert.equal(old.deck[0].level, 0);
});
test('tattoos are one per tour with shown HP tradeoffs; quick starts discount only one musician', () => {
  let s = enterShop({ ...createRun('ink'), phase: 'stop', cash: 80, cashEarned: 60 }, 'tattoo');
  s = buyTattoo(s, 'quick');
  assert.equal(s.maxHp, 72);
  assert.equal(s.hp, 72);
  assert.equal(s.cash, 40);
  assert.equal(buyTattoo(s, 'plated'), s);
  s = beginEncounter(leaveShop(s));
  const id = s.hand.find((i) => cardFor(s, i).type === 'musician')!;
  assert.equal(cardCost(s, id), 0);
  s = playCard(s, id);
  assert.ok(s.musiciansPlayed === 1);
  for (const other of s.hand.filter((i) => cardFor(s, i).type === 'musician'))
    assert.equal(cardCost(s, other), cardFor(s, other).cost);
  invariant(s);
});
test('death ends the tour; revive Records consume a bounded charge and reset only with a new run', () => {
  const s = ready(['roadie']);
  s.hp = 1;
  assert.equal(endTurn(s).phase, 'lost');
  s.records = ['encore'];
  const alive = endTurn(s);
  assert.equal(alive.hp, 1);
  assert.equal(alive.revivesUsed, 1);
  assert.equal(endTurn(alive).phase, 'lost');
  const fresh = createRun(s.seed);
  assert.equal(fresh.records.length, 0);
  assert.equal(fresh.cash, 20);
  assert.equal(fresh.tattoo, null);
  assert.equal(fresh.deck.length, 12);
});
test('alternate show choices are immutable and resolve the chosen enemy', () => {
  const s = createRun('route'),
    old = structuredClone(s);
  const chosen = chooseVenue(s, 1);
  assert.deepEqual(s, old);
  assert.equal(encounterAt(chosen).name, 'Penny Dread');
  const battle = beginEncounter(chosen);
  assert.equal(battle.enemyHp, 24);
  assert.deepEqual(currentIntent(battle), { damage: 3, block: 4 });
  assert.equal(chooseVenue(battle, 0), battle);
  for (const i of [-1, 2, NaN, 0.5]) assert.equal(chooseVenue(s, i), s);
});
test('resolved feedback distinguishes enemy defense and absorbed damage', () => {
  const s = { ...ready(['riff']), floor: 1, route: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] };
  const a = endTurn(s);
  assert.deepEqual(combatFeedback(s, a), { kind: 'enemy', text: '−8 HP' });
  const b = endTurn(a);
  assert.deepEqual(combatFeedback(a, b), { kind: 'enemy-guard', text: '+6 enemy block' });
  const armored = { ...ready(['riff']), enemyBlock: 99 };
  assert.deepEqual(combatFeedback(armored, playCard(armored, 0)), {
    kind: 'attack',
    text: '6 absorbed',
  });
});
test('seeded legal runs preserve stage/attachment zones and terminate for varied visible-information policies', () => {
  for (const policy of ['offense', 'defense', 'setup'] as Policy[])
    for (let i = 0; i < 30; i++) {
      const result = botRun(`band-${i}`, policy, 1800, i % 2);
      assert.ok(['won', 'lost'].includes(result.state.phase));
    }
  assert.deepEqual(botRun('repeatable'), botRun('repeatable'));
});
test('the default band tour crosses every show and the distinct final boss', () => {
  const { state, seen } = botRun('encore');
  assert.equal(state.phase, 'won');
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('not staging a band has a real loss condition and cannot farm cash', () => {
  let s = beginEncounter(createRun('careless-baseline'));
  for (let turn = 0; turn < 50 && s.phase === 'combat'; turn++) s = endTurn(s);
  assert.equal(s.phase, 'lost');
  assert.equal(s.floor, 0);
  assert.equal(s.cashEarned, 0);
  assert.equal(s.cash, 20);
});
