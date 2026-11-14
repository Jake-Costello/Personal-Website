export type Rarity = 'common' | 'rare' | 'super-rare';
export type CardType = 'musician' | 'crew' | 'gear';
export type Effect = {
  damage?: number;
  block?: number;
  draw?: number;
  energy?: number;
  weaken?: boolean;
};
export type CardKey =
  | 'guitarist'
  | 'singer'
  | 'drummer'
  | 'bassist'
  | 'keys'
  | 'conductor'
  | 'riff'
  | 'roadie'
  | 'soundcheck'
  | 'feedback'
  | 'rally'
  | 'ovation'
  | 'amp'
  | 'kit'
  | 'mic'
  | 'stack'
  | 'monitor'
  | 'rig';
export type CardDef = {
  name: string;
  type: CardType;
  rarity: Rarity;
  cost: number;
  artKey: string;
  role?: string;
  compatibleRoles?: string[];
  power?: number;
  guard?: number;
  effect: Effect;
  exhaust?: boolean;
  text: string;
  mark: string;
};
const musician = (
  name: string,
  rarity: Rarity,
  cost: number,
  role: string,
  power: number,
  guard: number,
  artKey: string,
  effect: Effect = {},
): CardDef => ({
  name,
  type: 'musician',
  rarity,
  cost,
  role,
  power,
  guard,
  artKey,
  effect,
  text: `Stays on stage. Performs ${power} damage and ${guard} guard each turn.`,
  mark: `${power} power · ${guard} guard`,
});
const crew = (
  name: string,
  rarity: Rarity,
  cost: number,
  text: string,
  mark: string,
  effect: Effect,
  exhaust = false,
): CardDef => ({
  name,
  type: 'crew',
  rarity,
  cost,
  text,
  mark,
  effect,
  exhaust,
  artKey: effect.damage ? 'crew-riff' : effect.block ? 'crew-roadie' : 'crew-call',
});
const gear = (
  name: string,
  rarity: Rarity,
  cost: number,
  power: number,
  guard: number,
  artKey: string,
  compatibleRoles?: string[],
): CardDef => ({
  name,
  type: 'gear',
  compatibleRoles,
  rarity,
  cost,
  power,
  guard,
  artKey,
  effect: {},
  text: `Equip to a musician: +${power} power, +${guard} guard. One Gear per musician.${compatibleRoles ? ` For ${compatibleRoles.join('/')}.` : ''}`,
  mark: `+${power} power · +${guard} guard`,
});
export const CARDS: Record<CardKey, CardDef> = {
  guitarist: musician('Garage guitarist', 'common', 1, 'Guitar', 4, 0, 'guitarist'),
  singer: musician('Porchlight singer', 'common', 1, 'Vocals', 2, 2, 'singer'),
  drummer: musician('Backbeat drummer', 'common', 1, 'Drums', 1, 4, 'drummer'),
  bassist: {
    ...musician('Motor Row bassist', 'rare', 2, 'Bass', 3, 3, 'bassist', { block: 3 }),
    text: 'Stays on stage. 3 power, 3 guard. Entrance: gain 3 guard.',
  },
  keys: {
    ...musician('Lantern keys', 'rare', 2, 'Keys', 4, 1, 'keys', { draw: 1 }),
    text: 'Stays on stage. 4 power, 1 guard. Entrance: draw 1 card.',
  },
  conductor: {
    ...musician('Midnight bandleader', 'super-rare', 3, 'Lead', 3, 3, 'conductor'),
    text: 'Stays on stage. 3 power, 3 guard. Other musicians gain 1 power.',
  },
  riff: crew('Riff', 'common', 1, 'Deal 6 damage.', '6 damage', { damage: 6 }),
  roadie: crew('Road crew', 'common', 1, 'Gain 5 guard.', '5 guard', { block: 5 }),
  soundcheck: crew('Dial in', 'common', 0, 'Draw 2 cards. Exhaust.', 'Draw 2', { draw: 2 }, true),
  feedback: crew(
    'Feedback',
    'rare',
    1,
    'Deal 3 damage. Reduce the next enemy attack by 3.',
    '3 + weaken',
    { damage: 3, weaken: true },
  ),
  rally: crew('Count-in', 'rare', 0, 'Gain 2 beats. Exhaust.', '+2 beats', { energy: 2 }, true),
  ovation: crew(
    'Standing ovation',
    'super-rare',
    2,
    'Deal 12 damage and gain 8 guard. Exhaust.',
    '12 damage · 8 guard',
    { damage: 12, block: 8 },
    true,
  ),
  amp: gear('Practice amp', 'common', 1, 2, 0, 'gear-amp'),
  kit: gear('House kit', 'common', 1, 0, 3, 'gear-kit', ['Drums']),
  mic: gear('Wired microphone', 'common', 1, 1, 1, 'gear-mic', ['Vocals', 'Lead']),
  stack: gear('Valve stack', 'rare', 2, 3, 1, 'gear-amp', ['Guitar', 'Bass', 'Keys']),
  monitor: gear('Stage monitor', 'rare', 2, 0, 5, 'gear-amp'),
  rig: gear('Touring rig', 'super-rare', 3, 4, 4, 'gear-rig'),
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  'super-rare': 'Super rare',
};
export const RARITIES: Rarity[] = ['common', 'rare', 'super-rare'];
export const RECORDS = {
  edge: { name: 'Porchlight live', rarity: 'common', text: 'Each musician gains 1 power.' },
  plating: {
    name: 'Road case sessions',
    rarity: 'common',
    text: 'Crew guard cards grant 2 extra guard.',
  },
  charge: { name: 'First pressing', rarity: 'common', text: 'Start each show with 1 extra beat.' },
  groove: {
    name: 'Deep cuts',
    rarity: 'rare',
    text: 'Your first Crew card each turn draws 1 card.',
  },
  backline: {
    name: 'Plugged in',
    rarity: 'rare',
    text: 'Equipped Gear gains 1 power and 1 guard.',
  },
  live: { name: 'After hours', rarity: 'rare', text: 'Recover 3 HP after each show.' },
  encore: {
    name: 'One more song',
    rarity: 'super-rare',
    text: 'Each copy saves you from one fatal enemy attack at 1 HP per tour.',
  },
  spotlight: {
    name: 'Full band',
    rarity: 'super-rare',
    text: 'Three different musician roles give each musician 2 extra power.',
  },
  double: {
    name: 'Double A-side',
    rarity: 'super-rare',
    text: 'Your first damaging Crew card each turn repeats its base damage per copy.',
  },
} satisfies Record<string, { name: string; rarity: Rarity; text: string }>;
export type RecordKey = keyof typeof RECORDS;
export const TATTOOS = {
  quick: {
    name: 'Knuckle stars',
    text: 'Your first musician each show costs 1 fewer beat.',
    hpCost: 8,
  },
  plated: { name: 'Anchor ink', text: 'Gain 2 extra guard each performance.', hpCost: 5 },
  night: { name: 'Night shift', text: 'Draw 1 extra card at the start of each show.', hpCost: 10 },
};
export type TattooKey = keyof typeof TATTOOS;
export const SHOP_PRICES = {
  common: 20,
  rare: 50,
  'super-rare': 90,
  mystery: 30,
  tattoo: 40,
  upgrade: 25,
  secondUpgrade: 40,
} as const;
export const MYSTERY_ODDS = { common: 70, rare: 27, 'super-rare': 3 } as const;
export function rarityForTicket(ticket: number): Rarity {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 100)
    throw new RangeError('Expected a rarity ticket from 0 through 99.');
  return ticket < 70 ? 'common' : ticket < 97 ? 'rare' : 'super-rare';
}
