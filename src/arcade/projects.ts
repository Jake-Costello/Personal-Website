export type ArcadeProject = {
  id: 'sketch' | 'warehouse' | 'protein' | 'shoreline';
  title: string;
  shortTitle: string;
  number: string;
  status: 'building' | 'live';
  accent: string;
  genre: string;
  tagline: string;
  description: string;
  steps: string[];
  skills: string[];
  href?: string;
};

const home = import.meta.env.BASE_URL;

export const arcadeProjects: ArcadeProject[] = [
  {
    id: 'sketch',
    title: 'Sketch-to-Ride',
    shortTitle: 'SKETCH / RIDE',
    number: '01',
    status: 'building',
    accent: '#dfff7f',
    genre: 'DRAW → BUILD → RIDE',
    tagline: 'Your worst drawing. Your best run.',
    description:
      'Draw a downhill course, turn it into a playable world, and ride from left to right. A little old-school browser-game energy, with AI helping bring your sketch to life.',
    steps: [
      'Sketch a slope, a finish line, and a few obstacles.',
      'Review and adjust the course AI reads from your drawing.',
      'Drop in, chase a clean run, and try another line.',
    ],
    skills: ['Multimodal AI', 'Canvas', 'Physics', 'Structured data'],
  },
  {
    id: 'warehouse',
    title: 'Warehouse Shift',
    shortTitle: 'WAREHOUSE SHIFT',
    number: '02',
    status: 'building',
    accent: '#ffb477',
    genre: 'UNLOAD → PICK → UPGRADE',
    tagline: 'Start with a box. Build a better system.',
    description:
      'A top-down warehouse, an empty wallet, and a shift to finish. Unload trucks on the left, put stock away in the middle, and pick orders for the outbound trucks on the right.',
    steps: [
      'Start at $0 and earn money by moving orders yourself.',
      'Reinvest in upgrades inspired by my real engineering work, starting with picking carts.',
      'Automate more of the operation and watch the warehouse become more efficient.',
    ],
    skills: ['Workflow design', 'APIs', 'Automation', 'Simulation'],
  },
  {
    id: 'protein',
    title: 'Protein Playground',
    shortTitle: 'PROTEIN PLAYGROUND',
    number: '03',
    status: 'live',
    accent: '#c3afff',
    genre: 'CONNECT → COMPARE → DISCOVER',
    tagline: 'Small things. Unexpected connections.',
    description:
      'Explore live protein networks, compare human proteins with other species, and ask AI to explain the evidence. This cabinet opens the working lab on the homepage.',
    steps: [
      'Pick two proteins and retrieve their network.',
      'Rotate the graph and inspect experimental structures.',
      'Compare species and explore a grounded AI explanation.',
    ],
    skills: ['Python', 'Live APIs', 'NetworkX', 'Grounded AI'],
    href: `${home}#lab`,
  },
  {
    id: 'shoreline',
    title: 'Shoreline Run',
    shortTitle: 'SHORELINE RUN',
    number: '04',
    status: 'live',
    accent: '#7ce5f3',
    genre: 'RIDE → JUMP → EXPLORE',
    tagline: 'The scenic route through my story.',
    description:
      'Ride a stand-up jetski along Cleveland’s shoreline, explore my experience, then take on the time trial. This cabinet opens the playable tour on the homepage.',
    steps: [
      'Use the arrow keys or touch controls to ride.',
      'Pump, jump, and discover the chapters along the shore.',
      'Reach the finish to unlock the time trial.',
    ],
    skills: ['TypeScript', 'SVG', 'Game physics', 'Touch input'],
    href: `${home}#experience`,
  },
];
