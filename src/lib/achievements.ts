import { useSyncExternalStore } from 'react';

export type GolfBallColor = 'white' | 'yellow';

export interface AchievementSnapshot {
  readonly storyFinished: boolean;
  readonly yellowBallUnlocked: boolean;
  readonly selectedBall: GolfBallColor;
  readonly bestTrialSeconds: number | null;
}

// Progress belongs to this browser only. Bump the version if its shape changes.
export const STORAGE_KEY = 'personal-website:achievements:v1';
const MAX_TRIAL_SECONDS = 24 * 60 * 60;
const EMPTY: AchievementSnapshot = Object.freeze({
  storyFinished: false,
  yellowBallUnlocked: false,
  selectedBall: 'white',
  bestTrialSeconds: null,
});

type AchievementStorage = Pick<Storage, 'getItem' | 'setItem'>;

function validTime(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_TRIAL_SECONDS
  );
}

function readSnapshot(serialized: string | null): AchievementSnapshot {
  if (!serialized) return EMPTY;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY;
    const data = value as Record<string, unknown>;
    const yellowBallUnlocked = data.yellowBallUnlocked === true;
    return Object.freeze({
      storyFinished: data.storyFinished === true,
      yellowBallUnlocked,
      selectedBall: yellowBallUnlocked && data.selectedBall === 'yellow' ? 'yellow' : 'white',
      bestTrialSeconds: validTime(data.bestTrialSeconds) ? data.bestTrialSeconds : null,
    });
  } catch {
    return EMPTY;
  }
}

function browserStorage(): AchievementStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

// The storage provider keeps persistence failures separate from the playable state.
export function createAchievementStore(
  getStorage: () => AchievementStorage | null = browserStorage,
) {
  let snapshot = EMPTY;
  let initialized = false;
  const listeners = new Set<() => void>();

  function replace(next: AchievementSnapshot, persist: boolean) {
    if (
      snapshot.storyFinished === next.storyFinished &&
      snapshot.yellowBallUnlocked === next.yellowBallUnlocked &&
      snapshot.selectedBall === next.selectedBall &&
      snapshot.bestTrialSeconds === next.bestTrialSeconds
    )
      return;
    snapshot = Object.freeze(next);
    if (persist) {
      try {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Private browsing or storage limits must never block an earned reward.
      }
    }
    listeners.forEach((listener) => listener());
  }

  function reload() {
    initialized = true;
    try {
      const storage = getStorage();
      if (storage) replace(readSnapshot(storage.getItem(STORAGE_KEY)), false);
    } catch {
      // Keep this visit's progress when browser storage is unavailable.
    }
  }

  function getSnapshot() {
    if (!initialized) reload();
    return snapshot;
  }

  return {
    getSnapshot,
    reload,
    subscribe(listener: () => void) {
      getSnapshot();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    markStoryFinished() {
      replace({ ...getSnapshot(), storyFinished: true }, true);
    },
    recordTrialResult(scoreSeconds: number, qualified: boolean) {
      if (!validTime(scoreSeconds)) return;
      const current = getSnapshot();
      replace(
        {
          ...current,
          yellowBallUnlocked: current.yellowBallUnlocked || qualified === true,
          bestTrialSeconds:
            current.bestTrialSeconds === null
              ? scoreSeconds
              : Math.min(current.bestTrialSeconds, scoreSeconds),
        },
        true,
      );
    },
    selectGolfBall(color: GolfBallColor) {
      const current = getSnapshot();
      if (color !== 'white' && (color !== 'yellow' || !current.yellowBallUnlocked)) return;
      replace({ ...current, selectedBall: color }, true);
    },
  };
}

const achievements = createAchievementStore();

function subscribe(listener: () => void) {
  const unsubscribe = achievements.subscribe(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) achievements.reload();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    unsubscribe();
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function useAchievements(): AchievementSnapshot {
  return useSyncExternalStore(subscribe, achievements.getSnapshot, () => EMPTY);
}

export const markStoryFinished = achievements.markStoryFinished;
export const recordTrialResult = achievements.recordTrialResult;
export const selectGolfBall = achievements.selectGolfBall;
