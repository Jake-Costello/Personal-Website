import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { arcadeProjects } from './projects';
import type { ArcadeProject } from './projects';
import type { ArcadeInput } from './input';

type SceneProps = {
  selected: number;
  playing: boolean;
  reduced: boolean;
  input: ArcadeInput;
  screenRef: RefObject<HTMLDivElement | null>;
  onSelect: (index: number) => void;
  onReady: () => void;
  onFailure: () => void;
};

const SCREEN = { width: 1.15, height: 1.15 / 1.6, y: 2.03, z: 0.455 };

function rounded(width: number, height: number, depth: number, radius = 0.025) {
  return new RoundedBoxGeometry(width, height, depth, 3, radius);
}

function labelTexture(title: string, subtitle: string, accent: string, dark = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = dark ? '#10191d' : accent;
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = dark ? accent : '#19252a';
  c.lineWidth = 3;
  c.strokeRect(17, 17, 990, 222);
  c.fillStyle = dark ? accent : '#122028';
  c.font = 'bold 91px Arial';
  c.textAlign = 'center';
  c.fillText(title, 512, 145, 930);
  c.font = '20px monospace';
  c.fillText(subtitle, 512, 207);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#969696';
  c.fillRect(0, 0, 256, 256);
  // Repeatable fine-grain laminate; no external texture or model downloads.
  let seed = 19;
  for (let i = 0; i < 16000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 256;
    const shade = 110 + (seed % 75);
    c.fillStyle = `rgb(${shade},${shade},${shade})`;
    c.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 5);
  return t;
}

