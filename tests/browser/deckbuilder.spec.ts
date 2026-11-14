import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CARDS } from '../../src/arcade/games/deckbuilder-model';
import { installProteinApi } from './protein-fixtures';

async function cabinetReady(page: Page) {
  await expect(page.locator('.arcade-page')).toHaveAttribute(
    'data-renderer',
    /^(three|fallback)$/,
    { timeout: 30000 },
  );
}
async function enter(page: Page, beforeEnter?: () => void) {
  await page.goto('/arcade/?game=deckbuilder');
  await cabinetReady(page);
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

async function playVisibleCard(page: Page) {
  const game = page.locator('.db-game');
  const attack = Number(
    (await game.locator('.db-intent').innerText()).match(/Attack (\d+)/)?.[1] ?? 0,
  );
  const block = Number(
    (await game.locator('.db-band-summary').innerText()).match(/(\d+) guard/)?.[1] ?? 0,
  );
  const guard = 0;
  const deficit = Math.max(0, attack - block - guard);
  const awaitedWeak = (await game.locator('.db-intent').innerText()).includes('weakened');
  const enemy = Number(await game.getAttribute('data-enemy-health'));
  const energy = Number(await game.getAttribute('data-energy'));
  const stage = await game.locator('.db-stage-slot[data-stage-id]').evaluateAll((es) =>
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
  const pressure = Number(await game.getAttribute('data-pressure'));
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
        if (f.pressure && pressure > 0) value += 6;
        if (f.weaken && !awaitedWeak) value += Math.min(3, deficit);
      }
      return { ...c, value, target };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const selected = options[0];
  if (!selected) {
    await game.getByRole('button', { name: 'Perform', exact: true }).click();
    return;
  }
  await game.locator('.db-hand .db-card').nth(selected.i).click();
  if (selected.target !== undefined)
    await game.locator(`.db-stage button[data-stage-id="${selected.target}"]`).click();
}

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
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
  await expect(page).toHaveURL(/\/arcade\/\?game=deckbuilder$/);
  // A full navigation initializes the WebGL capability probe before mounting the shell.
  // Use the same bounded readiness budget as direct cabinet entry on the software GPU.
  await cabinetReady(page);
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-selected', 'deckbuilder');
  if ((await page.locator('.arcade-page').getAttribute('data-renderer')) === 'three')
    await expect(page.getByRole('button', { name: 'Play Encore', exact: true })).toBeEnabled({
      timeout: 30000,
    });
  else
    await expect(
      page.locator('.arcade-fallback-machines > button').filter({ hasText: 'Encore' }),
    ).toBeEnabled();
  expect(errors).toEqual([]);
});

