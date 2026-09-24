import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

const clubs = [
  'Driver — Creative beginnings',
  '5 iron — Rock climbing',
  '7 iron — Beach volleyball',
  'Wedge — Drawing',
  'Putter — Two cats',
  '3 wood — Jet skis',
] as const;
const clubKinds = ['driver', 'iron', 'iron', 'wedge', 'putter', 'wood'] as const;

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

async function openGolf(page: Page) {
  await page.goto('/#about');
  const golf = page.getByRole('region', { name: 'Personal facts golf' });
  await golf.scrollIntoViewIfNeeded();
  await expect(golf).toBeVisible();
  return golf;
}

async function beginTimedGolf(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  const golf = await openGolf(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  return golf;
}

async function dragPointer(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  touch: boolean,
  touchSession?: CDPSession,
) {
  if (!touch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    return;
  }
  // Use native Chromium touch input, which exercises pointer capture and touch-action.
  const session = touchSession ?? (await page.context().newCDPSession(page));
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...from, id: 1 }],
    });
    for (let step = 1; step <= 12; step += 1) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step) / 12,
            y: from.y + ((to.y - from.y) * step) / 12,
            id: 1,
          },
        ],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    if (!touchSession) await session.detach();
  }
}

async function tapWithSession(target: Locator, session: CDPSession) {
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2, id: 1 }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('Revision Marine identifies the engineering role and links to the company', async ({
  page,
}) => {
  await page.goto('/#about');
  const about = page.locator('#about');
  await expect(about).toContainText(/founding engineer/i);
  await expect(page.locator('main')).not.toContainText(/cofound(er|ing)/i);
  await expect(about.getByRole('link', { name: /Revision Marine/ })).toHaveAttribute(
    'href',
    'https://revision-marine.com/',
  );
  await expect(
    page.locator('#project-revision').getByRole('link', { name: /Revision Marine/ }),
  ).toHaveAttribute('href', 'https://revision-marine.com/');
  await page.getByRole('button', { name: 'Read about Revision Marine' }).click();
  const project = page.getByRole('dialog');
  await expect(project).toContainText(/founding engineer/i);
  await expect(project).toContainText(/warehous/i);
  await expect(project).toContainText(/infrastructure/i);
  await expect(project).toContainText(/internal app/i);
  await expect(project.getByRole('link', { name: /Revision Marine/ })).toHaveAttribute(
    'href',
    'https://revision-marine.com/',
  );
  await page.keyboard.press('Escape');
});

test('the white ball is selected while mystery achievements remain locked', async ({ page }) => {
  const golf = await openGolf(page);
  const about = page.locator('#about');
  const white = about.getByRole('radio', { name: 'White ball', exact: true });
  const locked = about.getByRole('radio', { name: /^Mystery achievement [12], locked$/ });
  await expect(white).toBeChecked();
  await expect(white).toBeEnabled();
  await expect(locked).toHaveCount(2);
  for (const mystery of await locked.all()) {
    await expect(mystery).toBeDisabled();
    await mystery.evaluate((radio) => (radio as HTMLInputElement).click());
    await expect(mystery).not.toBeChecked();
  }
  await expect(white).toBeChecked();
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.golf-fact-ball')).toHaveCount(0);
});

test('clubs reveal personal stories with keyboard controls and a readable alternative', async ({
  page,
}) => {
  const golf = await openGolf(page);
  const driver = golf.getByRole('button', { name: clubs[0], exact: true });
  await driver.focus();
  await expect(driver.locator('.golf-club-tooltip')).toHaveCSS('opacity', '1');
  await expect(driver.locator('.golf-club-tooltip')).toContainText('Creative beginnings');
  await page.keyboard.press('Enter');
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(golf.locator('.golf-scene__golfer')).toHaveAttribute('data-club-kind', 'driver');
  await expect(golf.locator('.golf-scene__pose--followthrough .golf-held-club')).toHaveAttribute(
    'data-club-kind',
    'driver',
  );
  await expect(page.locator('.golf-fact-copy')).toContainText(/animation/i);
  await expect(page.locator('.golf-fact-copy')).toContainText(/computer science/i);
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(driver).toBeFocused();

  const putter = golf.getByRole('button', { name: clubs[4], exact: true });
  await putter.focus();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('heading', { name: 'Are You Crazy??? Putter off the Tee???', exact: true }),
  ).toBeVisible();
  await expect(golf.locator('.golf-scene__pose--followthrough .golf-held-club')).toHaveAttribute(
    'data-club-kind',
    'putter',
  );
  await expect(page.locator('.golf-fact-copy')).toContainText(/two cats|2 cats/i);
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(putter).toBeFocused();

  // Every illustrated club must be independently clickable, including clubs beside it.
  for (const index of [1, 2, 3, 5]) {
    const club = golf.getByRole('button', { name: clubs[index], exact: true });
    await club.click();
    await expect(golf.locator('.golf-scene__pose--followthrough .golf-held-club')).toHaveAttribute(
      'data-club-kind',
      clubKinds[index],
    );
    await expect(page.locator('.golf-fact-kicker')).toContainText(clubs[index].split(' — ')[1]);
    await page.getByRole('button', { name: 'Next shot', exact: true }).click();
    await expect(club).toBeFocused();
  }

  await golf.getByText('Read all 6 facts', { exact: true }).click();
  const facts = golf.locator('details[open]');
  for (const topic of [
    /animation/i,
    /rock climbing/i,
    /beach volleyball/i,
    /draw/i,
    /two cats/i,
    /jet\s?ski/i,
  ]) {
    await expect(facts).toContainText(topic);
  }
  // A completed animation minor must not be inferred from animation classes.
  await expect(facts).not.toContainText(/earned.*animation minor|minor in animation/i);
  await expect(facts.locator('article')).toHaveCount(6);
});

