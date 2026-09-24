import { bioinformaticsQuestions } from './trivia';
import type { BioinformaticsQuestion } from './trivia';
import type { GolfBallColor } from '../lib/achievements';

export interface PersonalFact {
  id: string;
  club: string;
  kind: 'driver' | 'wood' | 'iron' | 'wedge' | 'putter';
  topic: string;
  title: string;
  text: string;
  color: string;
  trivia?: BioinformaticsQuestion;
}

const whiteBallFacts: PersonalFact[] = [
  {
    id: 'animation',
    club: 'Driver',
    kind: 'driver',
    topic: 'Creative beginnings',
    title: 'Animation.',
    text: 'I originally planned to go to school for animation and minor in computer science. But after a while, I found I enjoyed animation more as a hobby, so I switched full time to CS.',
    color: '#f8a186',
  },
  {
    id: 'climbing',
    club: '5 iron',
    kind: 'iron',
    topic: 'Rock climbing',
    title: 'Climbing',
    text: 'Recently, I have picked up rock climbing as a way to get outside and enjoy the Midwest climbing scene!',
    color: '#dfff7f',
  },
  {
    id: 'volleyball',
    club: '7 iron',
    kind: 'iron',
    topic: 'Beach volleyball',
    title: 'Yes, Cleveland has beaches (kinda)',
    text: 'I play beach volleyball in the warmer months up near Cleveland. Surprisingly, we actually have a few really nice beaches in the area.',
    color: '#f5cd72',
  },
  {
    id: 'drawing',
    club: 'Wedge',
    kind: 'wedge',
    topic: 'Drawing',
    title: 'Still making marks',
    text: 'I still like to draw and animate in my free time. As you can tell from this site, I’m a little rusty in places but still enjoying the process.',
    color: '#f399bf',
  },
  {
    id: 'cats',
    club: 'Putter',
    kind: 'putter',
    topic: 'Two cats',
    title: 'Putter off the Tee???',
    text: 'Bold choice, but I respect it.',
    color: '#acd3ec',
  },
  {
    id: 'Golf',
    club: '3 wood',
    kind: 'wood',
    topic: 'Golf',
    title: 'Back to the course.',
    text: 'Golf is a passion of mine. I’ve been playing since I was a kid and still find time to play a couple of times a week.',
    color: '#bdacf0',
  },
];

type BallStory = Pick<PersonalFact, 'topic' | 'title' | 'text' | 'trivia'>;

// Ball collections share the same clubs, colors, and slots in the illustration.
function withClubs(stories: BallStory[]): PersonalFact[] {
  return stories.map((story, index) => ({ ...whiteBallFacts[index], ...story }));
}

// Edit each ball's stories here. Club tooltips and shots both
// use this collection; the selected ball only changes the stories and ball art.
export const personalFactsByBall: Record<GolfBallColor, PersonalFact[]> = {
  white: whiteBallFacts,
  yellow: withClubs([
    {
      topic: 'Building Revision Marine',
      title: 'More than the website.',
      text: 'As founding engineer at Revision Marine, I own the website, shipping, financial transactions, infrastructure, warehouse systems, and internal apps.',
    },
    {
      topic: 'Merchandise design',
      title: 'From code to clothing.',
      text: 'My work for Revision Marine also includes merchandise design. Drawing and software both have a place in what I make for the company.',
    },
    {
      topic: 'Picking-cart requirements',
      title: 'Before the first cart.',
      text: 'Before I started this project, I actually had maybe two months of experience with PL/SQL and no API experience. So that was a fun scramble, but it turned out to be one of my best projects.',
    },
    {
      topic: 'Reading',
      title: 'Time away',
      text: 'A hobby I have recently picked up again is reading. Mostly engineering and design books by some of my favorite builders, but I count that as time away from the screen.',
    },
    {
      topic: 'Downtown',
      title: 'Cleveland Skyline',
      text: 'If you look closely, the background to my resume game is actually the Cleveland skyline.',
    },
    {
      topic: 'Skiing',
      title: 'Lots of snow in Cleveland',
      text: 'Wintertime in Cleveland can be brutal, so I’ve got to find a way to make it fun.',
    },
  ]),
  striped: withClubs(
    bioinformaticsQuestions.map((question) => ({
      topic: question.topic,
      title: question.prompt,
      text: question.explanation,
      trivia: question,
    })),
  ),
};

// Keep the original facts available to existing readers and tests.
export const personalFacts = personalFactsByBall.white;
