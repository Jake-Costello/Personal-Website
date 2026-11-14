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
  leaveShop,
  buyOffer,
  buyMystery,
  buyTattoo,
  buyUpgrade,
  rarityForTicket,
  TOUR_NODES,
  visitNode,
  mapChoices,
  selectNode,
  hitChance,
  hitChanceForPressure,
  openingPressure,
  pressureGrowth,
  buyPromotion,
  chooseRehearsal,
  PROMOTIONS,
} from './deckbuilder-model';
import type { Run, CardKey, ShopKind } from './deckbuilder-model';
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
  s.pressure = 0;
  return s;
}
function enterShop(state: Run, kind: ShopKind): Run {
  if (state.phase !== 'map' || state.currentNode) return state;
  const node = TOUR_NODES.find((n) => n.shop === kind)!,
    parent = TOUR_NODES.find((n) => n.next.includes(node.id))!;
  return visitNode(
    { ...state, currentNode: parent.id, selectedNode: node.id, visited: [parent.id] },
    node.id,
  );
}
test('three card types and all three finishes have a twenty-card pool with pressure control', () => {
  assert.equal(Object.keys(CARDS).length, 20);
  for (const type of ['musician', 'crew', 'gear']) {
    const pool = Object.values(CARDS).filter((c) => c.type === type);
    assert.equal(pool.length, type === 'crew' ? 8 : 6);
    assert.ok(
      pool.some((c) => c.rarity === 'common') &&
        pool.some((c) => c.rarity === 'rare') &&
        pool.some((c) => c.rarity === 'super-rare'),
    );
  }
  assert.equal(Object.keys(RECORDS).length, 11);
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
test('card rewards keep identities and return to roads, without an interstitial stop', () => {
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
  assert.equal(next.phase, 'map');
  assert.equal(next.floor, s.floor);
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
    assert.equal(s.floor, floor);
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
  const stop = { ...createRun('shop'), phase: 'map' as const, floor: 1 };
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
  const s = enterShop({ ...createRun('cash'), phase: 'map' }, 'record');
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
    { ...createRun('mystery'), phase: 'map', cash: 80, cashEarned: 60 },
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
  let s = enterShop({ ...createRun('upgrade'), phase: 'map', cash: 100, cashEarned: 80 }, 'music');
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
  let s = enterShop({ ...createRun('ink'), phase: 'map', cash: 80, cashEarned: 60 }, 'tattoo');
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
  assert.ok([2, 5, 8, 9].every((f) => seen.includes(f)));
  assert.equal(state.showsWon, 10);
});

test('not staging a band has a real loss condition and cannot farm cash', () => {
  let s = beginEncounter(createRun('careless-baseline'));
  for (let turn = 0; turn < 50 && s.phase === 'combat'; turn++) s = endTurn(s);
  assert.equal(s.phase, 'lost');
  assert.equal(s.floor, 0);
  assert.equal(s.cashEarned, 0);
  assert.equal(s.cash, 20);
});

test('pressure odds have exact ticket boundaries and stay between 60 and 100 percent', () => {
  for (const [pressure, chance] of [
    [0, 100],
    [25, 90],
    [50, 80],
    [75, 70],
    [100, 60],
  ]) {
    assert.equal(hitChanceForPressure(pressure), chance);
    assert.equal(
      Array.from({ length: 100 }, (_, roll) => roll < chance).filter(Boolean).length,
      chance,
    );
  }
  assert.equal(hitChanceForPressure(-20), 100);
  assert.equal(hitChanceForPressure(300), 60);
});
test('attack rolls are seeded, independent of draw RNG and absent on invalid or support actions', () => {
  const s = ready(['riff', 'warmup']);
  s.pressure = 100;
  const old = structuredClone(s);
  const hit = playCard(s, 0);
  assert.deepEqual(playCard(s, 0), hit);
  assert.deepEqual(s, old);
  assert.equal(hit.rng, s.rng);
  assert.equal(hit.lastAttacks.length, 1);
  assert.equal(hit.lastAttacks[0].chance, 60);
  assert.equal(playCard({ ...s, energy: 0 }, 0).hitRng, s.hitRng);
  const calm = playCard(s, 1);
  assert.equal(calm.pressure, 80);
  assert.equal(calm.hitRng, s.hitRng);
  assert.equal(calm.energy, s.energy - 1);
});
test('missed damage never suppresses guard, pressure reduction or other card effects', () => {
  let miss: Run | undefined;
  for (let i = 0; i < 100 && !miss; i++) {
    const s = ready(['ovation'], 'miss-' + i);
    s.pressure = 100;
    const n = playCard(s, 0);
    if (!n.lastAttacks[0].hit) {
      miss = n;
      assert.equal(n.enemyHp, s.enemyHp);
      assert.equal(n.block, 8);
    }
  }
  assert.ok(miss);
  assert.equal(miss.misses, 1);
  const s = ready(['focus']);
  s.pressure = 80;
  const n = playCard(s, 0);
  assert.equal(n.pressure, 45);
  assert.equal(n.block, 3);
  assert.equal(n.lastAttacks.length, 0);
});
test('each staged musician rolls separately while guard remains reliable', () => {
  let s = ready(['guitarist', 'singer', 'drummer']);
  for (let i = 0; i < 3; i++) s = playCard(s, i);
  s.pressure = 100;
  const n = endTurn(s);
  assert.equal(n.lastAttacks.length, 3);
  assert.equal(n.hits + n.misses, 3);
  assert.equal(n.hp, s.hp);
  assert.equal(n.pressure, 100);
  invariant(n);
});
test('rehearsal Records and room tone reduce opening and rising pressure without negative values', () => {
  const s = createRun('calm');
  s.records = ['rehearsal', 'rehearsal', 'room'];
  assert.equal(openingPressure(s), 0);
  const b = beginEncounter(s);
  assert.equal(b.pressure, 0);
  assert.equal(pressureGrowth(b), 3);
  b.records = ['room', 'room', 'room'];
  assert.equal(pressureGrowth(b), 0);
  assert.equal(hitChance(b), 100);
});
test('roads allow only outgoing neighbours and never permit hopping, replay or skipping world bosses', () => {
  let s = createRun('roads');
  assert.equal(mapChoices(s).length, 3);
  assert.equal(selectNode(s, 'w3-boss'), s);
  assert.equal(visitNode(s, 'crown-show'), s);
  s = visitNode(s, 'w1-show-left');
  assert.deepEqual(s.visited, ['w1-show-left']);
  s = { ...s, phase: 'map' };
  assert.deepEqual(
    mapChoices(s).map((n) => n.id),
    ['w1-record', 'w1-extra-show'],
  );
  assert.equal(visitNode(s, 'w1-rehearsal'), s);
  assert.equal(visitNode(s, 'w1-show-left'), s);
  s = visitNode(s, 'w1-record');
  assert.equal(s.phase, 'shop');
  s = leaveShop(s);
  assert.deepEqual(
    mapChoices(s).map((n) => n.id),
    ['w1-tattoo'],
  );
  assert.equal(visitNode(s, 'w1-music'), s);
});
test('all paths cross one boss per district, with two crossovers and real utility nodes', () => {
  assert.equal(TOUR_NODES.length, 34);
  assert.ok(TOUR_NODES.every((n) => n.next.every((id) => TOUR_NODES.some((t) => t.id === id))));
  for (let w = 1; w <= 3; w++) {
    const nodes = TOUR_NODES.filter((n) => n.world === w);
    assert.equal(nodes.filter((n) => n.kind === 'show').length, 5);
    assert.equal(nodes.filter((n) => n.kind === 'shop').length, 4);
    assert.equal(nodes.filter((n) => n.kind === 'event').length, 1);
    assert.ok(
      nodes
        .filter((n) => n.column === 2)
        .every((n) => n.next.length === 1 && n.next[0] === `w${w}-boss`),
    );
  }
  const finalPrep = TOUR_NODES.filter((n) => n.world === 4 && n.kind !== 'show');
  assert.equal(finalPrep.length, 3);
  assert.ok(finalPrep.every((n) => n.shop !== 'studio' && n.next[0] === 'crown-show'));
});
test('Studio charges once, increases crowd/pressure only, and pays its bonus only on a win', () => {
  let s = enterShop({ ...createRun('promo'), cash: 100, cashEarned: 80 }, 'studio');
  const rng = s.rng;
  const n = buyPromotion(s, 'billboard');
  assert.equal(n.cash, 65);
  assert.equal(n.cashSpent, 35);
  assert.equal(n.rng, rng);
  assert.equal(buyPromotion(n, 'flyers'), n);
  assert.equal(buyPromotion({ ...s, cash: 0 }, 'flyers').promotion, null);
  const b = beginEncounter(leaveShop(n));
  assert.equal(b.enemyHp, encounterAt(b).hp);
  assert.ok(b.pressure >= 50);
  b.stage = [0];
  b.hand = b.hand.filter((id) => id !== 0);
  b.draw = b.draw.filter((id) => id !== 0);
  b.pressure = 0;
  b.enemyHp = 1;
  const won = endTurn(b);
  assert.equal(won.promotion, null);
  assert.equal(won.cashEarned, 80 + 20 + PROMOTIONS.billboard.bonus);
  assert.equal(endTurn(won), won);
});
test('rehearsal is a once-per-node route location, not a replayable heal menu', () => {
  const base = createRun('event');
  let s = visitNode(
    { ...base, currentNode: 'w1-show-right', visited: ['w1-show-right'], hp: 40 },
    'w1-rehearsal',
  );
  assert.equal(s.phase, 'event');
  s = chooseRehearsal(s, 'rest');
  assert.equal(s.hp, 50);
  assert.equal(chooseRehearsal(s, 'rest'), s);
  assert.equal(visitNode(s, 'w1-rehearsal'), s);
  const e = visitNode(
    { ...base, currentNode: 'w1-show-right', visited: ['w1-show-right'] },
    'w1-rehearsal',
  );
  const focus = chooseRehearsal(e, 'focus');
  assert.equal(focus.nextShowRelief, 20);
});

test('every complete road path reaches all four bosses and contains seven to ten shows', () => {
  const byId = Object.fromEntries(TOUR_NODES.map((n) => [n.id, n]));
  const reached = new Set<string>();
  const lengths = new Set<number>();
  let completed = 0;
  function walk(id: string, path: string[]) {
    assert.ok(!path.includes(id), 'road graph must be acyclic');
    const node = byId[id];
    assert.ok(node);
    reached.add(id);
    const next = [...path, id];
    if (!node.next.length) {
      assert.equal(id, 'crown-show');
      const shows = next.map((n) => byId[n]).filter((n) => n.kind === 'show');
      assert.deepEqual(
        shows.filter((n) => [2, 5, 8, 9].includes(n.floor!)).map((n) => n.floor),
        [2, 5, 8, 9],
      );
      assert.ok(shows.length >= 7 && shows.length <= 10);
      lengths.add(shows.length);
      completed++;
    } else for (const to of node.next) walk(to, next);
  }
  for (const n of mapChoices(createRun('roads'))) walk(n.id, []);
  assert.equal(reached.size, TOUR_NODES.length);
  assert.ok(completed > 100);
  assert.deepEqual(
    [...lengths].sort((a, b) => a - b),
    [7, 8, 9, 10],
  );
});

test('pressure misses receive explicit feedback while support can lower pressure independently', () => {
  const before = ready(['riff']);
  before.pressure = 100;
  let after = endTurn(before);
  // Find one deterministic missed Crew attack without relying on a particular lucky seed.
  let missed: Run | undefined;
  for (let i = 0; i < 20; i++) {
    const s = ready(['riff'], `miss-feedback-${i}`);
    s.pressure = 100;
    const v = playCard(s, 0);
    if (v.lastAttacks[0] && !v.lastAttacks[0].hit) {
      missed = v;
      assert.equal(combatFeedback(s, v)?.kind, 'miss');
      break;
    }
  }
  assert.ok(missed);
  const calm = ready(['warmup']);
  calm.pressure = 40;
  after = playCard(calm, 0);
  assert.equal(after.pressure, 20);
  assert.equal(combatFeedback(calm, after)?.kind, 'utility');
});