function sideTexture(project: ArcadeProject) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  c.fillStyle = project.cabinetColor;
  c.fillRect(0, 0, 512, 1024);
  c.strokeStyle = project.accent;
  c.lineWidth = 15;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(-30, 660 + i * 65);
    c.bezierCurveTo(210, 480 + i * 65, 240, 720 + i * 65, 550, 220 + i * 65);
    c.stroke();
  }
  c.fillStyle = project.accent;
  c.font = 'bold 160px Arial';
  c.fillText(project.number, 44, 209);
  c.fillStyle = '#e1e7da';
  c.font = '18px monospace';
  c.fillText('PLAY / MAKE / REPEAT', 45, 910);
  c.font = 'bold 32px Arial';
  c.fillText('JC EXPERIMENTS', 45, 957);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function attractTexture(project: ArcadeProject) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(
    0,
    project.id === 'sketch' ? '#a7c4ae' : project.id === 'shoreline' ? '#9ec1be' : '#1a303b',
  );
  sky.addColorStop(1, '#10262c');
  c.fillStyle = sky;
  c.fillRect(0, 0, 960, 600);
  if (project.id === 'shoreline') {
    c.fillStyle = '#e9edb5';
    c.beginPath();
    c.arc(756, 120, 56, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#496c70';
    for (let i = 0; i < 21; i++) c.fillRect(i * 49, 260 - ((i * 47) % 160), 36, 200);
    c.fillStyle = '#1f5f65';
    c.fillRect(0, 300, 960, 300);
    c.strokeStyle = '#72a9a1';
    c.lineWidth = 4;
    for (let i = 0; i < 26; i++) {
      const x = (i * 179) % 940;
      const y = 320 + ((i * 59) % 270);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 62, y);
      c.stroke();
    }
    c.fillStyle = '#ddf68b';
    c.beginPath();
    c.moveTo(378, 414);
    c.lineTo(568, 414);
    c.lineTo(601, 389);
    c.lineTo(572, 435);
    c.lineTo(409, 443);
    c.fill();
    c.strokeStyle = '#102b32';
    c.lineWidth = 20;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(447, 406);
    c.lineTo(469, 357);
    c.lineTo(501, 382);
    c.lineTo(519, 412);
    c.stroke();
    c.strokeStyle = '#ed9cb9';
    c.lineWidth = 29;
    c.beginPath();
    c.moveTo(470, 351);
    c.lineTo(490, 309);
    c.stroke();
    c.fillStyle = '#d8b38b';
    c.beginPath();
    c.arc(499, 286, 17, 0, 7);
    c.fill();
    c.strokeStyle = '#e3f6dc';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(381, 427);
    c.lineTo(295, 440);
    c.moveTo(381, 419);
    c.lineTo(324, 395);
    c.stroke();
  } else if (project.id === 'sketch') {
    c.strokeStyle = '#dcebd5';
    c.lineWidth = 1;
    for (let x = 0; x < 960; x += 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 600);
      c.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(960, y);
      c.stroke();
    }
    c.fillStyle = '#749386';
    c.beginPath();
    c.moveTo(0, 310);
    c.lineTo(220, 112);
    c.lineTo(407, 320);
    c.lineTo(650, 190);
    c.lineTo(960, 370);
    c.lineTo(960, 600);
    c.lineTo(0, 600);
    c.fill();
    c.strokeStyle = '#e5f89b';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-10, 260);
    c.bezierCurveTo(230, 215, 280, 490, 480, 430);
    c.bezierCurveTo(650, 360, 680, 540, 970, 480);
    c.stroke();
    c.strokeStyle = '#112d31';
    c.lineWidth = 11;
    [425, 513].forEach((x) => {
      c.beginPath();
      c.arc(x, 400, 28, 0, 7);
      c.stroke();
    });
    c.strokeStyle = '#e69c69';
    c.beginPath();
    c.moveTo(425, 400);
    c.lineTo(459, 349);
    c.lineTo(484, 400);
    c.closePath();
    c.lineTo(500, 340);
    c.lineTo(513, 400);
    c.stroke();
    c.strokeStyle = '#172f34';
    c.beginPath();
    c.moveTo(459, 349);
    c.lineTo(449, 315);
    c.lineTo(473, 288);
    c.lineTo(494, 330);
    c.stroke();
    c.fillStyle = '#172f34';
    c.beginPath();
    c.arc(480, 265, 17, 0, 7);
    c.fill();
  } else {
    c.strokeStyle = '#314650';
    c.lineWidth = 2;
    for (let x = 0; x < 960; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 600);
      c.stroke();
    }
    for (let y = 0; y < 600; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(960, y);
      c.stroke();
    }
    for (const x of [260, 440, 620])
      for (const y of [160, 340]) {
        c.fillStyle = '#839490';
        c.fillRect(x, y, 100, 130);
        for (let i = 0; i < 4; i++) {
          c.fillStyle = '#c7a47a';
          c.fillRect(x + 8 + (i % 2) * 45, y + 10 + Math.floor(i / 2) * 61, 34, 48);
        }
      }
    for (const x of [25, 830]) {
      c.fillStyle = '#dde4d4';
      c.fillRect(x, 220, 100, 180);
      c.fillStyle = project.accent;
      c.fillRect(x, 405, 100, 60);
      c.fillStyle = '#1a3f51';
      c.fillRect(x + 15, 415, 70, 24);
    }
    c.strokeStyle = '#d7f385';
    c.setLineDash([12, 12]);
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(140, 317);
    c.lineTo(812, 317);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#f1b677';
    c.beginPath();
    c.arc(395, 320, 16, 0, 7);
    c.fill();
    c.fillStyle = '#ebf29d';
    c.fillRect(380, 320, 30, 30);
  }
  c.fillStyle = '#06151bc9';
  c.fillRect(0, 0, 960, 94);
  c.fillRect(0, 514, 960, 86);
  c.fillStyle = '#f0f3e5';
  c.font = 'bold 36px Arial';
  c.textAlign = 'center';
  c.fillText(project.title.toUpperCase(), 480, 58);
  c.fillStyle = project.accent;
  c.font = '23px monospace';
  c.fillText('STEP UP TO PLAY', 480, 568);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Cabinet({
  project,
  index,
  selected,
  playing,
  reduced,
  input,
  onSelect,
}: Omit<SceneProps, 'screenRef' | 'onReady' | 'onFailure'> & {
  project: ArcadeProject;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const grip = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const capturedControls = useRef(new Map<number, string>());
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useThree((s) => s.gl.domElement);
  const [held, setHeld] = useState('');
  useEffect(() => input.subscribe(() => setHeld([...input.pressed].join('|'))), [input]);
  useEffect(() => {
    // R3F consumes cancellation events without forwarding them to captured meshes.
    // Release only the affected control so a second held touch remains usable.
    const releaseCaptured = (event: PointerEvent) => {
      const action = capturedControls.current.get(event.pointerId);
      if (!action) return;
      capturedControls.current.delete(event.pointerId);
      if (action === 'stick') {
        grip.current = null;
        input.set('left', false);
        input.set('right', false);
        if (project.id === 'warehouse') {
          input.set('up', false);
          input.set('down', false);
        }
      } else input.set(action, false);
    };
    const forgetCaptures = () => {
      capturedControls.current.clear();
      grip.current = null;
    };
    canvas.addEventListener('pointercancel', releaseCaptured);
    canvas.addEventListener('lostpointercapture', releaseCaptured);
    window.addEventListener('blur', forgetCaptures);
    return () => {
      canvas.removeEventListener('pointercancel', releaseCaptured);
      canvas.removeEventListener('lostpointercapture', releaseCaptured);
      window.removeEventListener('blur', forgetCaptures);
      forgetCaptures();
    };
  }, [canvas, input, project.id]);
  const active = index === selected;
  const resources = useMemo(() => {
    const shape = new THREE.Shape();
    // Side silhouette of a full-height upright cabinet, extruded across its width.
    shape.moveTo(-0.6, 0.08);
    shape.lineTo(0.5, 0.08);
    shape.lineTo(0.53, 1.05);
    shape.lineTo(0.82, 1.24);
    shape.lineTo(0.81, 1.43);
    shape.lineTo(0.48, 1.51);
    shape.lineTo(0.38, 2.51);
    shape.lineTo(0.58, 2.62);
    shape.lineTo(0.58, 3.05);
    shape.lineTo(-0.6, 3.05);
    shape.closePath();
    const side = new THREE.ExtrudeGeometry(shape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.012,
    });
    side.rotateY(-Math.PI / 2);
    const grain = surfaceTexture();
    const body = new THREE.MeshStandardMaterial({
      color: project.cabinetColor,
      roughness: 0.55,
      metalness: 0.15,
      roughnessMap: grain,
      bumpMap: grain,
      bumpScale: 0.008,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: project.accent,
      roughness: 0.32,
      metalness: 0.3,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: '#9ca6a6',
      metalness: 0.88,
      roughness: 0.28,
    });
    const black = new THREE.MeshStandardMaterial({
      color: '#12171a',
      roughness: 0.34,
      metalness: 0.2,
    });
    return {
      side,
      grain,
      body,
      edge,
      metal,
      black,
      marquee: labelTexture(
        project.shortTitle,
        `${project.genre}  /  JC EXPERIMENTS`,
        project.accent,
      ),
      screen: attractTexture(project),
      sideArt: sideTexture(project),
      badge: labelTexture('JC', 'ORIGINAL EXPERIMENTS', '#c9d2c7', true),
      controlA: labelTexture(
        project.controls[0].label.toUpperCase(),
        project.controls[0].key,
        project.accent,
        true,
      ),
      controlB: labelTexture(
        project.controls[1].label.toUpperCase(),
        project.controls[1].key,
        '#e1e9d9',
        true,
      ),
    };
  }, [project]);
  useEffect(
    () => () => {
      Object.values(resources).forEach((r) => r.dispose());
    },
    [resources],
  );
  const order = ((index - selected + 4) % 3) - 1;
  const targetX = order * (playing ? 3.9 : 2.18);
  const targetZ = active ? (playing ? 0.35 : 0.25) : playing ? -1.4 : -0.55;
  const targetR = active ? (playing ? 0 : -0.12) : -order * 0.28;
  const initialPosition = useRef<[number, number, number]>([targetX, 0, targetZ]);
  const initialRotation = useRef<[number, number, number]>([0, targetR, 0]);
  const boxes = useMemo(() => new Map<string, THREE.BufferGeometry>(), []);
  useEffect(() => () => boxes.forEach((g) => g.dispose()), [boxes]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const g = group.current;
    const a = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.06) * 7);
    g.position.x = THREE.MathUtils.lerp(g.position.x, targetX, a);
    g.position.z = THREE.MathUtils.lerp(g.position.z, targetZ, a);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetR, a);
    if (
      Math.abs(g.position.x - targetX) +
        Math.abs(g.position.z - targetZ) +
        Math.abs(g.rotation.y - targetR) >
      0.0005
    )
      invalidate();
  });
  const press = (action: string, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!active || !playing) {
      onSelect(index);
      return;
    }
    (event.target as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture(
      event.pointerId,
    );
    capturedControls.current.set(event.pointerId, action);
    input.set(action, true);
  };
  const release = (action: string, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    capturedControls.current.delete(event.pointerId);
    input.set(action, false);
  };
  const releaseStick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    capturedControls.current.delete(event.pointerId);
    grip.current = null;
    input.set('left', false);
    input.set('right', false);
    if (project.id === 'warehouse') {
      input.set('up', false);
      input.set('down', false);
    }
  };
  const box = (
    key: string,
    position: [number, number, number],
    size: [number, number, number],
    material = resources.body,
    radius = 0.02,
  ) => {
    if (!boxes.has(key)) boxes.set(key, rounded(...size, radius));
    return (
      <mesh key={key} position={position} castShadow receiveShadow material={material}>
        <primitive object={boxes.get(key)!} attach="geometry" />
      </mesh>
    );
  };

  return (
    <group
      ref={group}
      position={initialPosition.current}
      rotation={initialRotation.current}
      onClick={(e) => {
        e.stopPropagation();
        if (!playing || !active) onSelect(index);
      }}
      onPointerOver={() => {
        document.body.style.cursor = !playing || !active ? 'pointer' : '';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {[-0.71, 0.775].map((x) => (
        <mesh
          key={x}
          geometry={resources.side}
          material={resources.body}
          position={[x, 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {[-0.735, 0.735].map((x) => (
        <group key={x}>
          {box(`edge-${x}`, [x, 0.62, 0.51], [0.018, 1.1, 0.025], resources.edge, 0.005)}
          {box(`topedge-${x}`, [x, 2.83, 0.595], [0.022, 0.45, 0.025], resources.edge, 0.006)}
          <mesh
            position={[x * 1.075, 1.83, -0.17]}
            rotation={[0, x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.69, 1.3]} />
            <meshStandardMaterial map={resources.sideArt} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {box('back', [0, 1.56, -0.56], [1.42, 2.95, 0.12])}
      {box('base', [0, 0.08, -0.04], [1.5, 0.16, 1.15], resources.black)}
      {box('front', [0, 0.62, 0.48], [1.4, 1.04, 0.11])}
      {box('top', [0, 3.04, -0.01], [1.5, 0.09, 1.17])}
      {box('marquee-frame', [0, 2.825, 0.5], [1.43, 0.49, 0.23], resources.black)}
      <mesh position={[0, 2.825, 0.625]}>
        <planeGeometry args={[1.31, 0.33]} />
        <meshStandardMaterial
          map={resources.marquee}
          emissiveMap={resources.marquee}
          emissive="#ffffff"
          emissiveIntensity={0.6}
          roughness={0.23}
          metalness={0.1}
        />
      </mesh>
      {box('monitor-recess', [0, 2.04, 0.28], [1.4, 1.04, 0.25], resources.black, 0.06)}
      {box('crt-surround', [0, SCREEN.y, 0.402], [1.25, 0.82, 0.1], resources.black, 0.06)}
      <mesh position={[0, SCREEN.y, SCREEN.z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height, 14, 10]} />
        <meshBasicMaterial map={resources.screen} toneMapped={false} />
      </mesh>
      {box('deck', [0, 1.31, 0.56], [1.53, 0.16, 0.59], resources.black, 0.045)}
      {box('deck-face', [0, 1.21, 0.842], [1.5, 0.14, 0.07], resources.body)}
      {box('deck-trim', [0, 1.24, 0.885], [1.49, 0.025, 0.025], resources.edge, 0.008)}
      <mesh position={[0, 1.399, 0.59]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.39, 0.43]} />
        <meshStandardMaterial color={project.cabinetColor} metalness={0.45} roughness={0.28} />
      </mesh>
      {[-0.67, 0.67].flatMap((x) =>
        [0.43, 0.77].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.405, z]}>
            <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
            <primitive object={resources.metal} attach="material" />
          </mesh>
        )),
      )}
      <group
        position={[-0.4, 1.41, 0.57]}
        rotation={[
          held.includes('down') ? 0.16 : held.includes('up') ? -0.16 : 0,
          0,
          held.includes('left') ? 0.18 : held.includes('right') ? -0.18 : 0,
        ]}
      >
        <mesh>
          <cylinderGeometry args={[0.13, 0.14, 0.026, 32]} />
          <primitive object={resources.black} attach="material" />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.16, 20]} />
          <primitive object={resources.metal} attach="material" />
        </mesh>
        <mesh
          position={[0, 0.18, 0]}
          castShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!active || !playing) {
              onSelect(index);
              return;
            }
            grip.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
            capturedControls.current.set(e.pointerId, 'stick');
            (e.target as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture(
              e.pointerId,
            );
          }}
          onPointerMove={(e) => {
            if (!grip.current || grip.current.pointerId !== e.pointerId) return;
            e.stopPropagation();
            const dx = e.clientX - grip.current.x;
            const dy = e.clientY - grip.current.y;
            input.set('left', dx < -8);
            input.set('right', dx > 8);
            if (project.id === 'warehouse') {
              input.set('up', dy < -8);
              input.set('down', dy > 8);
            }
          }}
          onPointerUp={releaseStick}
        >
          <sphereGeometry args={[0.075, 32, 24]} />
          <meshPhysicalMaterial
            color={project.accent}
            roughness={0.24}
            clearcoat={1}
            clearcoatRoughness={0.16}
          />
        </mesh>
      </group>
      {project.controls.map((control, j) => (
        <group key={control.action} position={[0.18 + j * 0.27, 1.41, 0.59 - j * 0.07]}>
          <mesh>
            <cylinderGeometry args={[0.111, 0.116, 0.025, 40]} />
            <primitive object={resources.metal} attach="material" />
          </mesh>
          <mesh
            position={[0, active && held.includes(control.action) ? 0.018 : 0.047, 0]}
            castShadow
            onPointerDown={(e) => press(control.action, e)}
            onPointerUp={(e) => release(control.action, e)}
          >
            <cylinderGeometry args={[0.089, 0.096, 0.052, 40]} />
            <meshPhysicalMaterial
              color={j ? '#edf0e7' : project.accent}
              clearcoat={1}
              roughness={0.24}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}
      {[resources.controlA, resources.controlB].map((map, j) => (
        <mesh key={j} position={[0.18 + j * 0.27, 1.22, 0.89]}>
          <planeGeometry args={[0.25, 0.0625]} />
          <meshStandardMaterial map={map} roughness={0.7} />
        </mesh>
      ))}
      {box('coin-door', [-0.27, 0.69, 0.553], [0.42, 0.49, 0.035], resources.black, 0.015)}
      {box('slot-metal', [-0.27, 0.84, 0.58], [0.21, 0.075, 0.02], resources.metal, 0.007)}
      {box('slot', [-0.27, 0.84, 0.594], [0.15, 0.015, 0.012], resources.black, 0.002)}
      <mesh position={[-0.27, 0.67, 0.582]}>
        <planeGeometry args={[0.17, 0.105]} />
        <meshStandardMaterial
          color="#e78d50"
          emissive="#f78e36"
          emissiveIntensity={0.4}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[-0.27, 0.53, 0.582]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.02, 20]} />
        <primitive object={resources.metal} attach="material" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) =>
        box(
          `vent-${i}`,
          [0.33, 0.91 - i * 0.047, 0.55],
          [0.35, 0.015, 0.012],
          resources.black,
          0.004,
        ),
      )}
      <mesh position={[0.31, 0.36, 0.548]}>
        <planeGeometry args={[0.38, 0.095]} />
        <meshStandardMaterial map={resources.badge} roughness={0.6} />
      </mesh>
      <mesh position={[0.57, 2.5, 0.44]}>
        <sphereGeometry args={[0.012, 12, 8]} />
        <meshBasicMaterial color={project.accent} />
      </mesh>
      {[-0.51, 0.51].flatMap((x) =>
        [-0.4, 0.36].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.025, z]}>
            <cylinderGeometry args={[0.075, 0.08, 0.05, 16]} />
            <primitive object={resources.black} attach="material" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Room({ selected, playing, reduced, screenRef, onReady, ...props }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const target = useRef(new THREE.Vector3(0, 1.5, 0));
  const ready = useRef(false);
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const map = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    scene.environment = map.texture;
    scene.environmentIntensity = 0.55;
    invalidate();
    return () => {
      scene.environment = null;
      map.dispose();
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    invalidate();
  }, [selected, playing, reduced, invalidate]);
  useFrame((_, dt) => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const aspect = size.width / size.height;
    const closeZ =
      0.805 +
      SCREEN.width /
        (2 * Math.tan(THREE.MathUtils.degToRad(34 / 2)) * Math.min(aspect * 0.86, 0.95));
    const closeY = aspect < 0.8 ? SCREEN.y : 1.87;
    const desired = playing
      ? new THREE.Vector3(0, closeY, closeZ)
      : new THREE.Vector3(0, 2.9, aspect < 0.8 ? 11.3 : 9.7);
    const desiredTarget = new THREE.Vector3(0, playing ? closeY : 1.65, 0);
    const factor = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.06) * 6);
    camera.position.lerp(desired, factor);
    target.current.lerp(desiredTarget, factor);
    camera.lookAt(target.current);
    camera.updateMatrixWorld();
    const dist = camera.position.distanceTo(desired) + target.current.distanceTo(desiredTarget);
    if (dist > 0.0003) invalidate();
    const element = screenRef.current;
    if (element) {
      const a = new THREE.Vector3(
        -SCREEN.width / 2,
        SCREEN.y + SCREEN.height / 2,
        SCREEN.z + 0.35,
      ).project(camera);
      const b = new THREE.Vector3(
        SCREEN.width / 2,
        SCREEN.y - SCREEN.height / 2,
        SCREEN.z + 0.35,
      ).project(camera);
      element.style.left = `${((a.x + 1) * size.width) / 2}px`;
      element.style.top = `${((1 - a.y) * size.height) / 2}px`;
      element.style.width = `${((b.x - a.x) * size.width) / 2}px`;
      element.style.height = `${((a.y - b.y) * size.height) / 2}px`;
      element.style.opacity = playing && dist < 0.018 ? '1' : '0';
      element.style.pointerEvents = playing && dist < 0.018 ? 'auto' : 'none';
      element.dataset.settled = playing && dist < 0.018 ? 'true' : 'false';
    }
  });
  return (
    <>
      <fog attach="fog" args={['#070c15', 10, 26]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[2, 6, 5]}
        intensity={1.8}
        color="#e8f0ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0002}
      />
      <spotLight
        position={[-5, 4, 2]}
        angle={0.7}
        penumbra={0.9}
        intensity={32}
        color="#98bdf5"
        distance={15}
      />
      <pointLight position={[4, 2.8, -0.5]} intensity={12} color="#b6a5f8" distance={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#03070b"
          metalness={0.05}
          roughness={0.88}
          envMapIntensity={0.05}
        />
      </mesh>
      {[2.8, 3.2, 4.3].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <ringGeometry args={[r, r + 0.006, 128]} />
          <meshBasicMaterial color="#526878" transparent opacity={0.3} />
        </mesh>
      ))}
      {arcadeProjects.map((project, index) => (
        <Cabinet
          key={project.id}
          {...props}
          selected={selected}
          playing={playing}
          reduced={reduced}
          project={project}
          index={index}
        />
      ))}
    </>
  );
}

export default function ArcadeScene(props: SceneProps) {
  return (
    <Canvas
      className="arcade-webgl"
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.7, 9.1], fov: 34, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.domElement.addEventListener('webglcontextlost', props.onFailure, { once: true });
      }}
    >
      <Room {...props} />
    </Canvas>
  );
}
