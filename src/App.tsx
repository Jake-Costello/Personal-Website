import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import JetskiJourney from './components/JetskiJourney';
import ContactForm from './components/ContactForm';
import GolfFacts from './components/GolfFacts';
import GolfBallCollection from './components/GolfBallCollection';
import AchievementPopup from './components/AchievementPopup';
import { getContactEndpoint, linkedInUrl } from './lib/contact';
import { revisionMarine } from './data/revision';

const ProteinExplorer = lazy(() => import('./components/ProteinExplorer'));
const contactEndpoint = getContactEndpoint(import.meta.env.VITE_CONTACT_FORM_ENDPOINT);

function Arrow({ diagonal = false, className = '' }: { diagonal?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h16m-6-6 6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
    </svg>
  );
}

function Asterisk({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="14">
        <path d="M50 3v94M3 50h94M17 17l66 66M17 83l66-66" />
      </g>
    </svg>
  );
}

type Project = {
  id: string;
  number: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  status: string;
  problem: string;
  contribution: string;
  decisions: string;
  website?: { href: string; label: string; note: string };
};

const projects: Project[] = [
  {
    id: 'revision',
    number: '01',
    title: 'Revision Marine',
    category: 'FOUNDING ENGINEER / COMMERCE',
    summary:
      'Building the software behind a jetski parts company, from the storefront to warehouse operations and internal tools.',
    tags: ['Next.js', 'TypeScript', 'Medusa'],
    status: 'Founding engineer · Storefront in private preview',
    problem:
      'A new jetski parts company needs a way to sell products and manage the work behind each order. The storefront, warehouse, and daily operations all need software that fits how the business works.',
    contribution:
      'As founding engineer, I built the technology stack and own the website, infrastructure, warehousing system, and internal apps. I translate operational needs into software and also contribute merchandise design.',
    decisions:
      'Next.js and TypeScript power the storefront, with Medusa handling commerce data such as products and variants. My work connects the customer experience with the systems behind it. The storefront remains in a password-protected preview while development continues.',
    website: {
      href: revisionMarine.url,
      label: 'Visit Revision Marine',
      note: revisionMarine.websiteNote,
    },
  },
  {
    id: 'protein',
    number: '02',
    title: 'Small things. Big connections.',
    category: 'DATA / VISUALIZATION / EXPLORATION',
    summary:
      'Turning live public API data into an explorable protein network, measured species comparisons, and grounded AI explanations.',
    tags: ['Python / pandas', 'NetworkX', 'APIs / AI'],
    status: 'Live data explorer',
    problem:
      'Protein associations and species comparisons live in separate data sources. The goal is to bring them into one understandable workflow, with evidence behind each result.',
    contribution:
      'I built the interactive frontend and Python service. It retrieves STRING associations, cleans them with pandas, and computes communities with NetworkX. Ensembl supplies human-to-animal protein comparisons; the server calculates similarity rankings before AI explains the evidence.',
    decisions:
      'Source labels, retrieval times, and cache status remain visible. Validation, bounded queries, caching, and limits on paid AI requests keep the public workflow practical. The graph shows associations, not molecular structure, and AI explains measured results rather than inventing rankings.',
  },
];

function ProjectArt({ kind }: { kind: string }) {
  if (kind === 'revision')
    return (
      <div className="project-art revision-art" aria-hidden="true">
        <span className="art-corner">RM—001 / FOUNDING ENGINEER</span>
        <span className="revision-wordmark">
          REVISION
          <br />
          <span>MARINE</span>
          <i>↗</i>
        </span>
        <svg className="revision-water" viewBox="0 0 500 80">
          <path
            d="M-20 25Q30 0 80 25T180 25T280 25T380 25T480 25T580 25M-20 48Q30 23 80 48T180 48T280 48T380 48T480 48T580 48M-20 71Q30 46 80 71T180 71T280 71T380 71T480 71T580 71"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span className="art-bottom">BUILT FOR THE WATER.</span>
      </div>
    );
  const nodes = [
    [90, 90],
    [137, 64],
    [155, 115],
    [70, 150],
    [125, 170],
    [235, 82],
    [288, 55],
    [317, 106],
    [267, 140],
    [345, 164],
    [204, 176],
    [234, 225],
    [177, 238],
    [117, 241],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [2, 4],
    [3, 4],
    [2, 5],
    [5, 6],
    [5, 8],
    [6, 7],
    [7, 8],
    [7, 9],
    [8, 9],
    [8, 10],
    [10, 11],
    [10, 12],
    [11, 12],
    [12, 13],
    [4, 13],
    [4, 10],
  ];
  return (
    <div className="project-art network-art" aria-hidden="true">
      <span className="art-corner">AN EXERCISE IN CONNECTION</span>
      <svg viewBox="0 0 410 280" className="network-illustration">
        <g stroke="#746398" strokeWidth="1.5">
          {edges.map(([a, b], i) => (
            <path key={i} d={`M${nodes[a][0]} ${nodes[a][1]} ${nodes[b][0]} ${nodes[b][1]}`} />
          ))}
        </g>
        {nodes.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={i === 2 || i === 8 ? 14 : 9}
              fill={i < 5 ? '#dfff7f' : i < 10 ? '#f399bf' : '#f5f3ed'}
              stroke="#17251e"
              strokeWidth="1.5"
            />
            {(i === 2 || i === 8) && <circle cx={x} cy={y} r="4" fill="#17251e" />}
          </g>
        ))}
      </svg>
      <span className="art-bottom">A LITTLE CURIOSITY GOES A LONG WAY.</span>
    </div>
  );
}

