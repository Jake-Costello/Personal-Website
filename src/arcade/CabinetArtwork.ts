import * as THREE from 'three';
import type { ArcadeProject } from './projects';
import { controlLayout, physicalActions } from './controlLayout';

function artwork(
  width: number,
  height: number,
  paint: (c: CanvasRenderingContext2D) => void,
  invalidate: () => void,
  fonts = true,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  const redraw = () => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, width, height);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.globalAlpha = 1;
    paint(c);
  };
  redraw();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let disposed = false;
  texture.addEventListener('dispose', () => {
    disposed = true;
  });
  if (fonts && document.fonts)
    void Promise.all([
      document.fonts.load('700 80px "Space Grotesk Variable"'),
      document.fonts.load('500 60px "IBM Plex Mono"'),
    ])
      .then(() => {
        if (disposed) return;
        redraw();
        texture.needsUpdate = true;
        invalidate();
      })
      .catch(() => {});
  return texture;
}

export function cabinetMarquee(project: ArcadeProject, invalidate: () => void) {
  if (project.id === 'deckbuilder') return deckbuilderArtwork('marquee', invalidate);
  return artwork(
    1024,
    256,
    (c) => {
      const warehouse = project.id === 'warehouse';
      c.fillStyle = warehouse ? '#dfbd79' : '#103b4a';
      c.fillRect(0, 0, 1024, 256);
      if (warehouse) {
        c.save();
        c.beginPath();
        c.rect(0, 0, 62, 256);
        c.rect(962, 0, 62, 256);
        c.clip();
        c.fillStyle = '#29312e';
        for (let y = -100; y < 330; y += 48) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(1024, y + 180);
          c.lineTo(1024, y + 204);
          c.lineTo(0, y + 24);
          c.fill();
        }
        c.restore();
        c.fillStyle = '#27312b';
        c.textAlign = 'center';
        c.font = '500 43px "IBM Plex Mono", monospace';
        c.fillText('WAREHOUSE', 512, 58);
        c.font = '500 128px "IBM Plex Mono", monospace';
        c.lineWidth = 2;
        c.strokeStyle = '#27312b';
        c.strokeText('WARRIOR', 512, 186, 800);
        c.fillText('WARRIOR', 512, 186, 800);
        c.font = '500 15px "IBM Plex Mono", monospace';
        c.fillStyle = '#8d754f';
        for (let x = 80; x < 200; x += 7) c.fillRect(x, 211, 3 + (x % 3), 23);
        c.strokeStyle = '#6d654c';
        c.lineWidth = 2;
        c.strokeRect(71, 10, 882, 236);
      } else {
        c.strokeStyle = '#598c93';
        c.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(0, 190 + i * 16);
          c.bezierCurveTo(180, 260 + i * 8, 300, 157 + i * 8, 530, 210 + i * 12);
          c.bezierCurveTo(710, 262, 850, 170 + i * 9, 1024, 210 + i * 14);
          c.stroke();
        }
        c.textAlign = 'center';
        c.fillStyle = '#acd2c8';
        c.font = '500 15px "IBM Plex Mono", monospace';
        c.save();
        c.translate(512, 0);
        c.transform(1, 0, -0.14, 1, 10, 0);
        c.font = '700 112px "Space Grotesk Variable", sans-serif';
        c.fillStyle = '#082932';
        c.fillText('RESUME RUN', 5, 155, 900);
        c.fillStyle = '#f1ecd6';
        c.fillText('RESUME RUN', 0, 148, 900);
        c.restore();
        c.fillStyle = '#d1e7ab';
        c.font = '500 17px "IBM Plex Mono", monospace';
        c.strokeStyle = '#719a9b';
        c.lineWidth = 2;
        c.strokeRect(13, 11, 998, 234);
      }
    },
    invalidate,
  );
}

