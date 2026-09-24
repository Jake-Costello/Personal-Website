import { useSyncExternalStore } from 'react';

export type GolfBallColor = 'white' | 'yellow' | 'striped';
export type RewardId = Exclude<GolfBallColor, 'white'>;

export interface AchievementSnapshot {
  readonly storyFinished: boolean;
  readonly yellowBallUnlocked: boolean;
  readonly stripedBallUnlocked: boolean;
  readonly discoveredProteins: readonly string[];
  readonly acknowledgedRewards: readonly RewardId[];
  readonly selectedBall: GolfBallColor;
  readonly bestTrialSeconds: number | null;
}

// Additive fields preserve the original yellow reward and selection on upgrade.
export const STORAGE_KEY = 'personal-website:achievements:v1';
const MAX_TRIAL_SECONDS = 24 * 60 * 60;
const EMPTY: AchievementSnapshot = Object.freeze({
  storyFinished: false,
  yellowBallUnlocked: false,
  stripedBallUnlocked: false,
  discoveredProteins: Object.freeze([]),
  acknowledgedRewards: Object.freeze([]),
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
    const discoveredProteins = Array.isArray(data.discoveredProteins)
      ? [...new Set(data.discoveredProteins.filter(validProtein))].slice(0, 64)
      : [];
    const stripedBallUnlocked = discoveredProteins.length >= 2;
    const unlocked: RewardId[] = [
      ...(yellowBallUnlocked ? ['yellow' as const] : []),
      ...(stripedBallUnlocked ? ['striped' as const] : []),
    ];
    // Old saved rewards predate notifications. New rewards persist an explicit
    // empty acknowledgement list, so they remain pending until dismissed.
    const acknowledgedRewards = Array.isArray(data.acknowledgedRewards)
      ? unlocked.filter(
          (reward) =>
            data.acknowledgedRewards instanceof Array && data.acknowledgedRewards.includes(reward),
        )
      : unlocked;
    return Object.freeze({
      storyFinished: data.storyFinished === true,
      yellowBallUnlocked,
      stripedBallUnlocked,
      discoveredProteins: Object.freeze(discoveredProteins),
      acknowledgedRewards: Object.freeze(acknowledgedRewards),
      selectedBall:
        stripedBallUnlocked && data.selectedBall === 'striped'
          ? 'striped'
          : yellowBallUnlocked && data.selectedBall === 'yellow'
            ? 'yellow'
            : 'white',
      bestTrialSeconds: validTime(data.bestTrialSeconds) ? data.bestTrialSeconds : null,
    });
  } catch {
    return EMPTY;
  }
}

function validProtein(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z][A-Z0-9-]{0,19}$/.test(value);
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
      snapshot.stripedBallUnlocked === next.stripedBallUnlocked &&
      snapshot.discoveredProteins.join(',') === next.discoveredProteins.join(',') &&
      snapshot.acknowledgedRewards.join(',') === next.acknowledgedRewards.join(',') &&
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
      if (
        color !== 'white' &&
        !(color === 'yellow' && current.yellowBallUnlocked) &&
        !(color === 'striped' && current.stripedBallUnlocked)
      )
        return;
      replace({ ...current, selectedBall: color }, true);
    },
    recordProteinDiscovery(symbol: string) {
      if (!validProtein(symbol)) return;
      const current = getSnapshot();
      if (current.discoveredProteins.includes(symbol) || current.discoveredProteins.length >= 64)
        return;
      const discoveredProteins = Object.freeze([...current.discoveredProteins, symbol]);
      replace(
        { ...current, discoveredProteins, stripedBallUnlocked: discoveredProteins.length >= 2 },
        true,
      );
    },
    acknowledgeReward(reward: RewardId) {
      const current = getSnapshot();
      const unlocked =
        reward === 'yellow'
          ? current.yellowBallUnlocked
          : reward === 'striped' && current.stripedBallUnlocked;
      if (!unlocked || current.acknowledgedRewards.includes(reward)) return;
      replace(
        {
          ...current,
          acknowledgedRewards: Object.freeze([...current.acknowledgedRewards, reward]),
        },
        true,
      );
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
export const recordProteinDiscovery = achievements.recordProteinDiscovery;
export const acknowledgeReward = achievements.acknowledgeReward;
