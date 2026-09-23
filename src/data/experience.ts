export type ExperienceChapter = {
  id: string;
  year: string;
  date: string;
  place: string;
  title: string;
  story: string;
  skills: string[];
  link?: { href: string; label: string };
};

export const experience: ExperienceChapter[] = [
  {
    id: 'first-tools',
    year: '2021',
    date: 'August 2021 — January 2022',
    place: 'Component Repair Technologies',
    title: 'Good code starts with a real problem.',
    story:
      'As a software engineering intern, I built a Python tool that connected machine utilization with employee schedules. It helped the team spot a staffing gap behind three underused machines.',
    skills: ['Python', 'Data analysis', 'Enterprise IT'],
  },
  {
    id: 'payphone',
    year: '2023',
    date: 'August 2023 — May 2024',
    place: 'The Union · Athens, Ohio',
    title: 'An old payphone. Some new possibilities.',
    story:
      'I led a senior project that gave a payphone a second life: concert information, Spotify queue additions, and recorded messages. Real hardware, Python, and a whole lot of integration.',
    skills: ['Python', 'Asterisk', 'SIP / VoIP', 'pytest'],
    link: { href: '#project-payphone', label: 'Pick up the story' },
  },
  {
    id: 'graduation',
    year: '2024',
    date: 'May 2024',
    place: 'Ohio University · Athens, Ohio',
    title: 'Curiosity, with a computer science degree.',
    story:
      'I graduated with a B.S. in Computer Science. From physical systems to graph communities, I learned to break down unfamiliar problems, build with a team, and explain how the pieces fit.',
    skills: ['Computer science', 'Problem solving', 'Collaboration'],
  },
  {
    id: 'sherwin',
    year: '2024 →',
    date: 'July 2024 — present',
    place: 'Sherwin-Williams · Full Stack Developer',
    title: 'Making complex systems work together.',
    story:
      'I build warehouse integrations—from picking-cart workflows supporting 1,000+ order lines a day at full production to robot communication and exception handling. Documentation and hands-on training help teams put the software to work.',
    skills: ['REST APIs', 'PL/SQL', 'Robotics integration', 'Workflow automation'],
  },
  {
    id: 'revision',
    year: 'NOW',
    date: 'The next chapter',
    place: 'Revision Marine · Cofounder',
    title: 'And that explains the jetski.',
    story:
      'I’m cofounding Revision Marine, a jetski parts company, and building its commerce website. A chance to bring engineering, a business idea, and something I love onto the same shoreline.',
    skills: ['Next.js', 'TypeScript', 'Medusa', 'Entrepreneurship'],
    link: { href: '#project-revision', label: 'Meet Revision Marine' },
  },
];
