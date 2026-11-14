import { currentIntent } from './deckbuilder-model';
import type { Run } from './deckbuilder-model';

export type CombatFeedback = {
  kind: 'attack' | 'block' | 'utility' | 'enemy' | 'enemy-guard';
  text: string;
};
// Visual feedback is derived from resolved state; animation never owns game timing.
export function combatFeedback(before: Run, after: Run): CombatFeedback | null {
  if (
    before === after ||
    before.phase !== 'combat' ||
    after.phase === 'map' ||
    before.floor !== after.floor
  )
    return null;
  if (after.turn > before.turn) {
    if (!currentIntent(before).damage)
      return { kind: 'enemy-guard', text: `+${after.enemyBlock} enemy block` };
    const damage = before.hp - after.hp;
    return { kind: 'enemy', text: damage > 0 ? `−${damage} HP` : 'Blocked' };
  }
  const damage = before.enemyHp - after.enemyHp;
  if (damage > 0) return { kind: 'attack', text: `−${damage}` };
  const absorbed = before.enemyBlock - after.enemyBlock;
  if (absorbed > 0) return { kind: 'attack', text: `${absorbed} absorbed` };
  const block = after.block - before.block;
  if (block > 0) return { kind: 'block', text: `+${block} block` };
  return { kind: 'utility', text: after.log.at(-1)?.replace('Played ', '').replace('.', '') ?? '' };
}
