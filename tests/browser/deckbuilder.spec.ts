import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CARDS } from '../../src/arcade/games/deckbuilder-model';
import { installProteinApi } from './protein-fixtures';

async function enter(page: Page, beforeEnter?: () => void) {
  await page.goto('/arcade/?game=deckbuilder');
  await expect(page.locator('.arcade-page')).toHaveAttribute(
    'data-renderer',
    /^(three|fallback)$/,
    { timeout: 30000 },
  );
  beforeEnter?.();
  if ((await page.locator('.arcade-page').getAttribute('data-renderer')) === 'fallback')
    await page.locator('.arcade-fallback-machines > button').filter({ hasText: 'Encore' }).click();
  else await page.getByRole('button', { name: 'Play Encore', exact: true }).click();
  if ((await page.locator('.arcade-page').getAttribute('data-renderer')) === 'three') {
    await expect(page.locator('.arcade-live-screen')).toHaveAttribute('data-settled', 'true', {
      timeout: 20000,
    });
  }
  await expect(page.getByRole('region', { name: 'Encore deckbuilder prototype' })).toBeVisible();
}
async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.call(this, type as '2d', ...(args as [])) as never;
    } as typeof original;
  });
}

test('Encore cabinet plays cards, pauses, accepts physical controls and resets without API calls', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/\/api\/|api\.openai\.com|spotify\.com/.test(r.url())) external.push(r.url());
  });
  const gameRequests: string[] = [];
  page.on('request', (request) => {
    if (
      /\/(?:src\/arcade\/games\/DeckbuilderGame\.tsx|assets\/DeckbuilderGame-[^/]+\.js)/.test(
        request.url(),
      )
    )
      gameRequests.push(request.url());
  });
  await enter(page, () => expect(gameRequests).toEqual([]));
  expect(gameRequests).toHaveLength(1);
  const game = page.locator('.db-game');
  await expect(game).toHaveAttribute('data-phase', 'map');
  await expect(
    game.getByRole('heading', { name: 'Three venues. Four bosses.', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(game.getByRole('button', { name: 'Start battle', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: info.outputPath('encore-cabinet.png') });
  await game.getByRole('button', { name: 'Start battle', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'combat');
  await expect(game).toHaveAttribute('data-energy', '3');
  const hp = Number(await game.getAttribute('data-enemy-health'));
  await game.locator('.db-card[data-card="strike"]').first().click();
  await expect(game).toHaveAttribute('data-enemy-health', String(hp - 6));
  await expect(game).toHaveAttribute('data-energy', '2');
  await page.keyboard.press('ArrowRight');
  await expect(game.locator('.db-card[data-selected="true"]')).toHaveCount(1);
  const turn = await game.getAttribute('data-turn');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.keyboard.press('e');
  await expect(game).toHaveAttribute('data-turn', turn!);
  await expect(game.locator('.db-card').first()).toBeDisabled();
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'End turn / skip', exact: true })
    .click();
  await expect(game).toHaveAttribute('data-turn', '2');
  await page.screenshot({ path: info.outputPath('encore-combat.png') });
  await page.getByRole('button', { name: 'Expand screen', exact: true }).click();
  await expect(game).toHaveAttribute('data-turn', '2');
  await game.getByRole('button', { name: /Deck \(/ }).click();
  await expect(game.getByRole('heading', { name: 'Current deck' })).toBeVisible();
  await game.getByRole('button', { name: 'Back to run' }).click();
  await page.screenshot({ path: info.outputPath('encore-expanded.png') });
  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'map');
  await expect(game).toHaveAttribute('data-health', '80');
  await page.keyboard.press('Escape');
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('a complete Encore run crosses all three world bosses and the final boss without WebGL', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  const visited = new Set<number>();
  for (let step = 0; step < 700; step++) {
    const phase = await game.getAttribute('data-phase');
    const floor = Number(await game.getAttribute('data-floor'));
    if (phase === 'won' || phase === 'lost') break;
    if (phase === 'map') {
      visited.add(floor);
      await game.getByRole('button', { name: /^(Start battle|Challenge final boss)$/ }).click();
      if ([2, 5, 8, 9].includes(floor))
        await page.screenshot({ path: info.outputPath(`boss-${floor}.png`) });
    } else if (phase === 'reward') {
      const rank = ['Turn it up', 'Power chord', 'Drum fill', 'Quick riff', 'Count-in', 'Feedback'];
      const choices = game.locator('.db-choices button');
      const labels = await choices.locator('b').allTextContents();
      const best = labels
        .map((name, i) => ({ i, rank: rank.indexOf(name) }))
        .sort((a, b) => a.rank - b.rank)[0];
      await choices.nth(best.i).click();
    } else if (phase === 'relic') await game.getByRole('button', { name: /Hot pickup/ }).click();
    else {
      const attack = Number(
        (await game.locator('.db-intent').innerText()).match(/Attack (\d+)/)?.[1] ?? 0,
      );
      const block = Number(await game.locator('.db-player-block>b').innerText());
      const strength = Number(
        (await game.locator('.db-player-block small').allTextContents())
          .join('')
          .match(/\+(\d+)/)?.[1] ?? 0,
      );
      const enemy = Number(await game.getAttribute('data-enemy-health'));
      const enemyBlock = Number(
        (await game.locator('.db-enemy-stats').innerText()).match(/· (\d+) block/)?.[1] ?? 0,
      );
      const energy = Number(await game.getAttribute('data-energy'));
      const cards = await game.locator('.db-card').evaluateAll((elements) =>
        elements.map((e, i) => ({
          i,
          key: (e as HTMLElement).dataset.card!,
          disabled: (e as HTMLButtonElement).disabled,
        })),
      );
      const awaitedWeak = (await game.locator('.db-intent').innerText()).includes('weakened');
      const options = cards
        .filter((c) => !c.disabled)
        .map((c) => {
          const f = CARDS[c.key as keyof typeof CARDS].effect;
          let value = f.energy ? 100 : f.draw ? (energy > 0 ? 40 : 1) : 0;
          if (f.strength) value += enemy > 18 ? 50 : 0;
          if (f.damage) value += f.damage + strength;
          if (f.damage && f.damage + strength >= enemy + enemyBlock) value += 200;
          if (f.block) value += 1.5 * Math.min(f.block, Math.max(0, attack - block));
          if (f.weaken && !awaitedWeak) value += 3;
          return { ...c, value };
        });
      options.sort((a, b) => b.value - a.value);
      if (options.length) await game.locator('.db-card').nth(options[0].i).click();
      else await game.getByRole('button', { name: 'End turn', exact: true }).click();
    }
  }
  await expect(game).toHaveAttribute('data-phase', 'won');
  await expect(game.locator('.db-status')).toContainText('10/10 battles');
  expect([...visited]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  await expect(
    game.getByRole('heading', { name: 'Final boss defeated', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('run-complete.png') });
  await game.getByRole('button', { name: 'New run', exact: true }).click();
  await expect(game).toHaveAttribute('data-health', '80');
  await expect(game).toHaveAttribute('data-floor', '0');
});

test('Encore load failure keeps an exit and reload recovery', async ({ page }) => {
  await withoutWebGL(page);
  await page.route(/\/src\/arcade\/games\/DeckbuilderGame\.tsx/, (r) => r.abort('failed'));
  await page.goto('/arcade/?game=deckbuilder');
  await page.locator('.arcade-fallback-machines > button').filter({ hasText: 'Encore' }).click();
  const error = page.getByRole('alert');
  await expect(error).toContainText('couldn’t load');
  await expect(error.getByRole('button', { name: 'Back to machines', exact: true })).toBeFocused();
  await error.getByRole('button', { name: 'Back to machines', exact: true }).click();
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
});

test('portfolio copy and payphone project lead to the themed cabinet without losing factual context', async ({
  page,
}, info) => {
  await installProteinApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'JAKE COSTELLO.' })).toBeVisible();
  await expect(page.locator('#work .project-card')).toHaveCount(4);
  await expect(page.getByText('PERSONAL FIELD NOTES / VOL. 01', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('portfolio-hero.png') });
  await page.getByRole('button', { name: 'Read about The Union Payphone', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Athens');
  await expect(dialog).toContainText('Python and Asterisk');
  await page.screenshot({ path: info.outputPath('payphone-details.png') });
  await dialog.getByRole('link', { name: 'See the Encore cabinet' }).click();
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-selected', 'deckbuilder');
});
