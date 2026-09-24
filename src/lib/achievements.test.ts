import assert from 'node:assert/strict';
import test from 'node:test';
import { createAchievementStore, STORAGE_KEY } from './achievements';

function savedProgress(initial: string | null = null) {
  let saved = initial;
  const storage = {
    getItem(key: string) {
      assert.equal(key, STORAGE_KEY);
      return saved;
    },
    setItem(key: string, value: string) {
      assert.equal(key, STORAGE_KEY);
      saved = value;
    },
  };
  return { storage, read: () => saved };
}

test('story completion and qualified rewards persist without selecting the new ball', () => {
  const saved = savedProgress();
  const store = createAchievementStore(() => saved.storage);
  store.selectGolfBall('yellow');
  assert.equal(store.getSnapshot().selectedBall, 'white');
  store.markStoryFinished();
  store.recordTrialResult(175, false);
  assert.equal(store.getSnapshot().yellowBallUnlocked, false);
  store.recordTrialResult(145, true);
  assert.deepEqual(store.getSnapshot(), {
    storyFinished: true,
    yellowBallUnlocked: true,
    selectedBall: 'white',
    bestTrialSeconds: 145,
  });
  store.selectGolfBall('yellow');
  const restored = createAchievementStore(() => saved.storage);
  assert.equal(restored.getSnapshot().selectedBall, 'yellow');
  assert.equal(restored.getSnapshot().storyFinished, true);
  restored.recordTrialResult(200, false);
  assert.equal(restored.getSnapshot().bestTrialSeconds, 145);
  assert.equal(restored.getSnapshot().yellowBallUnlocked, true);
  restored.selectGolfBall('white');
  assert.equal(JSON.parse(saved.read()!).selectedBall, 'white');
});

test('invalid saved values and impossible result times cannot award or select a reward', () => {
  for (const initial of ['{', 'null', '[]', 'false', '42']) {
    const saved = savedProgress(initial);
    const store = createAchievementStore(() => saved.storage);
    assert.deepEqual(store.getSnapshot(), {
      storyFinished: false,
      yellowBallUnlocked: false,
      selectedBall: 'white',
      bestTrialSeconds: null,
    });
  }
  for (const seconds of [-1, 0, NaN, Infinity, 86_401]) {
    const saved = savedProgress(
      JSON.stringify({
        storyFinished: 'yes',
        yellowBallUnlocked: 'true',
        selectedBall: 'yellow',
        bestTrialSeconds: seconds,
      }),
    );
    const store = createAchievementStore(() => saved.storage);
    store.recordTrialResult(seconds, true);
    assert.equal(store.getSnapshot().storyFinished, false);
    assert.equal(store.getSnapshot().yellowBallUnlocked, false);
    assert.equal(store.getSnapshot().selectedBall, 'white');
    assert.equal(store.getSnapshot().bestTrialSeconds, null);
  }
});

test('storage failures preserve rewards and notify subscribers only when state changes', () => {
  const store = createAchievementStore(() => {
    throw new Error('Storage access blocked');
  });
  let updates = 0;
  const unsubscribe = store.subscribe(() => updates++);
  const initial = store.getSnapshot();
  assert.equal(store.getSnapshot(), initial);
  store.markStoryFinished();
  store.markStoryFinished();
  store.recordTrialResult(130, true);
  store.selectGolfBall('yellow');
  assert.equal(updates, 3);
  store.reload();
  assert.equal(store.getSnapshot().selectedBall, 'yellow');
  assert.equal(store.getSnapshot().bestTrialSeconds, 130);
  unsubscribe();
  store.selectGolfBall('white');
  assert.equal(updates, 3);
});

test('storage changes refresh the same snapshot only when persisted values differ', () => {
  const saved = savedProgress();
  const store = createAchievementStore(() => saved.storage);
  const initial = store.getSnapshot();
  store.reload();
  assert.equal(store.getSnapshot(), initial);
  saved.storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      storyFinished: true,
      yellowBallUnlocked: true,
      selectedBall: 'yellow',
      bestTrialSeconds: 132,
    }),
  );
  store.reload();
  assert.equal(store.getSnapshot().selectedBall, 'yellow');
  assert.equal(store.getSnapshot().bestTrialSeconds, 132);
});
