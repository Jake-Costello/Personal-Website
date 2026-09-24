import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';
import { bioinformaticsQuestions } from '../../src/data/trivia';

async function prepare(page: Page) {
  await installProteinApi(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      'personal-website:achievements:v1',
      JSON.stringify({
        discoveredProteins: ['TP53', 'MDM2'],
        selectedBall: 'striped',
        acknowledgedRewards: ['striped'],
      }),
    ),
  );
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
  await page.goto('/#about');
  await page.getByRole('region', { name: 'Personal facts golf' }).scrollIntoViewIfNeeded();
}

test('the seven-second round accepts one answer and keeps its explanation readable', async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole('button', { name: `Driver — ${bioinformaticsQuestions[0].topic}` }).click();
  await expect(page.locator('.golf-trivia-clock')).toHaveText('7 seconds to answer');
  await page.clock.runFor(6200);
  await expect(page.locator('.golf-trivia-clock')).toHaveText('1 second to answer');
  await page.locator('.golf-trivia-options button').nth(1).click();
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'correct');
  await expect(page.locator('.golf-trivia-result')).toContainText(
    bioinformaticsQuestions[0].explanation,
  );
  await expect(page.locator('.golf-trivia-options button:disabled')).toHaveCount(4);
  await page.clock.runFor(15000);
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'correct');
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await expect(page.locator('.golf-trivia')).toHaveCount(0);
});

test('timeout locks answers at seven seconds and a new shot resets the clock', async ({ page }) => {
  await prepare(page);
  const driver = page.getByRole('button', { name: `Driver — ${bioinformaticsQuestions[0].topic}` });
  await driver.click();
  await page.clock.runFor(6999);
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'playing');
  await page.clock.runFor(1);
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'timeout');
  await expect(page.locator('.golf-trivia-result')).toContainText('Time’s up! Answer: Three.');
  await page.screenshot({ path: `.cache/trivia-timeout-${page.viewportSize()!.width}.png` });
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await driver.click();
  await expect(page.locator('.golf-trivia-clock')).toHaveText('7 seconds to answer');
  await page.locator('.golf-trivia-options button').first().press('Enter');
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'incorrect');
});

test('the timer starts after the flight and untimed play remains available', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await prepare(page);
  await page.getByRole('button', { name: `Driver — ${bioinformaticsQuestions[0].topic}` }).click();
  await page.clock.runFor(1500);
  await expect(page.locator('.golf-trivia')).toHaveCount(0);
  await page.clock.runFor(50);
  await expect(page.locator('.golf-trivia-clock')).toHaveText('7 seconds to answer');
  await page.clock.runFor(7000);
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'timeout');
  await page.getByRole('button', { name: 'Next shot', exact: true }).click();
  await page.clock.runFor(1200);
  await page.getByRole('checkbox', { name: /Untimed trivia/ }).check();
  await page.getByRole('button', { name: `Driver — ${bioinformaticsQuestions[0].topic}` }).click();
  await page.clock.runFor(20000);
  await expect(page.locator('.golf-trivia')).toHaveAttribute('data-result', 'playing');
  await expect(page.locator('.golf-trivia-clock')).toHaveText('Untimed round');
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 844 });
  const options = page.locator('.golf-trivia-options');
  await expect(options).toBeVisible();
  const bounds = await options.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: `.cache/trivia-${testInfo.project.name}.png` });
});
