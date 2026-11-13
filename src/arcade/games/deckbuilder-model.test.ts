import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CARDS,
  ENCOUNTERS,
  RELICS,
  beginEncounter,
  cardFor,
  chooseRelic,
  chooseReward,
  createRun,
  currentIntent,
  endTurn,
  playCard,
} from './deckbuilder-model';
import type { Run } from './deckbuilder-model';
function invariant(s: Run) {
  if (s.phase !== 'combat') return;
  const ids = [...s.hand, ...s.draw, ...s.discard, ...s.exhaust];
  assert.equal(new Set(ids).size, ids.length, 'card exists in only one active zone');
  assert.deepEqual(
    [...ids].sort((a, b) => a - b),
    s.deck.map((c) => c.id).sort((a, b) => a - b),
  );
  assert.ok(s.energy >= 0 && s.hp >= 0 && s.hp <= s.maxHp && s.enemyHp >= 0);
}
// A deterministic heuristic player is a rules probe, not evidence that balance is fun.
export function botRun(seed: string, limit = 1500) {
  let s = createRun(seed);
  const seen: number[] = [];
  for (let steps = 0; steps < limit && !['won', 'lost'].includes(s.phase); steps++) {
    invariant(s);
    if (s.phase === 'map') {
      seen.push(s.floor);
      s = beginEncounter(s);
    } else if (s.phase === 'reward') {
      const rank = ['power', 'heavy', 'brace', 'rush', 'reserve', 'feint'];
      const best = s.rewards
        .map((key, i) => ({ i, rank: rank.indexOf(key) }))
        .sort((a, b) => a.rank - b.rank)[0];
      s = chooseReward(s, best.i);
    } else if (s.phase === 'relic') s = chooseRelic(s, 'edge');
    else {
      const intent = currentIntent(s);
      const options = s.hand
        .filter((id) => cardFor(s, id).cost <= s.energy)
        .map((id) => {
          const c = cardFor(s, id),
            f = c.effect;
          let value = f.energy ? 100 : f.draw ? (s.energy > 0 ? 40 : 1) : 0;
          if (f.strength) value += s.enemyHp > 18 ? 50 : 0;
          if (f.damage) value += f.damage + s.strength;
          if (f.damage && f.damage + s.strength >= s.enemyHp + s.enemyBlock) value += 200;
          if (f.block) value += 1.5 * Math.min(f.block, Math.max(0, intent.damage - s.block));
          if (f.weaken && !s.weakened) value += 3;
          return { id, value };
        })
        .sort((a, b) => b.value - a.value);
      s = options.length ? playCard(s, options[0].id) : endTurn(s);
    }
  }
  invariant(s);
  return { state: s, seen };
}
test('route has exactly three world bosses followed by a distinct final boss', () => {
  assert.equal(ENCOUNTERS.length, 10);
  assert.deepEqual(
    ENCOUNTERS.map((e, i) => (e.boss ? i : -1)).filter((i) => i >= 0),
    [2, 5, 8, 9],
  );
  assert.equal(ENCOUNTERS.filter((e) => e.final).length, 1);
  assert.equal(ENCOUNTERS[9].final, true);
});
test('same seed and same decisions reproduce draws, rewards and the complete run', () => {
  assert.deepEqual(botRun('repeatable'), botRun('repeatable'));
  assert.notDeepEqual(beginEncounter(createRun('a')).hand, beginEncounter(createRun('b')).hand);
});
test('illegal plays are atomic and leave the original state untouched', () => {
  const s = beginEncounter(createRun('atomic'));
  const old = structuredClone(s);
  assert.equal(playCard(s, -1), s);
  assert.equal(
    playCard(
      { ...s, energy: 0 },
      s.hand.find((id) => cardFor(s, id).cost > 0)!,
    ).energy,
    0,
  );
  assert.deepEqual(s, old);
  assert.equal(chooseReward(s, 0), s);
  assert.equal(chooseRelic(s, 'edge'), s);
});
test('drawing while a card resolves cannot draw that same card or duplicate another', () => {
  const s = beginEncounter(createRun('zones'));
  const focus = s.deck.find((c) => c.key === 'focus')!.id;
  s.hand = [focus];
  s.draw = [];
  s.exhaust = [];
  s.discard = s.deck.filter((c) => c.id !== focus).map((c) => c.id);
  const next = playCard(s, focus);
  invariant(next);
  assert.equal(next.hand.length, 2);
  assert.deepEqual(next.exhaust, [focus]);
  assert.ok(!next.hand.includes(focus));
  assert.deepEqual(s.hand, [focus]);
});
test('block, weakened intent and enemy block resolve in the advertised order', () => {
  let s = beginEncounter(createRun('defend'));
  const guard = s.deck.find((c) => c.key === 'guard')!.id;
  s.hand = s.deck.map((c) => c.id);
  s.draw = [];
  s.discard = [];
  s.exhaust = [];
  const hp = s.hp;
  s = playCard(s, guard);
  assert.equal(s.block, 5);
  s = endTurn(s);
  assert.equal(s.hp, hp);
  assert.equal(s.block, 0);
  assert.equal(s.energy, 3);
  invariant(s);
  const t = beginEncounter(createRun('attack'));
  const strike = t.deck.find((c) => c.key === 'strike')!.id;
  t.hand = [strike];
  t.draw = t.deck.filter((c) => c.id !== strike).map((c) => c.id);
  t.enemyBlock = 4;
  const after = playCard(t, strike);
  assert.equal(after.enemyHp, t.enemyHp - 2);
  assert.equal(after.enemyBlock, 0);
  const weakened = { ...beginEncounter(createRun('weak')), weakened: true };
  assert.equal(currentIntent(weakened).damage, 2);
  assert.equal(endTurn(weakened).weakened, false);
});
test('rewards permit skipping, use distinct card identities, and reject invalid indexes', () => {
  const s = {
    ...beginEncounter(createRun('reward')),
    phase: 'reward' as const,
    rewards: ['heavy', 'brace', 'rush'] as const,
  };
  const reward = { ...s, rewards: [...s.rewards] };
  const next = chooseReward(reward, 0);
  assert.equal(next.deck.length, 11);
  assert.equal(new Set(next.deck.map((c) => c.id)).size, 11);
  assert.equal(chooseReward(reward, -1).deck.length, 10);
  assert.equal(chooseReward(reward, 9), reward);
  assert.equal(chooseReward(reward, NaN), reward);
  assert.equal(chooseReward(reward, 0.5), reward);
  invariant(beginEncounter(next));
});
test('world boss recovery and relic selection lead to the next world, not early victory', () => {
  for (const floor of [2, 5, 8]) {
    let s = beginEncounter({ ...createRun('boss'), floor });
    const id = s.hand.find((i) => cardFor(s, i).effect.damage)!;
    s.enemyHp = 1;
    s.hp = 40;
    s.energy = 99;
    s = playCard(s, id);
    assert.equal(s.phase, 'relic');
    assert.equal(s.hp, 60);
    s = chooseRelic(s, 'charge');
    assert.equal(s.floor, floor + 1);
    assert.equal(s.phase, 'map');
    assert.ok(s.relics.includes('charge'));
    assert.equal(beginEncounter(s).energy, 4);
  }
  let s = beginEncounter({ ...createRun('final'), floor: 9 });
  const id = s.hand.find((i) => cardFor(s, i).effect.damage)!;
  s.enemyHp = 1;
  s.energy = 99;
  s = playCard(s, id);
  assert.equal(s.phase, 'won');
  assert.equal(s.floor, 9);
});
test('permadeath ends the run and restart restores the starter deck without relics', () => {
  const s = beginEncounter(createRun('loss'));
  s.hp = 1;
  const dead = endTurn(s);
  assert.equal(dead.phase, 'lost');
  assert.equal(dead.hp, 0);
  assert.equal(playCard(dead, 0), dead);
  assert.equal(endTurn(dead), dead);
  const fresh = createRun(dead.seed);
  assert.equal(fresh.hp, 80);
  assert.equal(fresh.deck.length, 10);
  assert.equal(fresh.relics.length, 0);
  assert.equal(fresh.floor, 0);
});
test('many seeded legal turns preserve card zones and finish without a stuck phase', () => {
  for (let i = 0; i < 100; i++) {
    const result = botRun(`run-${i}`);
    assert.ok(['won', 'lost'].includes(result.state.phase));
  }
  assert.ok(Object.keys(CARDS).length > 5);
  assert.equal(Object.keys(RELICS).length, 3);
});
test('the default prototype seed is completable with the heuristic player', () => {
  const { state, seen } = botRun('encore');
  assert.equal(state.phase, 'won');
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
