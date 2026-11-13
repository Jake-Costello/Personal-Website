export type ArcadeProject = {
  id: 'shoreline' | 'sketch' | 'warehouse' | 'deckbuilder';
  title: string;
  shortTitle: string;
  number: string;
  accent: string;
  cabinetColor: string;
  genre: string;
  tagline: string;
  hidden?: boolean;
  controls: { action: string; label: string; key: string }[];
};

const arcadeCatalog: ArcadeProject[] = [
  {
    id: 'shoreline',
    title: 'Resume Run',
    shortTitle: 'RESUME RUN',
    number: '01',
    accent: '#80dff2',
    cabinetColor: '#132732',
    genre: 'INTERACTIVE RÉSUMÉ',
    tagline: 'Explore my résumé along the Cleveland shoreline.',
    controls: [
      { action: 'up', label: 'Jump', key: '↑' },
      { action: 'left', label: 'Left', key: '←' },
      { action: 'down', label: 'Pump', key: '↓' },
      { action: 'right', label: 'Right', key: '→' },
    ],
  },
  {
    id: 'sketch',
    hidden: true,
    title: 'Sketch-to-Ride',
    shortTitle: 'SKETCH / RIDE',
    number: '02',
    accent: '#dcf68d',
    cabinetColor: '#25312a',
    genre: 'DRAW IT. DROP IN.',
    tagline: 'Draw your own trail, or ride through ten downhill challenges.',
    controls: [
      { action: 'action', label: 'Pedal', key: 'Space / E' },
      { action: 'secondary', label: 'Brake', key: 'Q' },
    ],
  },
  {
    id: 'warehouse',
    title: 'Warehouse Warrior',
    shortTitle: 'WAREHOUSE WARRIOR',
    number: '03',
    accent: '#f7b478',
    cabinetColor: '#3d2c22',
    genre: 'WAREHOUSE SIMULATION',
    tagline: 'Run warehouse shifts, load trucks and buy upgrades.',
    controls: [
      { action: 'action', label: 'Pick up', key: 'Q' },
      { action: 'secondary', label: 'Put down', key: 'E' },
    ],
  },
  {
    id: 'deckbuilder',
    title: 'Encore',
    shortTitle: 'ENCORE',
    number: '04',
    accent: '#dcb2a7',
    cabinetColor: '#2d2228',
    genre: 'CARD ROGUELIKE PROTOTYPE',
    tagline: 'Build a deck across three worlds, defeat their bosses, then face the final boss.',
    controls: [
      { action: 'action', label: 'Play / confirm', key: 'Q / Space' },
      { action: 'secondary', label: 'End turn / skip', key: 'E' },
    ],
  },
];

// Keep unfinished machines available in source without exposing them in either lobby.
export const arcadeProjects = arcadeCatalog.filter((project) => !project.hidden);