export function cabinetDeckArt(project: ArcadeProject, invalidate: () => void) {
  if (project.id === 'deckbuilder') return deckbuilderArtwork('deck', invalidate);
  return artwork(
    1024,
    346,
    (c) => {
      const warehouse = project.id === 'warehouse';
      c.fillStyle = warehouse ? '#28312c' : '#153f4c';
      c.fillRect(0, 0, 1024, 346);
      if (warehouse) {
        c.save();
        c.beginPath();
        c.rect(0, 299, 1024, 47);
        c.clip();
        c.fillStyle = '#cea45d';
        for (let x = -40; x < 1100; x += 66) {
          c.beginPath();
          c.moveTo(x, 299);
          c.lineTo(x + 35, 299);
          c.lineTo(x + 82, 346);
          c.lineTo(x + 47, 346);
          c.fill();
        }
        c.restore();
        c.strokeStyle = '#7d8a73';
        c.lineWidth = 2;
        c.strokeRect(33, 38, 207, 167);
        c.fillStyle = '#ddc08b';
        c.font = '500 22px "IBM Plex Mono", monospace';
        c.fillText('WAREHOUSE', 48, 75);
        c.fillText('WARRIOR', 48, 108);
        c.font = '500 13px "IBM Plex Mono", monospace';
        c.fillStyle = '#92a18c';
        for (let x = 36; x < 232; x += 8) c.fillRect(x, 229, 3 + (x % 3), 30);
      } else {
        c.strokeStyle = '#367681';
        c.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.moveTo(-30, 121 + i * 26);
          c.bezierCurveTo(75, 43 + i * 26, 139, 244 + i * 8, 255, 111 + i * 28);
          c.stroke();
        }
        c.fillStyle = '#d6e7c4';
        c.font = '700 28px "Space Grotesk Variable", sans-serif';
        c.fillText('RESUME RUN', 33, 44);
        c.fillStyle = '#9bbfba';
        c.font = '500 13px "IBM Plex Mono", monospace';
        c.strokeStyle = '#b2ce9b';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(33, 315);
        c.lineTo(991, 315);
        c.stroke();
        c.strokeStyle = '#315f6a';
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(840, 37 + i * 20);
          c.bezierCurveTo(930, 2 + i * 20, 951, 98 + i * 8, 1030, 45 + i * 25);
          c.stroke();
        }
      }
      const px = (x: number) => ((x + 0.695) / 1.39) * 1024,
        py = (z: number) => ((z + 0.235) / 0.47) * 346;
      const stick = controlLayout.joystick;
      c.strokeStyle = warehouse ? '#c5ac75' : '#82bdbd';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px(stick.x), py(stick.z), 57, 0, Math.PI * 2);
      c.stroke();
      c.textAlign = 'center';
      c.fillStyle = warehouse ? '#e6c58d' : '#c7dbce';
      c.font = '500 14px "IBM Plex Mono", monospace';
      c.fillText(warehouse ? 'MOVE' : 'STEER', px(stick.x), py(0.17));
      physicalActions(project).forEach((control, i) => {
        const p = controlLayout.buttons[i];
        if (!p) return;
        const x = px(p.x),
          y = py(p.z);
        c.strokeStyle = warehouse ? '#d7ad68' : i === 0 ? '#b6d8a0' : '#dca7bc';
        c.beginPath();
        c.arc(x, y, 28, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = warehouse ? '#e4ca97' : '#e1e7d1';
        c.font = '700 13px "Space Grotesk Variable", sans-serif';
        c.fillText(control.label.toUpperCase(), x, y + 43, 54);
        c.font = '500 10px "IBM Plex Mono", monospace';
        c.fillText(
          project.id === 'shoreline'
            ? control.action === 'down'
              ? 'DOWN / S'
              : 'UP / W'
            : control.key.toUpperCase(),
          x,
          y + 58,
          55,
        );
      });
    },
    invalidate,
  );
}

