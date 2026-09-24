import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { experience } from '../../src/data/experience';
import { installProteinApi } from './protein-fixtures';

const clockStart = new Date('2026-01-01T00:00:00Z');
const clockPause = new Date('2026-01-02T00:00:00Z');

async function openRide(page: Page, animated = false) {
  if (animated) await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: clockStart });
  await page.goto('/#experience');
  await page.locator('.journey-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
  await page.clock.pauseAt(clockPause);
  await page.locator('.journey-stage').focus();
}

async function keyTap(page: Page, key: 'ArrowLeft' | 'ArrowRight', duration = 60, gap = 60) {
  await page.keyboard.down(key);
  await page.clock.runFor(duration);
  await page.keyboard.up(key);
  await page.clock.runFor(gap);
}

async function tripleKey(page: Page, key: 'ArrowLeft' | 'ArrowRight') {
  for (let tap = 0; tap < 3; tap += 1) await keyTap(page, key);
}

async function selectChapter(page: Page, id: string) {
  await page.locator(`.journey-chapter[data-chapter="${id}"]`).click();
  await page.locator('.journey-stage').focus();
}

async function expectSpeed(page: Page, value: number) {
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', String(value));
  await expect(page.getByLabel('Ride speed', { exact: true })).toContainText(`${value}×`);
}

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

test('completed keyboard triples adjust bounded speed, preserve it across chapters, and reset', async ({
  page,
}) => {
  await openRide(page);
  await expectSpeed(page, 1);
  for (const speed of [1.25, 1.5, 2, 2]) {
    await tripleKey(page, 'ArrowRight');
    await expectSpeed(page, speed);
  }
  await selectChapter(page, 'picking-carts');
  await expectSpeed(page, 2);
  for (const speed of [1.5, 1.25, 1, 0.75, 0.75]) {
    await tripleKey(page, 'ArrowLeft');
    await expectSpeed(page, speed);
  }
  await selectChapter(page, experience.at(-1)!.id);
  await page.getByRole('button', { name: 'Back to start' }).click();
  await expectSpeed(page, 1);
  await expect(page.locator('.journey-story')).toHaveAttribute('data-story-id', experience[0].id);
});

test('mixed, slow, held, repeated, and interrupted input does not become a speed gesture', async ({
  page,
}) => {
  await openRide(page);
  await keyTap(page, 'ArrowRight');
  await keyTap(page, 'ArrowLeft');
  await keyTap(page, 'ArrowRight');
  await expectSpeed(page, 1);

  await selectChapter(page, experience[0].id);
  for (let tap = 0; tap < 3; tap += 1) await keyTap(page, 'ArrowRight', 60, 450);
  await expectSpeed(page, 1);

  await selectChapter(page, experience[0].id);
  await keyTap(page, 'ArrowRight', 350);
  await keyTap(page, 'ArrowRight');
  await keyTap(page, 'ArrowRight');
  await expectSpeed(page, 1);

  await selectChapter(page, experience[0].id);
  await page.keyboard.down('ArrowRight');
  for (let repeat = 0; repeat < 4; repeat += 1) {
    await page.clock.runFor(40);
    await page.keyboard.down('ArrowRight');
  }
  await expectSpeed(page, 1);
  await page.keyboard.up('ArrowRight');
  await expectSpeed(page, 1);

  await selectChapter(page, experience[0].id);
  await keyTap(page, 'ArrowRight');
  await keyTap(page, 'ArrowRight');
  await selectChapter(page, 'payphone');
  await keyTap(page, 'ArrowRight');
  await expectSpeed(page, 1);

  await selectChapter(page, experience[0].id);
  await keyTap(page, 'ArrowRight');
  await keyTap(page, 'ArrowRight');
  await page.getByRole('button', { name: 'Read as a timeline ↗' }).focus();
  await page.locator('.journey-stage').focus();
  await keyTap(page, 'ArrowRight');
  await expectSpeed(page, 1);

  await selectChapter(page, 'revision');
  await keyTap(page, 'ArrowRight');
  await keyTap(page, 'ArrowRight');
  const storyLink = page
    .locator('.journey-stage')
    .getByRole('link', { name: /Visit Revision Marine/ });
  await storyLink.focus();
  await page.locator('.journey-stage').focus();
  await keyTap(page, 'ArrowRight');
  await expectSpeed(page, 1);

  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(300);
  await storyLink.focus();
  await page.keyboard.up('ArrowRight');
  await page.clock.runFor(1000);
  await expect(page.locator('.jetski-wake')).toHaveCount(0);
});

test('inset controls support pointer and keyboard taps, pumping, and jumping', async ({ page }) => {
  await openRide(page);
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const left = page.getByRole('button', { name: 'Left', exact: true });
  await right.click();
  await page.clock.runFor(80);
  await right.click();
  await page.clock.runFor(80);
  await expectSpeed(page, 1);
  await right.click();
  await expectSpeed(page, 1.25);

  await left.focus();
  for (let tap = 0; tap < 3; tap += 1) {
    await page.keyboard.down('Space');
    await page.clock.runFor(60);
    await page.keyboard.up('Space');
    await page.clock.runFor(60);
  }
  await expectSpeed(page, 1);

  const pump = page.getByRole('button', { name: 'Pump', exact: true });
  await pump.hover();
  await page.mouse.down();
  await page.clock.runFor(400);
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'crouched');
  await page.mouse.up();
  await page.getByRole('button', { name: 'Jump', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'extended');
  await page.clock.runFor(1000);
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'cruising');
});

test('the selected speed changes both shoreline travel and word reveal rate', async ({ page }) => {
  await openRide(page, true);
  const progress = () =>
    page
      .locator('.journey-progress-fill')
      .evaluate((element) => parseFloat((element as HTMLElement).style.width));
  const wordCount = async () =>
    (await page.locator('.journey-typed').textContent())!.trim().split(/\s+/).filter(Boolean)
      .length;
  async function beginSample() {
    await selectChapter(page, 'payphone');
    await selectChapter(page, experience[0].id);
    const stage = page.locator('.journey-stage');
    await stage.scrollIntoViewIfNeeded();
    // Chapter navigation can scroll a tall phone scene out of view. Its native
    // visibility callback must settle before advancing the simulated ride clock.
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
    await stage.focus();
    await page.clock.runFor(100);
  }

  await beginSample();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(4000);
  await page.keyboard.up('ArrowRight');
  const ordinaryTravel = await progress();
  const ordinaryWords = await wordCount();

  let revealedWords = ordinaryWords;
  for (let increment = 0; increment < 3; increment += 1) {
    await tripleKey(page, 'ArrowRight');
    const currentWords = await wordCount();
    expect(currentWords).toBeGreaterThanOrEqual(revealedWords);
    revealedWords = currentWords;
  }
  await expectSpeed(page, 2);
  await beginSample();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor(4000);
  await page.keyboard.up('ArrowRight');
  const fasterTravel = await progress();
  const fasterWords = await wordCount();
  expect(ordinaryTravel).toBeGreaterThan(0);
  expect(fasterTravel).toBeGreaterThan(ordinaryTravel * 1.7);
  expect(fasterTravel).toBeLessThan(ordinaryTravel * 2.3);
  expect(fasterWords).toBeGreaterThan(ordinaryWords + 10);
});
