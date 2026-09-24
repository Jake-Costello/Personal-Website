import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { experience } from '../../src/data/experience';
import { achievementMessages } from '../../src/data/achievements';
import { MAX_SPEED } from '../../src/game/model';
import { buildJourneyRoute } from '../../src/game/route';
import { buildTrialCourse, PENALTY_SECONDS, TRIAL_SPEED } from '../../src/game/trial';
import { installProteinApi } from './protein-fixtures';

const route = buildJourneyRoute(experience, MAX_SPEED);
const course = buildTrialCourse(route, experience);
const trialVelocity = MAX_SPEED * TRIAL_SPEED;
const clockStart = new Date('2026-01-01T00:00:00Z');
const clockPause = new Date('2026-01-02T00:00:00Z');

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

async function visibleScene(page: Page) {
  const stage = page.locator('.journey-stage');
  await stage.scrollIntoViewIfNeeded();
  await stage.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(element);
      }),
  );
}

async function unlockTrial(page: Page) {
  await page.clock.install({ time: clockStart });
  await page.goto('/#experience');
  await expect(page.locator('.journey').getByRole('button', { name: /time trial/i })).toHaveCount(
    0,
  );
  await page.locator(`.journey-chapter[data-chapter="${experience.at(-1)!.id}"]`).click();
  await expect(page.locator('.journey-story')).toHaveAttribute(
    'data-story-id',
    experience.at(-1)!.id,
  );
  await expect(page.locator('.journey').getByRole('button', { name: /time trial/i })).toBeVisible();
  await page.clock.pauseAt(clockPause);
}

async function enterTrial(page: Page) {
  await page
    .locator('.journey')
    .getByRole('button', { name: /time trial/i })
    .click();
  await expect(page.locator('.journey')).toHaveAttribute('data-mode', 'trial');
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'ready');
  await visibleScene(page);
}

async function startTrial(page: Page) {
  await visibleScene(page);
  await page.getByRole('button', { name: 'Start time trial →' }).click();
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'running');
  await page.clock.runFor(100);
  expect(Number(await page.locator('.trial-hud').getAttribute('data-elapsed'))).toBeGreaterThan(0);
}

const position = (page: Page) =>
  page
    .locator('.journey-progress-fill')
    .evaluate(
      (element, length) => (parseFloat((element as HTMLElement).style.width) / 100) * length,
      route.length,
    );

async function advanceTo(page: Page, target: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remaining = target - (await position(page));
    if (remaining < 30) break;
    // Quiet travel can skip render frames; the race still advances its real
    // fixed-step simulation. Pump and jump remain ordinary keyboard actions.
    await page.clock.fastForward(
      Math.max(1, Math.floor(((remaining - 15) / trialVelocity) * 1000)),
    );
    await page.clock.runFor(34);
  }
  expect(Math.abs(target - (await position(page)))).toBeLessThan(70);
}

async function expectTrialFits(page: Page) {
  // Viewport changes notify the SVG's ResizeObserver asynchronously. Wait for
  // that commit before comparing the page and scene bounds.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const geometry = await page.locator('.journey-stage').evaluate((stage) => {
    const scene = stage.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      boxes: [
        ...stage.querySelectorAll(
          '.trial-scoreboard, .trial-card, .trial-chapter, .journey-controls',
        ),
      ].map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: element.className,
          fits:
            box.left >= scene.left &&
            box.right <= scene.right &&
            box.top >= scene.top &&
            box.bottom <= scene.bottom,
        };
      }),
    };
  });
  expect(geometry.overflow).toBe(false);
  for (const box of geometry.boxes)
    expect(box.fits, `${box.name} should fit inside the scene`).toBe(true);
}

test('finishing the story unlocks a persistent trial with fixed controls and pausing', async ({
  page,
}, testInfo) => {
  await unlockTrial(page);
  await page.reload();
  await expect(page.locator('.journey').getByRole('button', { name: /time trial/i })).toBeVisible();
  await enterTrial(page);
  await expect(page.locator('.journey-chapter:enabled, .journey-life-stage:enabled')).toHaveCount(
    0,
  );
  await expectTrialFits(page);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 844 });
    await expectTrialFits(page);
    await page.locator('.journey-stage').screenshot({ path: '.cache/trial-ready-320.png' });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page
    .locator('.journey-stage')
    .screenshot({ path: `.cache/trial-ready-${testInfo.project.name}.png` });
  await startTrial(page);
  await expect(page.getByRole('button', { name: 'Left', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Right', exact: true })).toHaveCount(0);
  for (let tap = 0; tap < 3; tap += 1) {
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(60);
  }
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', '2');
  await page.clock.runFor(700);
  expect(await position(page)).toBeGreaterThan(0);
  await expectTrialFits(page);
  await page
    .locator('.journey-stage')
    .screenshot({ path: `.cache/trial-running-${testInfo.project.name}.png` });
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 844 });
    await expectTrialFits(page);
    await page.locator('.journey-stage').screenshot({ path: '.cache/trial-running-320.png' });
    await page.setViewportSize({ width: 390, height: 844 });
  }

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'paused');
  const pausedScore = await page.locator('.trial-hud').getAttribute('data-score');
  const pausedPosition = await position(page);
  await page.clock.fastForward(5000);
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-score', pausedScore!);
  expect(await position(page)).toBe(pausedPosition);
  await expectTrialFits(page);

  await page.getByRole('button', { name: 'Resume ride →' }).click();
  await page.clock.runFor(300);
  await page.getByRole('button', { name: 'Full screen ↗', exact: true }).focus();
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'paused');
  await page.getByRole('button', { name: 'Resume ride →' }).click();
  await page.clock.runFor(300);
  await page.getByRole('heading', { name: 'JAKE COSTELLO.' }).scrollIntoViewIfNeeded();
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'paused');
  await page.getByRole('button', { name: 'Back to story', exact: true }).click();
  await expect(page.locator('.journey')).toHaveAttribute('data-mode', 'story');
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', '1');
  await expect(
    page.getByRole('radio', { name: 'Yellow ball, locked', exact: true }),
  ).toBeDisabled();
});

