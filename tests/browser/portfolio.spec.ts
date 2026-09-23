import { expect, test } from '@playwright/test';
import { experience } from '../../src/data/experience';
import { MAX_SPEED } from '../../src/game/model';
import { buildJourneyRoute } from '../../src/game/route';

test('the portfolio renders without errors or horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'JACOB COSTELLO.' })).toBeVisible();
  await expect(page.getByText('THE PROTEIN PLAYGROUND')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: `.cache/${testInfo.project.name}-page.png`, fullPage: true });
});

test('all experience is reachable without playing, with the dock at the final chapter', async ({
  page,
}) => {
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.getByRole('heading', { name: 'And that explains the jetski.' })).toBeVisible();
  await expect(
    page.locator('.journey-stage').getByRole('link', { name: 'Meet Revision Marine' }),
  ).toHaveAttribute('href', '#project-revision');
  await page.getByRole('button', { name: 'Read as a timeline ↗' }).click();
  await expect(page.locator('.journey-overview > li')).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: 'Good code starts with a real problem.' }),
  ).toBeVisible();
});

test('the focused game responds to keys and stops consuming them after blur', async ({ page }) => {
  await page.goto('/#experience');
  const stage = page.getByRole('group', { name: /^Playable jetski experience/ });
  await stage.focus();
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole('progressbar', { name: 'Shoreline progress' })
          .getAttribute('aria-valuenow'),
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Read as a timeline ↗' }).focus();
  const positionBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(positionBefore);
});

test('the stand-up rider crouches for a pump, extends on jumping, and lands', async ({ page }) => {
  await page.goto('/#experience');
  const stage = page.getByRole('group', { name: /^Playable jetski experience/ });
  await stage.focus();
  await page.keyboard.down('ArrowDown');
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'crouched');
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'extended');
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'cruising');
});

test('animated chapters reveal text, allow skipping, and settle on the latest selection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  await page.getByRole('button', { name: '2023: The Union · Athens, Ohio' }).click();
  await expect(
    page.getByRole('heading', { name: 'An old payphone. Some new possibilities.' }),
  ).toBeVisible();
  await expect(page.locator('.journey-untyped')).not.toBeEmpty();
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
  await expect
    .poll(async () => (await page.locator('.journey-typed').textContent())!.trim().length)
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Show full story' }).click();
  await expect(page.locator('.journey-untyped')).toHaveCount(0);
  await expect(page.locator('.journey-story').getByText('Asterisk', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '2024: Ohio University · Athens, Ohio' }).click();
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.getByRole('heading', { name: 'And that explains the jetski.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show full story' }).click();
  await expect(page.locator('.journey-story').getByText('Medusa', { exact: true })).toBeVisible();
  await expect(page.locator('.journey-story-transition')).not.toHaveClass(/is-leaving/);
});

test('the long route leaves reading time, fades each layer, and crosses open water', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/#experience');
  // Let real scrolling and IntersectionObserver start the visible scene before
  // advancing its timers; neither is driven by the browser's mock clock.
  await page.locator('.journey-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const route = buildJourneyRoute(experience, MAX_SPEED);
  await page.locator('.journey-stage').focus();
  await page.keyboard.down('ArrowRight');
  await page.clock.runFor((route.stops[0].detailsOut / MAX_SPEED) * 1000 - 500);
  await expect(page.locator('.journey-untyped')).toHaveCount(0);
  await expect(page.locator('.journey-story-details')).toHaveCSS('opacity', '1');
  await page.clock.runFor(1000);
  const opacity = async (selector: string) =>
    Number(await page.locator(selector).evaluate((el) => getComputedStyle(el).opacity));
  expect(await opacity('.journey-story-details')).toBeLessThan(1);
  expect(await opacity('.journey-story-details')).toBeGreaterThan(0);
  expect(await opacity('.journey-story-year')).toBe(1);
  await page.clock.runFor(800);
  expect(await opacity('.journey-story-details')).toBe(0);
  expect(await opacity('.journey-story-year')).toBeLessThan(1);
  expect(await opacity('.journey-story-title')).toBe(1);
  await page.clock.runFor(750);
  expect(await opacity('.journey-story-year')).toBe(0);
  expect(await opacity('.journey-story-title')).toBeLessThan(1);
  await page.clock.runFor(650);
  await expect(page.locator('.journey-story')).toHaveCount(0);
  await expect(page.getByText('OPEN WATER / THE NEXT CHAPTER IS AHEAD')).toBeVisible();
  await page.clock.runFor(1800);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('.journey-story')).toHaveAttribute('data-story-id', 'payphone');
});

