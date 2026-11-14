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
  await expect(game.getByRole('heading', { name: 'Bellwether', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(game.getByRole('button', { name: 'Start battle', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: info.outputPath('encore-cabinet.png') });
  await game.getByRole('button', { name: 'Start battle', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'combat');
  await expect(game).toHaveAttribute('data-energy', '3');
  const hp = Number(await game.getAttribute('data-enemy-health'));
  await game.locator('.db-card[data-card="riff"]').first().click();
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
  const viewport = page.viewportSize()!;
  if (viewport.width <= 900 && viewport.height >= 600 && viewport.height > viewport.width)
    expect((await game.boundingBox())!.height).toBeGreaterThan(400);
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

async function playVisibleCard(page: Page) {
  const game = page.locator('.db-game');
  const attack = Number(
    (await game.locator('.db-intent').innerText()).match(/Attack (\d+)/)?.[1] ?? 0,
  );
  const block = Number(await game.locator('.db-player-block>b').innerText());
  const guard = Number(await game.locator('[data-band-guard]').getAttribute('data-band-guard'));
  const deficit = Math.max(0, attack - block - guard);
  const awaitedWeak = (await game.locator('.db-intent').innerText()).includes('weakened');
  const enemy = Number(await game.getAttribute('data-enemy-health'));
  const energy = Number(await game.getAttribute('data-energy'));
  const stage = await game.locator('.db-stage [data-stage-id]').evaluateAll((es) =>
    es.map((e) => {
      const d = (e as HTMLElement).dataset;
      return {
        id: Number(d.stageId),
        role: d.role!,
        value: Number(d.power) + 1.1 * Number(d.guard),
        gear: Number(d.gearPower) + 1.1 * Number(d.gearGuard),
      };
    }),
  );
  const hand = await game.locator('.db-hand .db-card').evaluateAll((es) =>
    es.map((e, i) => ({
      i,
      key: (e as HTMLElement).dataset.card!,
      level: Number((e as HTMLElement).dataset.level),
      disabled: (e as HTMLButtonElement).disabled,
    })),
  );
  const options = hand
    .filter((c) => !c.disabled)
    .map((c) => {
      const def = CARDS[c.key as keyof typeof CARDS];
      const stat =
        (def.power ?? 0) +
        ((def.power ?? 0) > 0 ? c.level : 0) +
        1.1 * ((def.guard ?? 0) + ((def.guard ?? 0) > 0 ? c.level : 0));
      let value = 0,
        target: number | undefined;
      if (def.type === 'musician') {
        if (stage.length < 3) value = 50 + stat;
        else {
          const weak = [...stage].sort((a, b) => a.value + a.gear - b.value - b.gear)[0];
          if (stat > weak.value + weak.gear) {
            target = weak.id;
            value = 15 + stat - weak.value - weak.gear;
          }
        }
      } else if (def.type === 'gear') {
        const eligible = stage
          .filter((t) => !def.compatibleRoles || def.compatibleRoles.includes(t.role))
          .sort((a, b) => a.gear - b.gear);
        if (eligible[0] && stat > eligible[0].gear) {
          target = eligible[0].id;
          value = 25 + stat - eligible[0].gear;
        }
      } else {
        const f = def.effect;
        if (f.energy) value += 80;
        if (f.draw) value += energy > 0 ? 45 : 5;
        if (f.damage) value += f.damage + (f.damage >= enemy ? 200 : 0);
        if (f.block) value += 1.1 * Math.min(f.block, deficit);
        if (f.weaken && !awaitedWeak) value += Math.min(3, deficit);
      }
      return { ...c, value, target };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const selected = options[0];
  if (!selected) {
    await game.getByRole('button', { name: 'Perform / end turn', exact: true }).click();
    return;
  }
  await game.locator('.db-hand .db-card').nth(selected.i).click();
  if (selected.target !== undefined)
    await game.locator(`.db-stage button[data-stage-id="${selected.target}"]`).click();
}

test('a complete Encore tour visits all shops and three world bosses before Crown Hall', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  const bandShots = new Set<number>();
  const visited = new Set<number>(),
    shops = new Set<string>();
  for (let step = 0; step < 900; step++) {
    const phase = await game.getAttribute('data-phase'),
      floor = Number(await game.getAttribute('data-floor'));
    if (phase === 'won' || phase === 'lost') break;
    if (phase === 'map') {
      visited.add(floor);
      if ([0, 3, 6, 9].includes(floor))
        await page.screenshot({ path: info.outputPath(`town-${floor}.png`) });
      await game.getByRole('button', { name: /^(Start battle|Challenge final boss)$/ }).click();
      if ([2, 5, 8, 9].includes(floor))
        await page.screenshot({ path: info.outputPath(`boss-${floor}.png`) });
    } else if (phase === 'reward') {
      const choices = game.locator('[data-reward]');
      const keys = await choices.evaluateAll((es) =>
        es.map((e) => (e as HTMLElement).dataset.reward!),
      );
      const scored = keys
        .map((key, i) => {
          const c = CARDS[key as keyof typeof CARDS];
          return {
            i,
            value:
              (c.rarity === 'super-rare' ? 8 : c.rarity === 'rare' ? 4 : 0) +
              (c.type === 'crew'
                ? c.effect.draw
                  ? 8
                  : (c.effect.damage ?? c.effect.block ?? 5)
                : (c.power ?? 0) + (c.guard ?? 0)),
          };
        })
        .sort((a, b) => b.value - a.value);
      await choices.nth(scored[0].i).click();
    } else if (phase === 'record') {
      const preferred = [
        'edge',
        'spotlight',
        'double',
        'plating',
        'groove',
        'charge',
        'live',
        'backline',
        'encore',
      ];
      const choices = game.locator('[data-record]');
      const keys = await choices.evaluateAll((es) =>
        es.map((e) => (e as HTMLElement).dataset.record!),
      );
      const best = [...keys].sort((a, b) => preferred.indexOf(a) - preferred.indexOf(b))[0];
      await game.locator(`[data-record="${best}"]`).click();
    } else if (phase === 'stop') {
      const shop = floor % 3 === 1 ? (floor === 1 ? 'record' : 'tattoo') : 'music';
      shops.add(shop);
      await game.locator(`[data-shop="${shop}"]`).click();
      await page.screenshot({ path: info.outputPath(`shop-${floor}-${shop}.png`) });
    } else if (phase === 'shop') {
      const edge = game.locator('[data-offer="edge"]:enabled');
      const tattoo = game.locator('[data-tattoo="plated"]:enabled');
      const upgrades = game.locator('[data-upgrade]:enabled');
      if (await edge.count()) await edge.click();
      else if (await tattoo.count()) await tattoo.click();
      else if (await upgrades.count()) await upgrades.first().click();
      else await game.getByRole('button', { name: 'Leave shop', exact: true }).click();
    } else {
      await playVisibleCard(page);
      const world = Number(await game.getAttribute('data-world'));
      if (
        !bandShots.has(world) &&
        (await game.locator('.db-stage [data-stage-id]').count()) === 3
      ) {
        bandShots.add(world);
        await page.screenshot({ path: info.outputPath(`band-world-${world}.png`) });
      }
    }
  }
  await expect(game).toHaveAttribute('data-phase', 'won');
  expect([...visited]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect([...shops].sort()).toEqual(['music', 'record', 'tattoo']);
  await expect(game.locator('.db-status')).toContainText('10/10 battles');
  await page.screenshot({ path: info.outputPath('run-complete.png') });
  expect(errors).toEqual([]);
  await game.getByRole('button', { name: 'New run', exact: true }).click();
  await expect(game).toHaveAttribute('data-health', '80');
  await expect(game).toHaveAttribute('data-cash', '20');
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

test('town buildings select a real alternate show and expose locked roads and keyboard choices', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  const town = game.getByRole('group', { name: 'House Shows street map' });
  await expect(town.getByRole('button', { name: /The Last House/ })).toBeDisabled();
  const alternate = town.getByRole('button', { name: /Basement 9/ });
  await alternate.focus();
  await page.keyboard.press('Enter');
  await expect(alternate).toHaveAttribute('aria-pressed', 'true');
  await expect(game.locator('.db-next-show')).toContainText(
    'Penny Dread · 24 HP · First intent: Attack 3 + Block 4',
  );
  await page.screenshot({ path: info.outputPath('town-alternate.png') });
  await game.getByRole('button', { name: /Deck \(/ }).click();
  await expect(game.getByRole('heading', { name: 'Current deck', exact: true })).toBeFocused();
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Next card', exact: true })
    .click();
  await game.getByRole('button', { name: 'Back to run', exact: true }).click();
  await expect(alternate).toHaveAttribute('aria-pressed', 'true');
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Play / confirm', exact: true })
    .click();
  await expect(game.getByRole('heading', { name: 'Penny Dread', exact: true })).toBeFocused();
  await expect(game).toHaveAttribute('data-enemy-health', '24');
  await expect(game.locator('.db-enemy-art')).toHaveAttribute('data-character', 'penny');
  await expect(game.getByRole('img', { name: /Penny Dread: a white undercut/ })).toBeVisible();
  await expect(game.getByRole('group', { name: 'Guitar score battle board' })).toBeVisible();
  await expect(
    game.getByRole('button', { name: 'Perform / end turn', exact: true }),
  ).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: info.outputPath('alternate-board.png') });
});

test('combat feedback animates once, pauses and respects reduced motion without blocking input', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enter(page);
  const game = page.locator('.db-game');
  await game.getByRole('button', { name: 'Start battle', exact: true }).click();
  const strike = game.locator('.db-card[data-card="riff"]').first();
  await strike.click();
  await expect(game).toHaveAttribute('data-feedback', 'attack');
  const motion = game.locator('.db-character-motion');
  await expect(motion).toHaveCSS('animation-name', 'db-recoil');
  await expect(game.locator('.db-feedback span')).toHaveText('−6');
  await expect(game.getByRole('button', { name: 'Perform / end turn', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(motion).toHaveCSS('animation-play-state', 'paused');
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await game.getByRole('button', { name: 'Perform / end turn', exact: true }).click();
  await expect(game).toHaveAttribute('data-turn', '2');
  await expect(game.locator('.db-character-motion')).toHaveCSS('animation-name', 'none');
  await expect(game.locator('.db-feedback span')).toHaveCSS('animation-name', 'none');
  await expect(game.locator('.db-announcement')).toContainText('Enemy dealt');
  await page.screenshot({ path: info.outputPath('reduced-motion-board.png') });
});

test('musicians persist, incompatible Gear is disabled and canceling a target costs nothing', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  await game.getByRole('textbox', { name: 'Run seed' }).fill('target-6');
  await game.getByRole('button', { name: 'Start battle', exact: true }).click();
  // This seed opens with both roles and Gear: verify the actual disabled/target states.
  await expect(game.locator('.db-hand [data-card="kit"]')).toBeDisabled();
  await game.locator('.db-hand [data-card="singer"]').click();
  await expect(game.locator('.db-hand [data-card="kit"]')).toBeDisabled();
  await game.locator('.db-hand [data-card="drummer"]').click();
  const kit = game.locator('.db-hand [data-card="kit"]:enabled').first();
  await expect(kit).toBeEnabled();
  const energy = await game.getAttribute('data-energy');
  await kit.click();
  await expect(game).toHaveAttribute('data-targeting', 'true');
  await expect(game.locator('.db-stage button[data-role="Vocals"]')).toBeDisabled();
  await game.getByRole('button', { name: 'Cancel target' }).click();
  await expect(game).toHaveAttribute('data-energy', energy!);
  await expect(kit).toBeFocused();
  await expect(kit).toBeInViewport({ ratio: 1 });
  await kit.click();
  await game.locator('.db-stage button[data-role="Drums"]').first().click();
  await expect(game).toHaveAttribute('data-energy', String(Number(energy) - 1));
  await expect(game.locator('.db-stage')).toContainText('House kit');
  const stageCount = await game.locator('.db-stage [data-stage-id]').count();
  await game.getByRole('button', { name: 'Perform / end turn', exact: true }).click();
  await expect(game.locator('.db-stage [data-stage-id]')).toHaveCount(stageCount);
  await page.screenshot({ path: info.outputPath('band-equipment.png') });
});

test('catalog labels matte, metallic and prismatic cards and missing artwork keeps readable rules', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await page.route('**/art/encore/cards/guitarist.png', (r) => r.abort());
  await enter(page);
  const game = page.locator('.db-game');
  await game.getByRole('button', { name: /Deck \(/ }).click();
  await game.getByRole('button', { name: 'Browse card catalog' }).click();
  await expect(game.locator('.db-catalog .db-card')).toHaveCount(18);
  await expect(game.locator('.db-catalog [data-rarity="super-rare"]')).toHaveCount(3);
  await expect(game.locator('.db-catalog [data-rarity="rare"]')).toHaveCount(6);
  const guitarist = game.locator('.db-catalog .db-card').filter({ hasText: 'Garage guitarist' });
  await expect(guitarist.locator('svg')).toBeVisible();
  await expect(guitarist).toContainText('4 power');
  await expect(game.locator('.db-catalog .db-card').first()).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: info.outputPath('card-finishes.png') });
});

test('cabinet arrows skip incompatible Gear without losing the selected card', async ({ page }) => {
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  await game.getByRole('button', { name: 'Start battle', exact: true }).click();
  const initialScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await game.locator('.db-hand [data-card="riff"]').focus();
  const next = page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Next card', exact: true });
  await next.click();
  await expect(game.locator('.db-hand [data-card="singer"]')).toBeFocused();
  await next.click();
  await expect(game.locator('.db-hand [data-card="guitarist"]')).toBeFocused();
  await next.click();
  await expect(game.locator('.db-hand [data-card="soundcheck"]')).toBeFocused();
  await expect(game.locator('.db-hand [data-card="soundcheck"]')).toBeInViewport({ ratio: 1 });
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Play / confirm', exact: true })
    .click();
  await expect(game.locator('.db-hand [data-card="soundcheck"]')).toHaveCount(0);
  await expect(game).toHaveAttribute('data-energy', '3');
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(initialScroll);
});

test('portrait tablet toolbar leaves the Deck control clickable in fallback and expanded play', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await withoutWebGL(page);
  await enter(page);
  const game = page.locator('.db-game');
  const header = page.locator('.arcade-play-header');
  for (const expanded of [false, true]) {
    if (expanded) await page.getByRole('button', { name: 'Expand screen', exact: true }).click();
    const deck = game.getByRole('button', { name: /Deck \(/ });
    const toolbar = await header.boundingBox(),
      button = await deck.boundingBox();
    expect(toolbar!.y + toolbar!.height).toBeLessThanOrEqual(button!.y);
    await deck.click();
    await expect(game.getByRole('heading', { name: 'Current deck', exact: true })).toBeFocused();
    await game.getByRole('button', { name: 'Back to run', exact: true }).click();
  }
  await page.screenshot({ path: info.outputPath('tablet-toolbar-clear.png') });
});
