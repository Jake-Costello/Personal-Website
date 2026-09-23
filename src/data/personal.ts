export interface PersonalFact {
  id: string;
  club: string;
  kind: 'driver' | 'wood' | 'iron' | 'wedge' | 'putter';
  topic: string;
  title: string;
  text: string;
  color: string;
}

// Keep personal details here so the game and its readable alternative stay in sync.
export const personalFacts: PersonalFact[] = [
  {
    id: 'animation',
    club: 'Driver',
    kind: 'driver',
    topic: 'Creative beginnings',
    title: 'First, animation.',
    text: 'I first wanted to be an animator. Computer science let me build more while using the drawing and animation skills I learned in school.',
    color: '#f8a186',
  },
  {
    id: 'climbing',
    club: '5 iron',
    kind: 'iron',
    topic: 'Rock climbing',
    title: 'Sometimes, I look up.',
    text: 'I like rock climbing. Away from the keyboard, you might find me figuring out my next move on a climbing wall.',
    color: '#dfff7f',
  },
  {
    id: 'volleyball',
    club: '7 iron',
    kind: 'iron',
    topic: 'Beach volleyball',
    title: 'See you in the sand.',
    text: 'I play beach volleyball. A little sunshine, some sand, and a game with friends is a pretty good way to spend time outside.',
    color: '#f5cd72',
  },
  {
    id: 'drawing',
    club: 'Wedge',
    kind: 'wedge',
    topic: 'Drawing',
    title: 'Still making marks.',
    text: 'I like to draw. That creative side never went away when I moved into software; it still shapes the things I enjoy making.',
    color: '#f399bf',
  },
  {
    id: 'cats',
    club: 'Putter',
    kind: 'putter',
    topic: 'Two cats',
    title: 'A team of three.',
    text: 'I have two cats. There is a little more to life at home than screens and side projects.',
    color: '#acd3ec',
  },
  {
    id: 'jetskis',
    club: '3 wood',
    kind: 'wood',
    topic: 'Jet skis',
    title: 'Back to the water.',
    text: 'Jet skis are part of my life beyond this website, too. They are also the connection behind my work building the technology for Revision Marine.',
    color: '#bdacf0',
  },
];
