import { expect, test } from '@playwright/test';
import type { CDPSession, Locator, Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';
import { arcadeProjects } from '../../src/arcade/projects';
import { checkPhysicalButtonCaps } from './arcade-control-checks';

const machines = ['Resume Run', 'Sketch-to-Ride', 'Warehouse Warrior'] as const;
const gameIds = ['shoreline', 'sketch', 'warehouse'] as const;
const visibleMachines = ['Resume Run', 'Warehouse Warrior'] as const;
const sketchHidden = !arcadeProjects.some((project) => project.id === 'sketch');
const machine = (page: Page, title: string) =>
  page.getByRole('button', { name: `Play ${title}`, exact: true });
const controls = (page: Page) => page.locator('.arcade-player-controls');
const numeric = async (game: Locator, name: string) => Number(await game.getAttribute(name));

async function expectSelected(page: Page, title: (typeof machines)[number]) {
  await expect(page.locator('.arcade-page')).toHaveAttribute(
    'data-selected',
    gameIds[machines.indexOf(title)],
  );
}

async function expectRoomReady(page: Page) {
  await expect(page.locator('.arcade-page')).toHaveAttribute(
    'data-renderer',
    /^(three|fallback)$/,
    {
      timeout: 15_000,
    },
  );
}

async function expectGameReady(page: Page, title: (typeof machines)[number]) {
  await expect(page.locator('.arcade-page')).toHaveAttribute(
    'data-game',
    gameIds[machines.indexOf(title)],
  );
  await expectRoomReady(page);
  // The game DOM mounts before the Three camera projects a usable cabinet screen.
  if ((await page.locator('.arcade-page').getAttribute('data-renderer')) === 'three') {
    await expect(page.locator('.arcade-live-screen')).toHaveAttribute('data-settled', 'true', {
      timeout: 15_000,
    });
  }
  await expect(page.locator('.arcade-live-screen')).toBeVisible();
  const roots = ['.shoreline-game', '[data-game="sketch-ride"]', '[data-game="warehouse-shift"]'];
  await expect(page.locator(roots[machines.indexOf(title)])).toBeVisible();
}

async function play(page: Page, title: (typeof machines)[number]) {
  await expectRoomReady(page);
  await machine(page, title).click();
  await expectGameReady(page, title);
}

async function holdKeyUntil(
  page: Page,
  key: string,
  predicate: () => Promise<number>,
  above: number,
) {
  await page.keyboard.down(key);
  await expect.poll(predicate).toBeGreaterThan(above);
}

async function point(control: Locator, id = 1) {
  const bounds = await control.boundingBox();
  expect(bounds).not.toBeNull();
  return { id, x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
}

async function touch(
  session: CDPSession,
  type: 'touchStart' | 'touchEnd' | 'touchCancel',
  touchPoints: { id: number; x: number; y: number }[],
) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints });
}

