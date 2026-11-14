import { CARDS, RECORDS, TATTOOS, SHOP_PRICES, rarityForTicket } from './band-cards';
import type { CardDef, CardKey, RecordKey, Rarity, TattooKey } from './band-cards';
export { CARDS, RECORDS, TATTOOS, SHOP_PRICES, rarityForTicket } from './band-cards';
export type { CardDef, CardKey, RecordKey, Rarity, TattooKey } from './band-cards';
export type CardInstance = { id: number; key: CardKey; level: number };
export type Intent = { damage: number; block: number };
export type CharacterKey =
  | 'moth'
  | 'penny'
  | 'wires'
  | 'june'
  | 'static'
  | 'rivet'
  | 'axle'
  | 'fuse'
  | 'torque'
  | 'velvet'
  | 'echo'
  | 'prism'
  | 'luna'
  | 'nova'
  | 'atlas'
  | 'maestro';
export type Encounter = {
  character: CharacterKey;
  venue: string;
  name: string;
  world: number;
  boss: boolean;
  final?: boolean;
  hp: number;
  intents: Intent[];
};
const hit = (damage: number, block = 0): Intent => ({ damage, block });
export const WORLDS = ['House Shows', 'Garage Circuit', 'Main Venues'] as const;
export const ENCOUNTERS: Encounter[] = [
  {
    character: 'moth',
    name: 'Moth',
    venue: 'Porchlight House',
    world: 1,
    boss: false,
    hp: 22,
    intents: [hit(5), hit(7)],
  },
  {
    character: 'wires',
    name: 'Loose Wires',
    venue: 'The Living Room',
    world: 1,
    boss: false,
    hp: 27,
    intents: [hit(6), hit(3, 5)],
  },
  {
    character: 'static',
    name: 'Saint Static',
    venue: 'The Last House',
    world: 1,
    boss: true,
    hp: 42,
    intents: [hit(8), hit(0, 8), hit(12)],
  },
  {
    character: 'rivet',
    name: 'Rivet',
    venue: 'Rivet Auto',
    world: 2,
    boss: false,
    hp: 31,
    intents: [hit(7), hit(9)],
  },
  {
    character: 'fuse',
    name: 'Short Fuse',
    venue: 'Bay Three',
    world: 2,
    boss: false,
    hp: 35,
    intents: [hit(5, 6), hit(11)],
  },
  {
    character: 'torque',
    name: 'The Torque Twins',
    venue: 'The Motor Court',
    world: 2,
    boss: true,
    hp: 52,
    intents: [hit(5, 12), hit(15)],
  },
  {
    character: 'velvet',
    name: 'Velvet',
    venue: 'The Velvet Room',
    world: 3,
    boss: false,
    hp: 38,
    intents: [hit(9), hit(12)],
  },
  {
    character: 'prism',
    name: 'Prism Choir',
    venue: 'Prism Ballroom',
    world: 3,
    boss: false,
    hp: 43,
    intents: [hit(6, 8), hit(14)],
  },
  {
    character: 'atlas',
    name: 'Atlas Electric',
    venue: 'The Atlas',
    world: 3,
    boss: true,
    hp: 65,
    intents: [hit(8), hit(18), hit(4, 10)],
  },
  {
    character: 'maestro',
    name: 'The Midnight Conductor',
    venue: 'Crown Hall',
    world: 3,
    boss: true,
    final: true,
    hp: 85,
    intents: [hit(13), hit(8, 12), hit(21)],
  },
];
// Each regular stop offers a different opponent and attack rhythm. Boss roads converge.
const ALTERNATE_VENUES: Record<number, Encounter> = {
  0: {
    character: 'penny',
    name: 'Penny Dread',
    venue: 'Basement 9',
    world: 1,
    boss: false,
    hp: 24,
    intents: [hit(3, 4), hit(8)],
  },
  1: {
    character: 'june',
    name: 'June Bug',
    venue: 'Juniper Kitchen',
    world: 1,
    boss: false,
    hp: 25,
    intents: [hit(8), hit(0, 6), hit(7)],
  },
  3: {
    character: 'axle',
    name: 'Axle',
    venue: 'Axle & Sons',
    world: 2,
    boss: false,
    hp: 34,
    intents: [hit(4, 7), hit(10)],
  },
  4: {
    character: 'echo',
    name: 'Echo Box',
    venue: 'The Loading Dock',
    world: 2,
    boss: false,
    hp: 32,
    intents: [hit(12), hit(0, 9), hit(7)],
  },
  6: {
    character: 'luna',
    name: 'Luna Vale',
    venue: 'Moonrise Theatre',
    world: 3,
    boss: false,
    hp: 41,
    intents: [hit(7, 7), hit(13)],
  },
  7: {
    character: 'nova',
    name: 'Nova',
    venue: 'The Observatory',
    world: 3,
    boss: false,
    hp: 40,
    intents: [hit(16), hit(0, 10), hit(10)],
  },
};
export function venueOptions(floor: number): Encounter[] {
  if (!ENCOUNTERS[floor]) return [];
  return ALTERNATE_VENUES[floor]
    ? [ENCOUNTERS[floor], ALTERNATE_VENUES[floor]]
    : [ENCOUNTERS[floor]];
}
export function encounterAt(s: Run, floor = s.floor): Encounter {
  return venueOptions(floor)[s.route[floor] ?? 0];
}
export function chooseVenue(state: Run, index: number): Run {
  if (
    state.phase !== 'map' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= venueOptions(state.floor).length
  )
    return state;
  const s = copy(state);
  s.route[s.floor] = index;
  return s;
}
export type ShopKind = 'record' | 'tattoo' | 'music';
export type ShopOffer = {
  id: string;
  kind: 'record' | 'card';
  key: RecordKey | CardKey;
  price: number;
  sold: boolean;
};
export type Run = {
  seed: string;
  rng: number;
  phase: 'map' | 'combat' | 'reward' | 'record' | 'stop' | 'shop' | 'won' | 'lost';
  floor: number;
  route: number[];
  hp: number;
  maxHp: number;
  energy: number;
  block: number;
  turn: number;
  enemyHp: number;
  enemyBlock: number;
  weakened: boolean;
  deck: CardInstance[];
  draw: number[];
  hand: number[];
  discard: number[];
  exhaust: number[];
  stage: number[];
  attachments: { musician: number; gear: number }[];
  records: RecordKey[];
  recordRewards: RecordKey[];
  rewards: CardKey[];
  tattoo: TattooKey | null;
  musiciansPlayed: number;
  crewPlayed: number;
  crewAttackUsed: boolean;
  revivesUsed: number;
  cash: number;
  cashEarned: number;
  cashSpent: number;
  shopVisits: number;
  shop: ShopKind | null;
  offers: ShopOffer[];
  shopRng: number;
  mysteryUsed: boolean;
  log: string[];
};
export function hashSeed(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function nextRandom(value: number) {
  let t = (value + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { state: next, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}
function random(s: Run) {
  const r = nextRandom(s.rng);
  s.rng = r.state;
  return r.value;
}
function shopRandom(s: Run) {
  const r = nextRandom(s.shopRng);
  s.shopRng = r.state;
  return r.value;
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
    route: [...s.route],
    deck: s.deck.map((c) => ({ ...c })),
    draw: [...s.draw],
    hand: [...s.hand],
    discard: [...s.discard],
    exhaust: [...s.exhaust],
    stage: [...s.stage],
    attachments: s.attachments.map((a) => ({ ...a })),
    records: [...s.records],
    recordRewards: [...s.recordRewards],
    rewards: [...s.rewards],
    offers: s.offers.map((o) => ({ ...o })),
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
const count = (s: Run, key: RecordKey) => s.records.filter((k) => k === key).length;
export function cardFor(s: Run, id: number): CardDef {
  const instance = s.deck.find((c) => c.id === id)!;
  const base = CARDS[instance.key];
  const level = instance.level;
  if (!level) return base;
  const power = (base.power ?? 0) + ((base.power ?? 0) > 0 ? level : 0),
    guard = (base.guard ?? 0) + ((base.guard ?? 0) > 0 ? level : 0);
  return {
    ...base,
    power,
    guard,
    mark: `${power} power · ${guard} guard`,
    text:
      base.type === 'gear'
        ? `Equip: +${power} power, +${guard} guard. One Gear per musician.${base.compatibleRoles ? ` For ${base.compatibleRoles.join('/')}.` : ''}`
        : `Stays on stage. ${power} power, ${guard} guard. ${base.effect.draw ? 'Entrance: draw 1.' : base.effect.block ? 'Entrance: gain 3 guard.' : instance.key === 'conductor' ? 'Other musicians gain 1 power.' : ''}`,
  };
}
export function cardCost(s: Run, id: number) {
  const c = cardFor(s, id);
  return Math.max(
    0,
    c.cost - (c.type === 'musician' && s.tattoo === 'quick' && s.musiciansPlayed === 0 ? 1 : 0),
  );
}
export function createRun(seed: string): Run {
  const keys: CardKey[] = [
    'guitarist',
    'singer',
    'drummer',
    'guitarist',
    'singer',
    'drummer',
    'riff',
    'riff',
    'roadie',
    'soundcheck',
    'amp',
    'kit',
  ];
  const clean = seed.trim().slice(0, 64) || 'encore';
  return {
    seed: clean,
    rng: hashSeed(clean),
    phase: 'map',
    floor: 0,
    route: Array(ENCOUNTERS.length).fill(0),
    hp: 80,
    maxHp: 80,
    energy: 0,
    block: 0,
    turn: 0,
    enemyHp: 0,
    enemyBlock: 0,
    weakened: false,
    deck: keys.map((key, id) => ({ id, key, level: 0 })),
    draw: [],
    hand: [],
    discard: [],
    exhaust: [],
    stage: [],
    attachments: [],
    records: [],
    recordRewards: [],
    rewards: [],
    tattoo: null,
    musiciansPlayed: 0,
    crewPlayed: 0,
    crewAttackUsed: false,
    revivesUsed: 0,
    cash: 20,
    cashEarned: 0,
    cashSpent: 0,
    shopVisits: 0,
    shop: null,
    offers: [],
    shopRng: hashSeed(clean + ':shops'),
    mysteryUsed: false,
    log: ['Choose a show. Stage musicians, then use Crew and Gear.'],
  };
}
export function beginEncounter(state: Run): Run {
  if (state.phase !== 'map' || !ENCOUNTERS[state.floor]) return state;
  const s = copy(state);
  const enemy = encounterAt(s);
  Object.assign(s, {
    phase: 'combat',
    energy: 3 + count(s, 'charge'),
    block: 0,
    turn: 1,
    enemyHp: enemy.hp,
    enemyBlock: 0,
    weakened: false,
    hand: [],
    discard: [],
    exhaust: [],
    stage: [],
    attachments: [],
    rewards: [],
    recordRewards: [],
    musiciansPlayed: 0,
    crewPlayed: 0,
    crewAttackUsed: false,
  });
  s.draw = shuffled(
    s,
    s.deck.map((c) => c.id),
  );
  drawCards(s, 5 + (s.tattoo === 'night' ? 1 : 0));
  // A usable opening is guaranteed without duplicating a card or rerolling the deck.
  if (!s.hand.some((id) => cardFor(s, id).type === 'musician')) {
    const i = s.draw.findIndex((id) => cardFor(s, id).type === 'musician');
    if (i >= 0) {
      const replaced = s.hand[0];
      s.hand[0] = s.draw[i];
      s.draw[i] = replaced;
    }
  }
  note(s, `${enemy.name} at ${enemy.venue}. Stage your band.`);
  return s;
}
export function currentIntent(s: Run): Intent {
  const list = encounterAt(s).intents;
  const intent = list[Math.max(0, s.turn - 1) % list.length];
  return { ...intent, damage: Math.max(0, intent.damage - (s.weakened ? 3 : 0)) };
}
export function performance(s: Run) {
  const diverse =
    s.stage.length === 3 && new Set(s.stage.map((id) => cardFor(s, id).role)).size === 3;
  const leaders = s.stage.filter(
    (id) => s.deck.find((c) => c.id === id)?.key === 'conductor',
  ).length;
  let power = 0,
    guard = s.tattoo === 'plated' ? 2 : 0;
  for (const id of s.stage) {
    const unit = cardFor(s, id);
    const attachment = s.attachments.find((a) => a.musician === id);
    const gear = attachment ? cardFor(s, attachment.gear) : null;
    power +=
      (unit.power ?? 0) +
      count(s, 'edge') +
      (diverse ? 2 * count(s, 'spotlight') : 0) +
      leaders -
      (s.deck.find((c) => c.id === id)?.key === 'conductor' ? 1 : 0) +
      (gear ? (gear.power ?? 0) + count(s, 'backline') : 0);
    guard += (unit.guard ?? 0) + (gear ? (gear.guard ?? 0) + count(s, 'backline') : 0);
  }
  return { power, guard };
}
function damageEnemy(s: Run, amount: number) {
  const absorbed = Math.min(s.enemyBlock, amount);
  s.enemyBlock -= absorbed;
  s.enemyHp = Math.max(0, s.enemyHp - (amount - absorbed));
}
function rewardCards(s: Run) {
  const all = Object.keys(CARDS) as CardKey[];
  const picked: CardKey[] = [];
  while (picked.length < 3) {
    const rarity = rarityForTicket(Math.floor(random(s) * 100));
    let pool = all.filter((k) => CARDS[k].rarity === rarity && !picked.includes(k));
    if (!pool.length) pool = all.filter((k) => !picked.includes(k));
    picked.push(pool[Math.floor(random(s) * pool.length)]);
  }
  return picked;
}
function recordPool(rarity: Rarity) {
  return (Object.keys(RECORDS) as RecordKey[]).filter((k) => RECORDS[k].rarity === rarity);
}
function finishEncounter(s: Run) {
  s.hp = Math.min(s.maxHp, s.hp + 3 * count(s, 'live'));
  if (encounterAt(s).final) {
    s.phase = 'won';
    note(s, 'Crown Hall is cleared. Tour complete.');
    return;
  }
  const earnings = encounterAt(s).boss ? 30 : 20;
  s.cash += earnings;
  s.cashEarned += earnings;
  if (encounterAt(s).boss) {
    s.phase = 'record';
    s.hp = Math.min(s.maxHp, s.hp + 20);
    s.recordRewards = shuffled(s, recordPool('common')).slice(0, 2);
    const rare = recordPool(random(s) < 0.03 ? 'super-rare' : 'rare');
    s.recordRewards.push(rare[Math.floor(random(s) * rare.length)]);
    note(s, `Boss show cleared. Earned ${earnings} cash, recovered up to 20 HP. Choose a Record.`);
  } else {
    s.phase = 'reward';
    s.rewards = rewardCards(s);
    note(s, `Show cleared. Earned ${earnings} cash. Choose a card or skip.`);
  }
}
export function legalTargets(s: Run, id: number): number[] {
  const c = cardFor(s, id);
  if (c.type === 'musician') return s.stage.length >= 3 ? [...s.stage] : [];
  if (c.type !== 'gear') return [];
  return s.stage.filter(
    (target) => !c.compatibleRoles || c.compatibleRoles.includes(cardFor(s, target).role!),
  );
}
export function playCard(state: Run, id: number, target?: number): Run {
  if (state.phase !== 'combat' || !state.hand.includes(id)) return state;
  const card = cardFor(state, id),
    cost = cardCost(state, id);
  if (cost > state.energy) return state;
  if (card.type === 'gear' && (target === undefined || !legalTargets(state, id).includes(target)))
    return state;
  if (
    card.type === 'musician' &&
    state.stage.length >= 3 &&
    (target === undefined || !state.stage.includes(target))
  )
    return state;
  const s = copy(state);
  s.hand.splice(s.hand.indexOf(id), 1);
  s.energy -= cost;
  if (card.type === 'musician') {
    if (s.stage.length === 3) {
      const slot = s.stage.indexOf(target!);
      const old = s.stage[slot];
      s.discard.push(old);
      const gear = s.attachments.find((a) => a.musician === old);
      if (gear) s.discard.push(gear.gear);
      s.attachments = s.attachments.filter((a) => a.musician !== old);
      s.stage[slot] = id;
    } else s.stage.push(id);
    s.musiciansPlayed++;
  } else if (card.type === 'gear') {
    const old = s.attachments.find((a) => a.musician === target);
    if (old) s.discard.push(old.gear);
    s.attachments = s.attachments.filter((a) => a.musician !== target);
    s.attachments.push({ musician: target!, gear: id });
  }
  const fx = card.effect;
  if (fx.damage) {
    damageEnemy(
      s,
      fx.damage * (card.type === 'crew' && !s.crewAttackUsed ? 1 + count(s, 'double') : 1),
    );
    if (card.type === 'crew') s.crewAttackUsed = true;
  }
  if (fx.block) s.block += fx.block + (card.type === 'crew' ? 2 * count(s, 'plating') : 0);
  if (fx.weaken) s.weakened = true;
  if (fx.energy) s.energy += fx.energy;
  if (fx.draw) drawCards(s, fx.draw);
  if (card.type === 'crew') {
    if (!s.crewPlayed) drawCards(s, count(s, 'groove'));
    s.crewPlayed++;
    (card.exhaust ? s.exhaust : s.discard).push(id);
  }
  note(
    s,
    card.type === 'musician'
      ? `Staged ${card.name}.`
      : card.type === 'gear'
        ? `Equipped ${card.name} to ${cardFor(s, target!).name}.`
        : `Played ${card.name}.`,
  );
  if (!s.enemyHp) finishEncounter(s);
  return s;
}
export function endTurn(state: Run): Run {
  if (state.phase !== 'combat') return state;
  const s = copy(state);
  const band = performance(s);
  const priorHp = s.enemyHp;
  damageEnemy(s, band.power);
  s.block += band.guard;
  if (!s.enemyHp) {
    finishEncounter(s);
    return s;
  }
  const intent = currentIntent(s);
  const damage = Math.max(0, intent.damage - s.block);
  s.hp = Math.max(0, s.hp - damage);
  s.enemyBlock = intent.block;
  if (encounterAt(s).intents[(s.turn - 1) % encounterAt(s).intents.length].damage > 0)
    s.weakened = false;
  s.discard.push(...s.hand);
  s.hand = [];
  s.block = 0;
  s.energy = 3;
  s.turn++;
  s.crewPlayed = 0;
  s.crewAttackUsed = false;
  note(
    s,
    `Band dealt ${priorHp - s.enemyHp} damage and made ${band.guard} guard. Enemy dealt ${damage}${intent.block ? ` and gained ${intent.block} guard` : ''}.`,
  );
  if (!s.hp && s.revivesUsed < count(s, 'encore')) {
    s.hp = 1;
    s.revivesUsed++;
    note(s, 'One more song kept the band at 1 HP.');
  }
  if (!s.hp) {
    s.phase = 'lost';
    note(s, 'The tour ended. Start a new run with a fresh band.');
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
    s.deck.push({ id: Math.max(...s.deck.map((c) => c.id)) + 1, key, level: 0 });
    note(s, `Added ${CARDS[key].name}.`);
  } else note(s, 'Skipped card reward.');
  s.floor++;
  s.phase = 'stop';
  s.rewards = [];
  s.shop = null;
  s.offers = [];
  return s;
}
function replaceRecord(s: Run, key: RecordKey, slot?: number) {
  if (s.records.length < 3) {
    s.records.push(key);
    return true;
  }
  if (slot === undefined || !Number.isInteger(slot) || slot < 0 || slot >= 3) return false;
  s.records[slot] = key;
  return true;
}
export function chooseRecord(state: Run, key: RecordKey | null, slot?: number): Run {
  if (state.phase !== 'record' || (key !== null && !state.recordRewards.includes(key)))
    return state;
  const s = copy(state);
  if (key && !replaceRecord(s, key, slot)) return state;
  s.floor++;
  s.phase = 'map';
  s.recordRewards = [];
  note(s, key ? `Kept ${RECORDS[key].name}.` : 'Kept the current Records.');
  return s;
}
export function skipStop(state: Run): Run {
  if (state.phase !== 'stop') return state;
  const s = copy(state);
  s.phase = 'map';
  note(s, 'Headed straight to the next show.');
  return s;
}
export function enterShop(state: Run, kind: ShopKind): Run {
  if (state.phase !== 'stop' || !['record', 'tattoo', 'music'].includes(kind)) return state;
  const s = copy(state);
  s.phase = 'shop';
  s.shop = kind;
  s.shopVisits++;
  s.mysteryUsed = false;
  s.offers = [];
  s.shopRng = hashSeed(`${s.seed}:shop:${s.floor}:${kind}`);
  const offer = (key: RecordKey | CardKey, type: 'record' | 'card') => {
    const rarity =
      type === 'record' ? RECORDS[key as RecordKey].rarity : CARDS[key as CardKey].rarity;
    s.offers.push({
      id: `${s.floor}-${kind}-${s.offers.length}`,
      key,
      kind: type,
      price: SHOP_PRICES[rarity],
      sold: false,
    });
  };
  if (kind === 'record') {
    const pool = recordPool('common');
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(shopRandom(s) * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.forEach((k) => offer(k, 'record'));
    const ticket = Math.floor(shopRandom(s) * 100);
    if (ticket < 30) {
      const rare = recordPool(ticket < 2 ? 'super-rare' : 'rare');
      offer(rare[Math.floor(shopRandom(s) * rare.length)], 'record');
    }
  } else if (kind === 'music') {
    (['amp', 'kit', 'mic'] as CardKey[]).forEach((k) => offer(k, 'card'));
  }
  note(
    s,
    kind === 'record'
      ? 'Record House. Three Record slots; copies stack.'
      : kind === 'music'
        ? 'Backline. Buy Gear or upgrade a musician or instrument.'
        : 'Tattoo Parlor. One tattoo for this tour, with a health tradeoff.',
  );
  return s;
}
export function leaveShop(state: Run): Run {
  if (state.phase !== 'shop') return state;
  const s = copy(state);
  s.phase = 'map';
  s.shop = null;
  note(s, 'Next show. Cash, deck, Records and tattoo carry on.');
  return s;
}
export function buyOffer(state: Run, offerId: string, recordSlot?: number): Run {
  if (state.phase !== 'shop') return state;
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer || offer.sold || state.cash < offer.price) return state;
  const s = copy(state);
  if (offer.kind === 'record') {
    if (!replaceRecord(s, offer.key as RecordKey, recordSlot)) return state;
  } else
    s.deck.push({
      id: Math.max(...s.deck.map((c) => c.id)) + 1,
      key: offer.key as CardKey,
      level: 0,
    });
  s.cash -= offer.price;
  s.cashSpent += offer.price;
  s.offers.find((o) => o.id === offerId)!.sold = true;
  note(
    s,
    `Bought ${offer.kind === 'record' ? RECORDS[offer.key as RecordKey].name : CARDS[offer.key as CardKey].name} for ${offer.price} cash.`,
  );
  return s;
}
export function buyMystery(state: Run, recordSlot?: number): Run {
  if (
    state.phase !== 'shop' ||
    state.shop !== 'record' ||
    state.mysteryUsed ||
    state.cash < SHOP_PRICES.mystery ||
    (state.records.length >= 3 &&
      (recordSlot === undefined ||
        !Number.isInteger(recordSlot) ||
        recordSlot < 0 ||
        recordSlot >= 3))
  )
    return state;
  const s = copy(state),
    rarity = rarityForTicket(Math.floor(shopRandom(s) * 100));
  const pool = recordPool(rarity),
    key = pool[Math.floor(shopRandom(s) * pool.length)];
  replaceRecord(s, key, recordSlot);
  s.cash -= SHOP_PRICES.mystery;
  s.cashSpent += SHOP_PRICES.mystery;
  s.mysteryUsed = true;
  note(s, `Mystery pull: ${RECORDS[key].name} (${rarity}). Spent ${SHOP_PRICES.mystery} cash.`);
  return s;
}
export function buyTattoo(state: Run, key: TattooKey): Run {
  if (
    state.phase !== 'shop' ||
    state.shop !== 'tattoo' ||
    state.tattoo ||
    !Object.hasOwn(TATTOOS, key) ||
    state.cash < SHOP_PRICES.tattoo
  )
    return state;
  const s = copy(state);
  s.cash -= SHOP_PRICES.tattoo;
  s.cashSpent += SHOP_PRICES.tattoo;
  s.tattoo = key;
  s.maxHp -= TATTOOS[key].hpCost;
  s.hp = Math.min(s.hp, s.maxHp);
  note(s, `${TATTOOS[key].name}: maximum HP is now ${s.maxHp}.`);
  return s;
}
export function upgradeCost(s: Run, id: number) {
  const card = s.deck.find((c) => c.id === id);
  return card?.level === 0 ? SHOP_PRICES.upgrade : SHOP_PRICES.secondUpgrade;
}
export function buyUpgrade(state: Run, id: number): Run {
  const card = state.deck.find((c) => c.id === id);
  if (
    state.phase !== 'shop' ||
    state.shop !== 'music' ||
    !card ||
    CARDS[card.key].type === 'crew' ||
    card.level >= 2 ||
    state.cash < upgradeCost(state, id)
  )
    return state;
  const s = copy(state),
    cost = upgradeCost(s, id);
  s.deck.find((c) => c.id === id)!.level++;
  s.cash -= cost;
  s.cashSpent += cost;
  note(s, `Upgraded ${CARDS[card.key].name} to +${card.level + 1}.`);
  return s;
}