async function layoutReady(page: Page) {
  const game = page.locator('.db-game');
  const height = (await game.boundingBox())!.height;
  await expect(game).toHaveAttribute('data-compact', String(height < 360));
}
async function fit(page: Page) {
  await layoutReady(page);
  const game = page.locator('.db-game');
  const result = await game.evaluate((e) => {
    const box = e.getBoundingClientRect();
    const descendants = [
      e,
      ...e.querySelectorAll<HTMLElement>(
        '.db-panel,.db-combat,.db-pages-grid,.db-turnbar,.db-rules,.db-page-card',
      ),
    ];
    return {
      overflow: descendants
        .filter((x) => x.scrollHeight > x.clientHeight + 1)
        .map((x) => ({ name: x.className, scroll: x.scrollHeight, client: x.clientHeight })),
      clipped: [...e.querySelectorAll<HTMLElement>('button:not(:disabled),input,select')]
        .filter((x) => {
          if (!x.getClientRects().length || x.closest('.db-hand')) return false;
          const b = x.getBoundingClientRect();
          return (
            b.bottom > box.bottom + 1 ||
            b.top < box.top - 1 ||
            b.left < box.left - 1 ||
            b.right > box.right + 1
          );
        })
        .map((x) => x.textContent),
    };
  });
  expect(result).toEqual({ overflow: [], clipped: [] });
}
async function seedRun(page: Page, seed: string) {
  const g = page.locator('.db-game');
  await g.getByRole('button', { name: /Deck \(/ }).click();
  await g.getByRole('button', { name: 'Rules', exact: true }).click();
  await g.getByRole('textbox', { name: 'Run seed' }).fill(seed);
  await g.getByRole('button', { name: 'Restart seed', exact: true }).click();
}
test('Encore fits the cabinet, plays cards, pauses and resets without external API calls', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [],
    external: string[] = [],
    imports: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/\/api\/|api\.openai\.com|spotify\.com/.test(r.url())) external.push(r.url());
    if (
      /\/(?:src\/arcade\/games\/DeckbuilderGame\.tsx|assets\/DeckbuilderGame-[^/]+\.js)/.test(
        r.url(),
      )
    )
      imports.push(r.url());
  });
  await enter(page, () => expect(imports).toEqual([]));
  expect(imports).toHaveLength(1);
  const g = page.locator('.db-game');
  await fit(page);
  await page.screenshot({ path: info.outputPath('cabinet-map.png') });
  await g.getByRole('button', { name: 'Play show', exact: true }).click();
  await expect(g).toHaveAttribute('data-pressure', '10');
  await expect(g).toHaveAttribute('data-hit-chance', '96');
  await fit(page);
  await page.screenshot({ path: info.outputPath('cabinet-combat.png') });
  await g.locator('[data-card="singer"]').click();
  await expect(g).toHaveAttribute('data-energy', '2');
  for (const slot of await g.locator('.db-stage-slot,.db-gear-slot').all()) {
    const box = await slot.boundingBox();
    expect(box!.height).toBeGreaterThan(box!.width);
  }
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await page.keyboard.press('e');
  await expect(g).toHaveAttribute('data-turn', '1');
  await expect(g.getByRole('button', { name: 'Perform', exact: true })).toBeDisabled();
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'End turn / skip', exact: true })
    .click();
  await expect(g).toHaveAttribute('data-turn', '2');
  await expect(g).toHaveAttribute('data-pressure', '16');
  await expect(g.locator('.db-turnbar')).toHaveText('Perform');
  await expect(g.locator('.db-turnbar')).not.toContainText(/Draw|Discard|Band dealt/);
  await page.getByRole('button', { name: 'Expand screen', exact: true }).click();
  await fit(page);
  await page.screenshot({ path: info.outputPath('expanded-combat.png') });
  await g.getByRole('button', { name: /Deck \(/ }).click();
  await fit(page);
  await expect(g.getByRole('heading', { name: 'Current deck' })).toBeFocused();
  await page.screenshot({ path: info.outputPath('expanded-deck.png') });
  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await expect(g).toHaveAttribute('data-phase', 'map');
  await expect(g).toHaveAttribute('data-health', '80');
  await page.keyboard.press('Escape');
  await expect(page.locator('.arcade-page')).toHaveAttribute('data-game', 'selection');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('connected roads gate the town and keyboard confirmation plays the selected show', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await enter(page);
  const g = page.locator('.db-game');
  await expect(g.locator('[data-node="w1-boss"]')).toBeDisabled();
  await expect(g.locator('[data-node="w1-record"]')).toBeDisabled();
  await expect(g.locator('.db-town button:enabled')).toHaveCount(3);
  const middle = g.locator('[data-node="w1-show-middle"]');
  await middle.focus();
  await page.keyboard.press('Enter');
  await expect(middle).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('connected-roads.png') });
  await fit(page);
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Play / confirm', exact: true })
    .click();
  await expect(g).toHaveAttribute('data-current-node', 'w1-show-middle');
  await expect(g.getByRole('heading', { name: 'Penny Dread', exact: true })).toBeFocused();
  await expect(g.getByRole('group', { name: 'Guitar score battle board' })).toBeVisible();
  await fit(page);
});

test('musicians persist and Gear targeting and cancellation cost only on confirmation', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await enter(page);
  await seedRun(page, 'target-6');
  const g = page.locator('.db-game');
  await g.getByRole('button', { name: 'Play show', exact: true }).click();
  await expect(g.locator('.db-hand [data-card="kit"]')).toBeDisabled();
  await g.locator('.db-hand [data-card="singer"]').click();
  await expect(g.locator('.db-hand [data-card="kit"]')).toBeDisabled();
  await g.locator('.db-hand [data-card="drummer"]').click();
  const kit = g.locator('.db-hand [data-card="kit"]:enabled').first();
  const energy = await g.getAttribute('data-energy');
  await kit.click();
  await expect(g).toHaveAttribute('data-targeting', 'true');
  await expect(g.locator('.db-gear-slot[data-role="Drums"]')).toHaveAccessibleName(
    /Equip House kit to slot 2: Backbeat drummer \(Drums\)/,
  );
  await expect(g.locator('.db-gear-slot[data-role="Vocals"]')).toBeDisabled();
  await g.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(g).toHaveAttribute('data-energy', energy!);
  await expect(kit).toBeFocused();
  await kit.click();
  await g.locator('.db-gear-slot[data-role="Drums"]').click();
  await expect(g).toHaveAttribute('data-energy', String(Number(energy) - 1));
  await expect(g.locator('.db-stage')).toContainText('House kit');
  await g.getByRole('button', { name: 'Perform', exact: true }).click();
  await expect(g.locator('.db-stage-slot[data-stage-id]')).toHaveCount(2);
  await fit(page);
  await page.screenshot({ path: info.outputPath('equipment-slots.png') });
});

