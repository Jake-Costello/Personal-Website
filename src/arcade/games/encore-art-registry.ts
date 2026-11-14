/** Artwork is presentation data. Card IDs, names, rules and upgrades live elsewhere. */
export type ArtAsset = { src: string; rendering: 'pixel' | 'smooth'; position?: string };
const sprite = (key: string): ArtAsset => ({
  src: `art/encore/cards/${key}.png`,
  rendering: 'pixel',
  position: '50% 50%',
});
export const CARD_ART: Record<string, ArtAsset> = Object.fromEntries(
  [
    'guitarist',
    'singer',
    'drummer',
    'bassist',
    'keys',
    'conductor',
    'crew-riff',
    'crew-roadie',
    'crew-call',
    'gear-amp',
    'gear-kit',
    'gear-mic',
    'gear-rig',
  ].map((key) => [key, sprite(key)]),
);
/** Set a character key to your own local PNG/SVG; omitted keys keep the vector portrait. */
export const ENEMY_ART: Record<string, ArtAsset | undefined> = {};
/** Keys: house, garage, venue, crown. Omitted/missing art keeps the score-board backdrop. */
export const VENUE_ART: Record<string, ArtAsset | undefined> = {};
