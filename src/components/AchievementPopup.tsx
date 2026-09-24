import { useEffect, useRef } from 'react';
import { achievementMessages, allRewardsMessage } from '../data/achievements';
import { acknowledgeReward, selectGolfBall, useAchievements } from '../lib/achievements';
import type { RewardId } from '../lib/achievements';
import './achievement-popup.css';

export default function AchievementPopup() {
  const progress = useAchievements();
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const pending = (['yellow', 'striped'] as const).find(
    (reward) =>
      (reward === 'yellow' ? progress.yellowBallUnlocked : progress.stripedBallUnlocked) &&
      !progress.acknowledgedRewards.includes(reward),
  );

  useEffect(() => {
    if (pending) {
      if (!dialog.current?.open) dialog.current?.showModal();
      dismissButton.current?.focus({ preventScroll: true });
    }
    if (!pending && dialog.current?.open) dialog.current.close();
  }, [pending]);

  function dismiss() {
    if (pending) {
      dialog.current?.close();
      acknowledgeReward(pending);
    }
  }

  async function useBall(reward: RewardId) {
    dialog.current?.close();
    selectGolfBall(reward);
    acknowledgeReward(reward);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* The reward stays selected. */
      }
    }
    document.querySelector('#about')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    document
      .querySelector<HTMLInputElement>(`input[name="golf-ball"][value="${reward}"]`)
      ?.focus({ preventScroll: true });
  }

  const message = pending ? achievementMessages[pending] : null;
  return (
    <dialog
      ref={dialog}
      className="achievement-popup"
      aria-labelledby="achievement-title"
      aria-describedby="achievement-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      {message && pending && (
        <div className="achievement-popup-content">
          <span className={`achievement-ball achievement-ball--${pending}`} aria-hidden="true" />
          <p className="achievement-eyebrow">Achievement unlocked / {message.label}</p>
          <h2 id="achievement-title">{message.title}</h2>
          <p id="achievement-description">{message.text}</p>
          {progress.yellowBallUnlocked && progress.stripedBallUnlocked && (
            <p className="achievement-complete">{allRewardsMessage}</p>
          )}
          <div className="achievement-actions">
            <button
              type="button"
              className="button button-dark"
              onClick={() => void useBall(pending)}
            >
              Use this ball
            </button>
            <button
              type="button"
              className="achievement-dismiss"
              ref={dismissButton}
              onClick={dismiss}
            >
              Keep exploring
            </button>
          </div>
          <p className="achievement-local-note">
            Saved in this browser. You can change balls at the tee.
          </p>
        </div>
      )}
    </dialog>
  );
}
