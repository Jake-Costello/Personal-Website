// Import the actual reducer and the same finite visible-state policies as regression tests.
// No browser, network, storage, account or paid service.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { botRun } from './policy';
import type { Policy } from './policy';
const output = resolve(process.argv[2] ?? '/tmp/encore-balance');
mkdirSync(output, { recursive: true });
const raw = [];
for (const policy of ['offense', 'defense', 'setup'] as Policy[]) {
  for (let i = 0; i < 100; i++) {
    const seed = `band-audit-${i}`;
    const result = botRun(seed, policy, 1800, i % 4);
    const s = result.state;
    raw.push({
      seed,
      policy,
      branch: i % 4,
      phase: s.phase,
      floor: s.floor,
      hp: s.hp,
      maxHp: s.maxHp,
      cash: s.cash,
      earned: s.cashEarned,
      spent: s.cashSpent,
      shopVisits: s.shopVisits,
      records: s.records,
      tattoo: s.tattoo,
      hits: s.hits,
      misses: s.misses,
      maxMissStreak: s.maxMissStreak,
      shows: s.showsWon,
      path: s.visited,
      cards: s.deck.length,
      upgrades: s.deck.reduce((n, c) => n + c.level, 0),
      steps: result.steps,
    });
  }
}
// Paired Studio route: same seeds/policy/roads, skip campaigns as the control.
const paired = [];
for (const policy of ['offense', 'defense', 'setup'] as Policy[])
  for (let i = 0; i < 100; i++) {
    const seed = `studio-audit-${i}`;
    for (const promote of [false, true]) {
      const { state: s, steps } = botRun(seed, policy, 1800, 3, promote);
      paired.push({
        seed,
        policy,
        promote,
        phase: s.phase,
        hp: s.hp,
        shows: s.showsWon,
        hits: s.hits,
        misses: s.misses,
        maxMissStreak: s.maxMissStreak,
        earned: s.cashEarned,
        spent: s.cashSpent,
        cash: s.cash,
        steps,
      });
    }
  }
writeFileSync(resolve(output, 'studio-paired.json'), JSON.stringify(paired, null, 2) + '\n');
const summary = ['offense', 'defense', 'setup'].map((policy) => {
  const rows = raw.filter((r) => r.policy === policy);
  const mean = (key: 'floor' | 'hp' | 'earned' | 'spent' | 'steps') =>
    Number((rows.reduce((n, r) => n + r[key], 0) / rows.length).toFixed(2));
  return {
    policy,
    runs: rows.length,
    wins: rows.filter((r) => r.phase === 'won').length,
    losses: rows.filter((r) => r.phase === 'lost').length,
    budgetExceeded: rows.filter((r) => !['won', 'lost'].includes(r.phase)).length,
    meanFloor: mean('floor'),
    meanHP: mean('hp'),
    meanEarned: mean('earned'),
    meanSpent: mean('spent'),
    meanSteps: mean('steps'),
    hits: rows.reduce((n, r) => n + r.hits, 0),
    misses: rows.reduce((n, r) => n + r.misses, 0),
    maxMissStreak: Math.max(...rows.map((r) => r.maxMissStreak)),
  };
});
writeFileSync(resolve(output, 'raw.json'), JSON.stringify(raw, null, 2) + '\n');
writeFileSync(
  resolve(output, 'summary.json'),
  JSON.stringify(
    {
      seeds: 'band-audit-0..99, common across all policies',
      actionLimit: 1800,
      method:
        'Actual reducer; visible hand, stage and intent only; fixed shop/reward heuristics, not human or optimal play.',
      summary,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
if ([...raw, ...paired].some((r) => !['won', 'lost'].includes(r.phase))) process.exitCode = 1;
