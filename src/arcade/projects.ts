export type ArcadeProject = {
  id: 'shoreline' | 'sketch' | 'warehouse';
  title: string;
  shortTitle: string;
  number: string;
  accent: string;
  cabinetColor: string;
  genre: string;
  tagline: string;
  controls: { action: string; label: string; key: string }[];
};

export const arcadeProjects: ArcadeProject[] = [
  {
    id: 'shoreline',
    title: 'Shoreline Run',
    shortTitle: 'SHORELINE',
    number: '01',
    accent: '#80dff2',
    cabinetColor: '#132732',
    genre: 'A LIFE ON THE LAKE',
    tagline: 'A stand-up jetski. A Cleveland shoreline. My story.',
    controls: [
      { action: 'down', label: 'Pump', key: '↓' },
      { action: 'up', label: 'Jump', key: '↑' },
    ],
  },
  {
    id: 'sketch',
    title: 'Sketch-to-Ride',
    shortTitle: 'SKETCH / RIDE',
    number: '02',
    accent: '#dcf68d',
    cabinetColor: '#25312a',
    genre: 'DRAW IT. DROP IN.',
    tagline: 'Draw a downhill trail, then take it for a ride.',
    controls: [
      { action: 'action', label: 'Jump / ride', key: 'Space' },
      { action: 'secondary', label: 'Draw', key: 'Q' },
    ],
  },
  {
    id: 'warehouse',
    title: 'Warehouse Shift',
    shortTitle: 'WAREHOUSE',
    number: '03',
    accent: '#f7b478',
    cabinetColor: '#3d2c22',
    genre: 'ONE BOX AT A TIME',
    tagline: 'Work the floor. Earn your upgrades. Build a better flow.',
    controls: [
      { action: 'action', label: 'Interact', key: 'E' },
      { action: 'secondary', label: 'Upgrades', key: 'Q' },
    ],
  },
];