test('catalog pagination retains every card, rarity labels and missing-art fallback without scrolling', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await page.route('**/art/encore/cards/guitarist.png', (r) => r.abort());
  await enter(page);
  const g = page.locator('.db-game');
  await g.getByRole('button', { name: /Deck \(/ }).click();
  await g.getByRole('button', { name: 'Catalog', exact: true }).click();
  const seen = new Set<string>(),
    rarities = new Set<string>();
  for (let i = 0; i < 10; i++) {
    await fit(page);
    for (const card of await g.locator('.db-page-card').all()) {
      seen.add((await card.getAttribute('aria-label'))!);
      rarities.add((await card.getAttribute('data-rarity'))!);
      if ((await card.getAttribute('aria-label'))!.startsWith('Garage guitarist'))
        await expect(card.locator('svg')).toBeVisible();
    }
    if (i === 0) await page.screenshot({ path: info.outputPath('catalog-page.png') });
    const next = g.getByRole('button', { name: 'Next page', exact: true });
    if (await next.isDisabled()) break;
    await next.click();
  }
  expect(seen.size).toBe(20);
  expect([...rarities].sort()).toEqual(['common', 'rare', 'super-rare']);
  await page.screenshot({ path: info.outputPath('catalog-last.png') });
});

test('short phone and portrait tablet keep all controls inside the monitor', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 664 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    await enter(page);
    const g = page.locator('.db-game');
    for (const expanded of [false, true]) {
      if (expanded) await page.getByRole('button', { name: 'Expand screen', exact: true }).click();
      await fit(page);
      await g.getByRole('button', { name: 'Play show', exact: true }).click();
      await fit(page);
      await g.getByRole('button', { name: /Deck \(/ }).click();
      for (const tab of ['Deck', 'Catalog', 'Perks', 'Rules']) {
        await g.getByRole('button', { name: tab, exact: true }).click();
        await fit(page);
      }
      await page.screenshot({ path: info.outputPath(`fit-${viewport.width}-${expanded}.png`) });
      await g.getByRole('button', { name: 'Back to run', exact: true }).click();
      await page.getByRole('button', { name: 'Restart game', exact: true }).click();
    }
  }
});