export function buttonGlyph(project: ArcadeProject, action: string, invalidate: () => void) {
  return artwork(
    128,
    128,
    (c) => {
      c.strokeStyle = project.id === 'warehouse' ? '#2b3027' : '#123d46';
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (project.id === 'deckbuilder') {
        c.strokeStyle = '#392d48';
        if (action === 'action') {
          c.beginPath();
          c.moveTo(42, 30);
          c.lineTo(94, 64);
          c.lineTo(42, 98);
          c.closePath();
          c.stroke();
        } else {
          c.strokeRect(36, 32, 56, 64);
          c.beginPath();
          c.moveTo(27, 98);
          c.lineTo(101, 98);
          c.stroke();
        }
      } else if (project.id === 'shoreline' && action === 'down') {
        for (let y = 37; y < 106; y += 23) {
          c.beginPath();
          c.moveTo(24, y);
          c.bezierCurveTo(40, y - 17, 48, y + 17, 64, y);
          c.bezierCurveTo(81, y - 17, 89, y + 17, 105, y);
          c.stroke();
        }
      } else {
        if (project.id === 'warehouse') {
          c.strokeRect(24, 45, 80, 62);
          c.beginPath();
          c.moveTo(24, 65);
          c.lineTo(104, 65);
          c.stroke();
        }
        const down = action === 'secondary';
        c.save();
        c.translate(64, 64);
        if (down) c.rotate(Math.PI);
        c.beginPath();
        c.moveTo(0, 30);
        c.lineTo(0, -36);
        c.moveTo(-23, -13);
        c.lineTo(0, -36);
        c.lineTo(23, -13);
        c.stroke();
        c.restore();
      }
    },
    invalidate,
    false,
  );
}

export function warehouseSideArt(invalidate: () => void) {
  return artwork(
    512,
    1024,
    (c) => {
      c.fillStyle = '#26332e';
      c.fillRect(0, 0, 512, 1024);
      c.strokeStyle = '#a68b59';
      c.lineWidth = 5;
      c.strokeRect(19, 20, 474, 983);
      c.fillStyle = '#d7b77d';
      c.font = '500 22px "IBM Plex Mono", monospace';
      c.font = '500 69px "IBM Plex Mono", monospace';
      c.fillText('WAREHOUSE', 38, 192, 442);
      c.font = '500 86px "IBM Plex Mono", monospace';
      c.fillText('WARRIOR', 38, 280, 442);
      c.strokeStyle = '#c0a36b';
      c.lineWidth = 6;
      for (const [x, y, w, h] of [
        [63, 403, 180, 190],
        [258, 403, 180, 190],
        [63, 613, 180, 190],
        [258, 613, 180, 190],
      ]) {
        c.strokeRect(x, y, w, h);
        c.beginPath();
        c.moveTo(x + 55, y);
        c.lineTo(x + 55, y + h);
        c.stroke();
        c.beginPath();
        c.moveTo(x + 112, y);
        c.lineTo(x + 112, y + 40);
        c.lineTo(x + 150, y + 40);
        c.lineTo(x + 150, y);
        c.stroke();
      }
      c.fillStyle = '#d2b67a';
      c.font = '500 18px "IBM Plex Mono", monospace';
      for (let x = 46; x < 463; x += 11) c.fillRect(x, 892, 3 + (x % 4), 45);
      c.font = '500 15px "IBM Plex Mono", monospace';
    },
    invalidate,
  );
}

