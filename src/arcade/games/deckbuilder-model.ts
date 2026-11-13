export type CardKey =
  'strike' | 'guard' | 'focus' | 'feint' | 'heavy' | 'brace' | 'rush' | 'reserve' | 'power';
type Effect = {
  damage?: number;
  block?: number;
  draw?: number;
  energy?: number;
  strength?: number;
  weaken?: boolean;
};
export type CardDef = {
  name: string;
  cost: number;
  text: string;
  mark: string;
  effect: Effect;
  exhaust?: boolean;
};
export const CARDS: Record<CardKey, CardDef> = {
  strike: {
    name: 'Riff',
    cost: 1,
    text: 'Deal 6 damage.',
    mark: '6 damage',
    effect: { damage: 6 },
  },
  guard: {
    name: 'Backbeat',
    cost: 1,
    text: 'Gain 5 block.',
    mark: '5 block',
    effect: { block: 5 },
  },
  focus: {
    name: 'Dial in',
    cost: 0,
    text: 'Draw 2 cards. Exhaust.',
    mark: 'Draw 2',
    effect: { draw: 2 },
    exhaust: true,
  },
  feint: {
    name: 'Feedback',
    cost: 1,
    text: 'Deal 3 damage. Reduce the next enemy attack by 3.',
    mark: '3 + weaken',
    effect: { damage: 3, weaken: true },
  },
  heavy: {
    name: 'Power chord',
    cost: 2,
    text: 'Deal 17 damage.',
    mark: '17 damage',
    effect: { damage: 17 },
  },
  brace: {
    name: 'Drum fill',
    cost: 1,
    text: 'Gain 9 block.',
    mark: '9 block',
    effect: { block: 9 },
  },
  rush: {
    name: 'Quick riff',
    cost: 1,
    text: 'Deal 5 damage. Draw 1 card.',
    mark: '5 + draw 1',
    effect: { damage: 5, draw: 1 },
  },
  reserve: {
    name: 'Count-in',
    cost: 0,
    text: 'Gain 2 beats. Exhaust.',
    mark: '+2 beats',
    effect: { energy: 2 },
    exhaust: true,
  },
  power: {
    name: 'Turn it up',
    cost: 1,
    text: 'Attacks deal 2 more damage this battle. Exhaust.',
    mark: '+2 strength',
    effect: { strength: 2 },
    exhaust: true,
  },
};
export const RELICS = {
  edge: { name: 'Hot pickup', text: 'Attacks deal 1 more damage.' },
  plating: { name: 'Road case', text: 'Block cards give 2 more block.' },
  charge: { name: 'Spare battery', text: 'Start each battle with 1 extra beat.' },
} as const;
export type RelicKey = keyof typeof RELICS;
export type CardInstance = { id: number; key: CardKey };
export type Intent = { damage: number; block: number };
export type Encounter = {
  name: string;
  world: number;
  boss: boolean;
  final?: boolean;
  hp: number;
  intents: Intent[];
};
const hit = (damage: number, block = 0): Intent => ({ damage, block });
export const WORLDS = ['Garage', 'Club', 'Main Stage'] as const;
export const ENCOUNTERS: Encounter[] = [
  { name: 'Garage · Soundcheck', world: 1, boss: false, hp: 22, intents: [hit(5), hit(7)] },
  { name: 'Garage · First set', world: 1, boss: false, hp: 27, intents: [hit(6), hit(3, 5)] },
  { name: 'Opening Act', world: 1, boss: true, hp: 42, intents: [hit(8), hit(0, 8), hit(12)] },
  { name: 'Club · Support set', world: 2, boss: false, hp: 31, intents: [hit(7), hit(9)] },
  { name: 'Club · Late set', world: 2, boss: false, hp: 35, intents: [hit(5, 6), hit(11)] },
  { name: 'House Band', world: 2, boss: true, hp: 52, intents: [hit(5, 12), hit(15)] },
  { name: 'Main Stage · Warmup', world: 3, boss: false, hp: 38, intents: [hit(9), hit(12)] },
  { name: 'Main Stage · Spotlight', world: 3, boss: false, hp: 43, intents: [hit(6, 8), hit(14)] },
  { name: 'The Headliner', world: 3, boss: true, hp: 65, intents: [hit(8), hit(18), hit(4, 10)] },
  {
    name: 'The Final Set',
    world: 3,
    boss: true,
    final: true,
    hp: 85,
    intents: [hit(13), hit(8, 12), hit(21)],
  },
];
export type Run = {
  seed: string;
  rng: number;
  phase: 'map' | 'combat' | 'reward' | 'relic' | 'won' | 'lost';
  floor: number;
  hp: number;
  maxHp: number;
  energy: number;
  block: number;
  strength: number;
  turn: number;
  enemyHp: number;
  enemyBlock: number;
  weakened: boolean;
  deck: CardInstance[];
  draw: number[];
  hand: number[];
  discard: number[];
  exhaust: number[];
  relics: RelicKey[];
  rewards: CardKey[];
  log: string[];
};
function hashSeed(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function random(s: Run) {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffled<T>(s: Run, values: T[]) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function copy(s: Run): Run {
  return {
    ...s,
    deck: [...s.deck],
    draw: [...s.draw],
    hand: [...s.hand],
    discard: [...s.discard],
    exhaust: [...s.exhaust],
    relics: [...s.relics],
    rewards: [...s.rewards],
    log: [...s.log],
  };
}
function note(s: Run, message: string) {
  s.log = [...s.log.slice(-5), message];
}
function drawCards(s: Run, n: number) {
  for (let i = 0; i < n; i++) {
    if (!s.draw.length) {
      s.draw = shuffled(s, s.discard);
      s.discard = [];
    }
    const id = s.draw.pop();
    if (id === undefined) break;
    (s.hand.length < 10 ? s.hand : s.discard).push(id);
  }
}
export function cardFor(s: Run, id: number) {
  return CARDS[s.deck.find((c) => c.id === id)!.key];
}
const count = (s: Run, relic: RelicKey) => s.relics.filter((r) => r === relic).length;
export function createRun(seed: string): Run {
  const keys: CardKey[] = [
    'strike',
    'strike',
    'strike',
    'strike',
    'guard',
    'guard',
    'guard',
    'guard',
    'focus',
    'feint',
  ];
  const cleanSeed = seed.trim().slice(0, 64) || 'encore';
  return {
    seed: cleanSeed,
    rng: hashSeed(cleanSeed),
    phase: 'map',
    floor: 0,
    hp: 80,
    maxHp: 80,
    energy: 0,
    block: 0,
    strength: 0,
    turn: 0,
    enemyHp: 0,
    enemyBlock: 0,
    weakened: false,
    deck: keys.map((key, id) => ({ id, key })),
    draw: [],
    hand: [],
    discard: [],
    exhaust: [],
    relics: [],
    rewards: [],
    log: ['Run started.'],
  };
}
export function beginEncounter(state: Run): Run {
  if (state.phase !== 'map' || !ENCOUNTERS[state.floor]) return state;
  const s = copy(state);
  const enemy = ENCOUNTERS[s.floor];
  Object.assign(s, {
    phase: 'combat',
    energy: 3 + count(s, 'charge'),
    block: 0,
    strength: count(s, 'edge'),
    turn: 1,
    enemyHp: enemy.hp,
    enemyBlock: 0,
    weakened: false,
    hand: [],
    discard: [],
    exhaust: [],
    rewards: [],
  });
  s.draw = shuffled(
    s,
    s.deck.map((c) => c.id),
  );
  drawCards(s, 5);
  note(s, `${enemy.name}. Draw 5 cards.`);
  return s;
}
export function currentIntent(s: Run): Intent {
  const list = ENCOUNTERS[s.floor].intents;
  const intent = list[Math.max(0, s.turn - 1) % list.length];
  return { ...intent, damage: Math.max(0, intent.damage - (s.weakened ? 3 : 0)) };
}
function finishEncounter(s: Run) {
  if (ENCOUNTERS[s.floor].final) {
    s.phase = 'won';
    note(s, 'Final boss defeated. Run complete.');
    return;
  }
  if (ENCOUNTERS[s.floor].boss) {
    s.phase = 'relic';
    s.hp = Math.min(s.maxHp, s.hp + 20);
    note(s, 'Boss defeated. Recover 20 HP and choose a relic.');
    return;
  }
  s.phase = 'reward';
  s.rewards = shuffled(s, [
    'heavy',
    'brace',
    'rush',
    'reserve',
    'power',
    'feint',
  ] as CardKey[]).slice(0, 3);
  note(s, 'Battle won. Choose a card or skip.');
}
export function playCard(state: Run, id: number): Run {
  if (state.phase !== 'combat' || !state.hand.includes(id)) return state;
  const card = cardFor(state, id);
  if (card.cost > state.energy) return state;
  const s = copy(state);
  s.hand.splice(s.hand.indexOf(id), 1);
  s.energy -= card.cost;
  // The resolving card is held outside the discard pile until all its effects finish.
  const fx = card.effect;
  if (fx.damage) {
    const damage = fx.damage + s.strength;
    const absorbed = Math.min(s.enemyBlock, damage);
    s.enemyBlock -= absorbed;
    s.enemyHp = Math.max(0, s.enemyHp - (damage - absorbed));
  }
  if (fx.block) s.block += fx.block + 2 * count(s, 'plating');
  if (fx.strength) s.strength += fx.strength;
  if (fx.weaken) s.weakened = true;
  if (fx.energy) s.energy += fx.energy;
  if (fx.draw) drawCards(s, fx.draw);
  (card.exhaust ? s.exhaust : s.discard).push(id);
  note(s, `Played ${card.name}.`);
  if (!s.enemyHp) finishEncounter(s);
  return s;
}
export function endTurn(state: Run): Run {
  if (state.phase !== 'combat') return state;
  const s = copy(state);
  const intent = currentIntent(s);
  const damage = Math.max(0, intent.damage - s.block);
  s.hp = Math.max(0, s.hp - damage);
  s.enemyBlock = intent.block;
  if (
    intent.damage > 0 ||
    ENCOUNTERS[s.floor].intents[(s.turn - 1) % ENCOUNTERS[s.floor].intents.length].damage > 0
  )
    s.weakened = false;
  s.discard.push(...s.hand);
  s.hand = [];
  s.block = 0;
  s.energy = 3;
  s.turn++;
  note(
    s,
    `Enemy dealt ${damage} damage${intent.block ? ` and gained ${intent.block} block` : ''}.`,
  );
  if (!s.hp) {
    s.phase = 'lost';
    note(s, 'Run ended. Start a new run to try again.');
  } else drawCards(s, 5);
  return s;
}
export function chooseReward(state: Run, index: number): Run {
  if (
    state.phase !== 'reward' ||
    !Number.isInteger(index) ||
    index < -1 ||
    index >= state.rewards.length
  )
    return state;
  const s = copy(state);
  const key = s.rewards[index];
  if (key) {
    s.deck.push({ id: Math.max(...s.deck.map((c) => c.id)) + 1, key });
    note(s, `Added ${CARDS[key].name}.`);
  } else note(s, 'Skipped card reward.');
  s.floor++;
  s.phase = 'map';
  s.rewards = [];
  return s;
}
export function chooseRelic(state: Run, relic: RelicKey): Run {
  if (state.phase !== 'relic' || !Object.hasOwn(RELICS, relic)) return state;
  const s = copy(state);
  s.relics.push(relic);
  s.floor++;
  s.phase = 'map';
  note(s, `Gained ${RELICS[relic].name}.`);
  return s;
}