test('shoreline dots locate real story starts and reset with the journey', async ({ page }) => {
  await page.goto('/#experience');
  const markers = page.locator('.journey-progress-marker');
  const progress = page.getByRole('progressbar', { name: 'Shoreline progress' });
  const route = buildJourneyRoute(experience, MAX_SPEED);
  await expect(markers).toHaveCount(experience.length);
  for (const stop of route.stops) {
    const percentage = await markers
      .nth(stop.index)
      .evaluate((el) => parseFloat((el as HTMLElement).style.left));
    expect(percentage).toBeCloseTo((stop.start / route.length) * 100, 3);
  }
  await expect(progress).toHaveAttribute('aria-valuetext', /Next checkpoint: 2023/);
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.locator('.journey-progress-marker.is-reached')).toHaveCount(experience.length);
  await expect(markers.last()).toHaveClass(/is-current/);
  await page.getByRole('button', { name: 'Back to start' }).click();
  await expect(page.locator('.journey-progress-marker.is-reached')).toHaveCount(1);
  await expect(markers.first()).toHaveClass(/is-current/);
});

test('water spray animates while riding and splashes once on takeoff and landing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/#experience');
  const stage = page.locator('.journey-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await stage.focus();
  await page.keyboard.down('ArrowRight');
  const frames = new Set<string | null>();
  for (let step = 0; step < 6; step += 1) {
    await page.clock.runFor(125);
    frames.add(await page.locator('.jetski-wake').getAttribute('data-frame'));
  }
  expect([...frames].sort()).toEqual(['0', '1', '2']);
  await page.keyboard.down('ArrowDown');
  await page.clock.runFor(400);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.clock.runFor(100);
  await expect(page.locator('.jetski-splash')).toHaveAttribute('data-splash', 'takeoff');
  await expect(page.locator('.jetski-wake')).toHaveCount(0);
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'extended');
  await page.clock.runFor(850);
  await expect(page.locator('.jetski-splash')).toHaveAttribute('data-splash', 'landing');
  await expect(page.locator('.jetski-wake')).toHaveCount(1);
  await page.keyboard.up('ArrowRight');
  await page.clock.runFor(1000);
  await expect(page.locator('.jetski-splash, .jetski-wake')).toHaveCount(0);
});

test('the blimp flies once on its own clock and only replays after Back to start', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/#experience');
  const stage = page.locator('.journey-stage');
  const blimp = page.locator('.skyline-blimp');
  const progress = page.getByRole('progressbar', { name: 'Shoreline progress' });
  const destination = page.getByRole('button', { name: /^NOW: Revision Marine/ });
  const x = () => blimp.evaluate((element) => element.getBoundingClientRect().x);
  await stage.scrollIntoViewIfNeeded();
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await expect(blimp).toHaveCount(0);

  await destination.click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(1);
  const arrivalX = await x();
  await page.clock.runFor(2000);
  expect(await x()).toBeLessThan(arrivalX);
  await expect(progress).toHaveAttribute('aria-valuenow', '100');

  // Reversing and selecting an earlier chapter must not restart the flyover.
  const beforeReversingX = await x();
  await stage.focus();
  await page.keyboard.down('ArrowLeft');
  await page.clock.runFor(700);
  await page.keyboard.up('ArrowLeft');
  expect(await x()).toBeLessThan(beforeReversingX);
  expect(Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(100);
  const beforeChapterChangeX = await x();
  await page.getByRole('button', { name: /^2021: Component Repair Technologies$/ }).click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(1);
  const earlierChapterX = await x();
  expect(earlierChapterX).toBeLessThan(beforeChapterChangeX);
  await page.clock.runFor(1000);
  expect(await x()).toBeLessThan(earlierChapterX);
  await expect(progress).toHaveAttribute('aria-valuenow', '0');

  // The event also expires while the scene is unmounted in the readable view.
  await page.getByRole('button', { name: /^Read as a timeline/ }).click();
  await page.clock.fastForward(25000);
  await page.getByRole('button', { name: /Back to the ride/ }).click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(0);
  await destination.click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(0);

  await page.getByRole('button', { name: 'Back to start' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await destination.click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(1);
  const replayX = await x();
  await page.clock.runFor(2000);
  expect(await x()).toBeLessThan(replayX);
});

test('reduced motion keeps the timed blimp stationary until its flyover ends', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#experience');
  const stage = page.locator('.journey-stage');
  const blimp = page.locator('.skyline-blimp');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toBeInViewport();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: /^NOW: Revision Marine/ }).click();
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(1);
  const initialX = await blimp.evaluate((element) => element.getBoundingClientRect().x);
  await page.clock.runFor(2000);
  expect(await blimp.evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(
    initialX,
  );
  await page.clock.fastForward(21000);
  await expect(blimp).toHaveCount(1);
  await page.clock.fastForward(1000);
  await page.clock.runFor(100);
  await expect(blimp).toHaveCount(0);
});

