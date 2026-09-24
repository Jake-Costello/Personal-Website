import type { GolfBallColor } from '../lib/achievements';

export interface PersonalFact {
  id: string;
  club: string;
  kind: 'driver' | 'wood' | 'iron' | 'wedge' | 'putter';
  topic: string;
  title: string;
  text: string;
  color: string;
}

const whiteBallFacts: PersonalFact[] = [
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
    title: 'Are You Crazy??? Putter off the Tee???',
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

type BallStory = Pick<PersonalFact, 'topic' | 'title' | 'text'>;

// Ball collections share the same clubs, colors, and slots in the illustration.
function withClubs(stories: BallStory[]): PersonalFact[] {
  return stories.map((story, index) => ({ ...whiteBallFacts[index], ...story }));
}

// Edit each ball's stories here. Club tooltips, shots, and the readable list all
// use this collection; the selected ball only changes the stories and ball art.
export const personalFactsByBall: Record<GolfBallColor, PersonalFact[]> = {
  white: whiteBallFacts,
  yellow: withClubs([
    {
      topic: 'Building Revision Marine',
      title: 'More than the website.',
      text: 'As founding engineer at Revision Marine, I own the website, infrastructure, warehouse systems, and internal apps. My brother and his coworker own the business; I build its technology.',
    },
    {
      topic: 'Merchandise design',
      title: 'From code to clothing.',
      text: 'My work for Revision Marine also includes merchandise design. Drawing and software both have a place in what I make for the company.',
    },
    {
      topic: 'Picking-cart requirements',
      title: 'Before the first cart.',
      text: 'I owned the requirements for a picking-cart project at Sherwin-Williams and worked with the manufacturer in Wisconsin to bring those requirements into the build.',
    },
    {
      topic: 'The Statesville pilot',
      title: 'Built. Piloted. Taught.',
      text: 'The picking-cart pilot took place in Statesville. I carried the project through implementation, training, and documentation so the people using it could put it to work.',
    },
    {
      topic: 'Beyond one warehouse',
      title: 'The next three sites.',
      text: 'The picking-cart rollout is now underway at three or more additional sites, with implementation, training, and documentation part of the work.',
    },
    {
      topic: 'Waco automation',
      title: 'A much bigger system.',
      text: 'The Waco project added 200,000 square feet, with robotic storage for 30,000 pallets and 20,000 totes. I own the order-picking API and exception handling.',
    },
  ]),
  striped: withClubs([
    {
      topic: 'The first Java games',
      title: 'Choose a path. Find a field.',
      text: 'In AP Java, I built choose-your-own-path games. Those projects helped spark my interest in computer science.',
    },
    {
      topic: 'Art meets computer science',
      title: 'A different kind of canvas.',
      text: 'I first pictured a career in animation, then moved toward computer science. The art skills I learned in school came with me, and I still draw.',
    },
    {
      topic: 'From requirements to hardware',
      title: 'Following the whole project.',
      text: 'The picking-cart project took me from defining requirements to working with a manufacturer in Wisconsin, then to a pilot in Statesville. Software was only part of the work.',
    },
    {
      topic: 'Months on site',
      title: 'Where the system gets used.',
      text: 'I spent months on site in Waco during the warehouse automation project. My work there includes the order-picking API and the exceptions that need handling around it.',
    },
    {
      topic: 'Outside the screen',
      title: 'A wall. A court. Some water.',
      text: 'Away from software, I like rock climbing, beach volleyball, and jet skis. Those are a few of the other places you might find me.',
    },
    {
      topic: 'People behind the project',
      title: 'A family connection.',
      text: 'Revision Marine connects my interest in jet skis with engineering. My brother and his coworker own the company, and I joined as its founding engineer.',
    },
  ]),
};

// Keep the original facts available to existing readers and tests.
export const personalFacts = personalFactsByBall.white;
