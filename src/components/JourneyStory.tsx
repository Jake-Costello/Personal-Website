import { useEffect, useState } from 'react';
import { experience } from '../data/experience';
import type { ExperienceChapter } from '../data/experience';

function StoryContent({
  chapter,
  visible,
  reduced,
  onFollowLink,
}: {
  chapter: ExperienceChapter;
  visible: boolean;
  reduced: boolean;
  onFollowLink: () => void;
}) {
  const [characters, setCharacters] = useState(0);
  const complete = reduced || characters >= chapter.story.length;
  useEffect(() => {
    if (!visible || reduced) return;
    const timer = window.setInterval(() => {
      setCharacters((current) => {
        const next = Math.min(chapter.story.length, current + 4);
        if (next === chapter.story.length) window.clearInterval(timer);
        return next;
      });
    }, 40);
    return () => window.clearInterval(timer);
  }, [chapter.story.length, reduced, visible]);

  return (
    <article className={`journey-story${complete ? ' is-revealed' : ''}`}>
      <p className="journey-place">
        <span>{chapter.date}</span>
        <span>{chapter.place}</span>
      </p>
      <h3>{chapter.title}</h3>
      <p className="journey-story-body">
        {/* Read the full paragraph once, rather than announcing every typed letter. */}
        <span className="journey-sr-only">{chapter.story}</span>
        <span aria-hidden="true">
          <span className="journey-typed">
            {chapter.story.slice(0, complete ? chapter.story.length : characters)}
          </span>
          {!complete && <span className="journey-untyped">{chapter.story.slice(characters)}</span>}
        </span>
      </p>
      <div className="journey-toolkit">
        <span className="journey-toolkit-label">IN THE TOOLKIT</span>
        <button
          type="button"
          className="journey-reveal-button"
          style={{ visibility: complete ? 'hidden' : undefined }}
          onClick={() => setCharacters(chapter.story.length)}
          tabIndex={complete ? -1 : undefined}
        >
          Show full story ↗
        </button>
      </div>
      <div className="journey-story-bottom">
        <ul className="journey-skills" aria-label="Skills">
          {chapter.skills.map((skill, index) => (
            <li key={skill} style={{ animationDelay: `${650 + index * 160}ms` }}>
              {skill}
            </li>
          ))}
        </ul>
        {chapter.link && (
          <a className="journey-story-link" href={chapter.link.href} onClick={onFollowLink}>
            {chapter.link.label} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}

export default function JourneyStory({
  index,
  visible,
  reduced,
  onFollowLink,
}: {
  index: number;
  visible: boolean;
  reduced: boolean;
  onFollowLink: () => void;
}) {
  const [displayed, setDisplayed] = useState(index);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (reduced || !visible) {
      setDisplayed(index);
      setLeaving(false);
      return;
    }
    if (index === displayed) {
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setDisplayed(index);
      setLeaving(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [index, displayed, reduced, visible]);
  const chapter = experience[displayed];

  return (
    <>
      <div className={`journey-story-transition${leaving ? ' is-leaving' : ''}`}>
        <StoryContent
          key={chapter.id}
          chapter={chapter}
          visible={visible}
          reduced={reduced}
          onFollowLink={onFollowLink}
        />
      </div>
      <p className="journey-sr-only" role="status" aria-atomic="true">
        {chapter.year}. {chapter.place}. {chapter.title}
      </p>
    </>
  );
}