test('back to start clears the ride and restores its first checkpoint', async ({ page }) => {
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.getByRole('progressbar', { name: 'Shoreline progress' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  await page.getByRole('button', { name: 'Back to start' }).click();
  await expect(page.getByRole('progressbar', { name: 'Shoreline progress' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(page.locator('.journey-story')).toHaveAttribute('data-story-id', 'first-tools');
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'cruising');
  await expect(page.locator('.journey-stage')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Back to start' })).toHaveCount(0);
});

test('reduced motion shows the full story and tools immediately', async ({ page }) => {
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  await expect(page.locator('.journey-untyped')).toHaveCount(0);
  await expect(page.locator('.journey-typed')).toContainText('onto the same shoreline.');
  await expect(page.locator('.journey-story').getByText('Medusa', { exact: true })).toBeVisible();
});

test('full screen preserves the chapter, focuses the ride, and offers an exit', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/#experience');
  await page.getByRole('button', { name: 'NOW: Revision Marine · Cofounder' }).click();
  const enter = page.getByRole('button', { name: 'Full screen ↗', exact: true });
  await enter.click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.className))
    .toBe('journey');
  await expect(page.getByRole('group', { name: /^Playable jetski experience/ })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'And that explains the jetski.' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(enter).toBeFocused();
});

test('project details are accessible and the dialog closes with Escape', async ({ page }) => {
  await page.goto('/#work');
  await page.getByRole('button', { name: 'Read about Revision Marine' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Revision Marine', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('protein prototype filters connections and supports accessible selection', async ({
  page,
}) => {
  await page.goto('/#lab');
  await expect(page.getByText('ILLUSTRATIVE DEMO', { exact: true })).toBeVisible();
  const readout = page
    .locator('.protein-readout > div')
    .filter({ hasText: 'CONNECTIONS' })
    .locator('strong');
  const initialEdges = Number(await readout.textContent());
  const threshold = page.getByRole('slider', { name: 'Connection confidence' });
  await threshold.focus();
  await threshold.press('End');
  await expect.poll(async () => Number(await readout.textContent())).toBeLessThan(initialEdges);
  await page.getByText('Explore the data & how it works').click();
  await page
    .locator('.protein-node-list')
    .getByRole('button', { name: 'CDK2', exact: true })
    .click();
  await expect(page.locator('.protein-selected-heading h4')).toHaveText('CDK2');
  await page.getByRole('button', { name: 'Rotate network right' }).click();
  await expect(page.getByRole('button', { name: 'Reset network view' })).toBeEnabled();
  const labels = page.getByRole('button', { name: 'Show all protein labels' });
  await expect(labels).toHaveAttribute('aria-pressed', 'false');
  await labels.click();
  await expect(labels).toHaveAttribute('aria-pressed', 'true');
});

test('small screens expose working navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu +' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Selected work' }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.getByRole('button', { name: 'Menu +' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('contact offers LinkedIn without publishing an email or phone link', async ({ page }) => {
  const response = await page.goto('/#contact');
  // Includes the no-JavaScript fallback, which is not rendered in this browser.
  expect(await response!.text()).not.toMatch(/mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const contact = page.getByRole('region', { name: 'LET’S BUILD SOMETHING.' });
  await expect(contact.getByRole('link', { name: 'Let’s connect on LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/jacob-costello-675913232',
  );
  await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
  await expect(contact.getByRole('form')).toHaveCount(0);
  expect(await contact.textContent()).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});