test('driving through the obstacles finishes with penalties and leaves the reward locked', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  test.setTimeout(90000);
  await unlockTrial(page);
  await enterTrial(page);
  await startTrial(page);
  // Finishing removes the ride buttons. Losing their focus must not pause or
  // overwrite the completed result when the controls unmount.
  await page.getByRole('button', { name: 'Jump', exact: true }).focus();
  await page.clock.fastForward((course.targetSeconds + 2) * 1000);
  const hud = page.locator('.trial-hud');
  await expect(hud).toHaveAttribute('data-trial-phase', 'finished');
  await expect(hud).toHaveAttribute('data-hits', String(course.obstacles.length));
  await expect(hud).toHaveAttribute('data-cleared', '0');
  await expect(hud).toHaveAttribute(
    'data-penalty',
    String(course.obstacles.length * PENALTY_SECONDS),
  );
  await expect(hud).toHaveAttribute('data-qualified', 'false');
  expect(Number(await hud.getAttribute('data-score'))).toBeGreaterThan(course.targetSeconds);
  await expect(
    page.getByRole('radio', { name: 'Yellow ball, locked', exact: true }),
  ).toBeDisabled();
  await expectTrialFits(page);
  await page
    .locator('.journey-stage')
    .screenshot({ path: '.cache/trial-result-missed-desktop.png' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectTrialFits(page);
    await page
      .locator('.journey-stage')
      .screenshot({ path: `.cache/trial-result-missed-${width}.png` });
  }
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(hud).toHaveAttribute('data-trial-phase', 'ready');
  await expect(hud).toHaveAttribute('data-hits', '0');
  await expect(hud).toHaveAttribute('data-score', '0');
});

test('a real pump-and-jump run earns the yellow ball and preserves its selection after reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  test.setTimeout(120000);
  await unlockTrial(page);
  await enterTrial(page);
  await startTrial(page);
  for (const [index, obstacle] of course.obstacles.entries()) {
    await advanceTo(page, obstacle.position - 850);
    await page.keyboard.down('ArrowDown');
    await advanceTo(page, obstacle.position - 320);
    await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'crouched');
    await page.keyboard.up('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.clock.runFor(100);
    await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'extended');
    await page.clock.runFor(850);
    await expect(page.locator('.trial-hud')).toHaveAttribute('data-cleared', String(index + 1));
    await expect(page.locator('.trial-hud')).toHaveAttribute('data-hits', '0');
  }
  await page.clock.fastForward(
    Math.ceil(((route.length - (await position(page))) / trialVelocity) * 1000) + 1000,
  );
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-trial-phase', 'finished');
  await expect(page.locator('.trial-hud')).toHaveAttribute('data-qualified', 'true');
  const rewardPopup = page.getByRole('dialog', { name: achievementMessages.yellow.title });
  await expect(rewardPopup).toBeVisible();
  await rewardPopup.getByRole('button', { name: 'Keep exploring' }).click();
  await expect(rewardPopup).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hello, yellow.' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Yellow ball', exact: true })).toBeEnabled();
  await expectTrialFits(page);
  await page.locator('.journey-stage').screenshot({ path: '.cache/trial-result-won-desktop.png' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectTrialFits(page);
    await page
      .locator('.journey-stage')
      .screenshot({ path: `.cache/trial-result-won-${width}.png` });
  }
  await page.getByRole('link', { name: 'Try the yellow golf ball ↗' }).click();
  await page.getByText('Bright yellow', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Yellow ball', exact: true })).toBeChecked();
  await expect(page.locator('.golf-scene__tee-ball')).toHaveAttribute('data-ball-color', 'yellow');
  await page.reload();
  await expect(
    page.getByRole('dialog', { name: achievementMessages.yellow.title }),
  ).not.toBeVisible();
  await expect(page.getByRole('radio', { name: 'Yellow ball', exact: true })).toBeChecked();
  await expect(page.locator('.golf-scene__tee-ball')).toHaveAttribute('data-ball-color', 'yellow');
});
