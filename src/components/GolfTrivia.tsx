import { useEffect, useRef, useState } from 'react';
import type { BioinformaticsQuestion } from '../data/trivia';
import './golf-trivia.css';

export default function GolfTrivia({ question }: { question: BioinformaticsQuestion }) {
  const [remaining, setRemaining] = useState(7000);
  const [answer, setAnswer] = useState<number | null>(null);
  const remainingRef = useRef(7000);
  const lastTick = useRef(0);
  const locked = useRef(false);
  const firstAnswer = useRef<HTMLButtonElement>(null);
  const expired = remaining <= 0;
  const finished = answer !== null || expired;

  function updateClock() {
    const now = performance.now();
    if (!locked.current && !document.hidden) {
      remainingRef.current = Math.max(0, remainingRef.current - (now - lastTick.current));
      setRemaining(remainingRef.current);
      if (remainingRef.current === 0) locked.current = true;
    }
    lastTick.current = now;
  }

  useEffect(() => {
    firstAnswer.current?.focus({ preventScroll: true });
    lastTick.current = performance.now();
    const timer = window.setInterval(updateClock, 100);
    const visibility = () => {
      lastTick.current = performance.now();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  function choose(index: number) {
    updateClock(); // Enforce the deadline even between timer ticks.
    if (locked.current) return;
    locked.current = true;
    setAnswer(index);
  }

  return (
    <div
      className="golf-trivia"
      data-result={
        finished
          ? expired
            ? 'timeout'
            : answer === question.correct
              ? 'correct'
              : 'incorrect'
          : 'playing'
      }
    >
      <p className="golf-trivia-clock" role="timer" aria-live="off">
        {finished
          ? 'Round complete'
          : `${Math.ceil(remaining / 1000)} ${remaining > 1000 ? 'seconds' : 'second'} to answer`}
      </p>
      <div className="golf-trivia-options" role="group" aria-label={question.prompt}>
        {question.choices.map((choice, index) => (
          <button
            key={choice}
            type="button"
            ref={index === 0 ? firstAnswer : undefined}
            disabled={finished}
            onClick={() => choose(index)}
            data-correct={finished && index === question.correct ? 'true' : undefined}
            data-selected={answer === index ? 'true' : undefined}
          >
            <span aria-hidden="true">{String.fromCharCode(65 + index)}.</span> {choice}
          </button>
        ))}
      </div>
      <div className="golf-trivia-result" role="status" aria-atomic="true">
        {finished && (
          <>
            <strong>
              {expired ? 'Time’s up!' : answer === question.correct ? 'Correct!' : 'Not quite.'}{' '}
              Answer: {question.choices[question.correct]}.
            </strong>
            <p>{question.explanation}</p>
            <a href={question.source.url} target="_blank" rel="noreferrer">
              {question.source.label} ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
