import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as THREE from 'three';

// Project independent fixture points on the rendered top disks, rather than relying on
// DOM control bounds: those are separate accessible controls, not the physical buttons.
export async function checkPhysicalButtonCaps(
  page: Page,
  game: 'warehouse' | 'shoreline' = 'warehouse',
) {
  await expect(page.locator('.arcade-live-screen')).toHaveAttribute('data-settled', 'true');
  await expect
    .poll(() =>
      page.locator('.arcade-live-screen').evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe('1');
  const project = await deckProjector(page);
  const projectCap = (x: number, z: number) => project(x, 0.0156, z);
  const panel = page.locator('.arcade-player-controls');
  const samples = [
    { name: game === 'warehouse' ? 'Pick up' : 'Pump', x: 0.15, z: -0.035 },
    { name: game === 'warehouse' ? 'Put down' : 'Jump', x: 0.225, z: -0.085 },
  ];
  for (const cap of samples) {
    const button = panel.getByRole('button', { name: cap.name, exact: true });
    for (let edge = -1; edge < 8; edge++) {
      const angle = (edge * Math.PI) / 4;
      const point = projectCap(
        cap.x + (edge < 0 ? 0 : Math.cos(angle) * 0.0225),
        cap.z + (edge < 0 ? 0 : Math.sin(angle) * 0.0225),
      );
      // Regression: the transparent, full-width DOM controls panel intercepted the
      // front of the disks, even though the rendered cap and raycast agreed.
      expect(
        await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point),
        `${cap.name} ${edge < 0 ? 'center' : `edge ${edge}`} reaches the canvas`,
      ).toBe('CANVAS');
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await page.mouse.up();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  }
  const putDown = panel.getByRole('button', {
    name: game === 'warehouse' ? 'Put down' : 'Jump',
    exact: true,
  });
  const edge = projectCap(0.225, -0.085 + 0.0225);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, ...edge }],
  });
  await expect(putDown).toHaveAttribute('aria-pressed', 'true');
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(putDown).toHaveAttribute('aria-pressed', 'false');
  await session.detach();

  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  for (const cap of samples) {
    const point = projectCap(cap.x, cap.z);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await expect(panel.getByRole('button', { name: cap.name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.mouse.up();
  }
  await page
    .locator('.arcade-play-tools')
    .getByRole('button', { name: 'Resume game', exact: true })
    .click();
}

// Independent fixture projection of the deck; dimensions are deliberate test data,
// not imported from the model implementation.
export async function deckProjector(page: Page) {
  const bounds = (await page.locator('.arcade-webgl canvas').boundingBox())!;
  const aspect = bounds.width / bounds.height;
  const cameraZ =
    0.82 + 1.32 / (2 * Math.tan((17 * Math.PI) / 180) * Math.min(aspect * 0.96, 1.02));
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100);
  camera.position.set(0, 1.98 + (cameraZ - 0.88) * Math.tan((18 * Math.PI) / 180), cameraZ);
  camera.lookAt(0, 1.98, 0.88);
  camera.updateMatrixWorld();
  return (x: number, y: number, z: number) => {
    const point = new THREE.Vector3(x, y, z)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), (14 * Math.PI) / 180)
      .add(new THREE.Vector3(0, 1.43, 0.97))
      .project(camera);
    return {
      x: bounds.x + ((point.x + 1) * bounds.width) / 2,
      y: bounds.y + ((1 - point.y) * bounds.height) / 2,
    };
  };
}
