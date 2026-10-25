import { expect, test } from '@playwright/test';
import type { CDPSession, Locator, Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

const machines = ['Shoreline Run', 'Sketch-to-Ride', 'Warehouse Shift'] as const;
const gameIds = ['shoreline', 'sketch', 'warehouse'] as const;
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

test('the arcade directly loads and reloads three actual 3D machines without API requests', async ({
  page,
}) => {
  const errors: string[] = [];
  const dataRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
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
    await expect(
      page.getByRole('group', { name: 'Arcade machines', exact: true }).getByRole('button'),
    ).toHaveCount(3);
    for (const title of machines) await expect(machine(page, title)).toBeAttached();
    await expect(page.getByRole('button', { name: /Step up to play|^Choose / })).toHaveCount(0);
    await expect(
      page.locator('.arcade-room-intro, .arcade-lobby-info, .arcade-machine-list'),
    ).toHaveCount(0);
    await expectSelected(page, 'Shoreline Run');
    await expect(
      page.locator('.protein-explorer, .shoreline-game, .sr-game, [data-game="warehouse-shift"]'),
    ).toHaveCount(0);
  }
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('three-machine selection wraps and Enter plays locally while Escape returns to the room', async ({
  page,
}) => {
  await page.goto('/arcade/');
  await expectRoomReady(page);
  for (const title of ['Sketch-to-Ride', 'Warehouse Shift', 'Shoreline Run'] as const) {
    await page.getByRole('button', { name: 'Next machine', exact: true }).click();
    await expectSelected(page, title);
  }
  await page.getByRole('button', { name: 'Previous machine', exact: true }).click();
  await expectSelected(page, 'Warehouse Shift');
  const room = page.getByRole('main', { name: 'Project arcade', exact: true });
  await room.focus();
  await page.keyboard.press('ArrowRight');
  await expectSelected(page, 'Shoreline Run');
  await page.keyboard.press('ArrowLeft');
  await expectSelected(page, 'Warehouse Shift');
  await page.keyboard.press('Enter');
  await expectGameReady(page, 'Warehouse Shift');
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
  await expectSelected(page, 'Warehouse Shift');
  await expect(room).toBeFocused();
});

test('Shoreline really moves, pumps and jumps; pausing freezes it and blur clears held keys', async ({
  page,
}) => {
  // Software GPUs need extra total time for initialization and several camera transitions.
  // Individual gameplay assertions retain their normal deadlines.
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Shoreline Run');
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
  await play(page, 'Shoreline Run');
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
  await play(page, 'Shoreline Run');
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
  await page.goto('/arcade/');
  await play(page, 'Sketch-to-Ride');
  const game = page.locator('[data-game="sketch-ride"]');
  await expect(game).toHaveAttribute('data-phase', 'drawing');
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
  await page.goto('/arcade/');
  await play(page, 'Sketch-to-Ride');
  const game = page.locator('[data-game="sketch-ride"]');
  const panel = controls(page);
  await expect(panel.locator('.arcade-dpad').getByRole('button')).toHaveCount(2);
  await expect(panel.locator('.arcade-game-actions').getByRole('button')).toHaveCount(2);
  for (const label of ['Tilt back', 'Tilt forward', 'Pedal', 'Brake'])
    await expect(panel.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: /Jump|Draw|Move/ })).toHaveCount(0);

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

test('warehouse work earns cash and a purchased picking cart carries larger loads', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/arcade/');
  await play(page, 'Warehouse Shift');
  const game = page.locator('[data-game="warehouse-shift"]');
  await expect(game).toHaveAttribute('data-cash', '0');
  const panel = controls(page);
  await expect(panel.locator('.arcade-dpad.four-way').getByRole('button')).toHaveCount(4);
  for (const direction of ['up', 'left', 'down', 'right'])
    await expect(
      panel.getByRole('button', { name: `Move ${direction}`, exact: true }),
    ).toBeVisible();
  await expect(panel.locator('.arcade-game-actions').getByRole('button')).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Upgrades', exact: true })).toHaveCount(0);
  if (testInfo.project.name === 'mobile')
    await page.screenshot({ path: testInfo.outputPath('warehouse-mobile-upgrades.png') });
  await game.getByRole('button', { name: 'Upgrades ↗', exact: true }).click();
  const upgrades = page.getByRole('dialog', { name: 'Warehouse upgrades', exact: true });
  await expect(upgrades.getByRole('button', { name: '$40 · Buy', exact: true })).toBeDisabled();
  await upgrades.getByRole('button', { name: 'Close upgrades' }).click();
  for (let shipped = 1; shipped <= 2; shipped += 1) {
    await game
      .getByRole('button', { name: 'Walk to receiving and unload goods', exact: true })
      .click();
    await expect(game).toHaveAttribute('data-phase', 'put-away', { timeout: 10_000 });
    await game
      .getByRole('button', { name: 'Walk to racks and put away or pick goods', exact: true })
      .click();
    await expect(game).toHaveAttribute('data-phase', 'pick', { timeout: 10_000 });
    await controls(page).getByRole('button', { name: 'Interact', exact: true }).click();
    await expect(game).toHaveAttribute('data-phase', 'dispatch');
    await game
      .getByRole('button', { name: 'Walk to dispatch and ship order', exact: true })
      .click();
    await expect(game).toHaveAttribute('data-shipped', String(shipped), { timeout: 10_000 });
    await expect(game).toHaveAttribute('data-cash', String(shipped * 20));
  }
  await page.keyboard.press('q');
  await upgrades.getByRole('button', { name: '$40 · Buy', exact: true }).click();
  await expect(game).toHaveAttribute('data-cart', 'true');
  await expect(game).toHaveAttribute('data-cash', '0');
  await upgrades.getByRole('button', { name: 'Close upgrades' }).click();
  await game
    .getByRole('button', { name: 'Walk to receiving and unload goods', exact: true })
    .click();
  await expect(game).toHaveAttribute('data-carrying', '3', { timeout: 10_000 });
  await expect(page).toHaveURL(/\/arcade\/$/);
  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await expect(game).toHaveAttribute('data-cash', '0');
  await expect(game).toHaveAttribute('data-cart', 'false');
  await expect(game).toHaveAttribute('data-shipped', '0');
});

test('all three games remain playable when WebGL is unavailable', async ({ page }) => {
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
  for (const title of machines) {
    await play(page, title);
    if (title === 'Shoreline Run') {
      await holdKeyUntil(
        page,
        'ArrowRight',
        () => numeric(page.locator('.shoreline-game'), 'data-position'),
        25,
      );
      await page.keyboard.up('ArrowRight');
    } else if (title === 'Sketch-to-Ride') {
      await controls(page).getByRole('button', { name: 'Pedal', exact: true }).click();
      await expect
        .poll(() => numeric(page.locator('[data-game="sketch-ride"]'), 'data-progress'))
        .toBeGreaterThan(1);
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
  await expect(page.locator('#work .project-card')).toHaveCount(2);
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
