import assert from 'node:assert/strict';
import {
  CARDS,
  createRun,
  beginEncounter,
  chooseVenue,
  venueOptions,
  cardFor,
  cardCost,
  performance,
  currentIntent,
  legalTargets,
  playCard,
  endTurn,
  chooseReward,
  chooseRecord,
  enterShop,
  leaveShop,
  buyOffer,
  buyTattoo,
  buyUpgrade,
  upgradeCost,
} from '../../src/arcade/games/deckbuilder-model';
import type { Run } from '../../src/arcade/games/deckbuilder-model';
export function invariant(s: Run) {
  assert.equal(s.cash, 20 + s.cashEarned - s.cashSpent);
  assert.ok(s.cash >= 0 && s.records.length <= 3 && s.hp >= 0 && s.hp <= s.maxHp);
  if (s.phase !== 'combat') return;
  const ids = [
    ...s.hand,
    ...s.draw,
    ...s.discard,
    ...s.exhaust,
    ...s.stage,
    ...s.attachments.map((a) => a.gear),
  ];
  assert.equal(new Set(ids).size, ids.length, 'each card has one zone');
  assert.deepEqual(
    [...ids].sort((a, b) => a - b),
    s.deck.map((c) => c.id).sort((a, b) => a - b),
  );
  assert.ok(
    s.stage.length <= 3 &&
      s.records.length <= 3 &&
      s.energy >= 0 &&
      s.cash >= 0 &&
      s.hp >= 0 &&
      s.hp <= s.maxHp,
  );
  assert.equal(new Set(s.attachments.map((a) => a.musician)).size, s.attachments.length);
  assert.ok(s.attachments.every((a) => s.stage.includes(a.musician)));
  assert.equal(s.cash, 20 + s.cashEarned - s.cashSpent);
}
export type Policy = 'offense' | 'defense' | 'setup';
export function selectAction(s: Run, policy: Policy = 'setup') {
  const weight = policy === 'offense' ? 0.45 : policy === 'defense' ? 1.8 : 1.1;
  const stat = (id: number) => {
    const c = cardFor(s, id);
    return (c.power ?? 0) + weight * (c.guard ?? 0);
  };
  const band = performance(s),
    deficit = Math.max(0, currentIntent(s).damage - s.block - band.guard);
  const options = s.hand
    .filter((id) => cardCost(s, id) <= s.energy)
    .map((id) => {
      const c = cardFor(s, id);
      let value = 0,
        target: number | undefined;
      if (c.type === 'musician') {
        if (s.stage.length < 3) value = 50 + stat(id);
        else {
          const targets = s.stage
            .map((t) => ({
              id: t,
              value:
                stat(t) +
                (s.attachments.find((a) => a.musician === t)
                  ? stat(s.attachments.find((a) => a.musician === t)!.gear)
                  : 0),
            }))
            .sort((a, b) => a.value - b.value);
          target = targets[0].id;
          value = stat(id) > targets[0].value ? 15 + stat(id) - targets[0].value : 0;
        }
      } else if (c.type === 'gear') {
        const targets = legalTargets(s, id)
          .map((t) => {
            const gear = s.attachments.find((a) => a.musician === t);
            return { id: t, gain: stat(id) - (gear ? stat(gear.gear) : 0) };
          })
          .sort((a, b) => b.gain - a.gain);
        if (targets[0]?.gain > 0) {
          target = targets[0].id;
          value = 25 + targets[0].gain;
        }
      } else {
        const f = c.effect;
        if (f.draw) value += s.energy > 0 ? 45 : 5;
        if (f.energy) value += 80;
        if (f.damage) value += f.damage + (f.damage >= s.enemyHp + s.enemyBlock ? 200 : 0);
        if (f.block)
          value +=
            weight *
            Math.min(deficit, f.block + 2 * s.records.filter((r) => r === 'plating').length);
        if (f.weaken && !s.weakened) value += Math.min(3, deficit);
      }
      return { id, target, value };
    })
    .filter((o) => o.value > 0)
    .sort((a, b) => b.value - a.value);
  return options[0] ?? null;
}
export function botRun(seed: string, policy: Policy = 'setup', limit = 1800, branch = 0) {
  let s = createRun(seed);
  const seen: number[] = [];
  let steps = 0;
  for (; steps < limit && !['won', 'lost'].includes(s.phase); steps++) {
    invariant(s);
    if (s.phase === 'map') {
      seen.push(s.floor);
      s = beginEncounter(chooseVenue(s, branch % venueOptions(s.floor).length));
    } else if (s.phase === 'reward') {
      const scores = s.rewards
        .map((key, i) => {
          const c = CARDS[key];
          const bonus = c.rarity === 'super-rare' ? 8 : c.rarity === 'rare' ? 4 : 0;
          return {
            i,
            score:
              bonus +
              (c.type === 'crew'
                ? c.effect.draw
                  ? 8
                  : (c.effect.damage ?? c.effect.block ?? 5)
                : (c.power ?? 0) + (c.guard ?? 0)),
          };
        })
        .sort((a, b) => b.score - a.score);
      s = chooseReward(s, scores[0].i);
    } else if (s.phase === 'record') {
      const preferred = [
        'edge',
        'spotlight',
        'double',
        'plating',
        'groove',
        'charge',
        'live',
        'backline',
        'encore',
      ];
      const best = [...s.recordRewards].sort(
        (a, b) => preferred.indexOf(a) - preferred.indexOf(b),
      )[0];
      s = chooseRecord(s, best, s.records.length >= 3 ? 0 : undefined);
    } else if (s.phase === 'stop') {
      const stop = (s.floor % 3 === 1 ? (s.floor === 1 ? 'record' : 'tattoo') : 'music') as
        'record' | 'tattoo' | 'music';
      s = enterShop(s, stop);
    } else if (s.phase === 'shop') {
      if (s.shop === 'record') {
        const offer = s.offers.find((o) => !o.sold && o.key === 'edge' && o.price <= s.cash);
        if (offer) s = buyOffer(s, offer.id, s.records.length >= 3 ? 0 : undefined);
        else s = leaveShop(s);
      } else if (s.shop === 'tattoo' && !s.tattoo && s.cash >= 40) s = buyTattoo(s, 'plated');
      else if (s.shop === 'music') {
        const upgrade = s.deck
          .filter(
            (c) =>
              CARDS[c.key].type === 'musician' && c.level < 2 && upgradeCost(s, c.id) <= s.cash,
          )
          .sort((a, b) => a.level - b.level)[0];
        if (upgrade) s = buyUpgrade(s, upgrade.id);
        else s = leaveShop(s);
      } else s = leaveShop(s);
    } else {
      const next = selectAction(s, policy);
      s = next ? playCard(s, next.id, next.target) : endTurn(s);
    }
  }
  invariant(s);
  return { state: s, seen, steps };
}