export function deckbuilderArtwork(kind: 'marquee' | 'deck' | 'side', invalidate: () => void) {
  const width = kind === 'side' ? 512 : 1024;
  const height = kind === 'side' ? 1024 : kind === 'deck' ? 346 : 256;
  return artwork(
    width,
    height,
    (c) => {
      c.fillStyle = '#241d23';
      c.fillRect(0, 0, width, height);
      c.strokeStyle = '#c9bdb1';
      c.lineWidth = 3;
      c.strokeRect(14, 13, width - 28, height - 26);
      // Original gig-poster/checker motif, not a venue or museum logo.
      c.fillStyle = '#a6424e';
      for (let row = 0; row < (kind === 'side' ? 24 : 5); row++)
        for (let col = 0; col < 3; col++) {
          if ((row + col) % 2 === 0) c.fillRect(20 + col * 19, 20 + row * 19, 19, 19);
        }
      if (kind === 'marquee') {
        c.save();
        c.translate(520, 0);
        c.transform(1, 0, -0.12, 1, 10, 0);
        c.textAlign = 'center';
        c.font = '700 151px "Space Grotesk Variable", sans-serif';
        c.fillStyle = '#0f1118';
        c.fillText('ENCORE', 6, 167);
        c.fillStyle = '#eadfc9';
        c.fillText('ENCORE', 0, 161);
        c.restore();
        c.font = '500 17px "IBM Plex Mono", monospace';
        c.fillStyle = '#dfb1a3';
        c.textAlign = 'center';
        c.fillText('DECKBUILDER PROTOTYPE', 512, 224);
      } else if (kind === 'deck') {
        c.fillStyle = '#e2d7c5';
        c.font = '700 36px "Space Grotesk Variable", sans-serif';
        c.fillText('ENCORE', 92, 63);
        const px = (x: number) => ((x + 0.695) / 1.39) * 1024,
          py = (z: number) => ((z + 0.235) / 0.47) * 346;
        c.strokeStyle = '#c4a7a8';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(px(controlLayout.joystick.x), py(controlLayout.joystick.z), 57, 0, Math.PI * 2);
        c.stroke();
        c.textAlign = 'center';
        c.font = '500 14px "IBM Plex Mono", monospace';
        c.fillText('SELECT', px(controlLayout.joystick.x), py(0.17));
        controlLayout.buttons.forEach((p, i) => {
          const x = px(p.x),
            y = py(p.z);
          c.beginPath();
          c.arc(x, y, 28, 0, Math.PI * 2);
          c.stroke();
          c.fillText(i ? 'END TURN' : 'PLAY', x, y + 43);
          c.font = '500 11px "IBM Plex Mono", monospace';
          c.fillText(i ? 'E' : 'Q / SPACE', x, y + 59);
          c.font = '500 14px "IBM Plex Mono", monospace';
        });
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(824, 66 + i * 11);
          c.lineTo(956, 45 + i * 11);
          c.stroke();
        }
      } else {
        c.fillStyle = '#e8dcc6';
        c.font = '700 82px "Space Grotesk Variable", sans-serif';
        c.fillText('ENCORE', 45, 160, 420);
        c.save();
        c.translate(256, 490);
        c.rotate(-0.12);
        c.strokeStyle = '#ad4c58';
        c.lineWidth = 9;
        c.strokeRect(-130, -190, 260, 395);
        c.fillStyle = '#4b4043';
        c.fillRect(-111, -170, 222, 355);
        c.fillStyle = '#c4b8a4';
        c.fillRect(-75, -115, 150, 90);
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 3; col++) c.fillRect(-57 + col * 42, 12 + row * 34, 27, 22);
        c.strokeStyle = '#eadfca';
        c.lineCap = 'round';
        c.lineWidth = 27;
        c.beginPath();
        c.moveTo(-104, -125);
        c.quadraticCurveTo(-155, -30, -103, 60);
        c.stroke();
        c.strokeStyle = '#d7b8a4';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(-103, 75);
        c.bezierCurveTo(-160, 230, -30, 130, 0, 215);
        c.stroke();
        c.restore();
        c.font = '500 26px "IBM Plex Mono", monospace';
        c.fillStyle = '#caa9a2';
        c.textAlign = 'center';
        c.fillText('CLEVELAND', 256, 876);
      }
    },
    invalidate,
  );
}
