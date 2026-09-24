import { revisionMarine } from './revision';

export type ExperienceChapter = {
  id: string;
  lifeStage: 'high-school' | 'college' | 'career';
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
    id: 'first-code',
    lifeStage: 'high-school',
    year: 'Before 2019',
    date: 'High school · AP Computer Science',
    place: 'Java and a first spark of curiosity',
    title: 'Choose a path. Build an adventure.',
    story:
      'AP Computer Science introduced me to Java. I still remember making choose-your-own-adventure games and realizing I could turn an idea into something someone else could explore. That feeling made me want to study computer science.',
    skills: ['Java', 'Programming fundamentals', 'Interactive storytelling'],
  },
  {
    id: 'high-school-graduation',
    lifeStage: 'high-school',
    year: '2019',
    date: 'High school graduation · 2019',
    place: 'AP Capstone Diploma',
    title: 'A diploma, and a direction.',
    story:
      'I graduated from high school with an AP Capstone Diploma and a growing interest in what I could build with code. I chose computer science at the University of Cincinnati as my next step.',
    skills: ['Research', 'Communication', 'Computer science'],
  },
  {
    id: 'cincinnati',
    lifeStage: 'college',
    year: '2019–20',
    date: 'Starting college · 2019–2020',
    place: 'University of Cincinnati → home',
    title: 'An unexpected change of course.',
    story:
      'I started studying computer science at the University of Cincinnati. After my first semester, COVID changed the college experience and brought me home. It also made me look for practical ways to learn by working on real problems.',
    skills: ['Computer science', 'Adaptability', 'Learning by building'],
  },
  {
    id: 'ohio-university',
    lifeStage: 'college',
    year: '2021',
    date: 'A new college chapter · 2021',
    place: 'Ohio University · Athens, Ohio',
    title: 'Back to campus. Still building.',
    story:
      'In 2021, I started at Ohio University to continue my computer science degree. Classes, team projects, and hands-on work became different ways of asking the same question: how do we turn an unfamiliar problem into software people can use?',
    skills: ['Software development', 'Team projects', 'Problem solving'],
  },
  {
    id: 'first-tools',
    lifeStage: 'college',
    year: '2021–22',
    date: 'August 2021 — January 2022',
    place: 'Component Repair Technologies',
    title: 'Good code starts with a real problem.',
    story:
      'At Component Repair Technologies, I built a Python tool connecting machine utilization with employee schedules. It revealed three multimillion-dollar machines running less than 20% of the week. The findings exposed a staffing gap and helped the team hire a qualified machinist. I also learned enterprise IT and backend development alongside senior engineers.',
    skills: ['Python', 'Data analysis', 'Azure Active Directory', 'SQL'],
  },
  {
    id: 'payphone',
    lifeStage: 'college',
    year: '2023–24',
    date: 'August 2023 — May 2024',
    place: 'The Union · Athens, Ohio',
    title: 'An old payphone. Some new possibilities.',
    story:
      'For my senior project, I led a team giving a payphone at The Union a second life. We connected concert information, Spotify queue additions, and recorded band messages using Python and Asterisk. Weekly code reviews, Agile iterations, and pytest helped us bring hardware, networking, and software together.',
    skills: ['Python', 'Asterisk / SIP', 'pytest', 'Team leadership'],
  },
  {
    id: 'graduation',
    lifeStage: 'college',
    year: '2024',
    date: 'May 2024',
    place: 'Ohio University · Athens, Ohio',
    title: 'Curiosity, with a computer science degree.',
    story:
      'I graduated from Ohio University with a B.S. in Computer Science. From our payphone to community-detection and visualization projects, I had learned to work through unfamiliar systems, build with a team, and explain how the pieces fit. Next came a move back to Cleveland.',
    skills: ['Computer science', 'Problem solving', 'Collaboration'],
  },
  {
    id: 'sherwin',
    lifeStage: 'career',
    year: '2024',
    date: 'July 2024 — present',
    place: 'Sherwin-Williams · Cleveland, Ohio',
    title: 'Modern tools for real operations.',
    story:
      'I joined Sherwin-Williams as a full-stack developer. My early work moved legacy code into modern web applications, learning the warehouse workflows behind the screens. As the team became smaller, I took on broader responsibility—and ownership of a picking-cart project from requirements through rollout.',
    skills: ['Oracle APEX', 'PL/SQL', 'JavaScript', 'Legacy modernization'],
  },
  {
    id: 'picking-carts',
    lifeStage: 'career',
    year: '2024–now',
    date: 'Picking carts · discovery and implementation',
    place: 'Sherwin-Williams · Cleveland → Wisconsin',
    title: 'Own the problem. Build the whole solution.',
    story:
      'I took responsibility for the picking-cart software from end to end. I traveled to Wisconsin to work with the cart manufacturer on specifications and project needs, then wrote the integration code: order creation, prioritization, pick tracking, replenishment, and error handling. The work connected warehouse requirements with hardware and backend workflows.',
    skills: ['Requirements', 'Vendor collaboration', 'PL/SQL', 'REST APIs'],
  },
  {
    id: 'cart-rollout',
    lifeStage: 'career',
    year: '2024–now',
    date: 'Picking carts · pilot, training, and rollout',
    place: 'Sherwin-Williams · Statesville, North Carolina',
    title: 'A rollout is more than a deployment.',
    story:
      'At the Statesville pilot site, I worked with the team on requirements and adjusted the software around their feedback. I returned to implement the system, train users, and document the setup for future carts. At full production it supports 1,000+ order lines a day, with rollout now underway to at least three additional sites.',
    skills: ['On-site delivery', 'User feedback', 'Training', 'Documentation'],
  },
  {
    id: 'waco',
    lifeStage: 'career',
    year: 'Now',
    date: 'Current project · warehouse automation',
    place: 'Sherwin-Williams · Waco, Texas',
    title: 'From a customer order to a robot pick.',
    story:
      'A 200,000-square-foot addition in Waco houses an automated system with capacity for 30,000 full pallets and 20,000 small-product totes. I own its picking code: deciding which orders to process, how to pick them, and how to communicate with the robots through APIs—including the exceptions between request and completion.',
    skills: ['Order orchestration', 'REST APIs', 'Robotics integration', 'Exception handling'],
  },
  {
    id: 'waco-delivery',
    lifeStage: 'career',
    year: 'Now',
    date: 'Current project · working alongside operations',
    place: 'Sherwin-Williams · Waco, Texas',
    title: 'Build with the people who use it.',
    story:
      'This work has meant months on site with managers and operations teams in Waco. Understanding how the warehouse actually runs shapes the code I write: batching orders, handling small-product, large-product, and pallet workflows, tracking completion, and working through exceptions. The conversations on the floor are part of the engineering.',
    skills: ['Stakeholder collaboration', 'Workflow discovery', 'Troubleshooting', 'Delivery'],
  },
  {
    id: 'revision',
    lifeStage: 'career',
    year: 'Now',
    date: 'Building alongside my career',
    place: `Revision Marine · ${revisionMarine.role}`,
    title: 'And that explains the jetski.',
    story:
      'That shop on the shoreline is Revision Marine. As founding engineer, I built the technology stack behind our jetski parts company: the website, infrastructure, warehouse software, and internal apps. I also bring my creative side to merchandise design. The jetski makes a little more sense now. Keep riding—there’s more ahead.',
    skills: ['Next.js', 'TypeScript', 'Medusa', 'Infrastructure', 'Internal tools'],
    link: { href: revisionMarine.url, label: 'Visit Revision Marine · private preview' },
  },
  {
    id: 'future',
    lifeStage: 'career',
    year: 'Next',
    date: 'The story so far',
    place: 'Looking ahead',
    title: 'Finish line. Next chapter.',
    story:
      'That’s the journey so far. I want to keep working alongside people, turn real operational needs into useful software, and explore where practical AI can help. There are more systems to connect, more skills to learn, and more ideas to build. I’m looking forward to what comes next.',
    skills: ['Practical AI', 'Systems integration', 'Continued learning'],
    link: { href: '#contact', label: 'Let’s build what’s next' },
  },
];