test('a legal road tour visits shops, an event, Studio, three bosses and the final show', async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await withoutWebGL(page);
  await enter(page);
  const g = page.locator('.db-game'),
    visited: string[] = [],
    bosses: number[] = [],
    shops = new Set<string>();
  const route = [
    'w1-show-left',
    'w1-record',
    'w1-tattoo',
    'w1-boss',
    'w2-show-middle',
    'w2-extra-show',
    'w2-studio',
    'w2-boss',
    'w3-show-right',
    'w3-rehearsal',
    'w3-music',
    'w3-boss',
    'crown-record',
    'crown-show',
  ];
  const screenshots = new Set<string>();
  for (let step = 0; step < 1100; step++) {
    const phase = await g.getAttribute('data-phase');
    if (phase === 'won' || phase === 'lost') break;
    if (!screenshots.has(phase!)) {
      await fit(page);
      const original = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: 568 });
      await layoutReady(page);
      await fit(page);
      await page.screenshot({ path: info.outputPath(`short-${phase}.png`) });
      await page.setViewportSize(original);
      await layoutReady(page);
      await page.screenshot({ path: info.outputPath(`tour-${phase}.png`) });
      screenshots.add(phase!);
    }
    if (phase === 'map') {
      const id = route[visited.length];
      expect(id).toBeTruthy();
      const node = g.locator(`[data-node="${id}"]`);
      await expect(node).toBeEnabled();
      await node.click();
      await g.getByRole('button', { name: /^(Play show|Visit)$/ }).click();
      visited.push(id);
      if (id.endsWith('boss') || id === 'crown-show')
        bosses.push(Number(await g.getAttribute('data-floor')));
    } else if (phase === 'reward') {
      const choices = g.locator('[data-reward]'),
        keys = await choices.evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.reward!));
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
      await g.locator('[data-record]').first().click();
    } else if (phase === 'event') {
      await g.getByRole('button', { name: /^Rehearse/ }).click();
    } else if (phase === 'shop') {
      const id = (await g.getAttribute('data-current-node'))!;
      shops.add(id.split('-').slice(1).join('-'));
      await fit(page);
      if (!screenshots.has(id)) {
        const original = page.viewportSize()!;
        await page.setViewportSize({ width: 320, height: 568 });
        await layoutReady(page);
        for (let stockPage = 0; stockPage < 10; stockPage++) {
          await fit(page);
          await page.screenshot({ path: info.outputPath(`short-${id}-${stockPage}.png`) });
          const next = g.getByRole('button', { name: 'Next page', exact: true });
          if (!(await next.count()) || (await next.isDisabled())) break;
          await next.click();
        }
        await page.setViewportSize(original);
        await layoutReady(page);
        await fit(page);
        await page.screenshot({ path: info.outputPath(`${id}.png`) });
        screenshots.add(id);
      }
      const tattoo = g.locator('[data-tattoo="plated"]:enabled'),
        promo = g.locator('[data-promotion="flyers"]:enabled');
      if (await tattoo.count()) await tattoo.click();
      else if (await promo.count()) await promo.click();
      else await g.getByRole('button', { name: 'Leave', exact: true }).click();
    } else await playVisibleCard(page);
  }
  await expect(g).toHaveAttribute('data-phase', 'won');
  expect(visited).toEqual(route);
  expect(bosses).toEqual([2, 5, 8, 9]);
  expect([...shops].sort()).toEqual(['music', 'record', 'studio', 'tattoo']);
  await fit(page);
  await page.screenshot({ path: info.outputPath('tour-complete.png') });
  await g.getByRole('button', { name: 'New run', exact: true }).click();
  await expect(g).toHaveAttribute('data-cash', '20');
});

test('Warm-up visibly improves hit odds and feedback honors pause and reduced motion', async ({
  page,
}, info) => {
  await withoutWebGL(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enter(page);
  await seedRun(page, 'calm-0');
  const g = page.locator('.db-game');
  await g.getByRole('button', { name: 'Play show', exact: true }).click();
  await g.locator('.db-hand [data-card="warmup"]').click();
  await expect(g).toHaveAttribute('data-pressure', '0');
  await expect(g).toHaveAttribute('data-hit-chance', '100');
  await expect(g).toHaveAttribute('data-feedback', 'utility');
  await g.locator('.db-hand [data-card="guitarist"]').first().click();
  await g.getByRole('button', { name: 'Perform', exact: true }).click();
  await expect(g).toHaveAttribute('data-turn', '2');
  await expect(g.locator('.db-stage-slot[data-stage-id]')).toHaveAttribute('data-outcome', 'hit');
  await expect(g).toHaveAttribute('data-pressure', '6');
  const motion = g.locator('.db-character-motion');
  await expect(motion).toHaveCSS('animation-name', 'db-lunge');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(motion).toHaveCSS('animation-play-state', 'paused');
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(motion).toHaveCSS('animation-name', 'none');
  await fit(page);
  await page.screenshot({ path: info.outputPath('pressure-control.png') });
});

test('cabinet arrows skip incompatible Gear and preserve document position', async ({ page }) => {
  await withoutWebGL(page);
  await enter(page);
  const g = page.locator('.db-game');
  await g.getByRole('button', { name: 'Play show', exact: true }).click();
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await g.locator('.db-hand [data-card="riff"]').focus();
  const next = page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Next card', exact: true });
  await next.click();
  await expect(g.locator('.db-hand [data-card="singer"]')).toBeFocused();
  await next.click();
  await expect(g.locator('.db-hand [data-card="guitarist"]')).toBeFocused();
  await next.click();
  await expect(g.locator('.db-hand [data-card="soundcheck"]')).toBeFocused();
  await expect(g.locator('.db-hand [data-card="soundcheck"]')).toBeInViewport({ ratio: 1 });
  await page
    .locator('.arcade-player-controls')
    .getByRole('button', { name: 'Play / confirm', exact: true })
    .click();
  await expect(g.locator('.db-hand [data-card="soundcheck"]')).toHaveCount(0);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
});
