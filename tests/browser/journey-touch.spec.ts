import { expect, test } from '@playwright/test';
import type { CDPSession, Locator, Page } from '@playwright/test';
import { installProteinApi } from './protein-fixtures';

async function openRide(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/#experience');
  const stage = page.locator('.journey-stage');
  await stage.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await expect(page.locator('.journey-story-year')).toHaveCSS('opacity', '1');
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
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
  await stage.focus();
  await page.clock.runFor(50);
}

type TouchPoint = { id: number; x: number; y: number };

async function touchPoint(button: Locator, id: number): Promise<TouchPoint> {
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  return { id, x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

async function touch(
  session: CDPSession,
  type: 'touchStart' | 'touchEnd' | 'touchCancel',
  points: TouchPoint[],
) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

const progress = (page: Page) =>
  page
    .locator('.journey-progress-fill')
    .evaluate((element) => parseFloat((element as HTMLElement).style.width));

test.beforeEach(async ({ page }) => {
  await installProteinApi(page);
});

test('holding a touch arrow rides continuously and releasing it stops without scrolling', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await openRide(page);
  const session = await page.context().newCDPSession(page);
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const point = await touchPoint(right, 1);
  const scrollBefore = await page.evaluate(() => scrollY);
  await touch(session, 'touchStart', [point]);
  await expect(right).toHaveAttribute('data-pressed', 'true');
  await page.clock.runFor(500);
  const firstPosition = await progress(page);
  expect(firstPosition).toBeGreaterThan(0);
  await page.clock.runFor(500);
  expect(await progress(page)).toBeGreaterThan(firstPosition);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await touch(session, 'touchEnd', []);
  await expect(right).toHaveAttribute('data-pressed', 'false');
  await page.clock.runFor(1300);
  const stoppedPosition = await progress(page);
  await page.clock.runFor(500);
  expect(await progress(page)).toBe(stoppedPosition);
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', '1');
  await session.detach();
});

test('a second touch can pump and jump while the first keeps riding', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await openRide(page);
  const session = await page.context().newCDPSession(page);
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const pump = page.getByRole('button', { name: 'Pump', exact: true });
  const jump = page.getByRole('button', { name: 'Jump', exact: true });
  const riding = await touchPoint(right, 1);
  const pumping = await touchPoint(pump, 2);
  const jumping = await touchPoint(jump, 3);
  await touch(session, 'touchStart', [riding]);
  await page.clock.runFor(500);
  const beforePump = await progress(page);
  await touch(session, 'touchStart', [riding, pumping]);
  await page.clock.runFor(400);
  await expect(right).toHaveAttribute('data-pressed', 'true');
  await expect(pump).toHaveAttribute('data-pressed', 'true');
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'crouched');
  expect(await progress(page)).toBeGreaterThan(beforePump);
  // Chromium targets the released contact when touchEnd contains a point.
  // An empty array releases every remaining contact.
  await touch(session, 'touchEnd', [pumping]);
  await expect(pump).toHaveAttribute('data-pressed', 'false');
  await touch(session, 'touchStart', [riding, jumping]);
  await page.clock.runFor(100);
  await expect(page.locator('.jetski-sprite')).toHaveAttribute('data-rider-pose', 'extended');
  await expect(right).toHaveAttribute('data-pressed', 'true');
  await touch(session, 'touchEnd', []);
  await expect(right).toHaveAttribute('data-pressed', 'false');
  await expect(jump).toHaveAttribute('data-pressed', 'false');
  await session.detach();
});

test('cancelled touches clear the hold and do not complete a speed gesture', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await openRide(page);
  const session = await page.context().newCDPSession(page);
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const point = await touchPoint(right, 1);
  async function tap() {
    await touch(session, 'touchStart', [point]);
    await page.clock.runFor(60);
    await touch(session, 'touchEnd', []);
    await page.clock.runFor(60);
  }
  await tap();
  await tap();
  await touch(session, 'touchStart', [point]);
  await page.clock.runFor(60);
  await touch(session, 'touchCancel', []);
  await expect(right).toHaveAttribute('data-pressed', 'false');
  await tap();
  await tap();
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', '1');
  await tap();
  await expect(page.locator('.journey')).toHaveAttribute('data-speed', '1.25');
  await page.clock.runFor(1300);
  const stoppedPosition = await progress(page);
  await page.clock.runFor(500);
  expect(await progress(page)).toBe(stoppedPosition);
  await session.detach();
});