test('the arcade loads and reloads two 3D machines with Sketch hidden and no API requests', async ({
  page,
}) => {
  const errors: string[] = [];
  const dataRequests: string[] = [];
  const shaderRequests: string[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/\/ArcadeShader[.-]/.test(url.pathname)) shaderRequests.push(url.pathname);
    if (
      url.pathname.startsWith('/api/') ||
      /string-db\.org|ensembl\.org|rcsb\.org|api\.openai\.com/.test(url.hostname)
    )
      dataRequests.push(request.url());
  });
  for (const navigate of [() => page.goto('/arcade/'), () => page.reload()]) {
    const response = await navigate();
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Project Arcade — Jake Costello');
    await expect(page.locator('.arcade-page')).toHaveAttribute('data-renderer', 'three', {
      timeout: 15_000,
    });
    await expect(page.locator('.arcade-webgl canvas')).toBeVisible();
    await expect(page.locator('.arcade-backdrop')).toHaveAttribute('data-renderer', 'static');
    await expect(page.locator('.arcade-backdrop canvas')).toHaveCount(0);
    await expect(
      page.getByRole('group', { name: 'Arcade machines', exact: true }).getByRole('button'),
    ).toHaveCount(2);
    for (const title of visibleMachines) await expect(machine(page, title)).toBeAttached();
    await expect(machine(page, 'Sketch-to-Ride')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Step up to play|^Choose / })).toHaveCount(0);
    await expect(
      page.locator('.arcade-room-intro, .arcade-lobby-info, .arcade-machine-list'),
    ).toHaveCount(0);
    await expectSelected(page, 'Resume Run');
    await expect(
      page.locator('.protein-explorer, .shoreline-game, .sr-game, [data-game="warehouse-shift"]'),
    ).toHaveCount(0);
  }
  expect(dataRequests).toEqual([]);
  expect(shaderRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('the optional backdrop waits for the cabinet and idle, and cancels pending startup during play', async ({
  page,
}) => {
  // CI's software GPU renders the room, two camera transitions, and a second
  // WebGL context here. Keep individual readiness deadlines while allowing the full flow.
  test.setTimeout(180_000);
  const shaderRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/ArcadeShader[.-]/.test(new URL(request.url()).pathname))
      shaderRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  type IdleProbeWindow = Window & {
    arcadeIdleProbe: { pending: () => number; flush: () => void };
  };
  await page.addInitScript(() => {
    // Control idle delivery, not elapsed time, so cancellation is deterministic on
    // both fast devices and CI's software GPU. No application hooks are needed.
    const callbacks = new Map<number, IdleRequestCallback>();
    let sequence = 0;
    window.requestIdleCallback = (callback) => {
      const id = ++sequence;
      callbacks.set(id, callback);
      return id;
    };
    window.cancelIdleCallback = (id) => {
      callbacks.delete(id);
    };
    (window as IdleProbeWindow).arcadeIdleProbe = {
      pending: () => callbacks.size,
      flush: () => {
        const pending = [...callbacks.values()];
        callbacks.clear();
        for (const callback of pending) callback({ didTimeout: false, timeRemaining: () => 50 });
      },
    };
    const observer = new MutationObserver(() => {
      if (document.querySelector('.arcade-page')?.getAttribute('data-renderer') === 'three') {
        performance.mark('test:arcade-cabinet-ready');
        observer.disconnect();
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-renderer'],
    });
  });
  const pending = () => page.evaluate(() => (window as IdleProbeWindow).arcadeIdleProbe.pending());
  const flush = () => page.evaluate(() => (window as IdleProbeWindow).arcadeIdleProbe.flush());

  await test.step('paint the cabinet before scheduling the optional shader', async () => {
    await page.goto('/arcade/');
    await expect(page.locator('.arcade-page')).toHaveAttribute('data-renderer', 'three', {
      timeout: 15_000,
    });
    await expect(page.locator('.arcade-backdrop__fallback')).toBeVisible();
    await expect.poll(pending).toBeGreaterThan(0);
    expect(shaderRequests).toEqual([]);
  });

  await test.step('pausing ambience cancels the pending idle callback', async () => {
    await page.getByRole('button', { name: 'Pause ambience', exact: true }).click();
    await expect.poll(pending).toBe(0);
    await flush();
    expect(shaderRequests).toEqual([]);
    await page.getByRole('button', { name: 'Resume ambience', exact: true }).click();
    await expect.poll(pending).toBeGreaterThan(0);
  });

  await test.step('entering a game cancels startup before any shader download', async () => {
    await play(page, 'Resume Run');
    await expect.poll(pending).toBe(0);
    await flush();
    expect(shaderRequests).toEqual([]);
    await expect(page.locator('.arcade-backdrop')).toHaveAttribute('data-renderer', 'static');
  });

  await test.step('returning to the room starts the shader after readiness and idle', async () => {
    await page.getByRole('button', { name: /Back to machines/ }).click();
    await expect.poll(pending).toBeGreaterThan(0);
    await flush();
    await expect(page.locator('.arcade-backdrop')).toHaveAttribute('data-renderer', 'shader', {
      timeout: 30_000,
    });
    const timings = await page.evaluate(() => ({
      cabinet: performance.getEntriesByName('test:arcade-cabinet-ready')[0]?.startTime,
      shader: performance
        .getEntriesByType('resource')
        .find((entry) => /\/ArcadeShader[.-]/.test(new URL(entry.name).pathname))?.startTime,
    }));
    expect(shaderRequests).toHaveLength(1);
    expect(timings.cabinet).toBeDefined();
    expect(timings.shader).toBeDefined();
    expect(timings.shader!).toBeGreaterThanOrEqual(timings.cabinet!);
  });

  await test.step('pausing an initialized shader preserves its canvas', async () => {
    const canvas = await page.locator('.arcade-backdrop canvas').elementHandle();
    await page.getByRole('button', { name: 'Pause ambience', exact: true }).click();
    await expect(page.locator('.arcade-backdrop')).toHaveAttribute('data-renderer', 'shader');
    expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
    expect(shaderRequests).toHaveLength(1);
  });
});

test('two-machine selection wraps and Enter plays locally while Escape returns to the room', async ({
  page,
}) => {
  await page.goto('/arcade/');
  await expectRoomReady(page);
  for (const title of ['Warehouse Warrior', 'Resume Run'] as const) {
    await page.getByRole('button', { name: 'Next machine', exact: true }).click();
    await expectSelected(page, title);
  }
  await page.getByRole('button', { name: 'Previous machine', exact: true }).click();
  await expectSelected(page, 'Warehouse Warrior');
  const room = page.getByRole('main', { name: 'Project arcade', exact: true });
  await room.focus();
  await page.keyboard.press('ArrowRight');
  await expectSelected(page, 'Resume Run');
  await page.keyboard.press('ArrowLeft');
  await expectSelected(page, 'Warehouse Warrior');
  await page.keyboard.press('Enter');
  await expectGameReady(page, 'Warehouse Warrior');
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
  await expectSelected(page, 'Warehouse Warrior');
  await expect(room).toBeFocused();
});

test('physical cabinet buttons respond across their top disks and release safely', async ({
  page,
}, testInfo) => {
  // Eighteen native press/release pairs plus touch and pause checks require more
  // total time on CI's software GPU; individual input assertions keep their deadlines.
  test.setTimeout(180_000);
  // A shorter desktop window puts the transparent DOM controls panel over the deck,
  // reproducing the old offset-looking dead area on the front of the physical caps.
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 800 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/arcade/');
  await play(page, 'Warehouse Warrior');
  await checkPhysicalButtonCaps(page);
});

test('Resume Run moves, pumps and jumps; pausing freezes it and blur clears held keys', async ({
  page,
}) => {
  // Software GPUs need extra total time for initialization and several camera transitions.
  // Individual gameplay assertions retain their normal deadlines.
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Resume Run');
  const game = page.locator('.shoreline-game');
  await expect(game).toBeVisible();
  const pad = controls(page).locator('.arcade-dpad.four-way');
  await expect(pad.getByRole('button')).toHaveCount(4);
  await expect(controls(page).getByRole('button')).toHaveCount(4);
  const up = await point(pad.getByRole('button', { name: 'Jump', exact: true }));
  const down = await point(pad.getByRole('button', { name: 'Pump', exact: true }));
  const left = await point(pad.getByRole('button', { name: 'Move left', exact: true }));
  const rightPoint = await point(pad.getByRole('button', { name: 'Move right', exact: true }));
  expect(Math.abs(up.x - down.x)).toBeLessThan(1);
  expect(up.y).toBeLessThan(down.y);
  expect(left.x).toBeLessThan(down.x);
  expect(rightPoint.x).toBeGreaterThan(down.x);
  expect(Math.abs(left.y - down.y)).toBeLessThan(1);
  expect(Math.abs(rightPoint.y - down.y)).toBeLessThan(1);
  await holdKeyUntil(page, 'ArrowRight', () => numeric(game, 'data-position'), 35);
  const right = controls(page).getByRole('button', { name: 'Move right', exact: true });
  await expect(right).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(game).toHaveAttribute('data-jumps', '1');
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(right).toBeDisabled();
  const frozen = await numeric(game, 'data-position');
  await page.waitForTimeout(300);
  expect(await numeric(game, 'data-position')).toBe(frozen);
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await page.getByRole('button', { name: 'Expand screen', exact: true }).click();
  await expect(page.locator('.arcade-page')).toHaveClass(/is-expanded/);
  await expect(game).toHaveAttribute('data-jumps', '1');
  await page.getByRole('button', { name: 'Cabinet view', exact: true }).click();
  await expect(page.locator('.arcade-page')).not.toHaveClass(/is-expanded/);
  await holdKeyUntil(page, 'ArrowRight', () => numeric(game, 'data-position'), frozen + 30);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(right).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(right).toBeDisabled();
  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await expect(game).toHaveAttribute('data-position', '0');
  await expect(game).toHaveAttribute('data-jumps', '0');
  await expect(page.getByRole('button', { name: 'Pause game', exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  await expect(game).toHaveAttribute('data-position', '0');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('Escape');
  await page.keyboard.up('ArrowRight');
  await play(page, 'Resume Run');
  await expect(game).toHaveAttribute('data-position', '0');
  await expect(right).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(250);
  await expect(game).toHaveAttribute('data-position', '0');
});

test('mobile cabinet holds support simultaneous pumping and jumping and release on cancel or blur', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/arcade/');
  await play(page, 'Resume Run');
  const game = page.locator('.shoreline-game');
  await expect(game).toBeVisible();
  const right = controls(page).getByRole('button', { name: 'Move right', exact: true });
  const pump = controls(page).getByRole('button', { name: 'Pump', exact: true });
  const jump = controls(page).getByRole('button', { name: 'Jump', exact: true });
  await right.scrollIntoViewIfNeeded();
  const riding = await point(right, 1);
  const pumping = await point(pump, 2);
  const jumping = await point(jump, 3);
  const session = await page.context().newCDPSession(page);
  try {
    await touch(session, 'touchStart', [riding]);
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => numeric(game, 'data-position')).toBeGreaterThan(35);
    await touch(session, 'touchStart', [riding, pumping]);
    await expect(pump).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(400);
    await touch(session, 'touchEnd', [pumping]);
    await touch(session, 'touchStart', [riding, jumping]);
    await expect(game).toHaveAttribute('data-jumps', '1');
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await touch(session, 'touchCancel', []);
    await expect(right).toHaveAttribute('aria-pressed', 'false');
    await expect(jump).toHaveAttribute('aria-pressed', 'false');
    await touch(session, 'touchStart', [riding]);
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(right).toHaveAttribute('aria-pressed', 'false');
    await touch(session, 'touchEnd', []);
  } finally {
    await session.detach();
  }
});

test('a drawn downhill line becomes a playable Sketch ride and can be edited again', async ({
  page,
}) => {
  test.skip(sketchHidden, 'Sketch-to-Ride is temporarily hidden while it is refined.');
  await page.goto('/arcade/');
  await play(page, 'Sketch-to-Ride');
  const game = page.locator('[data-game="sketch-ride"]');
  await expect(game).toHaveAttribute('data-mode', 'levels');
  await game.getByRole('button', { name: 'Custom', exact: true }).click();
  await expect(game).toHaveAttribute('data-mode', 'custom');
  await expect(game).toHaveAttribute('data-phase', 'drawing');
  const cursorX = await numeric(game, 'data-cursor-x');
  const cursorY = await numeric(game, 'data-cursor-y');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => numeric(game, 'data-cursor-x')).toBeGreaterThan(cursorX + 25);
  await expect.poll(() => numeric(game, 'data-cursor-y')).toBeLessThan(cursorY - 5);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  const canvas = game.getByLabel(
    'Draw a downhill trail by dragging across this canvas from left to right',
  );
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.43);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.67, { steps: 24 });
  await page.mouse.up();
  await expect(game.getByRole('status')).toContainText('Your line is ready');
  await controls(page).getByRole('button', { name: 'Pedal', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'riding');
  await expect.poll(() => numeric(game, 'data-progress')).toBeGreaterThan(2);
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  const frozen = await numeric(game, 'data-progress');
  await page.waitForTimeout(250);
  expect(await numeric(game, 'data-progress')).toBe(frozen);
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await game.getByRole('button', { name: '✎ Draw', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'drawing');
  await expect(game).toHaveAttribute('data-progress', '0');
});

test('Sketch cabinet pedals and brakes change speed, and an actual rider collision can be retried', async ({
  page,
}, testInfo) => {
  test.skip(sketchHidden, 'Sketch-to-Ride is temporarily hidden while it is refined.');
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Sketch-to-Ride');
  const game = page.locator('[data-game="sketch-ride"]');
  const panel = controls(page);
  await expect(panel.locator('.arcade-dpad').getByRole('button')).toHaveCount(4);
  await expect(panel.locator('.arcade-game-actions').getByRole('button')).toHaveCount(2);
  for (const label of ['Draw up', 'Draw down', 'Tilt back', 'Tilt forward', 'Pedal', 'Brake'])
    await expect(panel.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: /Jump|Move/ })).toHaveCount(0);

  const pedal = panel.getByRole('button', { name: 'Pedal', exact: true });
  const brake = panel.getByRole('button', { name: 'Brake', exact: true });
  const pedalPoint = await point(pedal);
  await page.mouse.move(pedalPoint.x, pedalPoint.y);
  await page.mouse.down();
  await expect(pedal).toHaveAttribute('aria-pressed', 'true');
  await expect(game).toHaveAttribute('data-phase', 'riding');
  await expect.poll(() => numeric(game, 'data-speed')).toBeGreaterThan(100);
  await page.mouse.up();
  await expect(pedal).toHaveAttribute('aria-pressed', 'false');
  const brakePoint = await point(brake);
  await page.mouse.move(brakePoint.x, brakePoint.y);
  await page.mouse.down();
  await expect(brake).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => numeric(game, 'data-speed')).toBe(0);
  await expect(game).toHaveAttribute('data-phase', 'riding');
  await page.mouse.up();
  await expect(brake).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await page.keyboard.down('e');
  await page.keyboard.down('ArrowRight');
  await expect(panel.getByRole('button', { name: 'Tilt forward', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(game).toHaveAttribute('data-phase', 'crashed');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('e');
  await expect(game).toHaveAttribute('data-crash-part', /^(head|torso|arm|leg)$/);
  await expect(game.getByRole('region', { name: 'Crash result', exact: true })).toContainText(
    'You crashed',
  );
  if (testInfo.project.name === 'mobile')
    await page.screenshot({ path: testInfo.outputPath('sketch-mobile-crash.png') });
  await game.getByRole('button', { name: /Try again/ }).click();
  await expect(game).toHaveAttribute('data-phase', 'riding');
  await expect(game).toHaveAttribute('data-crash-part', '');
  await expect(page).toHaveURL(/\/arcade\/$/);
});

test('Sketch ramps launch naturally and scrolling levels advance after completion', async ({
  page,
}, testInfo) => {
  test.skip(sketchHidden, 'Sketch-to-Ride is temporarily hidden while it is refined.');
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Sketch-to-Ride');
  const game = page.locator('[data-game="sketch-ride"]');
  await expect(game).toHaveAttribute('data-mode', 'levels');
  await expect(game).toHaveAttribute('data-level', '1');
  expect(await numeric(game, 'data-course-length')).toBeGreaterThan(1500);
  const captureLevel = async (state: string) => {
    const path = testInfo.outputPath('sketch-level-' + state + '.png');
    await page.screenshot({ path });
    await testInfo.attach('Sketch level ' + state, { path, contentType: 'image/png' });
  };
  await captureLevel('ready');
  await controls(page).getByRole('button', { name: 'Pedal', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'riding');
  await expect.poll(() => numeric(game, 'data-camera-x')).toBeGreaterThan(150);
  await captureLevel('riding');
  // Observe each frame: a normal jump is shorter than expect.poll's one-second backoff.
  const flight = await page.waitForFunction(
    () => {
      const element = document.querySelector<HTMLElement>('[data-game="sketch-ride"]');
      if (
        !element ||
        Number(element.dataset.clearance) <= 35 ||
        element.dataset.grounded !== 'false'
      )
        return false;
      return {
        clearance: Number(element.dataset.clearance),
        screenY: (Number(element.dataset.worldY) - Number(element.dataset.cameraY)) * 1.5,
        jumps: Number(element.dataset.jumps),
      };
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );
  const airborne = await flight.jsonValue();
  expect(airborne.clearance).toBeGreaterThan(35);
  expect(airborne.jumps).toBe(0);
  expect(airborne.screenY).toBeLessThan(290);
  await captureLevel('airborne');
  await expect(game).toHaveAttribute('data-phase', 'finished', { timeout: 35_000 });
  await captureLevel('finish');
  expect(await numeric(game, 'data-camera-x')).toBeGreaterThan(100);
  expect(await numeric(game, 'data-world-x')).toBeGreaterThan(1500);
  await expect(game).toHaveAttribute('data-completed', '1');
  await game.getByRole('button', { name: /Next level/ }).click();
  await expect(game).toHaveAttribute('data-level', '2');
  await expect(game).toHaveAttribute('data-phase', 'ready');
  await expect(game).toHaveAttribute('data-completed', '1');
});

type WarehouseTruck = {
  id: 'dispatch' | 'dispatch2';
  sequence: number;
  phase: string;
  order: { location: string; required: number; delivered: number }[];
};

test('Warehouse Warrior serves independent trucks, restocks overnight and buys upgrades between days', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await page.goto('/arcade/');
  await play(page, 'Warehouse Warrior');
  const game = page.locator('[data-game="warehouse-shift"]');
  const panel = controls(page);
  const inventory = async () => JSON.parse((await game.getAttribute('data-inventory'))!);
  const trucks = async (): Promise<WarehouseTruck[]> =>
    JSON.parse((await game.getAttribute('data-trucks'))!);
  const inbound = async (): Promise<
    { id: string; location: string; sequence: number; remaining: number }[]
  > => JSON.parse((await game.getAttribute('data-inbound'))!);
  const carried = async (): Promise<{ location: string; quantity: number; kind: string }[]> =>
    JSON.parse((await game.getAttribute('data-carried'))!);
  const walk = async (station: string) => {
    await game.locator(`[data-station="${station}"]`).click();
    await expect(game).toHaveAttribute('data-near', station, { timeout: 10_000 });
  };
  const pickUp = () => panel.getByRole('button', { name: 'Pick up', exact: true }).click();
  const putDown = () => panel.getByRole('button', { name: 'Put down', exact: true }).click();
  const restock = async (id = 'receiving') => {
    await walk(id);
    await expect
      .poll(async () => (await inbound()).find((lane) => lane.id === id)!.remaining)
      .toBe(0);
    const lane = (await inbound()).find((lane) => lane.id === id)!;
    const before = (await inventory())[lane.location];
    await pickUp();
    await expect
      .poll(async () => (await carried()).some((item) => item.location === lane.location))
      .toBe(true);
    await walk(lane.location);
    await putDown();
    await expect.poll(async () => (await inventory())[lane.location]).toBe(before + 1);
    return lane.location;
  };

  await expect(game).toHaveAttribute('data-day', '1');
  await expect(game).toHaveAttribute('data-quota', '2');
  await expect(game).toHaveAttribute('data-cash', '0');
  await expect(panel.locator('.arcade-dpad').getByRole('button')).toHaveCount(4);
  await expect(panel.locator('.arcade-game-actions').getByRole('button')).toHaveCount(2);
  await expect(game.locator('[data-station]')).toHaveCount(21);
  await expect(game.getByRole('button', { name: /upgrades/i })).toHaveCount(0);
  await expect(page.locator('.arcade-play-header')).not.toContainText('NOW PLAYING');
  await expect(game.getByText(/Tap to walk.*Every address does both/)).toHaveCount(0);
  expect((await trucks()).map((truck) => truck.order[0].location)).toEqual(['A5', 'B2']);
  await expect(
    game.locator('.wh-goal-label:visible, .wh-compact-next:visible').first(),
  ).toContainText(/Next pick/i);

  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  const frozenClock = await numeric(game, 'data-remaining');
  const frozenDocks = await inbound();
  await page.clock.fastForward(5_000);
  expect(await numeric(game, 'data-remaining')).toBe(frozenClock);
  expect(await inbound()).toEqual(frozenDocks);
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();

  // The same two actions unload, store, retrieve, and load a truck.
  expect(await restock()).toBe('A5');
  await pickUp();
  await expect.poll(async () => (await inventory()).A5).toBe(0);
  await walk('dispatch2');
  await putDown();
  expect((await carried())[0].location).toBe('A5');
  expect(await numeric(game, 'data-cash')).toBe(0);
  const secondTruck = (await trucks())[1];
  await walk('dispatch');
  await putDown();
  await expect(game).toHaveAttribute('data-day-shipped', '1');
  await expect(game).toHaveAttribute('data-cash', '20');
  expect((await trucks())[1]).toEqual(secondTruck);
  await putDown();
  expect(await numeric(game, 'data-cash')).toBe(20);
  await expect(game.locator('[data-truck="dispatch"]')).toHaveAttribute('data-phase', 'loading', {
    timeout: 8_000,
  });
  expect((await trucks())[0].order).toEqual([]);

  await walk('B2');
  await pickUp();
  await walk('dispatch2');
  await putDown();
  await expect(game).toHaveAttribute('data-quota-met', 'true');
  await expect(game).toHaveAttribute('data-status', 'working');
  await expect(game).toHaveAttribute('data-cash', '40');
  await expect(game.getByRole('button', { name: /upgrades/i })).toHaveCount(0);
  await restock('receiving2');
  const overnightStock = await inventory();
  if (testInfo.project.name === 'mobile') {
    await page.screenshot({ path: testInfo.outputPath('warehouse-warrior-docks.png') });
  }
  await game.getByRole('button', { name: 'End day', exact: true }).click();
  await expect(game).toHaveAttribute('data-status', 'day-complete');
  const complete = game.getByRole('dialog', { name: 'Day 1 complete', exact: true });
  await complete.getByRole('button', { name: 'Shop upgrades', exact: true }).click();
  const upgrades = game.getByRole('dialog', { name: 'Warehouse upgrades', exact: true });
  await upgrades.getByRole('button', { name: '$40 \u00b7 Buy', exact: true }).click();
  await expect(game).toHaveAttribute('data-cart', 'true');
  await expect(game).toHaveAttribute('data-cash', '0');
  await upgrades.getByRole('button', { name: 'Close upgrades', exact: true }).click();
  await complete.getByRole('button', { name: 'Start day 2', exact: true }).click();
  await expect(game).toHaveAttribute('data-day', '2');
  expect(await inventory()).toEqual(overnightStock);
  const nextTruck = (await trucks())[0];
  expect(nextTruck.order.reduce((sum, line) => sum + line.required, 0)).toBe(2);
  const firstItem = nextTruck.order[0];
  expect((await inventory())[firstItem.location]).toBeGreaterThan(0);
  await walk(firstItem.location);
  await pickUp();
  await walk('dispatch');
  await putDown();
  await expect(game).toHaveAttribute('data-day-shipped', '0');
  await expect(game).toHaveAttribute('data-cash', '0');
  expect((await trucks())[0].order.reduce((sum, line) => sum + line.delivered, 0)).toBe(1);

  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await expect(game).toHaveAttribute('data-day', '1');
  await expect(game).toHaveAttribute('data-cash', '0');
  await expect(game).toHaveAttribute('data-cart', 'true');
  await expect(game).toHaveAttribute('data-best-day', '1');
  await page.getByRole('button', { name: /Back to machines/ }).click();
  await play(page, 'Warehouse Warrior');
  await expect(game).toHaveAttribute('data-cart', 'true');
  await expect(game).toHaveAttribute('data-best-day', '1');
  await page.clock.fastForward(120_000);
  await expect(game).toHaveAttribute('data-status', 'failed');
  await expect(game.getByRole('button', { name: /upgrades/i })).toHaveCount(0);
  await game
    .getByRole('dialog', { name: 'Shift over', exact: true })
    .getByRole('button', { name: /Try again/ })
    .click();
  await expect(game).toHaveAttribute('data-status', 'working');
  await expect(game).toHaveAttribute('data-cart', 'true');
});

test('Warehouse Warrior keeps held boxes until placement and charges for discarding them', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Warehouse Warrior');
  const game = page.locator('[data-game="warehouse-shift"]');
  const panel = controls(page);
  const walk = async (station: string) => {
    await game.locator(`[data-station="${station}"]`).click();
    await expect(game).toHaveAttribute('data-near', station, { timeout: 10_000 });
  };
  const carried = () => game.getAttribute('data-carried');
  await walk('B1');
  await page.keyboard.press('q');
  await expect(game).toHaveAttribute('data-carrying', '1');
  const load = await carried();
  await walk('receiving2');
  await panel.getByRole('button', { name: 'Pick up', exact: true }).click();
  expect(await carried()).toBe(load);
  await page.keyboard.press('e');
  expect(await carried()).toBe(load);
  await walk('B2');
  await panel.getByRole('button', { name: 'Put down', exact: true }).click();
  expect(await carried()).toBe(load);
  await walk('trash');
  await expect(game.locator('.wh-trash-cost')).toContainText('$5');
  await page.keyboard.press('e');
  await expect(game).toHaveAttribute('data-carrying', '0');
  await expect(game).toHaveAttribute('data-cash', '-5');
  await page.keyboard.press('e');
  expect(await numeric(game, 'data-cash')).toBe(-5);
});

test('both visible games remain playable and Sketch stays hidden without WebGL', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/arcade/');
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-renderer', 'fallback');
  await expect(machine(page, 'Sketch-to-Ride')).toHaveCount(0);
  await expect(page.locator('.arcade-fallback-machines > button')).toHaveCount(2);
  for (const title of visibleMachines) {
    await play(page, title);
    if (title === 'Resume Run') {
      await holdKeyUntil(
        page,
        'ArrowRight',
        () => numeric(page.locator('.shoreline-game'), 'data-position'),
        25,
      );
      await page.keyboard.up('ArrowRight');
    } else {
      await holdKeyUntil(
        page,
        'ArrowRight',
        () => numeric(page.locator('[data-game="warehouse-shift"]'), 'data-x'),
        220,
      );
      await page.keyboard.up('ArrowRight');
    }
    await page.getByRole('button', { name: /Back to machines/ }).click();
    await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
  }
  await expect(page).toHaveURL(/\/arcade\/$/);
});

test('the homepage links to the separate arcade and the arcade links back to the portfolio', async ({
  page,
}) => {
  await installProteinApi(page);
  await page.goto('/#work');
  await expect(page.locator('#work .project-card')).toHaveCount(3);
  const invitation = page.getByRole('link', { name: /A few experiments worth playing/ });
  await expect(invitation).toHaveAttribute('href', '/arcade/');
  await invitation.click();
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.getByRole('link', { name: 'Back to portfolio', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'JAKE COSTELLO.' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu +', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Project Arcade', exact: true })
    .click();
  await expect(page).toHaveURL(/\/arcade\/$/);
});
