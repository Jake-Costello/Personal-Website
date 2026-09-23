import { useEffect, useState } from 'react';
import { experience } from '../data/experience';
import type { ExperienceChapter } from '../data/experience';
import { INTRO_SECONDS, WORDS_PER_SECOND } from '../game/route';
import type { JourneyFrame } from '../game/route';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function StoryContent({
  chapter,
  frame,
  visible,
  reduced,
  onFollowLink,
}: {
  chapter: ExperienceChapter;
  frame: JourneyFrame;
  visible: boolean;
  reduced: boolean;
  onFollowLink: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const words = chapter.story.match(/\S+\s*/g) ?? [];
  const readingSeconds = words.length / WORDS_PER_SECOND;
  const immediate = reduced || showAll;
  const revealed = immediate
    ? words.length
    : Math.floor(Math.max(0, seconds - INTRO_SECONDS) * WORDS_PER_SECOND);
  const complete = revealed >= words.length;
  const titleOpacity = reduced ? 1 : frame.titleOpacity * (showAll ? 1 : clamp(seconds / 0.6));
  const yearOpacity = reduced
    ? 1
    : frame.yearOpacity * (showAll ? 1 : clamp((seconds - 0.65) / 0.65));
  const detailsOpacity = reduced
    ? 1
    : frame.detailsOpacity * (showAll ? 1 : clamp((seconds - 1.3) / 0.5));

  useEffect(() => {
    if (!visible || immediate) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.15, (now - previous) / 1000);
      previous = now;
      if (document.hidden) return;
      setSeconds((current) => {
        const next = Math.min(INTRO_SECONDS + readingSeconds + 1, current + dt);
        if (next >= INTRO_SECONDS + readingSeconds + 1) window.clearInterval(timer);
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [visible, immediate, readingSeconds]);

  return (
    <article className="journey-story" data-story-id={chapter.id}>
      <div className="journey-story-title" style={{ opacity: titleOpacity }}>
        <h3>{chapter.title}</h3>
        <button
          type="button"
          className="journey-reveal-button"
          style={{ visibility: complete || frame.detailsOpacity < 1 ? 'hidden' : undefined }}
          onClick={() => setShowAll(true)}
          tabIndex={complete || frame.detailsOpacity < 1 ? -1 : undefined}
        >
          Show full story ↗
        </button>
      </div>
      <div
        className="journey-story-year"
        style={{ opacity: yearOpacity, visibility: yearOpacity === 0 ? 'hidden' : undefined }}
      >
        <strong className="journey-year">{chapter.year}</strong>
        <p className="journey-place">
          <span>{chapter.date}</span>
          <span>{chapter.place}</span>
        </p>
      </div>
      <div
        className="journey-story-details"
        style={{ opacity: detailsOpacity, visibility: detailsOpacity === 0 ? 'hidden' : undefined }}
      >
        <p className="journey-story-body">
          <span className="journey-sr-only">{chapter.story}</span>
          <span aria-hidden="true">
            <span className="journey-typed">{words.slice(0, revealed).join('')}</span>
            {!complete && <span className="journey-untyped">{words.slice(revealed).join('')}</span>}
          </span>
        </p>
        <div className="journey-toolkit">
          <span className="journey-toolkit-label">IN THE TOOLKIT</span>
        </div>
        <div className="journey-story-bottom">
          <ul className="journey-skills" aria-label="Skills">
            {chapter.skills.map((skill, index) => (
              <li
                key={skill}
                style={{
                  opacity: immediate
                    ? 1
                    : clamp(
                        (seconds -
                          INTRO_SECONDS -
                          (readingSeconds * (index + 1)) / (chapter.skills.length + 1)) /
                          0.6,
                      ),
                }}
              >
                {skill}
              </li>
            ))}
          </ul>
          {chapter.link && (
            <a
              className="journey-story-link"
              href={chapter.link.href}
              target={chapter.link.href.startsWith('https://') ? '_blank' : undefined}
              rel={chapter.link.href.startsWith('https://') ? 'noreferrer' : undefined}
              onClick={onFollowLink}
            >
              {chapter.link.label} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function JourneyStory({
  frame,
  visible,
  reduced,
  onFollowLink,
}: {
  frame: JourneyFrame;
  visible: boolean;
  reduced: boolean;
  onFollowLink: () => void;
}) {
  const chapter = frame.stop ? experience[frame.index] : null;
  return (
    <>
      <div className="journey-story-transition">
        {chapter && (
          <StoryContent
            key={chapter.id}
            chapter={chapter}
            frame={frame}
            visible={visible}
            reduced={reduced}
            onFollowLink={onFollowLink}
          />
        )}
      </div>
      <p className="journey-sr-only" role="status" aria-atomic="true">
        {chapter
          ? `${chapter.year}. ${chapter.place}. ${chapter.title}`
          : 'Open water. Keep riding to the next chapter.'}
      </p>
    </>
  );
}
