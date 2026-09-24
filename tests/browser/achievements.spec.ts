import { expect, test } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';
import { achievementMessages, allRewardsMessage } from '../../src/data/achievements';

test('new rewards announce once, queue safely, and choosing a ball goes to the tee', async ({
  page,
}) => {
  await installProteinApi(page);
  await page.addInitScript(() => {
    const key = 'personal-website:achievements:v1';
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify({
          storyFinished: true,
          yellowBallUnlocked: true,
          discoveredProteins: ['TP53', 'MDM2'],
          selectedBall: 'white',
          acknowledgedRewards: [],
          bestTrialSeconds: 125,
        }),
      );
  });
  await page.goto('/');
  const yellow = page.getByRole('dialog', { name: achievementMessages.yellow.title });
  await expect(yellow).toBeVisible();
  await expect(yellow.getByRole('button', { name: 'Keep exploring' })).toBeFocused();
  await page.keyboard.press('Escape');
  const striped = page.getByRole('dialog', { name: achievementMessages.striped.title });
  await expect(striped).toBeVisible();
  await expect(striped).toContainText(allRewardsMessage);
  await striped.getByRole('button', { name: 'Use this ball' }).click();
  await expect(striped).not.toBeVisible();
  await expect(page.getByRole('radio', { name: 'Striped ball', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Striped ball', exact: true })).toBeFocused();
  await expect(page.locator('.golf-scene__tee-ball')).toHaveAttribute('data-ball-color', 'striped');
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Striped ball', exact: true })).toBeChecked();
});

test('an achievement popup remains reachable over the fullscreen ride', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await installProteinApi(page);
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'Full screen ↗', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen ↙', exact: true })).toBeVisible();
  // Inject a newly-earned store event to isolate the fullscreen dialog behavior;
  // trial.spec.ts separately earns yellow through an actual complete race.
  await page.evaluate(() => {
    const key = 'personal-website:achievements:v1';
    localStorage.setItem(
      key,
      JSON.stringify({ yellowBallUnlocked: true, acknowledgedRewards: [] }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });
  const popup = page.getByRole('dialog', { name: achievementMessages.yellow.title });
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'Use this ball' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('radio', { name: 'Yellow ball', exact: true })).toBeChecked();
});