test('on-screen controls use a right-side keyboard layout with comfortable targets', async ({
  page,
}) => {
  await openRide(page);
  const geometry = await page.locator('.journey-controls').evaluate((controls) => {
    const stage = controls.closest('.journey-stage')!.getBoundingClientRect();
    const panel = controls.getBoundingClientRect();
    const keys = Object.fromEntries(
      [...controls.querySelectorAll<HTMLElement>('[data-control]')].map((key) => {
        const box = key.getBoundingClientRect();
        return [key.dataset.control!, { x: box.x, y: box.y, width: box.width, height: box.height }];
      }),
    );
    return {
      keys,
      leftGap: panel.left - stage.left,
      rightGap: stage.right - panel.right,
      hintSize: parseFloat(
        getComputedStyle(controls.querySelector('.journey-control-hints')!).fontSize,
      ),
    };
  });
  const { left, right, down, jump } = geometry.keys;
  expect(jump.y + jump.height).toBeLessThanOrEqual(down.y);
  expect(Math.abs(jump.x - down.x)).toBeLessThan(1);
  expect(Math.abs(left.y - down.y)).toBeLessThan(1);
  expect(Math.abs(right.y - down.y)).toBeLessThan(1);
  expect(left.x + left.width).toBeLessThanOrEqual(down.x);
  expect(down.x + down.width).toBeLessThanOrEqual(right.x);
  for (const key of Object.values(geometry.keys)) {
    expect(key.width).toBeGreaterThanOrEqual(43.99);
    expect(key.height).toBeGreaterThanOrEqual(43.99);
  }
  expect(geometry.rightGap).toBeLessThan(geometry.leftGap);
  expect(geometry.hintSize).toBeGreaterThanOrEqual(12);
});

for (const width of [320, 390]) {
  test(`the ${width}px mobile tour keeps the rider visible while long stories scroll`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile');
    await page.setViewportSize({ width, height: 844 });
    await openRide(page);
    await page.locator('.journey-chapter[data-chapter="picking-carts"]').click();
    const stage = page.locator('.journey-stage');
    await stage.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await expect(page.locator('.journey-story')).toHaveAttribute('data-story-id', 'picking-carts');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const stage = document.querySelector('.journey-stage')!.getBoundingClientRect();
          const rider = document.querySelector('.jetski-sprite')!.getBoundingClientRect();
          return stage.height <= innerHeight && rider.top >= 0 && rider.bottom <= innerHeight;
        }),
      )
      .toBe(true);
    const geometry = await page.locator('.journey-story').evaluate((story) => {
      const scene = story.closest('.journey-stage')!;
      let scrollArea: HTMLElement | null = story as HTMLElement;
      while (
        scrollArea &&
        scrollArea !== scene &&
        !/auto|scroll/.test(getComputedStyle(scrollArea).overflowY)
      ) {
        scrollArea = scrollArea.parentElement;
      }
      if (!scrollArea || scrollArea === scene) return null;
      scrollArea.scrollTop = scrollArea.scrollHeight;
      const rider = scene.querySelector('.jetski-sprite')!.getBoundingClientRect();
      const controls = scene.querySelector('.journey-controls')!.getBoundingClientRect();
      const storyBox = scrollArea.getBoundingClientRect();
      return {
        scrollTop: scrollArea.scrollTop,
        allText: story.textContent,
        storyBottom: storyBox.bottom,
        riderTop: rider.top,
        controlTop: controls.top,
        controlBottom: controls.bottom,
        viewportHeight: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.scrollTop).toBeGreaterThan(0);
    expect(geometry!.allText).toContain(
      'The work connected warehouse requirements with hardware and backend workflows.',
    );
    expect(geometry!.storyBottom).toBeLessThanOrEqual(geometry!.riderTop);
    expect(geometry!.storyBottom).toBeLessThanOrEqual(geometry!.controlTop);
    expect(geometry!.controlBottom).toBeLessThanOrEqual(geometry!.viewportHeight);
    expect(geometry!.overflow).toBe(false);
  });
}