test('reduced motion leaves each fact readable until the visitor requests the next shot', async ({
  page,
}) => {
  await page.clock.install();
  const golf = await openGolf(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await golf.getByRole('button', { name: clubs[4], exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(page.locator('.golf-fact-copy')).toContainText(/two cats|2 cats/i);
  await page.mouse.move(1, 1);
  await page.clock.runFor(12_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await page.clock.runFor(12_000);
  await expect(page.locator('.golf-fact-ball')).toHaveCount(0);
});

test('dragging a club to the golfer plays its story, while a missed drop does not swing', async ({
  page,
}, testInfo) => {
  const golf = await openGolf(page);
  const club = golf.getByRole('button', { name: clubs[2], exact: true });
  await club.scrollIntoViewIfNeeded();
  const origin = await club.boundingBox();
  const target = await golf.locator('.golf-drop-zone').boundingBox();
  expect(origin).not.toBeNull();
  expect(target).not.toBeNull();
  await dragPointer(
    page,
    { x: origin!.x + origin!.width / 2, y: origin!.y + origin!.height / 2 },
    { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 },
    testInfo.project.name === 'mobile',
  );
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(page.locator('.golf-fact-copy')).toContainText(/beach volleyball/i);
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(club).toBeFocused();

  const otherClub = golf.getByRole('button', { name: clubs[1], exact: true });
  await otherClub.scrollIntoViewIfNeeded();
  const another = await otherClub.boundingBox();
  await dragPointer(
    page,
    { x: another!.x + another!.width / 2, y: another!.y + another!.height / 2 },
    { x: 4, y: 4 },
    testInfo.project.name === 'mobile',
  );
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.golf-fact-ball')).toHaveCount(0);
});

test('all six club heads remain touch-reachable on narrow phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const touchSession = await page.context().newCDPSession(page);
  try {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const golf = await openGolf(page);
      for (const label of clubs) {
        const club = golf.getByRole('button', { name: label, exact: true });
        await club.scrollIntoViewIfNeeded();
        const bounds = await club.boundingBox();
        expect(bounds!.width).toBeGreaterThanOrEqual(24);
        expect(bounds!.height).toBeGreaterThanOrEqual(24);
        await tapWithSession(club, touchSession);
        await expect(page.locator('.golf-fact-kicker')).toContainText(label.split(' — ')[1]);
        if (label === clubs[0]) {
          const next = await page
            .getByRole('button', { name: 'Next shot', exact: true })
            .boundingBox();
          await dragPointer(
            page,
            { x: next!.x + next!.width / 2, y: next!.y + next!.height / 2 },
            { x: 4, y: 4 },
            true,
            touchSession,
          );
          await expect(golf).toHaveAttribute('data-phase', 'reading');
        }
        await tapWithSession(
          page.getByRole('button', { name: 'Next shot', exact: true }),
          touchSession,
        );
        await expect(golf).toHaveAttribute('data-phase', 'idle');
      }

      const club = golf.getByRole('button', { name: clubs[2], exact: true });
      const origin = await club.boundingBox();
      const target = await golf.locator('.golf-drop-zone').boundingBox();
      await dragPointer(
        page,
        { x: origin!.x + origin!.width / 2, y: origin!.y + origin!.height / 2 },
        { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 },
        true,
        touchSession,
      );
      await expect(page.locator('.golf-fact-copy')).toContainText(/beach volleyball/i);
      await tapWithSession(
        page.getByRole('button', { name: 'Next shot', exact: true }),
        touchSession,
      );
      await expect(golf).toHaveAttribute('data-phase', 'idle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `.cache/golf-tests-phone-${width}.png` });
    }
  } finally {
    await touchSession.detach();
  }
});

test('a shot swings, approaches the screen, waits to be read, then falls away', async ({
  page,
}) => {
  const golf = await beginTimedGolf(page);
  const driver = golf.getByRole('button', { name: clubs[0], exact: true });
  await driver.click();
  await page.mouse.move(1, 1);
  await expect(golf).toHaveAttribute('data-phase', 'swing');
  await page.clock.runFor(950);
  await expect(golf).toHaveAttribute('data-phase', 'flight');
  await page.clock.runFor(700);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(page.locator('.golf-fact-copy')).toContainText(/animation/i);
  await page.clock.runFor(6_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.clock.runFor(1_100);
  await expect(golf).toHaveAttribute('data-phase', 'falling');
  await page.clock.runFor(1_150);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.golf-fact-ball')).toHaveCount(0);
  await expect(driver).toBeEnabled();
});

test('keep reading pauses expiry and repeated swing input cannot stack shots', async ({ page }) => {
  const golf = await beginTimedGolf(page);
  const swing = golf.getByRole('button', { name: clubs[0], exact: true });
  // Dispatch several activations in one event-loop turn to exercise the in-flight guard.
  await swing.evaluate((button) => {
    for (let click = 0; click < 4; click += 1) (button as HTMLButtonElement).click();
  });
  await golf.getByRole('button', { name: clubs[4], exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.mouse.move(1, 1);
  await page.clock.runFor(950);
  await page.clock.runFor(700);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(page.locator('.golf-fact-copy')).toContainText(/animation/i);
  await expect(page.locator('.golf-fact-ball')).toHaveCount(1);
  await page.getByRole('button', { name: 'Keep reading', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(page.getByRole('button', { name: 'Reading paused', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.clock.runFor(15_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.getByRole('button', { name: 'Reading paused', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep reading', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  // The ball naturally arrives beneath the cursor; hover must not stop its countdown.
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.clock.runFor(6_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.clock.runFor(1_100);
  await expect(golf).toHaveAttribute('data-phase', 'falling');
  await page.clock.runFor(1_150);
  await expect(golf).toHaveAttribute('data-phase', 'idle');

  await swing.click();
  await page.clock.runFor(950);
  await page.clock.runFor(700);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'falling');
  await page.clock.runFor(1_150);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await page.clock.runFor(15_000);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.golf-fact-ball')).toHaveCount(0);
});

test('the fact ball fills the viewport independently of the scene and Escape restores its club', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const golf = await openGolf(page);
  const driver = golf.getByRole('button', { name: clubs[0], exact: true });
  await driver.click();
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  const ball = page.locator('.golf-fact-ball');
  await expect(ball).toBeInViewport();
  // The overlay must escape any layout clipping applied to the little golf scene.
  await expect(golf.locator('.golf-fact-ball')).toHaveCount(0);
  const viewport = page.viewportSize()!;
  const ballBounds = await ball.boundingBox();
  expect(Math.abs(ballBounds!.x + ballBounds!.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(ballBounds!.y + ballBounds!.height / 2 - viewport.height / 2)).toBeLessThan(2);
  expect(ballBounds!.width).toBeGreaterThan(Math.min(viewport.width, viewport.height) * 0.7);
  for (const selector of ['.golf-fact-content', '.golf-fact-actions']) {
    const content = page.locator(selector);
    await expect(content).toBeInViewport({ ratio: 1 });
    const bounds = await content.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Next shot', exact: true }).focus();
  await page.screenshot({ path: `.cache/golf-tests-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(driver).toBeFocused();
  expect(errors).toEqual([]);
});

test('the introduction sits beside an unboxed golf scene with directly playable clubs', async ({
  page,
}, testInfo) => {
  const golf = await openGolf(page);
  const intro = page.locator('#about > .about-heading');
  const introBounds = await intro.boundingBox();
  const golfBounds = await golf.boundingBox();
  expect(introBounds).not.toBeNull();
  expect(golfBounds).not.toBeNull();
  if (testInfo.project.name === 'desktop') {
    expect(introBounds!.x + introBounds!.width).toBeLessThanOrEqual(golfBounds!.x);
    expect(
      Math.min(introBounds!.y + introBounds!.height, golfBounds!.y + golfBounds!.height),
    ).toBeGreaterThan(Math.max(introBounds!.y, golfBounds!.y));
  } else {
    expect(introBounds!.y + introBounds!.height).toBeLessThanOrEqual(golfBounds!.y);
  }
  await expect(golf).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(golf).toHaveCSS('border-top-width', '0px');
  await expect(golf.locator('.golf-facts-scene')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(golf.getByRole('button', { name: 'Take a swing', exact: true })).toHaveCount(0);
  for (const club of clubs)
    await expect(golf.getByRole('button', { name: club, exact: true })).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    const iron = golf.getByRole('button', { name: clubs[1], exact: true });
    await iron.hover();
    await expect(iron.locator('.golf-club-tooltip')).toHaveCSS('opacity', '1');
    await expect(iron.locator('.golf-club-tooltip')).toContainText('Rock climbing');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.cache/golf-tests-idle-${testInfo.project.name}.png` });
});
