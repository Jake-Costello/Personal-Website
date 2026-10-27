import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalytics } from './analytics';

function environment(hostname = 'jake-costello.com', disabled = false) {
  const storage = new Map<string, string>(disabled ? [['umami.disabled', '1']] : []);
  const scripts: {
    src?: string;
    async?: boolean;
    dataset: Record<string, string>;
    addEventListener: (name: string, listener: () => void) => void;
  }[] = [];
  const scriptEvents: Record<string, () => void> = {};
  const listeners: Record<string, (event: unknown) => void> = {};
  const calls: unknown[][] = [];
  const browser = {
    location: { hostname, pathname: '/', href: `https://${hostname}/` },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null },
    document: {
      createElement: () => ({
        dataset: {},
        addEventListener: (name: string, listener: () => void) => {
          scriptEvents[name] = listener;
        },
      }),
      head: { append: (script: (typeof scripts)[number]) => scripts.push(script) },
      addEventListener: (name: string, listener: (event: unknown) => void) => {
        listeners[name] = listener;
      },
    },
  } as unknown as Window;
  const client = createAnalytics(browser);
  const load = () => {
    browser.umami = {
      track: (...args) => {
        calls.push(args);
      },
    };
    scriptEvents.load();
  };
  const click = (href: string, type = 'click', button = 0, defaultPrevented = false) =>
    listeners[type]({
      type,
      button,
      defaultPrevented,
      target: { closest: () => ({ getAttribute: () => href }) },
    });
  return { browser, client, storage, scripts, scriptEvents, calls, load, click };
}

test('only the published domains load the tracker, once, with URL query/hash collection disabled', () => {
  for (const host of ['jake-costello.com', 'www.jake-costello.com']) {
    const env = environment(host);
    env.client.initialize();
    env.client.initialize();
    assert.equal(env.scripts.length, 1);
    assert.equal(env.scripts[0].src, 'https://cloud.umami.is/script.js');
    assert.equal(env.scripts[0].async, true);
    assert.equal(env.scripts[0].dataset.websiteId, '87805ca6-9b88-42c4-8507-e153aae9515e');
    assert.equal(env.scripts[0].dataset.excludeSearch, 'true');
    assert.equal(env.scripts[0].dataset.excludeHash, 'true');
  }
  for (const host of [
    'localhost',
    '127.0.0.1',
    'jake-costello.github.io',
    'jake-costello.com.example.org',
  ]) {
    const env = environment(host);
    env.client.initialize();
    env.client.track('project_open');
    assert.equal(env.scripts.length, 0);
    assert.equal(env.calls.length, 0);
  }
});

test('owner opt-out prevents even the initial tracker download and fails closed if storage is blocked', () => {
  const env = environment('jake-costello.com', true);
  env.client.initialize();
  env.client.track('arcade_game_start');
  assert.equal(env.scripts.length, 0);
  assert.equal(env.calls.length, 0);
  const blocked = environment();
  blocked.browser.localStorage.getItem = () => {
    throw new Error('Storage denied');
  };
  assert.doesNotThrow(() => blocked.client.initialize());
  assert.equal(blocked.scripts.length, 0);
});

test('early events flush once after load, and exclusion also stops queued and future sends', () => {
  const env = environment();
  env.client.initialize();
  env.client.track('lab_action', { action: 'explore' });
  assert.equal(env.calls.length, 0);
  env.load();
  assert.deepEqual(env.calls, [['lab_action', { source: 'home', action: 'explore' }]]);
  env.scriptEvents.load();
  assert.equal(env.calls.length, 1);
  env.storage.set('umami.disabled', '1');
  env.client.track('lab_action', { action: 'inspect' });
  assert.equal(env.calls.length, 1);
  assert.equal(env.browser.portfolioAnalyticsBeforeSend!('event', { url: '/' }), false);

  const pending = environment();
  pending.client.initialize();
  pending.client.track('project_open');
  pending.storage.set('umami.disabled', '1');
  pending.load();
  assert.equal(pending.calls.length, 0);
});

test('outbound clicks send only named destinations and support middle click without right-click duplicates', () => {
  const env = environment();
  env.client.initialize();
  env.load();
  env.click('https://www.linkedin.com/in/example?secret=never-send#private');
  env.click('https://github.com/Jake-Costello', 'auxclick', 1);
  env.click('https://revision-marine.com/');
  env.click('https://github.com/', 'auxclick', 2);
  env.click('https://github.com/', 'click', 0, true);
  env.click('https://github.com.example.org/');
  env.click('/#about');
  assert.deepEqual(env.calls, [
    ['external_link', { source: 'home', destination: 'linkedin' }],
    ['external_link', { source: 'home', destination: 'github' }],
    ['external_link', { source: 'home', destination: 'revision-marine' }],
  ]);
});

test('tracker failures do not propagate to gameplay, and arcade events get their source', async () => {
  const blockedSetup = environment();
  blockedSetup.browser.document.head.append = () => {
    throw new Error('Script injection denied');
  };
  assert.doesNotThrow(() => blockedSetup.client.initialize());
  const env = environment();
  env.browser.location.pathname = '/arcade/';
  env.client.initialize();
  env.load();
  env.client.track('arcade_game_start', { game: 'warehouse' });
  assert.deepEqual(env.calls[0], ['arcade_game_start', { source: 'arcade', game: 'warehouse' }]);
  env.browser.umami!.track = () => {
    throw new Error('Blocked');
  };
  assert.doesNotThrow(() => env.client.track('arcade_game_start'));
  env.browser.umami!.track = () => Promise.reject(new Error('Offline'));
  env.client.track('arcade_game_start');
  await new Promise((resolve) => setTimeout(resolve, 0));
  env.scriptEvents.error();
  env.browser.umami!.track = () => assert.fail('failed tracker must not be called');
  env.client.track('arcade_game_start');
});
