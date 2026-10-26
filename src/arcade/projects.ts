export type ArcadeProject = {
  id: 'shoreline' | 'sketch' | 'warehouse';
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
    genre: 'A LIFE ON THE LAKE',
    tagline: 'A stand-up jetski. A Cleveland shoreline. My story.',
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
    genre: 'ONE BOX AT A TIME',
    tagline: 'Beat the clock. Upgrade your warehouse. See how many days you last.',
    controls: [
      { action: 'action', label: 'Pick up', key: 'Q' },
      { action: 'secondary', label: 'Put down', key: 'E' },
    ],
  },
];

// Keep unfinished machines available in source without exposing them in either lobby.
export const arcadeProjects = arcadeCatalog.filter((project) => !project.hidden);
