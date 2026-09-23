import { expect, test, type Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

const clubs = [
  'Driver — Creative beginnings',
  '5 iron — Rock climbing',
  '7 iron — Beach volleyball',
  'Wedge — Drawing',
  'Putter — Two cats',
  '3 wood — Jet skis',
] as const;

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
) {
  if (!touch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    return;
  }
  // Use native Chromium touch input, which exercises pointer capture and touch-action.
  const session = await page.context().newCDPSession(page);
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
    await session.detach();
  }
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

test('clubs reveal personal stories with keyboard controls and a readable alternative', async ({
  page,
}) => {
  const golf = await openGolf(page);
  await expect(golf.getByRole('button', { name: 'Take a swing', exact: true })).toBeEnabled();
  await golf.getByRole('button', { name: clubs[0], exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(golf.getByRole('button', { name: clubs[0], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await golf.getByRole('button', { name: 'Take a swing', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(golf.locator('.golf-fact-copy')).toContainText(/animation/i);
  await expect(golf.locator('.golf-fact-copy')).toContainText(/computer science/i);
  await expect(golf).toContainText('1 / 6 discovered');
  await golf.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(golf.getByRole('button', { name: 'Take a swing', exact: true })).toBeFocused();

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
  await golf.getByRole('button', { name: 'Take a swing', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(golf.locator('.golf-fact-copy')).toContainText(/two cats|2 cats/i);
  await page.mouse.move(1, 1);
  await page.clock.runFor(12_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(golf).toContainText('1 / 6 discovered');
  await golf.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await page.clock.runFor(12_000);
  await expect(golf.locator('.golf-fact-ball')).toHaveCount(0);
  await expect(golf).toContainText('1 / 6 discovered');
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
  await expect(golf.locator('.golf-fact-copy')).toContainText(/beach volleyball/i);
  await golf.getByRole('button', { name: 'Next shot', exact: true }).click();

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
  await expect(golf).toContainText('1 / 6 discovered');
  await expect(golf.locator('.golf-fact-ball')).toHaveCount(0);
});

test('a shot swings, approaches the screen, waits to be read, then falls away', async ({
  page,
}) => {
  const golf = await beginTimedGolf(page);
  await golf.getByRole('button', { name: 'Take a swing', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(golf).toHaveAttribute('data-phase', 'swing');
  await page.clock.runFor(950);
  await expect(golf).toHaveAttribute('data-phase', 'flight');
  await page.clock.runFor(700);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await expect(golf.locator('.golf-fact-copy')).toContainText(/animation/i);
  await expect(golf).toContainText('1 / 6 discovered');
  await page.clock.runFor(6_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await page.clock.runFor(1_100);
  await expect(golf).toHaveAttribute('data-phase', 'falling');
  await page.clock.runFor(1_150);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(golf.locator('.golf-fact-ball')).toHaveCount(0);
  await expect(golf.getByRole('button', { name: 'Take a swing', exact: true })).toBeEnabled();
});

test('keep reading pauses expiry and repeated swing input cannot stack shots', async ({ page }) => {
  const golf = await beginTimedGolf(page);
  const swing = golf.getByRole('button', { name: 'Take a swing', exact: true });
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
  await expect(golf.locator('.golf-fact-copy')).toContainText(/animation/i);
  await expect(golf).toContainText('1 / 6 discovered');
  await golf.getByRole('button', { name: 'Keep reading', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(golf.getByRole('button', { name: 'Reading paused', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.clock.runFor(15_000);
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  await golf.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'falling');
  await page.clock.runFor(1_150);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await page.clock.runFor(15_000);
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(golf).toContainText('1 / 6 discovered');
});

test('the fact card fits the screen and Escape restores the golf controls', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const golf = await openGolf(page);
  // The decorative ball can extend past the scene; its text and controls must fit.
  await golf.getByRole('button', { name: clubs[0], exact: true }).click();
  await golf.getByRole('button', { name: 'Take a swing', exact: true }).click();
  await expect(golf).toHaveAttribute('data-phase', 'reading');
  const ball = golf.locator('.golf-fact-ball');
  await expect(ball).toBeInViewport();
  const sceneBounds = await golf.locator('.golf-facts-scene').boundingBox();
  for (const selector of ['.golf-fact-content', '.golf-fact-actions']) {
    const content = golf.locator(selector);
    await expect(content).toBeInViewport({ ratio: 1 });
    const bounds = await content.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(Math.max(0, sceneBounds!.x));
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      Math.min(page.viewportSize()!.width, sceneBounds!.x + sceneBounds!.width) + 1,
    );
    expect(bounds!.y).toBeGreaterThanOrEqual(sceneBounds!.y);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(sceneBounds!.y + sceneBounds!.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await golf.getByRole('button', { name: 'Next shot', exact: true }).focus();
  await page.screenshot({ path: `.cache/golf-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(golf).toHaveAttribute('data-phase', 'idle');
  await expect(golf.getByRole('button', { name: 'Take a swing', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