function ProjectDialog({ project, close }: { project: Project | null; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (project && ref.current && !ref.current.open) ref.current.showModal();
    if (!project) ref.current?.close();
  }, [project]);
  return (
    <dialog
      ref={ref}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {project && (
        <div className="dialog-content">
          <div className="dialog-top">
            <span className="eyebrow">
              PROJECT {project.number} / {project.category}
            </span>
            <button className="close-button" onClick={close} aria-label="Close project details">
              ×
            </button>
          </div>
          <h2 id="project-dialog-title">{project.title}</h2>
          <p className="project-status">{project.status}</p>
          <h3>The starting point</h3>
          <p>{project.problem}</p>
          <h3>My part in it</h3>
          <p>{project.contribution}</p>
          <h3>How it’s taking shape</h3>
          <p>{project.decisions}</p>
          <div className="tag-list">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {project.id === 'protein' && (
            <a className="button button-dark dialog-cta" href="#lab" onClick={close}>
              Explore the lab <Arrow />
            </a>
          )}
          {project.website && (
            <div className="project-website">
              <a
                className="button button-dark dialog-cta"
                href={project.website.href}
                target="_blank"
                rel="noreferrer"
              >
                {project.website.label} <Arrow diagonal />
              </a>
              <p>{project.website.note}</p>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -55% 0px' },
    );
    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a href="#" className="brand" aria-label="Jake Costello, home">
          <span className="brand-mark">
            jc<span>↗</span>
          </span>
          <span>
            JAKE COSTELLO<span className="brand-caption">ENGINEER & BUILDER</span>
          </span>
        </a>
        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? 'Close −' : 'Menu +'}
        </button>
        <nav
          id="main-nav"
          className={menuOpen ? 'main-nav is-open' : 'main-nav'}
          aria-label="Main navigation"
        >
          {[
            ['experience', 'The journey'],
            ['work', 'Selected work'],
            ['lab', 'The lab'],
            ['about', 'Off the clock'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeSection === id ? 'location' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <a className="nav-contact" href="#contact" onClick={() => setMenuOpen(false)}>
            Say hello <Arrow diagonal />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-topline">
            <p className="eyebrow">
              <span className="status-dot" /> FULL-STACK ENGINEER. REAL-WORLD PROBLEM SOLVER.
            </p>
            <span className="eyebrow hero-edition">PERSONAL FIELD NOTES / VOL. 01</span>
          </div>
          <div className="hero-title-row">
            <h1 id="hero-title">
              JAKE
              <br />
              <span>
                COSTELLO<span className="name-period">.</span>
              </span>
            </h1>
            <div className="hero-sticker">
              <Asterisk />
              <span>
                A WORK
                <br />
                IN PROGRESS.
                <br />
                <strong>JUST LIKE ME.</strong>
              </span>
            </div>
          </div>
          <div className="hero-bottom">
            <div className="hero-intro">
              <h2>
                Useful code.
                <br />
                Curious mind.
              </h2>
              <p>
                I build software that connects systems and makes real work easier. Here’s what I’ve
                been up to, what I’m figuring out, and a little of the person behind it.
              </p>
            </div>
            <div className="hero-actions">
              <a className="button button-dark" href="#experience">
                Take the scenic route <Arrow />
              </a>
              <a className="text-link" href="#work">
                Or, get straight to the work <Arrow diagonal />
              </a>
            </div>
          </div>
          <div className="hero-footnote">
            <span>SCROLL TO EXPLORE</span>
            <span className="hero-coordinate">CODE → CONNECTIONS → CURIOSITY</span>
            <span aria-hidden="true">↓</span>
          </div>
        </section>

        <section
          id="experience"
          className="experience-section section-shell"
          aria-labelledby="experience-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / THE JOURNEY</p>
              <h2 id="experience-title">
                A résumé with
                <br />a little more <em>motion.</em>
              </h2>
            </div>
            <p className="section-intro">
              A few stops that made me who I am.
              <br />
              Hop on. There’s a reason for the jetski.
            </p>
          </div>
          <JetskiJourney />
        </section>

        <div className="skill-strip" aria-label="Areas of experience">
          <span>FULL-STACK DEVELOPMENT</span>
          <Asterisk />
          <span>API INTEGRATIONS</span>
          <Asterisk />
          <span>PYTHON & AUTOMATION</span>
          <Asterisk />
          <span>REAL-WORLD SYSTEMS</span>
          <Asterisk />
        </div>

        <section id="work" className="work-section section-shell" aria-labelledby="work-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / SELECTED WORK</p>
              <h2 id="work-title">
                Ideas, made <em>real.</em>
              </h2>
            </div>
            <p className="section-intro">
              A business taking shape. <br />A live experiment in connecting data.
            </p>
          </div>
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" id={`project-${project.id}`} key={project.id}>
                <button
                  className="project-art-button"
                  onClick={() => setSelectedProject(project)}
                  aria-label={`Read about ${project.title}`}
                >
                  <ProjectArt kind={project.id} />
                  <span className="project-open-icon">
                    <Arrow diagonal />
                  </span>
                </button>
                <div className="project-meta">
                  <span>{project.category}</span>
                  <span>{project.number}</span>
                </div>
                <h3>
                  <button onClick={() => setSelectedProject(project)}>{project.title}</button>
                </h3>
                <p>{project.summary}</p>
                <div className="tag-list">
                  {project.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {project.website && (
                  <div className="project-website">
                    <a
                      className="text-link"
                      href={project.website.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {project.website.label} <Arrow diagonal />
                    </a>
                    <p>{project.website.note}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="lab" className="lab-section section-shell" aria-labelledby="lab-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / THE LAB</p>
              <h2 id="lab-title">
                Follow the <em>connections.</em>
              </h2>
            </div>
            <p className="section-intro">
              A small window into a complex world.
              <br />
              Explore a protein network, one connection at a time.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="lab-loading" role="status">
                Opening the explorer…
              </div>
            }
          >
            <ProteinExplorer />
          </Suspense>
        </section>

        <section id="about" className="about-section section-shell" aria-labelledby="about-title">
          <div className="about-heading">
            <p className="eyebrow">04 / OFF THE CLOCK</p>
            <h2 id="about-title">
              The person
              <br />
              behind the
              <br />
              <em>projects.</em>
            </h2>
            <div className="about-copy">
              <p>
                I’m Jake—a computer science graduate from Ohio University, a full-stack developer,
                and the founding engineer at Revision Marine. I like making things that bring
                engineering and creativity together. There’s a little more to me away from the
                keyboard, too.
              </p>
            </div>
          </div>
          <GolfBallCollection />
          <GolfFacts />
        </section>

        <section
          id="contact"
          className="contact-section section-shell"
          aria-labelledby="contact-title"
        >
          <div className="contact-top">
            <p className="eyebrow">
              <span className="status-dot" /> OPEN TO WHAT’S NEXT
            </p>
            <p className="eyebrow">GOOD THINGS START WITH A CONVERSATION.</p>
          </div>
          <a
            className="contact-heading"
            href={contactEndpoint ? '#contact-form' : linkedInUrl}
            target={contactEndpoint ? undefined : '_blank'}
            rel={contactEndpoint ? undefined : 'noreferrer'}
          >
            <h2 id="contact-title">
              LET’S BUILD
              <br />
              <span>SOMETHING.</span>
            </h2>
            <Arrow diagonal />
          </a>
          {contactEndpoint ? (
            <ContactForm endpoint={contactEndpoint} />
          ) : (
            <p className="contact-note">
              Have a role, a project, or a good idea? Connect with me on LinkedIn to start a
              conversation.
            </p>
          )}
          <div className="contact-bottom">
            <a className="contact-link" href={linkedInUrl} target="_blank" rel="noreferrer">
              Let’s connect on LinkedIn <Arrow diagonal />
            </a>
            <div className="social-links">
              <a href="https://github.com/Jake-Costello" target="_blank" rel="noreferrer">
                GitHub <Arrow diagonal />
              </a>
              <a href={linkedInUrl} target="_blank" rel="noreferrer">
                LinkedIn <Arrow diagonal />
              </a>
              <a href="#experience">
                Experience <Arrow />
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} JAKE COSTELLO</span>
        <span>BUILT WITH INTENTION. AND A LITTLE PLAY.</span>
        <a href="#">BACK TO TOP ↑</a>
      </footer>
      <ProjectDialog project={selectedProject} close={() => setSelectedProject(null)} />
      <AchievementPopup />
    </>
  );
}

export default App;
